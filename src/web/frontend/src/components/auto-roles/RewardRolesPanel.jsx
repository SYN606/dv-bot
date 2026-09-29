import React from "react";
import RewardRankRow from "./RewardRankRow";
import { MessageSquare, Mic } from "lucide-react";

export default function RewardRolesPanel({ type, roles, config, updateConfig }) {
  const isChat = type === "chat";
  const icon = isChat ? <MessageSquare className="w-5 h-5 text-indigo-400" /> : <Mic className="w-5 h-5 text-emerald-400" />;
  const title = isChat ? "Text Activity" : "Voice Activity";
  
  const prefix = isChat ? "top_chat_role" : "top_vc_role";
  const field1 = `${prefix}_1`;
  const field2 = `${prefix}_2`;
  const field3 = `${prefix}_3`;

  // Prevent accidentally selecting the same role across multiple ranks in the same category
  const selectedIds = [config[field1], config[field2], config[field3]].filter(Boolean);

  return (
    <div className="glass-panel p-6 rounded-3xl border border-white/5 flex flex-col h-full">
      <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
        {icon}
        <h2 className="text-sm font-mono text-white uppercase tracking-widest font-bold">{title}</h2>
      </div>

      <div className="space-y-6">
        {[1, 2, 3].map(rank => (
          <RewardRankRow 
            key={rank}
            rank={rank}
            roles={roles}
            value={config[`${prefix}_${rank}`]}
            onChange={(val) => updateConfig(`${prefix}_${rank}`, val)}
            excludeIds={selectedIds}
          />
        ))}
      </div>
    </div>
  );
}
