import React, { useState, useMemo } from "react";
import { MessageSquare } from "lucide-react";
import AutoresponderRule from "./AutoresponderRule";
import { Tabs, SearchInput, EmptyState, Button } from "../ui";

export default function AutoresponderList({
  rules,
  loading,
  editingRuleId,
  onEdit,
  onToggle,
  onDelete,
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const filteredRules = useMemo(() => {
    return rules.filter((r) => {
      if (filter === "enabled" && !r.enabled) return false;
      if (filter === "disabled" && r.enabled) return false;
      if (!search.trim()) return true;
      const term = search.toLowerCase();
      const triggerText = (r.trigger || r.trigger_phrase || "").toLowerCase();
      const replyText = (r.reply || r.reply_content || r.embedTitle || r.embed_title || "").toLowerCase();
      return triggerText.includes(term) || replyText.includes(term);
    });
  }, [rules, search, filter]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass-panel h-28 rounded-2xl animate-pulse border border-white/5" />
        ))}
      </div>
    );
  }

  if (rules.length === 0) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="No autoresponders yet"
        description="Create a trigger rule above to automatically respond when members send matching messages in chat."
      />
    );
  }

  const enabledCount = rules.filter((r) => r.enabled).length;
  const disabledCount = rules.length - enabledCount;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-base font-bold text-white uppercase tracking-wider font-display">
          Configured Rules ({rules.length})
        </h2>

        <div className="flex flex-wrap items-center gap-2.5">
          <Tabs
            size="sm"
            activeTab={filter}
            onChange={setFilter}
            tabs={[
              { id: "all", label: "All", count: rules.length },
              { id: "enabled", label: "Enabled", count: enabledCount },
              { id: "disabled", label: "Disabled", count: disabledCount },
            ]}
          />

          <div className="w-full sm:w-52">
            <SearchInput
              size="sm"
              placeholder="Search triggers..."
              value={search}
              onChange={setSearch}
              onClear={() => setSearch("")}
            />
          </div>
        </div>
      </div>

      <div className="space-y-2.5">
        {filteredRules.length === 0 ? (
          <EmptyState
            compact
            title="No rules match your filters"
            description={search ? `No autoresponders matched "${search}".` : "No rules in this status."}
            action={
              (search || filter !== "all") && (
                <Button
                  variant="secondary"
                  size="xs"
                  onClick={() => {
                    setSearch("");
                    setFilter("all");
                  }}
                >
                  Reset Filters
                </Button>
              )
            }
          />
        ) : (
          filteredRules.map((rule) => (
            <AutoresponderRule
              key={rule.id}
              rule={rule}
              isEditing={Boolean(
                editingRuleId && (rule.id === editingRuleId || rule.responder_id === editingRuleId)
              )}
              onEdit={onEdit}
              onToggle={onToggle}
              onDelete={onDelete}
            />
          ))
        )}
      </div>
    </div>
  );
}
