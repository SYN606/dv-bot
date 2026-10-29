import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import UnsavedChangesBar from "../../components/ui/UnsavedChangesBar";
import UnsavedChangesModal from "../../components/ui/UnsavedChangesModal";

const UnsavedChangesContext = createContext(null);

export function UnsavedChangesProvider({ children }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [state, setState] = useState({
    isDirty: false,
    onSave: null,
    onReset: null,
    pageTitle: "",
    message: "Careful — you have unsaved changes!",
  });

  const [isSaving, setIsSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);

  // Store latest state in ref to avoid stale closures in event listeners
  const stateRef = useRef(state);
  stateRef.current = state;

  const isSavingRef = useRef(isSaving);
  isSavingRef.current = isSaving;

  const registerUnsavedChanges = useCallback(({ isDirty, onSave, onReset, pageTitle, message }) => {
    setState({
      isDirty: Boolean(isDirty),
      onSave: onSave || null,
      onReset: onReset || null,
      pageTitle: pageTitle || "",
      message: message || "Careful — you have unsaved changes!",
    });
  }, []);

  const clearUnsavedChanges = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isDirty: false,
      onSave: null,
      onReset: null,
    }));
  }, []);

  // Save changes handler (used by floating bar and modal)
  const handleSave = useCallback(async () => {
    const { onSave } = stateRef.current;
    if (!onSave) return false;

    setIsSaving(true);
    try {
      const res = await onSave();
      // If the function explicitly returned false, saving failed
      if (res === false) {
        setIsSaving(false);
        return false;
      }
      setIsSaving(false);
      setState((prev) => ({ ...prev, isDirty: false }));
      return true;
    } catch (err) {
      console.error("[UnsavedChanges] Failed to save:", err);
      setIsSaving(false);
      return false;
    }
  }, []);

  // Reset changes handler (used by floating bar and modal)
  const handleReset = useCallback(() => {
    const { onReset } = stateRef.current;
    if (onReset) {
      try {
        onReset();
      } catch (err) {
        console.error("[UnsavedChanges] Error during reset:", err);
      }
    }
    setState((prev) => ({ ...prev, isDirty: false }));
  }, []);

  // Stay on current page
  const handleStay = useCallback(() => {
    setShowModal(false);
    setPendingNavigation(null);
  }, []);

  // Discard changes and proceed with pending navigation
  const handleDiscardAndLeave = useCallback(() => {
    const dest = pendingNavigation;
    handleReset();
    setShowModal(false);
    setPendingNavigation(null);

    if (dest) {
      if (dest === "BACK") {
        window.history.back();
      } else {
        navigate(dest);
      }
    }
  }, [pendingNavigation, handleReset, navigate]);

  // Save changes and proceed with pending navigation if successful
  const handleSaveAndLeave = useCallback(async () => {
    const dest = pendingNavigation;
    const success = await handleSave();
    if (success) {
      setShowModal(false);
      setPendingNavigation(null);
      if (dest) {
        if (dest === "BACK") {
          window.history.back();
        } else {
          navigate(dest);
        }
      }
    }
  }, [pendingNavigation, handleSave, navigate]);

  // Programmatic navigation helper that respects unsaved changes
  const navigateWithPrompt = useCallback(
    (to) => {
      if (stateRef.current.isDirty) {
        setPendingNavigation(to);
        setShowModal(true);
      } else {
        navigate(to);
      }
    },
    [navigate]
  );

  // 1. Intercept internal anchor link clicks across the DOM (Capture Phase)
  useEffect(() => {
    const handleCaptureClick = (e) => {
      if (!stateRef.current.isDirty) return;

      // Ignore elements explicitly marked to bypass unsaved guard
      if (e.target.closest('[data-unsaved-ignore="true"]')) {
        return;
      }

      const anchor = e.target.closest("a[href]");
      if (!anchor) return;

      // Ignore new tab, downloads, mailto, tel, javascript, hashes
      if (
        anchor.target === "_blank" ||
        anchor.getAttribute("download") !== null ||
        anchor.rel?.includes("external")
      ) {
        return;
      }

      const rawHref = anchor.getAttribute("href");
      if (!rawHref || rawHref.startsWith("#") || rawHref.startsWith("javascript:") || rawHref.startsWith("mailto:")) {
        return;
      }

      try {
        const currentUrl = new URL(window.location.href);
        const targetUrl = new URL(anchor.href, window.location.href);

        // Only guard same-origin routes
        if (targetUrl.origin !== currentUrl.origin) {
          return;
        }

        const currentPath = currentUrl.pathname + currentUrl.search;
        const targetPath = targetUrl.pathname + targetUrl.search;

        // If clicking the current exact page/hash, no navigation happens
        if (targetPath === currentPath) {
          return;
        }

        // Intercept navigation
        e.preventDefault();
        e.stopPropagation();

        setPendingNavigation(targetPath);
        setShowModal(true);
      } catch {
        // Fallback: ignore malformed URL
      }
    };

    document.addEventListener("click", handleCaptureClick, true);
    return () => {
      document.removeEventListener("click", handleCaptureClick, true);
    };
  }, []);

  // 2. Intercept window reload, tab closing, external URL entry
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (stateRef.current.isDirty) {
        e.preventDefault();
        e.returnValue = "You have unsaved changes. Are you sure you want to leave?";
        return e.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  // 3. Intercept browser back/forward buttons
  useEffect(() => {
    const handlePopState = (e) => {
      if (stateRef.current.isDirty) {
        // Push state back to prevent URL change before user decision
        window.history.pushState(null, "", window.location.href);
        setPendingNavigation("BACK");
        setShowModal(true);
      }
    };

    if (state.isDirty) {
      window.history.pushState(null, "", window.location.href);
      window.addEventListener("popstate", handlePopState);
    }

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [state.isDirty]);

  // 4. Ctrl+S / Cmd+S shortcut to save changes quickly
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        if (stateRef.current.isDirty && stateRef.current.onSave) {
          e.preventDefault();
          handleSave();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleSave]);

  // Automatically reset dirty state on route change if navigation was allowed
  const previousPathRef = useRef(location.pathname);
  useEffect(() => {
    if (previousPathRef.current !== location.pathname) {
      previousPathRef.current = location.pathname;
      setShowModal(false);
      setPendingNavigation(null);
    }
  }, [location.pathname]);

  return (
    <UnsavedChangesContext.Provider
      value={{
        isDirty: state.isDirty,
        isSaving,
        registerUnsavedChanges,
        clearUnsavedChanges,
        saveChanges: handleSave,
        resetChanges: handleReset,
        navigateWithPrompt,
      }}
    >
      {children}

      {/* Floating Unsaved Changes Bar */}
      <UnsavedChangesBar
        visible={state.isDirty && !showModal}
        isSaving={isSaving}
        onSave={handleSave}
        onReset={handleReset}
        message={state.message}
      />

      {/* Modal Dialog when navigating away while dirty */}
      <UnsavedChangesModal
        open={showModal}
        onStay={handleStay}
        onDiscard={handleDiscardAndLeave}
        onSave={handleSaveAndLeave}
        isSaving={isSaving}
        pageTitle={state.pageTitle}
      />
    </UnsavedChangesContext.Provider>
  );
}

