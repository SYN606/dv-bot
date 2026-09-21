import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import DashboardLayout from "../components/layout/DashboardLayout";
import {
  getAutoresponders,
  saveAutoresponder,
  deleteAutoresponder,
} from "../api/client";
import { Bot, Plus, Trash2, MessageCircle } from "lucide-react";

export default function AutoresponderPage({ user, botInfo, showToast }) {
  const { guildId } = useParams();
  const [rules, setRules] = useState([]);
  const [trigger, setTrigger] = useState("");
  const [reply, setReply] = useState("");
  const [matchMode, setMatchMode] = useState("contains");
  const [reaction, setReaction] = useState("");
  const [saving, setSaving] = useState(false);

  const loadRules = () => {
    getAutoresponders(guildId)
      .then((res) => setRules(res.rules || []))
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    loadRules();
  }, [guildId]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!trigger.trim() || !reply.trim()) return;
    setSaving(true);
    try {
      await saveAutoresponder(guildId, {
        trigger: trigger.trim(),
        reply: reply.trim(),
        matchMode,
        reaction: reaction.trim() || null,
      });
      showToast("Autoresponder rule created successfully!");
      setTrigger("");
      setReply("");
      setReaction("");
      loadRules();
    } catch (err) {
      showToast(err.message || "Failed to create rule.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (ruleId) => {
    try {
      await deleteAutoresponder(guildId, ruleId);
      showToast("Autoresponder rule deleted.");
      loadRules();
    } catch (err) {
      showToast(err.message || "Failed to delete rule.", "error");
    }
  };

  return (
    <DashboardLayout
      user={user}
      botInfo={botInfo}
      breadcrumbs={["Autoresponder"]}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Bot className="w-6 h-6 text-rose-400" />
            <span>Autoresponder</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Trigger automated bot replies and emoji reactions when matching chat messages are sent.
          </p>
        </div>

        {/* Add Rule Form */}
        <div className="glass-card p-6 rounded-3xl border border-white/5 space-y-4">
          <h3 className="font-bold text-sm text-white">Create New Autoresponder Rule</h3>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Trigger Keyword / Phrase
                </label>
                <input
                  type="text"
                  placeholder="e.g. !help, rules, ip address"
                  value={trigger}
                  onChange={(e) => setTrigger(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Match Type
                </label>
                <select
                  value={matchMode}
                  onChange={(e) => setMatchMode(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="contains">Message Contains</option>
                  <option value="exact">Exact Match</option>
                  <option value="startswith">Starts With</option>
                  <option value="regex">Regular Expression</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Add Emoji Reaction (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 👍 or :wave:"
                  value={reaction}
                  onChange={(e) => setReaction(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Automated Bot Response
              </label>
              <textarea
                rows={3}
                placeholder="The message content the bot will send when triggered..."
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                className="w-full p-4 rounded-xl bg-slate-900/80 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={saving || !trigger.trim() || !reply.trim()}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>{saving ? "Creating..." : "Add Autoresponder Rule"}</span>
            </button>
          </form>
        </div>

        {/* Rules List */}
        <div className="glass-card p-6 rounded-3xl border border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-white">Active Rules</h3>
            <span className="text-xs text-slate-400 font-mono">
              {rules.length} Configured
            </span>
          </div>

          {rules.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              No autoresponder rules configured yet.
            </div>
          ) : (
            <div className="space-y-3">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 flex items-start justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-300 text-[10px] font-mono uppercase">
                        {rule.match_mode || "contains"}
                      </span>
                      <span className="font-bold text-xs text-white truncate">
                        "{rule.trigger}"
                      </span>
                      {rule.reaction && (
                        <span className="text-xs">{rule.reaction}</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 whitespace-pre-wrap">
                      {rule.reply}
                    </p>
                  </div>

                  <button
                    onClick={() => handleDelete(rule.id)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition-colors shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
