import React, { useState, useRef, useEffect } from "react";
import { UserPlus, Send, Save, RotateCcw, ChevronDown, Check, Sparkles } from "lucide-react";

export default function WelcomeHeader({
  hasChanges,
  saving,
  testing,
  activeTab = "channel",
  onSave,
  onReset,
  onSendTest,
  onOpenTestModal,
}: {
  hasChanges?: boolean;
  saving?: boolean;
  testing?: boolean;
  activeTab?: string;
  onSave?: () => void;
  onReset?: () => void;
  onSendTest?: (type: string) => void;
  onOpenTestModal?: (type?: "channel" | "leave" | "dm") => void;
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const currentTabType: "channel" | "leave" | "dm" =
    activeTab === "leave" ? "leave" : activeTab === "dm" ? "dm" : "channel";
  const currentTabLabel =
    activeTab === "leave" ? "Goodbye" : activeTab === "dm" ? "DM" : "Welcome";

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleTestClick = (type: string) => {
    setDropdownOpen(false);
    onSendTest?.(type);
  };

  const handleOpenModal = (type?: "channel" | "leave" | "dm") => {
    setDropdownOpen(false);
    if (onOpenTestModal) {
      onOpenTestModal(type || currentTabType);
    } else {
      onSendTest?.(type || currentTabType);
    }
  };

  const handleMainTestClick = () => {
    setDropdownOpen(false);
    onSendTest?.(currentTabType);
  };

  return (
    <div className="relative overflow-hidden rounded-3xl p-6 lg:p-8 bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-indigo-950/30 border border-white/[0.08] backdrop-blur-xl shadow-2xl mb-8">
      {/* Background Cyber Glow */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 -mb-20 w-64 h-64 rounded-full bg-rose-500/5 blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-3">
            <UserPlus className="w-3.5 h-3.5" />
            <span>Community Onboarding Engine</span>
            <span className="text-[10px] text-indigo-300/80 font-normal ml-1">
              • स्वागत एवं विदाई इंजन
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            Welcome & Leave Gatekeeper
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-normal">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Live Gateway
            </span>
          </h1>

          <p className="text-slate-400 text-sm mt-2 max-w-2xl leading-relaxed">
            Automate member greetings with customizable rich embeds, direct message onboarding tutorials,
            farewell logs, and instantaneous role assignment on join.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3 self-start md:self-center">
          {/* Test Dispatcher Dropdown */}
          <div className="relative inline-flex items-center rounded-xl bg-slate-800/90 border border-white/10 hover:border-white/20 shadow-md" ref={dropdownRef}>
            <button
              type="button"
              disabled={testing}
              onClick={handleMainTestClick}
              className="inline-flex items-center gap-2 pl-4 pr-2.5 py-2.5 hover:bg-white/5 text-slate-200 text-xs font-semibold rounded-l-xl transition-all disabled:opacity-50"
              title={`Dispatch test ${currentTabLabel} message to Discord`}
            >
              <Send className={`w-3.5 h-3.5 text-indigo-400 ${testing ? "animate-spin" : ""}`} />
              <span>{testing ? "Dispatching..." : `Send Test (${currentTabLabel})`}</span>
            </button>
            <button
              type="button"
              disabled={testing}
              onClick={() => setDropdownOpen((prev) => !prev)}
              aria-label="Test options"
              className="p-2.5 hover:bg-white/5 text-slate-400 hover:text-white rounded-r-xl border-l border-white/10 transition-all disabled:opacity-50"
            >
              <ChevronDown className="w-3 h-3" />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-slate-900/95 border border-white/10 shadow-2xl backdrop-blur-xl p-1.5 z-50 animate-in fade-in zoom-in-95">
                <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Select Dispatch Target
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenModal(currentTabType)}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-indigo-300 hover:text-white hover:bg-indigo-600/25 transition-all flex items-center justify-between group"
                >
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Configure Sandbox Test...</span>
                  </span>
                  <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded font-mono">Modal</span>
                </button>
                <div className="my-1 border-t border-white/5" />
                <button
                  type="button"
                  onClick={() => handleTestClick("channel")}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs text-slate-200 hover:text-white hover:bg-white/5 transition-all flex items-center justify-between group"
                >
                  <span>Quick Test Welcome Channel</span>
                  <Send className="w-3 h-3 text-indigo-400 opacity-60 group-hover:opacity-100" />
                </button>
                <button
                  type="button"
                  onClick={() => handleTestClick("leave")}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs text-slate-200 hover:text-white hover:bg-white/5 transition-all flex items-center justify-between group"
                >
                  <span>Quick Test Goodbye Channel</span>
                  <Send className="w-3 h-3 text-rose-400 opacity-60 group-hover:opacity-100" />
                </button>
                <button
                  type="button"
                  onClick={() => handleTestClick("dm")}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs text-slate-200 hover:text-white hover:bg-white/5 transition-all flex items-center justify-between group"
                >
                  <span>Quick Test Member DM (To You)</span>
                  <Send className="w-3 h-3 text-emerald-400 opacity-60 group-hover:opacity-100" />
                </button>
              </div>
            )}
          </div>

          {/* Reset Changes Button */}
          {hasChanges && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white text-xs font-semibold border border-white/10 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>Reset</span>
            </button>
          )}

          {/* Save Button */}
          <button
            type="button"
            disabled={!hasChanges || saving}
            onClick={onSave}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs transition-all shadow-lg ${
              hasChanges
                ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30 hover:scale-[1.02]"
                : "bg-slate-800/60 text-slate-500 border border-white/5 cursor-not-allowed"
            }`}
          >
            <Save className={`w-3.5 h-3.5 ${saving ? "animate-spin" : ""}`} />
            <span>{saving ? "Saving..." : "Save Changes"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
