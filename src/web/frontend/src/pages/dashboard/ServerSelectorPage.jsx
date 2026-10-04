import React from "react";
import Navbar from "../../components/navigation/Navbar";
import Footer from "../../components/navigation/Footer";
import { useServerSelector } from "../../hooks/server-selector";

import {
  ServerSelectorHeader,
  ServerFilters,
  ServerGrid,
  PrivateBotDialog
} from "../../components/server-selector";

export default function ServerSelectorPage({ user, botInfo, onUserUpdate, showToast }) {
  const {
    search,
    setSearch,
    filterMode,
    setFilterMode,
    refreshing,
    handleRefresh,
    filteredServers,
    manageableCount,
    totalCount,
    requestGuild,
    setRequestGuild
  } = useServerSelector(user, botInfo, onUserUpdate, showToast);

  return (
    <div className="min-h-screen bg-black text-neutral-200 flex flex-col antialiased relative overflow-x-hidden">
      <Navbar user={user} botInfo={botInfo} />

      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 flex-1 animate-in fade-in duration-500">
        <ServerSelectorHeader 
          search={search}
          setSearch={setSearch}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          user={user}
        />

        <ServerFilters 
          filterMode={filterMode}
          setFilterMode={setFilterMode}
          manageableCount={manageableCount}
          totalCount={totalCount}
        />

        <ServerGrid 
          servers={filteredServers}
          search={search}
          filterMode={filterMode}
          onRequestAccess={setRequestGuild}
          onRefresh={handleRefresh}
        />
      </main>

      <PrivateBotDialog 
        open={!!requestGuild}
        onClose={() => setRequestGuild(null)}
        guild={requestGuild}
      />

      <Footer />
    </div>
  );
}
