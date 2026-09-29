import React, { createContext, useContext, useState, useCallback } from "react";
import Toast from "../../components/ui/Toast";

const ToastContext = createContext(null);

/**
 * ToastProvider — global toast notification state.
 *
 * Wrap the application once with this provider. Any component can then
 * call `useToast()` to get `showToast` without prop drilling.
 *
 * showToast(message, type?) — backward-compatible signature
 * showToast({ title, message, type }) — object signature used by hooks
 *
 * Both forms work because hooks already call showToast?.({ ... }).
 */
export function ToastProvider({ children }) {
  const [toast, setToast] = useState({ message: "", type: "success", visible: false });

  const showToast = useCallback((messageOrObj, type = "success") => {
    let message;
    let resolvedType = type;

    if (typeof messageOrObj === "object" && messageOrObj !== null) {
      // Object form: { title, message, type }
      message = messageOrObj.message || messageOrObj.title || "";
      resolvedType = messageOrObj.type || "success";
    } else {
      // String form: showToast("message", "error")
      message = messageOrObj;
    }

    setToast({ message, type: resolvedType, visible: true });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Toast {...toast} />
    </ToastContext.Provider>
  );
}

/**
 * useToast — access the global toast function from any component.
 *
 * @returns {{ showToast: (messageOrObj: string | object, type?: string) => void }}
 */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Graceful fallback: return a no-op if used outside provider
    return { showToast: () => {} };
  }
  return ctx;
}
