import React, { useEffect } from "react";
import { Shield } from "lucide-react";

export default function PrivacyPage() {
  useEffect(() => {
    document.title = "Privacy Policy — Digital Vigital";
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="animate-in fade-in zoom-in-[0.98] duration-700">
      <div className="mb-16 border-b border-white/5 pb-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-brand-crimson/10 flex items-center justify-center text-brand-crimson border border-brand-crimson/20">
            <Shield className="w-5 h-5" />
          </div>
          <span className="text-3xl font-display text-brand-crimson/20 select-none">नीति</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-4 font-sans">Privacy Policy</h1>
        <p className="text-slate-400 font-mono text-sm uppercase tracking-widest mb-6">Last Updated: September 2026</p>
        <p className="text-lg text-slate-300 leading-relaxed max-w-2xl font-body">
          How Digital Vigital collects, uses, and protects information when you use our Discord bot and web dashboard.
        </p>
      </div>

      <div className="space-y-12 text-slate-300 leading-relaxed font-body">
        
        <section className="group">
          <div className="flex items-center gap-4 mb-4">
            <span className="font-mono text-xl text-brand-crimson font-bold opacity-50 group-hover:opacity-100 transition-opacity">01</span>
            <h2 className="text-2xl font-bold text-white tracking-tight">Information We Collect</h2>
          </div>
          <div className="prose prose-invert prose-slate max-w-none prose-p:text-slate-400">
            <p>We only collect the data necessary to operate the bot and dashboard functionalities. This includes:</p>
            <ul className="list-disc pl-5 text-slate-400 space-y-2 mt-4 marker:text-brand-crimson">
              <li><strong>Discord Profile:</strong> User ID, Username, Avatar URL, and the servers you share with the bot.</li>
              <li><strong>Server Data:</strong> Guild IDs, Channels, Roles, and aggregate telemetry (message counts, voice minutes) for analytics purposes.</li>
              <li><strong>Moderation Records:</strong> Warning logs, automated punishment records, and audit logs.</li>
            </ul>
          </div>
        </section>

        <section className="group">
          <div className="flex items-center gap-4 mb-4">
            <span className="font-mono text-xl text-brand-crimson font-bold opacity-50 group-hover:opacity-100 transition-opacity">02</span>
            <h2 className="text-2xl font-bold text-white tracking-tight">Cookies & Authentication</h2>
          </div>
          <div className="prose prose-invert prose-slate max-w-none prose-p:text-slate-400">
            <p>The dashboard uses an encrypted, HTTP-only cookie (`dv_session`) exclusively to maintain your login session. We do not use third-party tracking cookies or advertising pixels.</p>
          </div>
        </section>

        <section className="group">
          <div className="flex items-center gap-4 mb-4">
            <span className="font-mono text-xl text-brand-crimson font-bold opacity-50 group-hover:opacity-100 transition-opacity">03</span>
            <h2 className="text-2xl font-bold text-white tracking-tight">How Information is Used</h2>
          </div>
          <div className="prose prose-invert prose-slate max-w-none prose-p:text-slate-400">
            <p>Data is strictly used to:</p>
            <ul className="list-disc pl-5 text-slate-400 space-y-2 mt-4 marker:text-brand-crimson">
              <li>Provide dashboard access controls (verifying your permissions in a server).</li>
              <li>Execute automated moderation and auto-role assignments.</li>
              <li>Render server insights and leaderboards.</li>
            </ul>
            <p className="mt-4">We do not sell data to third parties.</p>
          </div>
        </section>

        <section className="group">
          <div className="flex items-center gap-4 mb-4">
            <span className="font-mono text-xl text-brand-crimson font-bold opacity-50 group-hover:opacity-100 transition-opacity">04</span>
            <h2 className="text-2xl font-bold text-white tracking-tight">Data Retention</h2>
          </div>
          <div className="prose prose-invert prose-slate max-w-none prose-p:text-slate-400">
            <p>Server configurations, analytics aggregates, and moderation logs are kept as long as the bot remains in your server. If the bot is removed from a server, configurations may be wiped as part of routine database cleanups.</p>
          </div>
        </section>

      </div>
    </div>
  );
}
