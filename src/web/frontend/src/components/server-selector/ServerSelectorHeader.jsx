import React from "react";
import { RotateCw } from "lucide-react";
import { PageHeader, SearchInput, Button, SuperuserBadge } from "../ui";

export default function ServerSelectorHeader({ search, setSearch, refreshing, onRefresh, user }) {
  return (
    <PageHeader
      category="डैशबोर्ड"
      breadcrumb="Dashboard / Servers"
      title="Your Servers"
      description="Choose a Discord server to configure and manage Digital Vigital bot settings."
      actions={
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          {user?.isSuperuser && <SuperuserBadge size="sm" />}

          <div className="w-full sm:w-64">
            <SearchInput
              value={search}
              onChange={setSearch}
              onClear={() => setSearch("")}
              placeholder="Search your servers..."
            />
          </div>

          <Button
            variant="secondary"
            onClick={onRefresh}
            isLoading={refreshing}
            loadingText="Syncing..."
            icon={RotateCw}
            className="w-full sm:w-auto"
            title="Refresh servers and permissions from Discord."
          >
            Sync Servers
          </Button>
        </div>
      }
    />
  );
}
