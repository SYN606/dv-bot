import React, { useState } from "react";
import { useParams, useOutletContext } from "react-router-dom";
import { useAutoresponders } from "../../hooks/autoresponder";

// Components
import { AutoresponderHeader, AutoresponderEditor, AutoresponderList } from "../../components/autoresponder";



export default function AutoresponderPage({ showToast }) {
  const { user, botInfo } = useOutletContext() || {};
  const { guildId } = useParams();
  
  const { rules, loading, error, refresh, saveRule, toggleRule, deleteRule } = useAutoresponders(guildId, showToast);
  const [editingRule, setEditingRule] = useState(null);

  const activeCount = rules.filter(r => r.enabled).length;

  const handleSave = async (ruleData) => {
    const success = await saveRule(ruleData);
    if (success) setEditingRule(null);
    return success;
  };

  const handleEdit = (rule) => {
    setEditingRule(rule);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditingRule(null);
  };

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[50vh] animate-in fade-in zoom-in-[0.98] duration-500">
        <div className="glass-panel p-8 rounded-3xl max-w-md w-full border border-white/5 text-center space-y-4">
          <h2 className="text-xl font-bold text-white tracking-tight">Unable to load Autoresponders</h2>
          <p className="text-sm text-slate-400">Failed to connect to the backend.</p>
          <button onClick={refresh} className="mt-4 px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-semibold transition-colors">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto animate-in fade-in duration-500">
      <AutoresponderHeader 
        activeCount={activeCount} 
        totalCount={rules.length} 
        loading={loading} 
        onRefresh={refresh} 
      />

      <AutoresponderEditor 
        editRule={editingRule} 
        onSave={handleSave} 
        onCancel={handleCancelEdit} 
        guildId={guildId} 
        botInfo={botInfo} 
        user={user} 
      />

      <AutoresponderList 
        rules={rules} 
        loading={loading} 
        onEdit={handleEdit} 
        onToggle={toggleRule} 
        onDelete={deleteRule} 
      />
    </div>
  );
}
