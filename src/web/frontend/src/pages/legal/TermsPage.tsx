import React, { useEffect } from "react";
import {
  Scale,
  CheckCircle2,
  AlertTriangle,
  Server,
  ShieldAlert,
  Zap,
  HelpCircle,
  FileText,
  UserX,
  ExternalLink,
} from "lucide-react";
import { Link } from "react-router-dom";

export default function TermsPage() {
  useEffect(() => {
    document.title = "Terms of Service — Digital Vigital";
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="animate-in fade-in zoom-in-[0.98] duration-700">
      {/* Header */}
      <div className="mb-14 border-b border-white/5 pb-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20 shadow-lg shadow-indigo-500/5">
            <Scale className="w-6 h-6" />
          </div>
          <span className="text-2xl font-mono text-indigo-400/40 select-none tracking-widest font-bold">
            LEGAL // TERMS
          </span>
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-4 font-sans">
          Terms of Service
        </h1>
        <div className="flex flex-wrap items-center gap-3 mb-6 text-xs font-mono">
          <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" /> Effective Agreement
          </span>
          <span className="text-slate-400 tracking-wider uppercase">
            Last Updated: November 2026
          </span>
        </div>
        <p className="text-lg text-slate-300 leading-relaxed max-w-2xl font-body">
          These Terms of Service govern your access to and use of the <strong>Digital Vigital</strong> Discord bot, the web dashboard, API interfaces, and associated community automation services.
        </p>
      </div>

      {/* Core Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-14">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-mono font-bold uppercase tracking-wide">
            <Server className="w-4 h-4" /> Admin Responsibility
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Server administrators maintain primary control and legal responsibility over bot configuration and punishments in their guilds.
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-amber-400 text-xs font-mono font-bold uppercase tracking-wide">
            <ShieldAlert className="w-4 h-4" /> Discord Terms First
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            All users must comply with Discord's Official Terms of Service and Community Guidelines at all times.
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-rose-400 text-xs font-mono font-bold uppercase tracking-wide">
            <UserX className="w-4 h-4" /> Fair Use & Safeguards
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Abuse, API flooding, raiding, or exploiting the bot for malicious harassment results in permanent blacklisting.
          </p>
        </div>
      </div>

      {/* Main Sections */}
      <div className="space-y-12 text-slate-300 leading-relaxed font-body">
        
        {/* Section 01 */}
        <section id="acceptance" className="scroll-mt-32 group p-6 rounded-3xl bg-slate-900/40 border border-white/5 hover:border-white/10 transition-colors">
          <div className="flex items-center gap-4 mb-4">
            <span className="font-mono text-xl text-indigo-400 font-bold opacity-60 group-hover:opacity-100 transition-opacity">
              01
            </span>
            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-indigo-400" /> Acceptance & Agreement
            </h2>
          </div>
          <div className="text-sm text-slate-400 space-y-3">
            <p>
              By inviting Digital Vigital to any Discord server, running any slash/prefix commands, or authenticating into the web dashboard, you acknowledge that you have read, understood, and agreed to be bound by these Terms of Service and our{" "}
              <Link to="/privacy" className="text-indigo-400 underline underline-offset-4 hover:text-indigo-300 transition-colors">
                Privacy Policy
              </Link>.
            </p>
            <p>
              If you do not agree with any part of these Terms, you must remove the bot from your server and immediately cease using our web interfaces.
            </p>
          </div>
        </section>

        {/* Section 02 */}
        <section id="eligibility" className="scroll-mt-32 group p-6 rounded-3xl bg-slate-900/40 border border-white/5 hover:border-white/10 transition-colors">
          <div className="flex items-center gap-4 mb-4">
            <span className="font-mono text-xl text-indigo-400 font-bold opacity-60 group-hover:opacity-100 transition-opacity">
              02
            </span>
            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <Server className="w-5 h-5 text-indigo-400" /> Eligibility & Authorization
            </h2>
          </div>
          <div className="text-sm text-slate-400 space-y-3">
            <p>
              You must meet the minimum age required to use Discord in your jurisdiction (typically 13 years or older).
            </p>
            <p>
              To invite Digital Vigital to a server or configure settings on the web dashboard, you must possess valid administrative permissions (<code className="bg-white/10 text-slate-200 px-1.5 py-0.5 rounded font-mono text-xs">Manage Server</code> or <code className="bg-white/10 text-slate-200 px-1.5 py-0.5 rounded font-mono text-xs">Administrator</code>) within that specific Discord guild. You warrant that you have full legal authority to bind that server community to these Terms.
            </p>
          </div>
        </section>

        {/* Section 03 */}
        <section id="acceptable-use" className="scroll-mt-32 group p-6 rounded-3xl bg-slate-900/40 border border-white/5 hover:border-white/10 transition-colors">
          <div className="flex items-center gap-4 mb-4">
            <span className="font-mono text-xl text-rose-400 font-bold opacity-60 group-hover:opacity-100 transition-opacity">
              03
            </span>
            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <ShieldAlert className="w-5 h-5 text-rose-400" /> Acceptable Use & Prohibited Conduct
            </h2>
          </div>
          <div className="text-sm text-slate-400 space-y-3">
            <p>
              You agree to use Digital Vigital solely for lawful and ethical server management purposes. You explicitly agree NOT to:
            </p>
            <ul className="list-disc pl-5 space-y-2 marker:text-rose-400">
              <li>Violate the{" "}
                <a
                  href="https://discord.com/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-400 underline underline-offset-4 hover:text-indigo-300"
                >
                  Discord Terms of Service
                </a>{" "}
                or{" "}
                <a
                  href="https://discord.com/guidelines"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-400 underline underline-offset-4 hover:text-indigo-300"
                >
                  Discord Community Guidelines
                </a>.
              </li>
              <li>Abuse, spam, or intentionally trigger commands at rates designed to bypass rate-limiting or cause Denial of Service (DoS) conditions.</li>
              <li>Attempt to reverse-engineer, exploit vulnerabilities, or inject unauthorized payloads into the bot API or web dashboard endpoints.</li>
              <li>Configure autoresponder or message studio features to publish hate speech, doxxing material, non-consensual content, or malicious external links.</li>
              <li>Use the bot to organize, facilitate, or execute raids on other Discord servers.</li>
            </ul>
          </div>
        </section>

        {/* Section 04 */}
        <section id="disclaimer" className="scroll-mt-32 group p-6 rounded-3xl bg-slate-900/40 border border-white/5 hover:border-white/10 transition-colors">
          <div className="flex items-center gap-4 mb-4">
            <span className="font-mono text-xl text-indigo-400 font-bold opacity-60 group-hover:opacity-100 transition-opacity">
              04
            </span>
            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <Zap className="w-5 h-5 text-indigo-400" /> Availability & Limitation of Liability
            </h2>
          </div>
          <div className="text-sm text-slate-400 space-y-3">
            <p>
              Digital Vigital is provided on an <strong>"AS IS"</strong> and <strong>"AS AVAILABLE"</strong> basis without warranties of any kind, whether express or implied.
            </p>
            <p>
              While we strive for 99.9% uptime and dependable automation, we do not guarantee uninterrupted availability. The service may occasionally experience maintenance windows, network interruptions, or upstream Discord Gateway outages.
            </p>
            <p>
              To the maximum extent permitted by applicable law, Digital Vigital, its developers, and contributors shall not be liable for any indirect, incidental, special, or consequential damages resulting from your use or inability to use the service, including moderation disputes or accidental data loss resulting from server misconfigurations.
            </p>
          </div>
        </section>

        {/* Section 05 */}
        <section id="termination" className="scroll-mt-32 group p-6 rounded-3xl bg-slate-900/40 border border-white/5 hover:border-white/10 transition-colors">
          <div className="flex items-center gap-4 mb-4">
            <span className="font-mono text-xl text-indigo-400 font-bold opacity-60 group-hover:opacity-100 transition-opacity">
              05
            </span>
            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <UserX className="w-5 h-5 text-indigo-400" /> Termination & Access Revocation
            </h2>
          </div>
          <div className="text-sm text-slate-400 space-y-3">
            <p>
              We reserve the right to suspend or permanently revoke bot access or dashboard credentials for any server, user ID, or IP address that violates these Terms, abuses infrastructure, or engages in malicious community activity.
            </p>
            <p>
              You may terminate this agreement at any time by kicking the bot from your server and logging out of the dashboard.
            </p>
          </div>
        </section>

        {/* Section 06 */}
        <section id="contact" className="scroll-mt-32 group p-6 rounded-3xl bg-slate-900/40 border border-white/5 hover:border-white/10 transition-colors">
          <div className="flex items-center gap-4 mb-4">
            <span className="font-mono text-xl text-indigo-400 font-bold opacity-60 group-hover:opacity-100 transition-opacity">
              06
            </span>
            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <HelpCircle className="w-5 h-5 text-indigo-400" /> Updates to Terms & Contact
            </h2>
          </div>
          <div className="text-sm text-slate-400 space-y-3">
            <p>
              We reserve the right to revise or replace these Terms at any time. When material changes are made, the "Last Updated" date at the top will be updated. Your continued use of Digital Vigital following any modifications constitutes acceptance of the new Terms.
            </p>
            <div className="p-4 rounded-xl bg-slate-950/60 border border-white/5 flex flex-wrap items-center justify-between gap-4 mt-4">
              <div>
                <p className="text-xs text-slate-400">Questions about our Terms?</p>
                <p className="text-sm font-semibold text-white">Digital Vigital Support & Legal Team</p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  to="/privacy"
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold transition-colors border border-white/5"
                >
                  View Privacy Policy
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
