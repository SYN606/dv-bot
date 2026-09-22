import React from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import {
  FileText,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Scale,
  Users,
  Server,
  Lock,
  Mail,
} from "lucide-react";

export default function TermsPage({ user, botInfo }) {
  const lastUpdated = "September 22, 2026";

  const sections = [
    {
      id: "acceptance",
      title: "1. Acceptance of Terms",
      icon: Scale,
      content: (
        <>
          <p>
            By adding <strong>Digital Vigital</strong> ("the Bot", "DV-BOT") to your Discord server, accessing the web dashboard at this domain, or using any associated services, you agree to be bound by these Terms of Service. If you do not agree to these terms, do not invite or use Digital Vigital.
          </p>
          <p className="mt-2 text-slate-400">
            These terms apply to all visitors, server administrators, moderators, and end-users who interact with the bot in any Discord guild or web dashboard session.
          </p>
        </>
      ),
    },
    {
      id: "services",
      title: "2. Description of Service",
      icon: Server,
      content: (
        <>
          <p>
            Digital Vigital provides Discord community automation, verification gating, media channel policies, automated response triggers, sticky announcement repinning, server analytics, voice channel tooling, and moderation enforcement suite via Discord slash commands, prefix commands, and a web-based management dashboard.
          </p>
          <p className="mt-2 text-slate-400">
            We reserve the right to modify, update, enhance, or temporarily suspend features with or without prior notice to optimize stability, security, or compliance with the Discord Developer Platform.
          </p>
        </>
      ),
    },
    {
      id: "compliance",
      title: "3. Compliance with Discord Terms of Service",
      icon: ShieldCheck,
      content: (
        <>
          <p>
            You agree to strictly abide by the{" "}
            <a
              href="https://discord.com/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 hover:underline"
            >
              Discord Terms of Service
            </a>{" "}
            and{" "}
            <a
              href="https://discord.com/guidelines"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 hover:underline"
            >
              Discord Community Guidelines
            </a>
            . Any server or user found utilizing Digital Vigital to violate Discord policies (such as mass spam, harassment, unauthorized raiding, or malicious exploits) will be permanently blacklisted from our service.
          </p>
        </>
      ),
    },
    {
      id: "responsibilities",
      title: "4. Server Administrator Responsibilities",
      icon: Users,
      content: (
        <>
          <p>Server owners and authorized administrators are solely responsible for:</p>
          <ul className="list-disc list-inside space-y-1 mt-2 text-slate-300">
            <li>Granting appropriate Discord permissions to the bot and configuring staff roles.</li>
            <li>Configuring verification gates, media-only channels, and automated punishment thresholds.</li>
            <li>All moderation actions (kicks, bans, timeouts, fakebans) executed through the bot by their server staff.</li>
            <li>Ensuring that custom autoresponder triggers and sticky notices adhere to community decency standards.</li>
          </ul>
        </>
      ),
    },
    {
      id: "privacy-link",
      title: "5. Privacy & Data Storage",
      icon: Lock,
      content: (
        <>
          <p>
            Your privacy is of utmost importance to us. We only store the minimal data necessary to provide bot functionality (such as guild configuration, moderation logs, and verification state).
          </p>
          <p className="mt-2 text-slate-400">
            Please consult our full{" "}
            <Link to="/privacy" className="text-indigo-400 hover:underline font-semibold">
              Privacy Policy
            </Link>{" "}
            for comprehensive details on data collection, storage, security, and deletion requests.
          </p>
        </>
      ),
    },
    {
      id: "disclaimer",
      title: "6. Disclaimer of Warranties & Limitation of Liability",
      icon: AlertTriangle,
      content: (
        <>
          <p>
            Digital Vigital is provided on an <strong>"AS IS"</strong> and <strong>"AS AVAILABLE"</strong> basis without warranties of any kind, whether express or implied.
          </p>
          <p className="mt-2 text-slate-400">
            In no event shall Digital Vigital, its developers, or affiliates be held liable for any direct, indirect, incidental, or consequential damages resulting from Discord API outages, lost server messages, unauthorized staff misuse, or service interruptions.
          </p>
        </>
      ),
    },
    {
      id: "contact",
      title: "7. Contact & Inquiries",
      icon: Mail,
      content: (
        <>
          <p>
            If you have questions, feedback, or concerns regarding these Terms of Service, please reach out to the development team at{" "}
            <a
              href="https://digitalvigital.fun"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 hover:underline"
            >
              Digital Vigital Network
            </a>{" "}
            or via support discord channels.
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-4">
            <FileText className="w-3.5 h-3.5" />
            <span>Legal Agreement</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
            Terms of Service
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-2">
            Last Updated: <span className="text-indigo-300 font-mono">{lastUpdated}</span>
          </p>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl w-full mx-auto px-4 sm:px-8 py-10 flex-1 space-y-6">
        <div className="p-5 rounded-2xl bg-indigo-950/20 border border-indigo-500/20 text-xs text-slate-300 leading-relaxed">
          Please read these Terms of Service carefully before utilizing Digital Vigital. By adding the bot to a Discord guild or interacting with our web dashboard, you acknowledge and agree to comply with all guidelines stated below.
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
                  <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
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
