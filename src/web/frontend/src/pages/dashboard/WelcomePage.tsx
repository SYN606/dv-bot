import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { useWelcome } from "../../hooks/welcome/useWelcome";
import { useUnsavedChanges } from "../../hooks/useUnsavedChanges";
import { PageSkeleton, PageError } from "../../components/ui";
import {
  WelcomeHeader,
  WelcomeChannelEditor,
  WelcomeDmEditor,
  WelcomeLeaveEditor,
  WelcomeAutoRoleEditor,
  WelcomeSimulator,
} from "../../components/welcome";
import { MessageSquare, Mail, UserMinus, UserCheck } from "lucide-react";

export default function WelcomePage({ showToast }) {
  const { guildId } = useParams();
  const [activeTab, setActiveTab] = useState("channel"); // "channel" | "dm" | "leave" | "autorole"

  const {
    config,
    channels,
    roles,
    guildMeta,
    loading,
    saving,
    testing,
    error,
    hasChanges,
    updateConfig,
    save,
    discardChanges,
    sendTest,
    insertVariable,
    refresh,
  } = useWelcome(guildId, showToast);

  // Hook into floating unsaved changes prompt & route guard
  useUnsavedChanges({
    isDirty: hasChanges,
    onSave: save,
    onReset: discardChanges,
    pageTitle: "Welcome & Leave Engine",
  });

  if (loading) {
    return <PageSkeleton />;
  }

  if (error) {
    return (
      <PageError
        title="Failed to Load Welcome Engine"
        message="An error occurred while fetching the welcome and leave configuration."
        onRetry={refresh}
      />
    );
  }

  const tabs = [
    {
      id: "channel",
      label: "Welcome Channel",
      icon: MessageSquare,
      badge: config.welcome_enabled ? "Active" : null,
      badgeColor: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    },
    {
      id: "dm",
      label: "Member DM",
      icon: Mail,
      badge: config.dm_enabled ? "Active" : null,
      badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    },
    {
      id: "leave",
      label: "Goodbye / Leave",
      icon: UserMinus,
      badge: config.leave_enabled ? "Active" : null,
      badgeColor: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    },
    {
      id: "autorole",
      label: "Join Auto-Roles",
      icon: UserCheck,
      badge: config.autorole_enabled ? "Active" : null,
      badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    },
  ];

  return (
    <div className="min-h-full pb-16 space-y-6">
      {/* Page Header with Action Dispatcher */}
      <WelcomeHeader
        hasChanges={hasChanges}
        saving={saving}
        testing={testing}
        onSave={save}
        onReset={discardChanges}
        onSendTest={sendTest}
      />

      {/* Module Selector Navigation Tabs */}
      <div className="flex flex-wrap gap-2 p-1.5 rounded-2xl bg-slate-900/60 border border-white/[0.08] backdrop-blur-xl">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full border ${
                    isActive ? "bg-white/20 text-white border-white/30" : tab.badgeColor
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Active Module Form Editor */}
        <div className="lg:col-span-7 space-y-6">
          {activeTab === "channel" && (
            <WelcomeChannelEditor
              config={config}
              channels={channels}
              updateConfig={updateConfig}
              insertVariable={insertVariable}
            />
          )}

          {activeTab === "dm" && (
            <WelcomeDmEditor
              config={config}
              updateConfig={updateConfig}
              insertVariable={insertVariable}
            />
          )}

          {activeTab === "leave" && (
            <WelcomeLeaveEditor
              config={config}
              channels={channels}
              updateConfig={updateConfig}
              insertVariable={insertVariable}
            />
          )}

          {activeTab === "autorole" && (
            <WelcomeAutoRoleEditor
              config={config}
              roles={roles}
              updateConfig={updateConfig}
            />
          )}
        </div>

        {/* Right Column: Live Interactive Discord Simulator */}
        <div className="lg:col-span-5">
          <WelcomeSimulator config={config} guildMeta={guildMeta} />
        </div>
      </div>
    </div>
  );
}
