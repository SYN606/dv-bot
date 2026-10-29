import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { useAnalytics } from "../../hooks/analytics";
import { PageError } from "../../components/ui";

// Components
import {
  AnalyticsHeader,
  AnalyticsKpis,
  InsightsPanel,
  MessageActivityChart,
  VoiceActivityChart,
  HourlyActivityChart,
  ChannelActivity,
  Leaderboard
} from "../../components/analytics";

export default function AnalyticsPage() {
  const { guildId } = useParams();
  const [timeframe, setTimeframe] = useState(7);
  
  const { data, loading, error, refresh } = useAnalytics(guildId, timeframe);

  if (error) {
    return (
      <PageError
        title="Unable to load analytics"
        description="We couldn't retrieve analytics for this server. The backend might be unreachable or the guild data doesn't exist."
        onRetry={refresh}
      />
    );
  }

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-300 pb-16">
      <AnalyticsHeader 
        timeframe={timeframe} 
        setTimeframe={setTimeframe} 
        data={data} 
        loading={loading} 
        refresh={refresh} 
      />

      <AnalyticsKpis 
        summary={data?.summary} 
        loading={loading} 
        timeframe={timeframe} 
      />

      <InsightsPanel 
        insights={data?.insights} 
        loading={loading} 
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <MessageActivityChart timeline={data?.timeline} loading={loading} />
        <VoiceActivityChart timeline={data?.timeline} loading={loading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <HourlyActivityChart hourlyDistribution={data?.hourlyDistribution} loading={loading} />
        <ChannelActivity channelBreakdown={data?.channelBreakdown} loading={loading} />
      </div>

      <Leaderboard 
        topChatters={data?.topChatters} 
        topVoice={data?.topVoice} 
        leaderboards={data?.leaderboards}
        loading={loading} 
      />
    </div>
  );
}
