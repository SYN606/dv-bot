import React, { useState } from "react";
import { useParams, useOutletContext } from "react-router-dom";
import { useAnalytics } from "../../hooks/analytics";

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
      <div className="flex-1 flex items-center justify-center min-h-[50vh] animate-in fade-in zoom-in-[0.98] duration-500">
        <div className="glass-panel p-8 rounded-3xl max-w-md w-full border border-white/5 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-brand-crimson/10 text-brand-crimson mx-auto flex items-center justify-center border border-brand-crimson/20">
            <span className="font-bold text-xl">!</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Unable to load analytics</h2>
          <p className="text-sm text-slate-400">We couldn't retrieve analytics for this server. The backend might be unreachable or the guild data doesn't exist.</p>
          <button 
            onClick={refresh}
            className="mt-4 px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-semibold transition-colors w-full"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto animate-in fade-in duration-500">
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
        loading={loading} 
      />
    </div>
  );
}
