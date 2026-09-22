import React from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import {
  Shield,
  Eye,
  Database,
  Lock,
  Trash2,
  CheckCircle2,
  HelpCircle,
  Mail,
  UserCheck,
} from "lucide-react";

export default function PrivacyPage({ user, botInfo }) {
  const lastUpdated = "September 22, 2026";

  const sections = [
    {
      id: "collection",
      title: "1. Information We Collect",
      icon: Database,
      content: (
        <>
          <p>Digital Vigital collects only the minimum data required to deliver bot and dashboard services:</p>
          <ul className="list-disc list-inside space-y-1.5 mt-2 text-slate-300">
            <li>
              <strong>Discord Identifiers:</strong> User Snowflake IDs, usernames, and avatars retrieved via Discord OAuth2 to authenticate your web dashboard session.
            </li>
            <li>
              <strong>Guild & Configuration Data:</strong> Server IDs, channel IDs, and role IDs provided by server administrators when configuring verification, media channels, autoresponders, or staff admin roles.
            </li>
            <li>
              <strong>Moderation Records:</strong> Records of moderation actions (warnings, timeouts, kicks, bans, tempbans) executed within the server for audit transparency.
            </li>
            <li>
              <strong>Aggregated Analytics:</strong> Hourly and daily message and voice activity metrics used exclusively to render server activity charts and leaderboards.
            </li>
          </ul>
        </>
      ),
    },
    {
      id: "no-collection",
      title: "2. Information We NEVER Collect",
      icon: Eye,
      content: (
        <>
          <p>To preserve user privacy and uphold community trust:</p>
          <ul className="list-disc list-inside space-y-1.5 mt-2 text-slate-300">
            <li>We do <strong>not</strong> read, log, or store your private Direct Messages (DMs).</li>
            <li>We do <strong>not</strong> store message chat logs permanently (messages are parsed in real time for autoresponder triggers and discarded immediately).</li>
            <li>We do <strong>not</strong> collect personal financial information, passwords, phone numbers, or IP addresses.</li>
            <li>We <strong>never sell or monetize</strong> server or member data to third-party brokers or advertisers.</li>
          </ul>
        </>
      ),
    },
    {
      id: "usage",
      title: "3. How We Use Collected Data",
      icon: UserCheck,
      content: (
        <>
          <p>Collected data is used strictly for operational purposes:</p>
          <ul className="list-disc list-inside space-y-1.5 mt-2 text-slate-300">
            <li>Enforcing server verification gates and assigning configured member roles.</li>
            <li>Purging non-media messages in designated showcase channels.</li>
            <li>Triggering automated replies and emoji reactions configured by server staff.</li>
            <li>Displaying active member leaderboards and server growth charts in the web dashboard.</li>
          </ul>
        </>
      ),
    },
    {
      id: "security",
      title: "4. Data Security & Storage",
      icon: Lock,
      content: (
        <>
          <p>
            All configuration data is maintained in secure, hardened local databases protected by strict filesystem permissions (<code className="px-1.5 py-0.5 rounded bg-slate-900 text-indigo-300 font-mono text-xs">chmod 700</code>).
          </p>
          <p className="mt-2 text-slate-400">
            Web sessions are authenticated using tamper-proof HMAC-SHA256 signed session tokens stored in secure, HttpOnly, SameSite cookies.
          </p>
        </>
      ),
    },
    {
      id: "retention",
      title: "5. Data Retention & Deletion Rights",
      icon: Trash2,
      content: (
        <>
          <p>
            You have full control over your server's data. Server owners and administrators can remove, reconfigure, or completely reset verification, autoresponder rules, or media channel settings directly from the web dashboard at any time.
          </p>
          <p className="mt-2 text-slate-400">
            If Digital Vigital is removed from a Discord guild, all associated runtime caches are purged. To request a permanent deletion of all stored guild records, server owners may submit a data deletion request.
          </p>
        </>
      ),
    },
    {
      id: "contact",
      title: "6. Contact & Data Privacy Inquiries",
      icon: Mail,
      content: (
        <>
          <p>
            For any inquiries regarding data protection, privacy rights, or deletion requests, please contact our team via{" "}
            <a
              href="https://digitalvigital.fun"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 hover:underline"
            >
              Digital Vigital Network
            </a>{" "}
            or open an issue with our support staff.
          </p>
        </>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased relative overflow-x-hidden selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Background glow orbs */}
      <div className="fixed top-[-140px] left-[-100px] w-[600px] h-[600px] rounded-full bg-indigo-600/15 blur-[160px] pointer-events-none -z-10" />
      <div className="fixed bottom-[-140px] right-[-100px] w-[600px] h-[600px] rounded-full bg-purple-600/15 blur-[160px] pointer-events-none -z-10" />

      {/* Top Navbar */}
      <Navbar user={user} botInfo={botInfo} />

      {/* Hero Header */}
      <div className="border-b border-white/5 bg-slate-950/40 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-4 sm:px-8 py-12 sm:py-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-4">
            <Shield className="w-3.5 h-3.5" />
            <span>Data Transparency & Protection</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
            Privacy Policy
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-2">
            Last Updated: <span className="text-indigo-300 font-mono">{lastUpdated}</span>
          </p>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl w-full mx-auto px-4 sm:px-8 py-10 flex-1 space-y-6">
        <div className="p-5 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 text-xs text-slate-300 leading-relaxed">
          At Digital Vigital, we believe in radical transparency. We do not track personal habits, store private communications, or sell data. This policy outlines exactly what we store and how your information is protected.
        </div>

        <div className="space-y-6">
          {sections.map((sec) => {
            const Icon = sec.icon;
            return (
              <section
                key={sec.id}
                id={sec.id}
                className="glass-card p-6 sm:p-8 rounded-3xl border border-white/5 shadow-xl space-y-3"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Icon className="w-4 h-4" />
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    {sec.title}
                  </h2>
                </div>
                <div className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-1">
                  {sec.content}
                </div>
              </section>
            );
          })}
        </div>
      </main>

      {/* Global Footer */}
      <Footer botInfo={botInfo} />
    </div>
  );
}
