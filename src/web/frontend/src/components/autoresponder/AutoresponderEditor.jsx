import React, { useState, useEffect } from "react";
import { EmojiSelector, DiscordPreview } from "../discord";

import { validateAutoresponder } from "../../utils/autoresponder";

const INITIAL_RULE = {
  trigger: "",
  reply: "",
  matchMode: "contains",
  isEmbed: false,
  embedTitle: "",
  imageUrl: "",
  cooldown: 0,
  deleteTrigger: false,
  ignoreBots: true,
  reactions: [],
};

const VARIABLES = ["{user}", "{username}", "{server}", "{channel}", "{memberCount}"];

export default function AutoresponderEditor({ editRule, onSave, onCancel, guildId, botInfo, user }) {
  const [form, setForm] = useState(INITIAL_RULE);
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (editRule) {
      setForm({
        ...INITIAL_RULE,
        ...editRule,
        id: editRule.id || editRule.responder_id,
        responder_id: editRule.responder_id || editRule.id,
        trigger: editRule.trigger ?? editRule.trigger_phrase ?? "",
        reply: editRule.reply ?? editRule.reply_content ?? "",
        matchMode: editRule.matchMode ?? editRule.match_mode ?? editRule.match_type ?? "contains",
        isEmbed: Boolean(editRule.isEmbed ?? editRule.is_embed),
        embedTitle: editRule.embedTitle ?? editRule.embed_title ?? "",
        imageUrl: editRule.imageUrl ?? editRule.image_url ?? "",
        cooldown: Number(editRule.cooldown || 0),
        deleteTrigger: Boolean(editRule.deleteTrigger ?? editRule.delete_trigger),
        ignoreBots: editRule.ignoreBots !== undefined ? Boolean(editRule.ignoreBots) : (editRule.ignore_bots !== undefined ? Boolean(editRule.ignore_bots) : true),
        reactions: Array.isArray(editRule.reactions)
          ? editRule.reactions
          : Array.isArray(editRule.emoji_reactions)
          ? editRule.emoji_reactions
          : [],
      });
    } else {
      setForm(INITIAL_RULE);
    }
    setErrors({});
  }, [editRule]);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };

  const handleSave = async () => {
    const validation = validateAutoresponder(form);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }
    setIsSaving(true);
    const success = await onSave(form);
    if (success && !editRule) {
      setForm(INITIAL_RULE);
    }
    setIsSaving(false);
  };

  const insertVariable = (variable) => {
    const updatedReply = form.reply + variable;
    handleChange("reply", updatedReply);
  };

  return (
    <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-white/10 space-y-5 mb-6 shadow-lg shadow-black/20">
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <h2 className="text-base font-bold text-white">
          {editRule ? "Edit Autoresponder" : "Create Autoresponder"}
        </h2>
        {editRule && (
          <button onClick={onCancel} className="text-xs font-semibold text-slate-400 hover:text-white transition-colors">
            Cancel Edit
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 space-y-5">
          {/* 1. TRIGGER SECTION */}
          <section className="space-y-2.5">
            <h3 className="text-xs font-mono text-slate-400 uppercase tracking-widest font-bold">1. Trigger</h3>
            <div className="space-y-2">
              <div>
                <input
                  type="text"
                  placeholder="Keyword, phrase, or pattern..."
                  value={form.trigger}
                  onChange={(e) => handleChange("trigger", e.target.value)}
                  className={`w-full px-3.5 py-2 rounded-lg bg-slate-900 border text-xs text-white placeholder-slate-500 focus:outline-none transition-colors ${
                    errors.trigger ? "border-brand-crimson focus:border-brand-crimson" : "border-white/10 focus:border-indigo-500"
                  }`}
                />
                {errors.trigger && <p className="text-brand-crimson text-xs mt-1">{errors.trigger}</p>}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-slate-500 mr-1">Match when:</span>
                {["contains", "exact", "startsWith", "endsWith", "regex"].map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => handleChange("matchMode", mode)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors border ${
                      String(form.matchMode || "contains").toLowerCase() === mode.toLowerCase()
                        ? "bg-indigo-500 text-white border-indigo-500 shadow-md shadow-indigo-500/20"
                        : "bg-slate-900 text-slate-400 border-white/5 hover:bg-slate-800"
                    }`}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* 2. RESPONSE SECTION */}
          <section className="space-y-2.5">
            <h3 className="text-xs font-mono text-slate-400 uppercase tracking-widest font-bold">2. Response</h3>
            
            <div className="flex bg-slate-900 p-0.5 rounded-lg border border-white/5 w-fit">
              <button
                type="button"
                onClick={() => handleChange("isEmbed", false)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                  !form.isEmbed ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300"
                }`}
              >
                Plain Message
              </button>
              <button
                type="button"
                onClick={() => handleChange("isEmbed", true)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                  form.isEmbed ? "bg-indigo-500/20 text-indigo-300" : "text-slate-500 hover:text-slate-300"
                }`}
              >
                Rich Embed
              </button>
            </div>

            <div className="space-y-2.5 bg-slate-900/50 p-3 rounded-xl border border-white/5">
              {form.isEmbed && (
                <input
                  type="text"
                  placeholder="Embed Title (optional)"
                  value={form.embedTitle}
                  onChange={(e) => handleChange("embedTitle", e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg bg-slate-900 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              )}
              
              <div>
                <textarea
                  placeholder={form.isEmbed ? "Embed description..." : "Write the automated response..."}
                  value={form.reply}
                  onChange={(e) => handleChange("reply", e.target.value)}
                  className={`w-full h-20 px-3.5 py-2.5 rounded-lg bg-slate-900 border text-xs text-white placeholder-slate-500 focus:outline-none transition-colors resize-none ${
                    errors.reply ? "border-brand-crimson focus:border-brand-crimson" : "border-white/10 focus:border-indigo-500"
                  }`}
                />
                {errors.reply && <p className="text-brand-crimson text-xs mt-1">{errors.reply}</p>}
              </div>

              {form.isEmbed && (
                <div>
                  <input
                    type="text"
                    placeholder="Image URL (optional)"
                    value={form.imageUrl}
                    onChange={(e) => handleChange("imageUrl", e.target.value)}
                    className={`w-full px-3.5 py-2 rounded-lg bg-slate-900 border text-xs text-white placeholder-slate-500 focus:outline-none transition-colors ${
                      errors.imageUrl ? "border-brand-crimson focus:border-brand-crimson" : "border-white/10 focus:border-indigo-500"
                    }`}
                  />
                  {errors.imageUrl && <p className="text-brand-crimson text-xs mt-1">{errors.imageUrl}</p>}
                </div>
              )}

              {/* Variables */}
              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-white/5 mt-1">
                <span className="text-[10px] uppercase tracking-widest text-slate-500 mr-1">Insert:</span>
                {VARIABLES.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => insertVariable(v)}
                    className="px-1.5 py-0.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded text-[11px] font-mono transition-colors border border-white/5"
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* 3. REACTIONS */}
          <section className="space-y-2.5">
            <h3 className="text-xs font-mono text-slate-400 uppercase tracking-widest font-bold">3. Reactions</h3>
            <div className="bg-slate-900/50 p-3 rounded-xl border border-white/5">
              <EmojiSelector 
                guildId={guildId} 
                value={form.reactions} 
                onChange={(v) => handleChange("reactions", v)} 
                multiple={true} 
                max={5} 
              />
            </div>
          </section>

          {/* 4. BEHAVIOR */}
          <section className="space-y-2.5">
            <h3 className="text-xs font-mono text-slate-400 uppercase tracking-widest font-bold">4. Behavior</h3>
            <div className="bg-slate-900/50 p-3 rounded-xl border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-200">Cooldown</div>
                  <div className="text-[11px] text-slate-500">Wait before triggering again</div>
                </div>
                <select
                  value={form.cooldown}
                  onChange={(e) => handleChange("cooldown", Number(e.target.value))}
                  className="bg-slate-900 border border-white/10 text-white text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-indigo-500"
                >
                  <option value={0}>No cooldown</option>
                  <option value={5}>5 seconds</option>
                  <option value={10}>10 seconds</option>
                  <option value={30}>30 seconds</option>
                  <option value={60}>1 minute</option>
                </select>
              </div>

              <label className="flex items-center justify-between cursor-pointer group">
                <div>
                  <div className="text-xs font-semibold text-slate-200 group-hover:text-white transition-colors">Delete Trigger</div>
                  <div className="text-[11px] text-slate-500">Delete the user's message</div>
                </div>
                <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${form.deleteTrigger ? 'bg-brand-crimson' : 'bg-slate-700'}`}>
                  <input type="checkbox" className="sr-only" checked={form.deleteTrigger} onChange={(e) => handleChange("deleteTrigger", e.target.checked)} />
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${form.deleteTrigger ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                </div>
              </label>

              <label className="flex items-center justify-between cursor-pointer group">
                <div>
                  <div className="text-xs font-semibold text-slate-200 group-hover:text-white transition-colors">Ignore Bots</div>
                  <div className="text-[11px] text-slate-500">Don't trigger on other bot messages</div>
                </div>
                <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${form.ignoreBots ? 'bg-indigo-500' : 'bg-slate-700'}`}>
                  <input type="checkbox" className="sr-only" checked={form.ignoreBots} onChange={(e) => handleChange("ignoreBots", e.target.checked)} />
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${form.ignoreBots ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                </div>
              </label>
            </div>
          </section>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50"
          >
            {isSaving ? "Saving..." : editRule ? "Save Changes" : "Create Autoresponder"}
          </button>
        </div>

        {/* PREVIEW COLUMN */}
        <div className="lg:col-span-5 relative">
          <div className="sticky top-20">
            <DiscordPreview
              botInfo={botInfo}
              user={user}
              trigger={form.trigger || "trigger"}
              isEmbed={form.isEmbed}
              embedTitle={form.embedTitle}
              reply={form.reply}
              imageUrl={form.imageUrl}
              reactions={form.reactions}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
