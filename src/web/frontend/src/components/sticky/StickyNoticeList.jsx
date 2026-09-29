import React, { useState, useMemo } from "react";
import StickyNoticeItem from "./StickyNoticeItem";
import EmptyState from "../ui/EmptyState";
import SearchInput from "../ui/SearchInput";
import { Pin } from "lucide-react";

export default function StickyNoticeList({ notices, channels, onEdit, onDelete, deletingChannelId }) {
  const [search, setSearch] = useState("");

  const filteredNotices = useMemo(() => {
    if (!search) return notices;
    const lowerSearch = search.toLowerCase();
    
    return notices.filter(n => {
      const channel = channels.find(c => c.id === n.channel_id);
      const cName = channel ? channel.name.toLowerCase() : "";
      const contentMatch = n.content?.toLowerCase().includes(lowerSearch);
      
      return cName.includes(lowerSearch) || contentMatch;
    });
  }, [notices, channels, search]);

  if (notices.length === 0) {
    return (
      <EmptyState 
        icon={Pin}
        title="No sticky notices yet"
        description="Create a persistent announcement for a channel to keep important information visible."
      />
    );
  }

  return (
    <div className="mt-12">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Active Notices</h2>
          <p className="text-sm text-slate-400 mt-1">
            {notices.length} channels • {notices.reduce((a, n) => a + (n.repins || 0), 0).toLocaleString()} total repins
          </p>
        </div>
        <div className="w-full sm:w-64">
          <SearchInput 
            value={search} 
            onChange={setSearch} 
            placeholder="Search notices..." 
          />
        </div>
      </div>

      {filteredNotices.length === 0 ? (
        <EmptyState 
          title="No matching notices"
          description={`No active sticky notices match "${search}".`}
          action={
            <button 
              onClick={() => setSearch("")}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-semibold transition-colors"
            >
              Clear Search
            </button>
          }
        />
      ) : (
        <div className="space-y-4">
          {filteredNotices.map((notice) => {
            const channel = channels.find(c => c.id === notice.channel_id);
            return (
              <StickyNoticeItem 
                key={notice.channel_id}
                notice={notice}
                channelName={channel?.name}
                onEdit={onEdit}
                onDelete={onDelete}
                isDeleting={deletingChannelId === notice.channel_id}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
