import React, { useState, useMemo } from "react";
import StickyNoticeItem from "./StickyNoticeItem";
import { EmptyState, SearchInput, Button } from "../ui";
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
            onClear={() => setSearch("")}
            placeholder="Search notices..." 
          />
        </div>
      </div>

      {filteredNotices.length === 0 ? (
        <EmptyState 
          title="No matching notices"
          description={`No active sticky notices match "${search}".`}
          action={
            <Button 
              variant="secondary"
              size="sm"
              onClick={() => setSearch("")}
            >
              Clear Search
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredNotices.map((notice) => {
            const channel = channels.find(c => c.id === notice.channel_id);
            return (
              <StickyNoticeItem 
                key={notice.channel_id}
                notice={notice}
                channel={channel}
                onEdit={() => onEdit(notice)}
                onDelete={() => onDelete(notice.channel_id)}
                isDeleting={deletingChannelId === notice.channel_id}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
