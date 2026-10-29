import React, { useState } from "react";
import { useParams, useOutletContext } from "react-router-dom";
import { useAutoresponders } from "../../hooks/autoresponder";
import { useModuleStatus } from "../../hooks/useModuleStatus";
import { PageError } from "../../components/ui";

// Components
import { AutoresponderHeader, AutoresponderEditor, AutoresponderList } from "../../components/autoresponder";

export default function AutoresponderPage({ showToast }) {
  const { user, botInfo } = useOutletContext() || {};
  const { guildId } = useParams();
  
  const { rules, loading, error, refresh, saveRule, toggleRule, deleteRule } = useAutoresponders(guildId, showToast);
  const { enabled: moduleEnabled, toggle: toggleModule } = useModuleStatus(guildId, "autoresponder", showToast);
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
    return <PageError title="Unable to load Autoresponders" onRetry={refresh} />;
  }

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-300 pb-16">
      <AutoresponderHeader 
        activeCount={activeCount} 
        totalCount={rules.length} 
        loading={loading} 
        onRefresh={refresh} 
        enabled={moduleEnabled}
        onToggle={toggleModule}
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
        editingRuleId={editingRule?.id || editingRule?.responder_id} 
        onEdit={handleEdit} 
        onToggle={toggleRule} 
        onDelete={deleteRule} 
      />
    </div>
  );
}