/**
 * Hook to access raw UnsavedChanges context functions
 */
export function useUnsavedChangesContext() {
  const ctx = useContext(UnsavedChangesContext);
  if (!ctx) {
    return {
      isDirty: false,
      isSaving: false,
      registerUnsavedChanges: () => {},
      clearUnsavedChanges: () => {},
      saveChanges: async () => false,
      resetChanges: () => {},
      navigateWithPrompt: () => {},
    };
  }
  return ctx;
}

/**
 * Hook for pages/forms to register their unsaved changes status
 *
 * @param {Object} options
 * @param {boolean} options.isDirty - Whether there are uncommitted changes
 * @param {Function} options.onSave - Async function to save changes (must return false only on error)
 * @param {Function} options.onReset - Function to reset form to initial/saved state
 * @param {string} [options.pageTitle] - Human-friendly name of the section or page
 * @param {string} [options.message] - Custom message for floating bar
 */
export function useUnsavedChanges({ isDirty, onSave, onReset, pageTitle, message }) {
  const { registerUnsavedChanges, clearUnsavedChanges } = useUnsavedChangesContext();

  // Save latest callbacks in refs to avoid re-registering on every render
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  const onResetRef = useRef(onReset);
  onResetRef.current = onReset;

  useEffect(() => {
    registerUnsavedChanges({
      isDirty: Boolean(isDirty),
      onSave: () => onSaveRef.current?.(),
      onReset: () => onResetRef.current?.(),
      pageTitle,
      message,
    });
  }, [isDirty, pageTitle, message, registerUnsavedChanges]);

  useEffect(() => {
    return () => {
      clearUnsavedChanges();
    };
  }, [clearUnsavedChanges]);
}
