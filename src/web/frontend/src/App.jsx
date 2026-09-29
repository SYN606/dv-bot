import { useEffect, useState } from "react";
import { BrowserRouter } from "react-router-dom";
import { getAuthSession, getBotInfo } from "./api/client";
import { ToastProvider, useToast } from "./app/providers/ToastProvider";
import AppRoutes from "./app/routes";

/**
 * Inner component that has access to ToastProvider context.
 * Separated so useToast() can be called inside the provider tree.
 */
function AppInner() {
  const { showToast } = useToast();
  const [user, setUser] = useState(null);
  const [botInfo, setBotInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  const handleUserUpdate = (data) => {
    if (data?.user) {
      setUser({
        ...data.user,
        guilds: data.guilds || [],
        isSuperuser: data.isSuperuser || false,
      });
    }
    getBotInfo().then((b) => b && setBotInfo(b)).catch(() => {});
  };

  useEffect(() => {
    Promise.all([
      getAuthSession().catch(() => null),
      getBotInfo().catch(() => null),
    ])
      .then(([sessionData, botData]) => {
        if (sessionData?.user) {
          setUser({
            ...sessionData.user,
            guilds: sessionData.guilds || [],
            isSuperuser: sessionData.isSuperuser || false,
          });
        }
        if (botData) {
          setBotInfo(botData);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-950 text-white">
        <div className="w-12 h-12 border-4 border-slate-800 border-t-brand-violet rounded-full animate-spin" />
        <p className="mt-4 text-sm text-brand-cyan font-mono tracking-widest uppercase">
          INITIALIZING SYSTEM
        </p>
      </div>
    );
  }

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppRoutes
        user={user}
        botInfo={botInfo}
        showToast={showToast}
        onUserUpdate={handleUserUpdate}
      />
    </BrowserRouter>
  );
}

/**
 * App — root application bootstrap.
 * ToastProvider wraps everything so any component can call useToast().
 */
export default function App() {
  return (
    <ToastProvider>
      <AppInner />
    </ToastProvider>
  );
}
