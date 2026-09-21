import React, { useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import Footer from "./Footer";
import Toast from "../ui/Toast";
import { Menu } from "lucide-react";

export default function DashboardLayout({ user, botInfo, toast, breadcrumbs = [], children }) {
  const { guildId } = useParams();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Check if user has access to this guild
  const currentGuild = user?.guilds?.find((g) => g.id === guildId);

  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  if (!currentGuild) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
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
    <div className="min-h-screen flex flex-col md:flex-row flex-1 bg-slate-950 text-slate-100 selection:bg-indigo-500/30 selection:text-indigo-200 antialiased relative overflow-x-hidden">
      {/* Ambient background glows */}
      <div className="fixed top-[-100px] left-[-100px] w-[500px] h-[500px] rounded-full bg-indigo-600/15 blur-[140px] pointer-events-none -z-10" />
      <div className="fixed bottom-[-100px] right-[-100px] w-[550px] h-[550px] rounded-full bg-purple-600/15 blur-[150px] pointer-events-none -z-10" />
      <div className="fixed top-[40%] left-[50%] -translate-x-1/2 w-[400px] h-[400px] rounded-full bg-cyan-600/10 blur-[130px] pointer-events-none -z-10" />

      {/* Sidebar */}
      <Sidebar
        currentGuild={currentGuild}
        botInfo={botInfo}
        user={user}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Mobile Header Bar */}
        <div className="md:hidden flex items-center justify-between p-4 glass-panel border-b border-white/10 sticky top-0 z-40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg overflow-hidden ring-1 ring-indigo-500/40">
              <img
                src={botInfo?.avatar || "https://cdn.discordapp.com/embed/avatars/0.png"}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
            <span className="font-extrabold text-sm text-white tracking-tight">
              {botInfo?.username || "Digital Vigital"}
            </span>
          </div>
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:text-white"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Top Navbar */}
        <Navbar
          user={user}
          botInfo={botInfo}
          currentGuild={currentGuild}
          breadcrumbs={breadcrumbs}
        />

        {/* Page Content */}
        <main className="p-4 sm:p-8 max-w-6xl w-full mx-auto flex-1">
          {children}
        </main>

        {/* Branded Footer */}
        <Footer />
      </div>

      {/* Toast */}
      {toast && <Toast {...toast} />}
    </div>
  );
}
