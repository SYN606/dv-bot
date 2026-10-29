import React from "react";
import { Download, RefreshCw } from "lucide-react";
import { exportAnalyticsCSV } from "../../utils/analytics";
import { PageHeader, Tabs, Button } from "../ui";

export default function AnalyticsHeader({ timeframe, setTimeframe, data, loading, refresh }) {
  return (
    <PageHeader
      category="विश्लेषण"
      breadcrumb="Analytics / Growth"
      title="Server Insights"
      description="Understand message volume, voice activity, growth trends and community engagement."
      actions={
        <div className="flex flex-wrap items-center gap-3">
          <Tabs
            size="sm"
            activeTab={timeframe}
            onChange={setTimeframe}
            tabs={[
              { id: 7, label: "7D" },
              { id: 14, label: "14D" },
              { id: 30, label: "30D" },
            ]}
          />

          <Button
            variant="secondary"
            size="sm"
            onClick={() => exportAnalyticsCSV(data)}
            disabled={loading || !data}
            icon={Download}
          >
            Export
          </Button>

          <Button
            variant="primary"
            size="icon"
            onClick={refresh}
            disabled={loading}
            title="Refresh Data"
            className="rounded-xl"
          >
            <RefreshCw className={`w-4 h-4 text-white ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      }
    />
  );
}
