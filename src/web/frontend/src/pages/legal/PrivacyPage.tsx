import React, { useEffect } from "react";
import {
  Shield,
  Lock,
  Database,
  EyeOff,
  Trash2,
  Server,
  Clock,
  Mail,
  CheckCircle2,
  FileText,
  UserCheck,
  AlertTriangle,
} from "lucide-react";
import { Link } from "react-router-dom";

export default function PrivacyPage() {
  useEffect(() => {
    document.title = "Privacy Policy — Digital Vigital";
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="animate-in fade-in zoom-in-[0.98] duration-700">
      {/* Header */}
      <div className="mb-14 border-b border-white/5 pb-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20 shadow-lg shadow-indigo-500/5">
            <Shield className="w-6 h-6" />
          </div>
          <span className="text-2xl font-mono text-indigo-400/40 select-none tracking-widest font-bold">
            LEGAL // PRIVACY
          </span>
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-4 font-sans">
          Privacy Policy
        </h1>
        <div className="flex flex-wrap items-center gap-3 mb-6 text-xs font-mono">
          <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" /> Effective & Verified
          </span>
          <span className="text-slate-400 tracking-wider uppercase">
            Last Updated: November 2026
          </span>
        </div>
        <p className="text-lg text-slate-300 leading-relaxed max-w-2xl font-body">
          At <strong>Digital Vigital</strong>, we believe in complete transparency and strict adherence to the{" "}
          <a
            href="https://discord.com/developers/docs/policies-and-agreements/developer-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-400 underline underline-offset-4 hover:text-indigo-300 transition-colors"
          >
            Discord Developer Policy
          </a>
          . This document outlines exactly how data is collected, processed, and safeguarded across our Discord bot and web command center.
        </p>
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-14">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono font-bold uppercase tracking-wide">
            <EyeOff className="w-4 h-4" /> Zero Ads & Selling
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            We never sell, monetize, or broker your personal information or server metadata to any third party.
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-mono font-bold uppercase tracking-wide">
            <Lock className="w-4 h-4" /> Minimalist Collection
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Only data strictly necessary to execute moderation, ticketing, verification, and analytics is stored.
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-rose-400 text-xs font-mono font-bold uppercase tracking-wide">
            <Trash2 className="w-4 h-4" /> Right to Erasure
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Server owners and users can request full data expungement at any time under GDPR/CCPA standards.
          </p>
        </div>
      </div>

      {/* Main Sections */}
      <div className="space-y-12 text-slate-300 leading-relaxed font-body">
        
        {/* Section 01 */}
        <section className="group p-6 rounded-3xl bg-slate-900/40 border border-white/5 hover:border-white/10 transition-colors">
          <div className="flex items-center gap-4 mb-4">
            <span className="font-mono text-xl text-indigo-400 font-bold opacity-60 group-hover:opacity-100 transition-opacity">
              01
            </span>
            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <Database className="w-5 h-5 text-indigo-400" /> Information We Collect
            </h2>
          </div>
          <div className="text-sm text-slate-400 space-y-4">
            <p>
              When Digital Vigital is added to a server or when you interact with the dashboard, we collect and store only specific metadata necessary for operational integrity:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mt-3">
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/5">
                <h3 className="font-bold text-white text-xs mb-1 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-indigo-400" /> User Profile Metadata
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Discord User ID, username, global display name, and avatar URL. Used for authentication, leaderboard display, and moderation records.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/5">
                <h3 className="font-bold text-white text-xs mb-1 flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5 text-indigo-400" /> Server Architecture Data
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Guild ID, channel IDs, role IDs, and server settings configured via the bot or web panel (e.g., auto-role assignments, welcome channels).
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/5">
                <h3 className="font-bold text-white text-xs mb-1 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-indigo-400" /> Moderation & Warning Logs
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Enforcement logs including warning reasons, issuing moderator IDs, timestamps, timeout intervals, and automated punishment thresholds.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/5">
                <h3 className="font-bold text-white text-xs mb-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" /> Activity Telemetry
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Aggregated message volume counts and voice channel session durations in seconds to calculate leaderboard standings. We do not store message history for analytics.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/5 mt-3">
              <h3 className="font-bold text-white text-xs mb-1 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-400" /> Ticket & Support Transcripts
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                When a user opens a support ticket, the bot records ticket status, claiming staff members, and priority. Upon ticket closure, an HTML transcript of the messages in that ticket channel is generated and posted directly to the server's configured audit channel for archival.
              </p>
            </div>
          </div>
        </section>

        {/* Section 02 */}
        <section className="group p-6 rounded-3xl bg-slate-900/40 border border-white/5 hover:border-white/10 transition-colors">
          <div className="flex items-center gap-4 mb-4">
            <span className="font-mono text-xl text-rose-400 font-bold opacity-60 group-hover:opacity-100 transition-opacity">
              02
            </span>
            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <EyeOff className="w-5 h-5 text-rose-400" /> What We Never Collect
            </h2>
          </div>
          <div className="text-sm text-slate-400 space-y-3">
            <p>To preserve user privacy and uphold trust, Digital Vigital operates under strict technical constraints:</p>
            <ul className="list-disc pl-5 space-y-2 marker:text-rose-400">
              <li><strong>No Voice Recording:</strong> The bot never records, stores, or transmits audio data from voice channels. Voice tracking only calculates total connection duration in minutes.</li>
              <li><strong>No General Chat Harvesting:</strong> We do not index or store message text across general channels. Messages are only processed transiently in memory for hot-path feature execution (e.g., matching autoresponder triggers or sticky reposts).</li>
              <li><strong>No Payment Details:</strong> We do not process or retain credit card, bank, or billing information.</li>
              <li><strong>No Third-Party Tracking Pixels:</strong> We do not load advertising scripts, analytics cookies from external networks, or behavioral tracking SDKs.</li>
            </ul>
          </div>
        </section>

        {/* Section 03 */}
        <section className="group p-6 rounded-3xl bg-slate-900/40 border border-white/5 hover:border-white/10 transition-colors">
          <div className="flex items-center gap-4 mb-4">
            <span className="font-mono text-xl text-indigo-400 font-bold opacity-60 group-hover:opacity-100 transition-opacity">
              03
            </span>
            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <Lock className="w-5 h-5 text-indigo-400" /> Authentication & Cookies
            </h2>
          </div>
          <div className="text-sm text-slate-400 space-y-3">
            <p>
              When accessing the Digital Vigital Web Dashboard, authentication is handled via official Discord OAuth2. 
            </p>
            <p>
              We issue a secure, cryptographic session cookie named <code className="bg-white/10 text-slate-200 px-1.5 py-0.5 rounded font-mono text-xs">dv_session</code>. This cookie is marked <strong>HTTP-Only</strong>, <strong>SameSite=Lax</strong>, and encrypted with an HMAC-SHA256 signature to protect against cross-site scripting (XSS) and unauthorized tampering.
            </p>
          </div>
        </section>

        {/* Section 04 */}
        <section className="group p-6 rounded-3xl bg-slate-900/40 border border-white/5 hover:border-white/10 transition-colors">
          <div className="flex items-center gap-4 mb-4">
            <span className="font-mono text-xl text-indigo-400 font-bold opacity-60 group-hover:opacity-100 transition-opacity">
              04
            </span>
            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <Clock className="w-5 h-5 text-indigo-400" /> Data Retention & Right to Erasure
            </h2>
          </div>
          <div className="text-sm text-slate-400 space-y-3">
            <p>
              Data is retained only as long as the bot remains an active member of your server or as necessary to fulfill moderation records.
            </p>
            <ul className="list-disc pl-5 space-y-2 marker:text-indigo-400">
              <li><strong>Guild Departure:</strong> If Digital Vigital is kicked or removed from a guild, server configuration settings and moderation histories are scheduled for automatic purge during routine database hygiene routines.</li>
              <li><strong>Right to be Forgotten:</strong> Any user or server owner may request complete expungement of their stored records, including warning histories, analytics counts, and tickets.</li>
              <li><strong>Data Requests:</strong> To request a copy or complete purge of data associated with your user ID or guild, contact our team or utilize the dashboard configuration wipe controls.</li>
            </ul>
          </div>
        </section>

        {/* Section 05 */}
        <section className="group p-6 rounded-3xl bg-slate-900/40 border border-white/5 hover:border-white/10 transition-colors">
          <div className="flex items-center gap-4 mb-4">
            <span className="font-mono text-xl text-indigo-400 font-bold opacity-60 group-hover:opacity-100 transition-opacity">
              05
            </span>
            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <Mail className="w-5 h-5 text-indigo-400" /> Contact & Privacy Inquiries
            </h2>
          </div>
          <div className="text-sm text-slate-400 space-y-3">
            <p>
              If you have any questions regarding this Privacy Policy, your rights under GDPR/CCPA, or wish to submit a data erasure request, please contact our administrative team via:
            </p>
            <div className="p-4 rounded-xl bg-slate-950/60 border border-white/5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs text-slate-400">Official Discord Support Server</p>
                <p className="text-sm font-semibold text-white">Digital Vigital Headquarters</p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  to="/terms"
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold transition-colors border border-white/5"
                >
                  View Terms of Service
                </Link>
                <Link
                  to="/"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors shadow-lg shadow-indigo-600/20"
                >
                  Return to Dashboard
                </Link>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
