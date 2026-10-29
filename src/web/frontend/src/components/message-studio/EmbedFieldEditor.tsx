import React from "react";
import { Plus, Trash2, ArrowUp, ArrowDown, Copy, CheckSquare, Square } from "lucide-react";

export default function EmbedFieldEditor({ fields = [], onChangeFields }) {
  const handleAddField = () => {
    if (fields.length >= 25) return;
    onChangeFields([...fields, { name: "", value: "", inline: false }]);
  };

  const handleUpdateField = (index, updates) => {
    const next = [...fields];
    next[index] = { ...next[index], ...updates };
    onChangeFields(next);
  };

  const handleRemoveField = (index) => {
    const next = fields.filter((_, idx) => idx !== index);
    onChangeFields(next);
  };

  const handleDuplicateField = (index) => {
    if (fields.length >= 25) return;
    const target = fields[index];
    const next = [...fields];
    next.splice(index + 1, 0, { ...target });
    onChangeFields(next);
  };

  const handleMoveUp = (index) => {
    if (index === 0) return;
    const next = [...fields];
    const temp = next[index - 1];
    next[index - 1] = next[index];
    next[index] = temp;
    onChangeFields(next);
  };

  const handleMoveDown = (index) => {
    if (index === fields.length - 1) return;
    const next = [...fields];
    const temp = next[index + 1];
    next[index + 1] = next[index];
    next[index] = temp;
    onChangeFields(next);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">Embed Fields</span>
          <span className="text-xs text-slate-500 font-mono">({fields.length}/25)</span>
        </div>
        {fields.length < 25 && (
          <button
            type="button"
            onClick={handleAddField}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 text-xs font-semibold transition-colors border border-indigo-500/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Field</span>
          </button>
        )}
      </div>

      {fields.length === 0 ? (
        <div className="p-4 rounded-xl bg-slate-900/40 border border-dashed border-white/10 text-center">
          <p className="text-xs text-slate-500">No fields added to this embed yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {fields.map((field, index) => (
            <div
              key={index}
              className="p-3.5 rounded-xl bg-slate-900/70 border border-white/5 space-y-2.5 relative group"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-mono text-slate-400 font-semibold">
                  Field #{index + 1}
                </span>

                <div className="flex items-center gap-1">
                  {/* Inline Toggle */}
                  <button
                    type="button"
                    onClick={() => handleUpdateField(index, { inline: !field.inline })}
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                      field.inline
                        ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                        : "bg-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {field.inline ? (
                      <CheckSquare className="w-3 h-3 text-indigo-400" />
                    ) : (
                      <Square className="w-3 h-3" />
                    )}
                    <span>Inline</span>
                  </button>

                  {/* Reorder Buttons */}
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => handleMoveUp(index)}
                    title="Move up"
                    className="p-1 rounded text-slate-500 hover:text-white disabled:opacity-20 transition-colors"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={index === fields.length - 1}
                    onClick={() => handleMoveDown(index)}
                    title="Move down"
                    className="p-1 rounded text-slate-500 hover:text-white disabled:opacity-20 transition-colors"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDuplicateField(index)}
                    title="Duplicate field"
                    className="p-1 rounded text-slate-500 hover:text-indigo-400 transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveField(index)}
                    title="Delete field"
                    className="p-1 rounded text-slate-500 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Field Name */}
              <div>
                <input
                  type="text"
                  maxLength={256}
                  value={field.name || ""}
                  onChange={(e) => handleUpdateField(index, { name: e.target.value })}
                  placeholder="Field Name (e.g. Server Rules, Requirements)"
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950/80 border border-white/10 text-white text-xs placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                />
              </div>

              {/* Field Value */}
              <div>
                <textarea
                  maxLength={1024}
                  rows={2}
                  value={field.value || ""}
                  onChange={(e) => handleUpdateField(index, { value: e.target.value })}
                  placeholder="Field Value (Markdown supported)"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950/80 border border-white/10 text-white text-xs placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono resize-y"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
