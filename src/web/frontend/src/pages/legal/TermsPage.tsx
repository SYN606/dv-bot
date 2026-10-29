import React, { useEffect } from "react";
import { Scale } from "lucide-react";

export default function TermsPage() {
  useEffect(() => {
    document.title = "Terms of Service — Digital Vigital";
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="animate-in fade-in zoom-in-[0.98] duration-700">
      <div className="mb-16 border-b border-white/5 pb-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-brand-crimson/10 flex items-center justify-center text-brand-crimson border border-brand-crimson/20">
            <Scale className="w-5 h-5" />
          </div>
          <span className="text-3xl font-display text-brand-crimson/20 select-none">नियम</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-4 font-sans">Terms of Service</h1>
        <p className="text-slate-400 font-mono text-sm uppercase tracking-widest mb-6">Last Updated: September 2026</p>
        <p className="text-lg text-slate-300 leading-relaxed max-w-2xl font-body">
          These Terms govern the use of our website, the Digital Vigital Discord bot, and related community command center services.
        </p>
      </div>

      <div className="space-y-12 text-slate-300 leading-relaxed font-body">
        
        <section id="acceptance" className="scroll-mt-32 group">
          <div className="flex items-center gap-4 mb-4">
            <span className="font-mono text-xl text-brand-crimson font-bold opacity-50 group-hover:opacity-100 transition-opacity">01</span>
            <h2 className="text-2xl font-bold text-white tracking-tight">Acceptance of Terms</h2>
          </div>
          <div className="prose prose-invert prose-slate max-w-none prose-p:text-slate-400">
            <p>By inviting the Digital Vigital bot to a Discord server or logging into our web dashboard, you agree to these Terms. If you do not agree to these terms, do not use the service.</p>
            <p>Digital Vigital is provided primarily for the Digital Vigital Discord community and approved external servers.</p>
          </div>
        </section>

        <section id="description" className="scroll-mt-32 group">
          <div className="flex items-center gap-4 mb-4">
            <span className="font-mono text-xl text-brand-crimson font-bold opacity-50 group-hover:opacity-100 transition-opacity">02</span>
            <h2 className="text-2xl font-bold text-white tracking-tight">Description of Service</h2>
          </div>
          <div className="prose prose-invert prose-slate max-w-none prose-p:text-slate-400">
            <p>Digital Vigital provides moderation tools, automation, analytics, and verification systems for Discord communities. The service is provided "as is" and functionality may change, update, or be removed without prior notice.</p>
          </div>
        </section>

        <section id="responsibilities" className="scroll-mt-32 group">
          <div className="flex items-center gap-4 mb-4">
            <span className="font-mono text-xl text-brand-crimson font-bold opacity-50 group-hover:opacity-100 transition-opacity">03</span>
            <h2 className="text-2xl font-bold text-white tracking-tight">User Responsibilities & Acceptable Use</h2>
          </div>
          <div className="prose prose-invert prose-slate max-w-none prose-p:text-slate-400">
            <p>You agree not to use the bot or dashboard to:</p>
            <ul className="list-disc pl-5 text-slate-400 space-y-2 mt-4 marker:text-brand-crimson">
              <li>Violate Discord's Terms of Service or Community Guidelines.</li>
              <li>Circumvent rate limits, spam APIs, or attempt to destabilize the service infrastructure.</li>
              <li>Use automation features for malicious mass-messaging or server raiding.</li>
            </ul>
            <p className="mt-4">Server administrators are responsible for how they configure the bot's permissions, automations, and moderation punishments within their respective communities.</p>
          </div>
        </section>

        <section id="availability" className="scroll-mt-32 group">
          <div className="flex items-center gap-4 mb-4">
            <span className="font-mono text-xl text-brand-crimson font-bold opacity-50 group-hover:opacity-100 transition-opacity">04</span>
            <h2 className="text-2xl font-bold text-white tracking-tight">Availability & Termination</h2>
          </div>
          <div className="prose prose-invert prose-slate max-w-none prose-p:text-slate-400">
            <p>We do not guarantee 100% uptime. The service may occasionally be taken offline for maintenance.</p>
            <p>We reserve the right to terminate or restrict access to the dashboard or bot for any user or server at any time, especially in cases of abuse or policy violations.</p>
          </div>
        </section>

        <section id="changes" className="scroll-mt-32 group">
          <div className="flex items-center gap-4 mb-4">
            <span className="font-mono text-xl text-brand-crimson font-bold opacity-50 group-hover:opacity-100 transition-opacity">05</span>
            <h2 className="text-2xl font-bold text-white tracking-tight">Changes to Terms</h2>
          </div>
          <div className="prose prose-invert prose-slate max-w-none prose-p:text-slate-400">
            <p>We may modify these Terms at any time. Continued use of the bot or dashboard after any changes constitutes your acceptance of the new terms.</p>
          </div>
        </section>

      </div>
    </div>
  );
}
