import React, { useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import Footer from "./Footer";
import Toast from "../ui/Toast";
import { Menu } from "lucide-react";

/**
 * Base layout component.
 * Provides a stationary, non-moving sidebar with an independently scrollable main content viewport.
 * Guarantees that the sidebar stays pinned in place when scrolling across any device.
 */
export default function Base({
  user,
  botInfo,
  currentGuild,
  breadcrumbs = [],
  toast,
  children,
  hideSidebar = false,
  hideNavbar = false,
  hideFooter = false,
  customSidebar = null,
  customNavbar = null,
  maxWidth = "max-w-6xl",
  className = "",
}) {
  const { guildId } = useParams();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Determine active guild from props or current URL params
  const activeGuild = currentGuild || user?.guilds?.find((g) => g.id === guildId);

  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  // If a guildId was requested in URL but user has no access to it
  if (guildId && !activeGuild) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="glass-panel p-8 rounded-3xl max-w-md w-full border border-white/10 shadow-2xl">
          <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-xs text-slate-400 mb-6">
            You do not have Administrator access to manage this server or the bot is not present.
          </p>
          <a
            href="/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-lg shadow-indigo-600/20"
          >
            Back to Server List
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex bg-slate-950 text-slate-100 selection:bg-indigo-500/30 selection:text-indigo-200 antialiased overflow-hidden relative">
      {/* Ambient background glows (controlled via theme.css variables) */}
      <div className="fixed top-[-100px] left-[-100px] w-[500px] h-[500px] rounded-full glow-orb-primary blur-[140px] pointer-events-none -z-10" />
      <div className="fixed bottom-[-100px] right-[-100px] w-[550px] h-[550px] rounded-full glow-orb-secondary blur-[150px] pointer-events-none -z-10" />
      <div className="fixed top-[40%] left-[50%] -translate-x-1/2 w-[400px] h-[400px] rounded-full glow-orb-tertiary blur-[130px] pointer-events-none -z-10" />

      {/* Stationary Sidebar (never moves on scroll) */}
      {!hideSidebar && (
        customSidebar || (activeGuild && (
          <Sidebar
            currentGuild={activeGuild}
            botInfo={botInfo}
            user={user}
            mobileOpen={mobileOpen}
            setMobileOpen={setMobileOpen}
          />
        ))
      )}

      {/* Main Content Viewport: independently scrollable */}
      <div className="flex-1 flex flex-col h-screen min-w-0 overflow-hidden relative">
        {/* Mobile Header Bar */}
        {!hideSidebar && (
          <div className="md:hidden flex items-center justify-between p-4 glass-panel border-b border-white/10 sticky top-0 z-40 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full overflow-hidden ring-1 ring-indigo-500/40">
                <img
                  src={botInfo?.avatar || "https://cdn.discordapp.com/embed/avatars/0.png"}
                  alt=""
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
              <span className="font-extrabold text-sm text-white tracking-tight">
                {botInfo?.username || "Digital Vigital"}
              </span>
            </div>
            <button
              onClick={() => setMobileOpen(true)}
              className="p-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:text-white"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Top Navbar */}
        {!hideNavbar && (
          <div className="shrink-0 sticky top-0 z-30">
            {customNavbar || (
              <Navbar
                user={user}
                botInfo={botInfo}
                currentGuild={activeGuild}
                breadcrumbs={breadcrumbs}
              />
            )}
          </div>
        )}

        {/* Independently Scrollable Page Content */}
        <div className="flex-1 overflow-y-auto min-h-0 flex flex-col focus:outline-none">
          <main className={`p-4 sm:p-8 ${maxWidth} w-full mx-auto flex-1 ${className}`}>
            {children}
          </main>

          {/* Branded Footer */}
          {!hideFooter && <Footer className="shrink-0" botInfo={botInfo} />}
        </div>
      </div>

      {/* Floating Toast Notification */}
      {toast && <Toast {...toast} />}
    </div>
  );
}
