import React, { useState } from "react";
import Badge from "../ui/Badge";
import ConfirmDialog from "../ui/ConfirmDialog";
import { Hash, Trash2, Image as ImageIcon, Film } from "lucide-react";

export default function MediaRuleItem({ rule, channels, roles, onDelete, isDeleting }) {
  const [showConfirm, setShowConfirm] = useState(false);

  const channel = channels.find(c => c.id === rule.channel_id);
  const bypassRole = roles.find(r => r.id === rule.whitelist_role_id);
  const channelName = channel ? channel.name : "Unknown Channel";

  return (
    <>
      <div className="glass-panel p-5 rounded-2xl border border-white/5 flex flex-col sm:flex-row gap-6">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Hash className="w-5 h-5 text-indigo-400" />
                <h3 className="text-lg font-bold text-white">{channelName}</h3>
                <Badge variant="brand" className="ml-2">Active</Badge>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1.5">
                {rule.image_only ? (
                  <><ImageIcon className="w-3.5 h-3.5" /> Images Only</>
                ) : (
                  <><Film className="w-3.5 h-3.5" /> All Media</>
                )}
              </p>
            </div>
            
            <div className="sm:hidden">
              <button
                onClick={() => setShowConfirm(true)}
                disabled={isDeleting}
                className="p-2 rounded-xl text-rose-400/70 hover:text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-white/5">
            <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Bypass</div>
              <div className="text-xs font-semibold text-slate-300">
                {bypassRole ? `@${bypassRole.name}` : "None"}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Auto-Mute</div>
              <div className="text-xs font-semibold text-slate-300">
                {rule.auto_mute ? "3 strikes → 60s" : "Disabled"}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">NSFW Channels</div>
              <div className="text-xs font-semibold text-slate-300">
                {rule.nsfw_bypass ? "Bypassed" : "Enforced"}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Notice</div>
              <div className="text-xs font-semibold text-slate-300">
                {rule.post_sticky_notice ? "Active" : "Disabled"}
              </div>
            </div>
          </div>
        </div>

        <div className="hidden sm:flex shrink-0 items-center border-l border-white/5 pl-6">
          <button
            onClick={() => setShowConfirm(true)}
            disabled={isDeleting}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-rose-400/70 hover:text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            {isDeleting ? "Removing..." : "Remove"}
          </button>
        </div>
      </div>

      <ConfirmDialog 
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={() => {
          setShowConfirm(false);
          onDelete(rule.channel_id);
        }}
        title="Remove media rule?"
        description={`Media restrictions will stop applying to #${channelName}. Messages will no longer be automatically removed.`}
        confirmText="Remove Rule"
        isDestructive={true}
        isPending={isDeleting}
      />
    </>
  );
}
