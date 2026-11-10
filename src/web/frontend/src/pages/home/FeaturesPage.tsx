import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ShieldAlert,
  ShieldCheck,
  Music,
  Ticket,
  UserPlus,
  PenTool,
  Bot,
  Lock,
  Pin,
  Trophy,
  Activity,
  Sliders,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Disc,
  Layers,
  Zap,
  Radio,
  ImageIcon,
  MessageSquareHeart,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  RotateCcw,
  Check,
  Server,
  LockKeyhole,
  ExternalLink,
  Cpu,
  Flame,
  Clock,
  Eye,
  SlidersHorizontal,
  Workflow,
  Key,
  Users,
} from "lucide-react";
import Navbar from "../../components/navigation/Navbar";
import Footer from "../../components/navigation/Footer";

export default function FeaturesPage({ user, botInfo }: { user?: any; botInfo?: any }) {
  useEffect(() => {
    document.title = "Features & Anti-Nuke Architecture • Digital Vigital";
    window.scrollTo(0, 0);
  }, []);

  // Category filter state
  const [activeCategory, setActiveCategory] = useState<string>("all");

  // Interactive Anti-Nuke Scenario simulation state
  const [activeScenario, setActiveScenario] = useState<string>("admin-escalation");

  // FAQ Accordion state
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Anti-Nuke Scenarios Data
  const antinukeScenarios: Record<string, {
    title: string;
    subtitle: string;
    threatType: string;
    trigger: string;
    actionTime: string;
    countermeasure: string;
    restoration: string;
    executorRole: string;
    details: string;
    steps: { number: string; title: string; desc: string; badge: string }[];
  }> = {
    "admin-escalation": {
      title: "Unauthorized Admin Escalation",
      subtitle: "A compromised moderator grants Administrator permissions or creates an unapproved super-admin role.",
      threatType: "ADMIN_PERM_ESCALATION",
      trigger: "Role modified with 'Administrator' flag by non-whitelisted admin",
      actionTime: "< 0.4s",
      countermeasure: "STRIP_PERMISSIONS & QUARANTINE",
      restoration: "ENABLED (Role Reverted)",
      executorRole: "Moderator / Staff",
      details: "Attempted to assign Administrator flag to @Community Staff (ID: 1042918472910)",
      steps: [
        {
          number: "01",
          title: "Audit Burst Intercepted",
          desc: "Gateway detects a Role Update or Member Role Update event containing high-risk administrative permissions.",
          badge: "Sub-Second Detection",
        },
        {
          number: "02",
          title: "Zero-Tolerance Strip",
          desc: "DV-BOT instantly strips the Administrator and Manage Server flags from the role before malicious commands run.",
          badge: "Permission Neutralized",
        },
        {
          number: "03",
          title: "Staff Quarantine Escalation",
          desc: "The executing staff member has their administrative roles immediately revoked and is placed into isolation.",
          badge: "Executor Isolated",
        },
        {
          number: "04",
          title: "Direct Owner DM Dispatch",
          desc: "An encrypted incident alert is dispatched directly to the server owner with Executor ID, Incident UUID, and exact diff.",
          badge: "Owner Alert Sent",
        },
      ],
    },
    "rogue-bot": {
      title: "Rogue Bot Injection",
      subtitle: "A malicious staff member or hijacked account invites an unapproved bot with administrative permissions.",
      threatType: "ROGUE_BOT_ADD",
      trigger: "Unauthorized bot joined server without whitelist pre-approval",
      actionTime: "< 0.6s",
      countermeasure: "BOT_BAN & INVITER_REVOCATION",
      restoration: "ENABLED (Topology Checked)",
      executorRole: "Administrator",
      details: "Invited unauthorized bot @Hade#7267 (ID: 1021732722479202304)",
      steps: [
        {
          number: "01",
          title: "Bot Join Event Captured",
          desc: "Guild Member Add event fires for an unverified application not present on the server's pre-approved Bot Whitelist.",
          badge: "Audit Log Correlated",
        },
        {
          number: "02",
          title: "Autonomous Bot Ban",
          desc: "The rogue bot is banned from the server instantly before it can fetch member lists, read private channels, or execute commands.",
          badge: "Rogue Bot Banned",
        },
        {
          number: "03",
          title: "Inviter Privileges Revoked",
          desc: "DV-BOT identifies the executor who created the bot invite link and immediately revokes their administrative privileges.",
          badge: "Inviter Quarantined",
        },
        {
          number: "04",
          title: "Incident Log & DM Alert",
          desc: "The server owner receives a high-priority incident embed in their DMs detailing the invited bot and inviter's user ID.",
          badge: "Audit Dispatched",
        },
      ],
    },
    "channel-purge": {
      title: "Mass Channel / Role Deletion",
      subtitle: "An attacker attempts to wipe out server channels and categories to grief or extort the community.",
      threatType: "CHANNEL_MASS_DELETE",
      trigger: "3 channels deleted within a 5-second velocity window",
      actionTime: "< 0.8s",
      countermeasure: "QUARANTINE_STAFF & AUTO_RESTORE",
      restoration: "ENABLED (Live Memory Mirror)",
      executorRole: "Compromised Staff",
      details: "Deleted #general, #announcements, and #voice-lounge in burst",
      steps: [
        {
          number: "01",
          title: "Velocity Limiter Breached",
          desc: "Burst frequency limiter flags deletion count exceeding safety thresholds, triggering immediate server protection.",
          badge: "Velocity Triggered",
        },
        {
          number: "02",
          title: "Immediate Attacker Neutralization",
          desc: "The offending account is instantly stripped of all channel management permissions or removed from the server.",
          badge: "Attacker Stopped",
        },
        {
          number: "03",
          title: "In-Memory Topology Resurrection",
          desc: "DV-BOT reads its live RAM mirror and auto-recreates deleted channels with identical names, topics, positions, and permission overwrites.",
          badge: "Assets Restored",
        },
        {
          number: "04",
          title: "One-Click Manual Fallback",
          desc: "All deleted assets remain stored in the dashboard Protection Logs tab for easy 1-click manual verification or restoration.",
          badge: "State Preserved",
        },
      ],
    },
    "emergency-lockdown": {
      title: "Emergency Panic Server Lockdown",
      subtitle: "Server owner or trusted lead initiates a master lockdown during an ongoing raid or coordinated bot attack.",
      threatType: "EMERGENCY_LOCKDOWN_ENGAGED",
      trigger: "1-Click Panic Switch engaged from dashboard or `/antinuke lockdown`",
      actionTime: "< 0.9s",
      countermeasure: "SERVER_WIDE_MUTED",
      restoration: "REVERSIBLE (1-Click Lift)",
      executorRole: "Server Owner",
      details: "Muted @everyone Send Messages & Add Reactions across 28 public channels",
      steps: [
        {
          number: "01",
          title: "Master Panic Trigger",
          desc: "Triggered instantly via Web Dashboard toggle or emergency Discord slash command with no confirmation delay.",
          badge: "Instant Engagement",
        },
        {
          number: "02",
          title: "Mass Permission Freeze",
          desc: "DV-BOT runs parallel permission overrides across all public text and voice channels, locking @everyone from chatting.",
          badge: "Channels Secured",
        },
        {
          number: "03",
          title: "Raid Neutralization",
          desc: "Spammers, compromised bots, and raiders are rendered unable to post spam, ping members, or flood voice rooms.",
          badge: "Threat Defused",
        },
        {
          number: "04",
          title: "Seamless One-Click Lift",
          desc: "Once the incident is handled, toggling the lockdown off instantly restores previous normal channel permissions cleanly.",
          badge: "Zero Configuration Loss",
        },
      ],
    },
  };

  const currentScenario = antinukeScenarios[activeScenario];

  // All Feature Modules
  const allFeatures = [
    {
      id: "antinuke",
      title: "Server Protection & Anti-Nuke",
      category: "security",
      categoryLabel: "Security & Recovery",
      badge: "Zero-Trust Shield",
      badgeColor: "bg-rose-500/10 text-rose-400 border-rose-500/20",
      icon: ShieldAlert,
      iconColor: "text-rose-400 bg-rose-500/10 border-rose-500/20",
      description:
        "Autonomous real-time defense against rogue staff, token compromise, mass deletions, and bot raids with instant in-memory topology recovery.",
      metric: "< 1s Auto-Recovery",
      highlights: [
        "One-Click Emergency Server Lockdown to restrict public channel messaging in under a second",
        "Velocity Limits for mass channel deletions, creations, role purges, kicks, and bans",
        "Instant Topology Recovery: Auto-recreates deleted channels and roles with identical permissions from memory",
        "Unauthorized Bot Blocking: Immediately bans rogue bot invites and isolates the inviting admin",
        "Dangerous Permission Guard: Stops unauthorized granting of Administrator and Manage Server perms",
        "Vanity URL & Server Identity Guard: Reverts rogue server renaming and invite link modifications",
      ],
    },
    {
      id: "music",
      title: "Lossless Studio Music Player",
      category: "music",
      categoryLabel: "Entertainment & Audio",
      badge: "Lavalink v4 Powered",
      badgeColor: "bg-purple-500/10 text-purple-400 border-purple-500/20",
      icon: Music,
      iconColor: "text-purple-400 bg-purple-500/10 border-purple-500/20",
      description:
        "High-fidelity voice audio streaming powered by dedicated Lavalink nodes with a live web control panel and zero voice disconnects.",
      metric: "Lossless 24/7 Audio",
      highlights: [
        "Crystal-clear lossless audio playback with customizable equalizer and acoustic filter presets (Bass Boost, Nightcore, Lo-Fi, 8D)",
        "Real-Time Interactive Now Playing Cards with instant play/pause button state synchronization",
        "Web Dashboard Live Player: Control playback, adjust volume, and reorder queue live from your browser",
        "24/7 Voice Channel Stay Mode: Keeps the bot in designated voice channels around the clock",
        "Smart Queue Management with drag-and-drop song reordering and persistent server playlists",
      ],
    },
    {
      id: "tickets",
      title: "Support Ticket Tooling",
      category: "support",
      categoryLabel: "Community & Support",
      badge: "Multi-Department",
      badgeColor: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
      icon: Ticket,
      iconColor: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
      description:
        "Professional customer support and inquiry desk with interactive buttons, modal reason inputs, staff claiming, and automatic HTML transcripts.",
      metric: "Live Modal Intake",
      highlights: [
        "Department Routing: Direct tickets to specific staff roles (General Support, Billing, Technical, Bug Reports)",
        "Modal Form Inputs: Gather user details, issue descriptions, and screenshots upon ticket creation",
        "One-Click Staff Claiming: Assign tickets to individual staff members to prevent duplicate replies",
        "Automated HTML & Text Transcripts: Export full conversation logs to a private archive channel upon close",
        "Automated Inactive Ticket Auto-Close worker with configurable reminder prompts",
      ],
    },
    {
      id: "welcome",
      title: "Welcome & Leave Gatekeeper",
      category: "community",
      categoryLabel: "Onboarding & Retention",
      badge: "Rich Embed Cards",
      badgeColor: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
      icon: UserPlus,
      iconColor: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
      description:
        "Give new members an unforgettable first impression with dynamic greeting messages, automatic role assignment, and direct message guides.",
      metric: "Instant Auto-Roles",
      highlights: [
        "Dynamic Welcome Cards with member avatars, server counters, and customized colored embeds",
        "Instant Auto-Roles: Automatically assign starter community roles immediately upon joining",
        "Direct Message (DM) Onboarding: Send private instructions, rules, and server links directly to newcomers",
        "Detailed Member Leave Logging with join timestamps, time spent, and held roles",
      ],
    },
    {
      id: "message-studio",
      title: "Message Studio & Embed Creator",
      category: "tools",
      categoryLabel: "Creative & Announcements",
      badge: "Live Visual Preview",
      badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      icon: PenTool,
      iconColor: "text-amber-400 bg-amber-500/10 border-amber-500/20",
      description:
        "Design rich Discord embeds and announcements with real-time WYSIWYG previews, custom webhook branding, and scheduled broadcasting.",
      metric: "WYSIWYG Live Canvas",
      highlights: [
        "Live Pixel-Perfect Discord Preview of author, titles, fields, thumbnails, banners, and footers",
        "Webhook Personas: Send messages with custom avatars and display names for tailored branding",
        "Action Buttons & Hyperlinks: Add clickable buttons and resource links directly below announcements",
        "Template Library: Save and re-use announcement layouts across multiple server channels",
      ],
    },
    {
      id: "autoresponder",
      title: "Smart Autoresponder",
      category: "tools",
      categoryLabel: "Automation & FAQ",
      badge: "Regex & Wildcards",
      badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      icon: Bot,
      iconColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
      description:
        "Automate answers to repetitive questions with intelligent triggers, exact match patterns, wildcards, and role-based exemptions.",
      metric: "Zero Latency Cache",
      highlights: [
        "Trigger Modes: Support for Exact Match, Contains Keyword, Starts With, and Regular Expressions",
        "Dynamic Placeholder Variables: Automatically insert {user}, {server}, {channel}, and member counters",
        "Channel & Role Whitelists: Restrict triggers to specific help channels or bypass staff members",
        "Cooldown Throttle: Prevent trigger spamming with per-user and per-channel response cooldowns",
      ],
    },
    {
      id: "verification",
      title: "Verification Gatekeeper",
      category: "security",
      categoryLabel: "Anti-Raid & Gating",
      badge: "Role Isolation",
      badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      icon: Lock,
      iconColor: "text-blue-400 bg-blue-500/10 border-blue-500/20",
      description:
        "Protect your community from bot raids and spammers by isolating new joins with an Unverified role until they pass verification.",
      metric: "Complete Gating",
      highlights: [
        "Button & Captcha Verification: Fast 1-click or challenge-response verification in a dedicated channel",
        "Complete Server Isolation: Prevents unverified accounts from reading or messaging general channels",
        "Auto-Role Hand-Off: Seamlessly removes unverified roles and grants verified member access upon completion",
      ],
    },
    {
      id: "supporter",
      title: "Supporter & Clan Status Rewards",
      category: "community",
      categoryLabel: "Community Growth",
      badge: "Vanity Auto-Role",
      badgeColor: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
      icon: Trophy,
      iconColor: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
      description:
        "Encourage members to promote your server by automatically rewarding those who place your vanity invite or clan tag in their Discord status.",
      metric: "Live Presence Scan",
      highlights: [
        "Automated Status Scanner: Checks user presence and custom status strings in real time",
        "Instant Role Grant & Revocation: Gives exclusive supporter roles when added, removes automatically when cleared",
        "Custom Announcement Broadcast: Celebrate new supporters in a dedicated channel with celebratory messages",
      ],
    },
    {
      id: "analytics",
      title: "Analytics & Activity Trends",
      category: "community",
      categoryLabel: "Insights & Engagement",
      badge: "Hourly Telemetry",
      badgeColor: "bg-sky-500/10 text-sky-400 border-sky-500/20",
      icon: Activity,
      iconColor: "text-sky-400 bg-sky-500/10 border-sky-500/20",
      description:
        "Deep metrics and visual graphs tracking member messages, active voice minutes, and peak server activity hours.",
      metric: "Real-Time Telemetry",
      highlights: [
        "Hourly Heatmaps: Identify when your community is most active to schedule events and announcements",
        "Chat & Voice Leaderboards: Recognize top text contributors and voice room regulars",
        "Automated Medal Roles: Grant weekly active chatter awards and exclusive podium roles automatically",
      ],
    },
    {
      id: "moderation",
      title: "Moderation & Strike Escalations",
      category: "security",
      categoryLabel: "Enforcement & Safety",
      badge: "Strike Punishments",
      badgeColor: "bg-red-500/10 text-red-400 border-red-500/20",
      icon: Sliders,
      iconColor: "text-red-400 bg-red-500/10 border-red-500/20",
      description:
        "Equip your moderation team with rapid moderation tools, multi-level strike escalations, and comprehensive audit logs.",
      metric: "Self-Healing Workers",
      highlights: [
        "Automated Warning Escalation: Trigger automatic 10-minute timeouts at 3 warnings, temporary bans at 5 warnings",
        "Temporary Ban & Timeout Workers: Self-healing background workers that automatically unban members when timers expire",
        "Bulk Message Purging: Clean up channel spam instantly with targeted user, bot, or keyword filters",
      ],
    },
    {
      id: "sticky-media",
      title: "Sticky Messages & Media Channels",
      category: "tools",
      categoryLabel: "Channel Curation",
      badge: "Persistent Rules",
      badgeColor: "bg-teal-500/10 text-teal-400 border-teal-500/20",
      icon: Pin,
      iconColor: "text-teal-400 bg-teal-500/10 border-teal-500/20",
      description:
        "Keep rules or important links permanently visible at the bottom of busy chats, and lock gallery channels strictly to media.",
      metric: "Always Visible",
      highlights: [
        "Intelligent Sticky Notes: Automatically re-posts instructions at the bottom of the chat after conversation bursts",
        "Media-Only Channels: Automatically deletes text-only messages in art, clips, and selfie channels",
        "Anonymous Confessions: Safe, community-moderated confession pipeline with approval review queues",
      ],
    },
  ];

  const filteredFeatures =
    activeCategory === "all"
      ? allFeatures
      : allFeatures.filter((f) => f.category === activeCategory);

  // FAQ Data
  const faqs = [
    {
      q: "How does the Anti-Nuke detect unauthorized admin changes so fast?",
      a: "DV-BOT connects directly to Discord's live Gateway WebSocket. The moment a role or permission modification event occurs, the payload is checked against the in-memory whitelist before Discord even renders the update to regular clients. If unauthorized, the countermeasure engages within 300 to 800 milliseconds.",
    },
    {
      q: "What happens if a trusted staff member's Discord account gets compromised or token-logged?",
      a: "This is exactly what DV-BOT was engineered for. Even if an account has full Administrator permissions in Discord, DV-BOT enforces strict velocity limits. If the compromised account deletes channels, creates rogue roles, or invites bots, the bot immediately strips their roles, isolates them to quarantine, and restores all deleted assets.",
    },
    {
      q: "Can deleted channels and roles really be restored with their exact permissions?",
      a: "Yes! DV-BOT runs an active In-Memory Topology Mirror. It continuously retains the full hierarchy of your server: channel names, topics, positions, voice bitrates, and role-by-role permission overwrites. When a deletion occurs, DV-BOT rebuilds the asset with the exact same configuration in under a second.",
    },
    {
      q: "Do I need to pay or host a separate server for the Lavalink v4 music?",
      a: "No! DV-BOT connects to high-performance, enterprise-grade Lavalink v4 audio clusters. You get 24/7 stay mode, custom audio filters (Bass Boost, Nightcore, Lo-Fi, 8D), and the live browser player completely included.",
    },
    {
      q: "Can I manage everything from my phone or web browser?",
      a: "Yes! The DV-BOT Web Dashboard provides full control over all modules, real-time protection toggles, emergency server lockdown, interactive message builders, and ticket settings from desktop or mobile devices.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#07080c] text-slate-100 font-sans flex flex-col relative overflow-hidden selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Background Atmosphere */}
      <div className="fixed top-[-25%] left-[-15%] w-[65vw] h-[65vw] rounded-full bg-gradient-to-br from-indigo-600/10 via-purple-600/5 to-transparent blur-[120px] pointer-events-none -z-10" />
      <div className="fixed bottom-[-25%] right-[-15%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-tl from-cyan-600/10 via-rose-600/5 to-transparent blur-[120px] pointer-events-none -z-10" />

      {/* Grid Pattern Background */}
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-25"
        style={{
          backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.12) 1px, transparent 1px)`,
          backgroundSize: "28px 28px",
          maskImage: "radial-gradient(ellipse 80% 60% at 50% 15%, #000 60%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 15%, #000 60%, transparent 100%)",
        }}
      />

      <Navbar user={user} botInfo={botInfo} />

      <main className="flex-1 w-full relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-20">
        
        {/* ==================================================================== */}
        {/* 1. HERO SECTION                                                     */}
        {/* ==================================================================== */}
        <div className="text-center space-y-6 max-w-4xl mx-auto pt-6 sm:pt-10">
          {/* Eyebrow Pill */}
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 backdrop-blur-md shadow-sm">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-indigo-300">
              Platform Architecture // Capabilities
            </span>
          </div>

          {/* Main Title */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-white tracking-tight leading-[1.08]">
            Next-Gen Discord Defense <br />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-cyan-400 bg-clip-text text-transparent">
              &amp; Community Automation.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl mx-auto font-normal">
            Engineered for high-trust communities. Zero-trust Anti-Nuke defense, lossless studio music streaming, multi-department support tickets, and live server topology recovery.
          </p>

          {/* Hero CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
            <a
              href="/auth/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl font-semibold text-sm bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-lg shadow-indigo-600/30 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Disc className="w-4 h-4" />
              <span>Add DV-BOT to Discord</span>
            </a>

            <a
              href="#antinuke-deepdive"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-sm bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white border border-white/10 hover:border-white/20 transition-all backdrop-blur-sm"
            >
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <span>See Anti-Nuke in Action</span>
              <ChevronDown className="w-4 h-4 opacity-60" />
            </a>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* STATS BAR (Kerit Cloud Inspired)                                     */}
        {/* ==================================================================== */}
        <div className="p-6 sm:p-7 rounded-2xl border border-white/10 bg-[#0d101a]/80 backdrop-blur-xl shadow-2xl shadow-black/40">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 divide-y lg:divide-y-0 lg:divide-x divide-white/10">
            <div className="flex flex-col items-center text-center px-4">
              <div className="font-mono text-3xl sm:text-4xl font-extrabold text-rose-400 tracking-tight">
                &lt; 0.6s
              </div>
              <div className="text-xs uppercase tracking-wider font-semibold text-slate-400 mt-1">
                Threat Mitigation Speed
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
                Sub-second autonomous intercept
              </div>
            </div>

            <div className="flex flex-col items-center text-center px-4 pt-6 lg:pt-0">
              <div className="font-mono text-3xl sm:text-4xl font-extrabold text-cyan-400 tracking-tight">
                100%
              </div>
              <div className="text-xs uppercase tracking-wider font-semibold text-slate-400 mt-1">
                Topology Live Mirror
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
                Instant RAM channel &amp; role restore
              </div>
            </div>

            <div className="flex flex-col items-center text-center px-4 pt-6 lg:pt-0">
              <div className="font-mono text-3xl sm:text-4xl font-extrabold text-purple-400 tracking-tight">
                24/7
              </div>
              <div className="text-xs uppercase tracking-wider font-semibold text-slate-400 mt-1">
                Lavalink v4 Lossless
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
                Dedicated audio nodes &amp; zero lag
              </div>
            </div>

            <div className="flex flex-col items-center text-center px-4 pt-6 lg:pt-0">
              <div className="font-mono text-3xl sm:text-4xl font-extrabold text-emerald-400 tracking-tight">
                0ms
              </div>
              <div className="text-xs uppercase tracking-wider font-semibold text-slate-400 mt-1">
                Desync Recovery
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
                State rollbacks on rogue staff
              </div>
            </div>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* 2. FLAGSHIP SPOTLIGHT: ANTI-NUKE SCENARIO WALKTHROUGH                */}
        {/* ==================================================================== */}
        <section id="antinuke-deepdive" className="space-y-10 scroll-mt-24">
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-rose-500/30 bg-rose-500/10 text-xs font-mono font-semibold text-rose-300">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              <span>FLAGSHIP SECURITY SYSTEM</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
              What Happens When an Attacker Striking?
            </h2>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Experience the exact autonomous escalation flow. When an admin goes rogue, a token leaks, or a bot raids your server, DV-BOT acts in under a second.
            </p>
          </div>

          {/* Interactive Scenario Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-2 max-w-3xl mx-auto">
            <button
              onClick={() => setActiveScenario("admin-escalation")}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 border ${
                activeScenario === "admin-escalation"
                  ? "bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-lg shadow-rose-500/10"
                  : "bg-slate-900/60 text-slate-400 border-white/5 hover:border-white/20 hover:text-white"
              }`}
            >
              <Key className="w-4 h-4 text-rose-400" />
              <span>Admin Privilege Escalation</span>
            </button>

            <button
              onClick={() => setActiveScenario("rogue-bot")}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 border ${
                activeScenario === "rogue-bot"
                  ? "bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-lg shadow-rose-500/10"
                  : "bg-slate-900/60 text-slate-400 border-white/5 hover:border-white/20 hover:text-white"
              }`}
            >
              <Bot className="w-4 h-4 text-amber-400" />
              <span>Rogue Bot Invite</span>
            </button>

            <button
              onClick={() => setActiveScenario("channel-purge")}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 border ${
                activeScenario === "channel-purge"
                  ? "bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-lg shadow-rose-500/10"
                  : "bg-slate-900/60 text-slate-400 border-white/5 hover:border-white/20 hover:text-white"
              }`}
            >
              <RotateCcw className="w-4 h-4 text-cyan-400" />
              <span>Mass Channel Deletion</span>
            </button>

            <button
              onClick={() => setActiveScenario("emergency-lockdown")}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 border ${
                activeScenario === "emergency-lockdown"
                  ? "bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-lg shadow-rose-500/10"
                  : "bg-slate-900/60 text-slate-400 border-white/5 hover:border-white/20 hover:text-white"
              }`}
            >
              <LockKeyhole className="w-4 h-4 text-purple-400" />
              <span>Emergency Lockdown</span>
            </button>
          </div>

          {/* Scenario Details & Live Simulation Display */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left: Step-by-Step Defense Timeline */}
            <div className="lg:col-span-7 space-y-4">
              <div className="p-6 sm:p-7 rounded-2xl border border-white/10 bg-[#0d101a]/70 backdrop-blur-md space-y-5">
                <div>
                  <div className="text-xs font-mono font-bold text-rose-400 uppercase tracking-wider">
                    Execution Timeline
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white mt-1">
                    {currentScenario.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
                    {currentScenario.subtitle}
                  </p>
                </div>

                {/* Steps Flow Cards */}
                <div className="space-y-3 pt-2">
                  {currentScenario.steps.map((step, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border border-white/5 bg-[#121524]/70 hover:border-white/15 transition-all flex items-start gap-4"
                    >
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                        {step.number}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-sm font-bold text-white">{step.title}</h4>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 border border-white/10 text-slate-300">
                            {step.badge}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {step.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-2 flex items-center justify-between text-xs text-slate-400 border-t border-white/5 font-mono">
                  <span>Target Response SLA: <span className="text-emerald-400 font-bold">{currentScenario.actionTime}</span></span>
                  <span className="text-slate-500">Autonomous · Zero Owner Lag</span>
                </div>
              </div>
            </div>

            {/* Right: Authentic Discord Security Alert Simulation (Matching Real Bot UI) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="p-6 sm:p-7 rounded-2xl border border-rose-500/30 bg-[#0d101a]/90 backdrop-blur-xl space-y-5 relative overflow-hidden shadow-2xl">
                
                {/* Monospace System Header */}
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="font-mono text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Live Gateway Event
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold">
                    NEUTRALIZED
                  </span>
                </div>

                {/* Simulated Discord Embed (Direct replica of real DV-BOT bot alert) */}
                <div className="rounded-xl border-l-4 border-l-rose-500 border border-white/5 bg-[#121524] p-4 sm:p-5 space-y-3 font-sans shadow-lg">
                  <div className="flex items-center gap-2 text-white font-bold text-sm">
                    <span className="text-base">⚠️</span>
                    <span>URGENT SECURITY ALERT FOR GUILD OWNER</span>
                  </div>

                  <div className="text-xs font-semibold text-rose-400 flex items-center gap-1.5 pt-1">
                    <span>❌ 🛡️ Anti-Nuke Countermeasure Engaged</span>
                  </div>

                  <div className="space-y-1 text-xs">
                    <div className="text-slate-400">
                      Threat Detected: <span className="font-mono text-white bg-slate-800 px-1.5 py-0.5 rounded">{currentScenario.threatType}</span>
                    </div>
                    <div className="text-slate-300 text-[11px] leading-relaxed">
                      An unauthorized administrative action burst was intercepted and neutralized.
                    </div>
                  </div>

                  {/* Grid Fields */}
                  <div className="grid grid-cols-2 gap-3 pt-2 text-xs border-t border-white/5">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-mono">Executor</div>
                      <div className="font-semibold text-slate-200 mt-0.5 truncate">
                        @MaliciousStaff
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">ID: 755846180923113592</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-mono">Countermeasure</div>
                      <div className="font-mono text-[11px] text-rose-300 font-bold mt-0.5">
                        {currentScenario.countermeasure}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 text-xs border-t border-white/5">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-mono">Auto-Restoration</div>
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mt-0.5">
                        {currentScenario.restoration}
                      </span>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-mono">Incident ID</div>
                      <div className="font-mono text-[10px] text-indigo-300 truncate mt-0.5">
                        49118fc0-0de1-4ac8-b9aa
                      </div>
                    </div>
                  </div>

                  {/* Details box */}
                  <div className="pt-2 text-xs border-t border-white/5">
                    <div className="text-[10px] text-slate-400 uppercase font-mono">Details</div>
                    <p className="text-slate-200 text-[11px] font-mono mt-0.5 bg-black/30 p-2 rounded border border-white/5">
                      {currentScenario.details}
                    </p>
                  </div>
                </div>

                {/* Dashboard Action Prompt */}
                <div className="p-3.5 rounded-xl border border-white/10 bg-slate-900/60 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <RotateCcw className="w-4 h-4 text-cyan-400" />
                    <span className="text-slate-300 font-medium">Recorded in Dashboard Logs</span>
                  </div>
                  <Link
                    to={user ? `/dashboard` : `/auth/login`}
                    className="text-indigo-400 hover:text-indigo-300 font-bold inline-flex items-center gap-1"
                  >
                    <span>View Hub</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

              </div>
            </div>

          </div>
        </section>

        {/* ==================================================================== */}
        {/* 3. SIX CORE DEFENSE PILLARS (BENTO GRID - Kerit Style)               */}
        {/* ==================================================================== */}
        <section className="space-y-8">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <div className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-wider">
              Comprehensive Protection Vector
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Six Layers of Uncompromising Defense
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Every critical vector an attacker can target is monitored continuously by autonomous background workers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* 1. Zero-Tolerance Permission Shield */}
            <div className="p-6 rounded-2xl border border-white/10 bg-[#0d101a]/70 hover:border-white/20 transition-all flex flex-col justify-between space-y-4 group">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white group-hover:text-rose-300 transition-colors">
                  Zero-Tolerance Shield
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Stops unauthorized granting of dangerous permissions including Administrator, Manage Server, and Manage Webhooks. Reverts bits immediately.
                </p>
              </div>
              <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs font-mono text-slate-400">
                <span>Reaction Window</span>
                <span className="text-rose-400 font-bold">&lt; 350ms</span>
              </div>
            </div>

            {/* 2. In-Memory Topology Mirror */}
            <div className="p-6 rounded-2xl border border-white/10 bg-[#0d101a]/70 hover:border-white/20 transition-all flex flex-col justify-between space-y-4 group">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white group-hover:text-cyan-300 transition-colors">
                  In-Memory Topology Mirror
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Constantly snapshots channels, roles, categories, and permission overwrites in RAM. Auto-restores deleted assets with identical configurations.
                </p>
              </div>
              <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs font-mono text-slate-400">
                <span>State Retention</span>
                <span className="text-cyan-400 font-bold">100% In-RAM</span>
              </div>
            </div>

            {/* 3. Rogue Bot Auto-Ban & Inviter Strip */}
            <div className="p-6 rounded-2xl border border-white/10 bg-[#0d101a]/70 hover:border-white/20 transition-all flex flex-col justify-between space-y-4 group">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Bot className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white group-hover:text-amber-300 transition-colors">
                  Rogue Bot Auto-Ban
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Bans unwhitelisted bots the millisecond they join. Tracks down the inviting staff member and revokes their administrative permissions.
                </p>
              </div>
              <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs font-mono text-slate-400">
                <span>Bot Ban Speed</span>
                <span className="text-amber-400 font-bold">Instant Gate</span>
              </div>
            </div>

            {/* 4. Velocity Limiter Burst Engine */}
            <div className="p-6 rounded-2xl border border-white/10 bg-[#0d101a]/70 hover:border-white/20 transition-all flex flex-col justify-between space-y-4 group">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                  <Activity className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white group-hover:text-purple-300 transition-colors">
                  Velocity Limiters
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Configurable action burst thresholds for channel deletions, role creations, kicks, and bans. Triggers isolation before servers suffer widespread loss.
                </p>
              </div>
              <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs font-mono text-slate-400">
                <span>Threshold Safety</span>
                <span className="text-purple-400 font-bold">Configurable</span>
              </div>
            </div>

            {/* 5. Vanity URL & Server Identity Guard */}
            <div className="p-6 rounded-2xl border border-white/10 bg-[#0d101a]/70 hover:border-white/20 transition-all flex flex-col justify-between space-y-4 group">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white group-hover:text-emerald-300 transition-colors">
                  Vanity &amp; Identity Guard
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Guards server name, icon, banner, and vanity URL invite. Reverts malicious modifications and strips permissions from unauthorized editors.
                </p>
              </div>
              <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs font-mono text-slate-400">
                <span>Identity Protection</span>
                <span className="text-emerald-400 font-bold">Lockdown Shield</span>
              </div>
            </div>

            {/* 6. Emergency 1-Click Server Lockdown */}
            <div className="p-6 rounded-2xl border border-white/10 bg-[#0d101a]/70 hover:border-white/20 transition-all flex flex-col justify-between space-y-4 group">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <LockKeyhole className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors">
                  Emergency Server Lockdown
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Master emergency switch freezes all public channel chat and reactions in under a second. Can be toggled on and off cleanly with zero config loss.
                </p>
              </div>
              <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs font-mono text-slate-400">
                <span>Lockdown Trigger</span>
                <span className="text-indigo-400 font-bold">Dashboard &amp; Slash</span>
              </div>
            </div>

          </div>
        </section>

        {/* ==================================================================== */}
        {/* 4. COMPLETE FEATURE MODULES DIRECTORY (FILTERABLE TABS)              */}
        {/* ==================================================================== */}
        <section className="space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/10 pb-6">
            <div className="space-y-2">
              <div className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-wider">
                Explore The Suite
              </div>
              <h2 className="text-3xl font-extrabold text-white tracking-tight">
                All Included Bot Modules
              </h2>
              <p className="text-xs sm:text-sm text-slate-300">
                Filter by category to explore every tool built into DV-BOT.
              </p>
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-slate-900/80 border border-white/10 backdrop-blur-md">
              {[
                { id: "all", label: `All (${allFeatures.length})` },
                { id: "security", label: "Security & Safety" },
                { id: "music", label: "Music & Audio" },
                { id: "support", label: "Tickets & Support" },
                { id: "community", label: "Community & Retention" },
                { id: "tools", label: "Automation & Tools" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveCategory(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeCategory === tab.id
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Feature Bento Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredFeatures.map((feature) => {
              const Icon = feature.icon;

              return (
                <div
                  key={feature.id}
                  id={feature.id}
                  className="p-7 rounded-2xl border border-white/10 bg-[#0d101a]/70 hover:border-white/20 transition-all flex flex-col justify-between space-y-6 shadow-xl relative overflow-hidden group"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${feature.iconColor}`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                            {feature.categoryLabel}
                          </div>
                          <h3 className="text-lg font-bold text-white tracking-tight">
                            {feature.title}
                          </h3>
                        </div>
                      </div>
                      <span
                        className={`text-[11px] font-mono px-2.5 py-0.5 rounded-full border font-semibold shrink-0 hidden sm:inline-block ${feature.badgeColor}`}
                      >
                        {feature.badge}
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      {feature.description}
                    </p>

                    <div className="pt-3 border-t border-white/5 space-y-2">
                      {feature.highlights.map((highlight, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2.5 text-xs text-slate-300"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{highlight}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs">
                    <span className="font-mono text-slate-400 text-[11px]">
                      {feature.metric}
                    </span>
                    <Link
                      to={user ? `/dashboard` : `/auth/login`}
                      className="inline-flex items-center gap-1.5 font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      <span>Configure in Dashboard</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ==================================================================== */}
        {/* 5. COMPARISON SECTION: DV-BOT vs TRADITIONAL BOTS (Kerit Style)      */}
        {/* ==================================================================== */}
        <section className="space-y-8">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <div className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-wider">
              Engineering Comparison
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Why High-Traffic Guilds Choose DV-BOT
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Compare our proactive architecture against traditional Discord bots that fail when under attack.
            </p>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[640px] p-6 rounded-2xl border border-white/10 bg-[#0d101a]/80 backdrop-blur-md">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 font-mono text-xs">
                    <th className="pb-3 font-semibold">Capability</th>
                    <th className="pb-3 font-semibold text-rose-400">Traditional Bots</th>
                    <th className="pb-3 font-semibold text-indigo-400">Digital Vigital (DV-BOT)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  <tr>
                    <td className="py-3.5 font-medium text-white">Raid &amp; Rogue Attack Response</td>
                    <td className="py-3.5 text-slate-400">10s – 30s delay; often rate-limited</td>
                    <td className="py-3.5 font-semibold text-emerald-400 flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-400" /> &lt; 0.6s sub-second Gateway intercept
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3.5 font-medium text-white">Deleted Asset Recovery</td>
                    <td className="py-3.5 text-slate-400">None; manual recreation required</td>
                    <td className="py-3.5 font-semibold text-emerald-400">
                      In-Memory Topology Mirror (1-Click or Auto-Recreate)
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3.5 font-medium text-white">Compromised Staff Handling</td>
                    <td className="py-3.5 text-slate-400">None; admins bypass all bot commands</td>
                    <td className="py-3.5 font-semibold text-emerald-400">
                      Zero-Tolerance bitflag strip &amp; quarantine isolation
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3.5 font-medium text-white">Studio Music Architecture</td>
                    <td className="py-3.5 text-slate-400">Shared nodes, rate limits, audio stutter</td>
                    <td className="py-3.5 font-semibold text-emerald-400">
                      Lavalink v4 high-performance nodes with 24/7 stay mode
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3.5 font-medium text-white">Support Ticket Transcripts</td>
                    <td className="py-3.5 text-slate-400">Plain text text files or external paywalls</td>
                    <td className="py-3.5 font-semibold text-emerald-400">
                      Full HTML rich transcripts with user avatars &amp; timestamps
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ==================================================================== */}
        {/* 6. FREQUENTLY ASKED QUESTIONS (FAQ)                                  */}
        {/* ==================================================================== */}
        <section className="space-y-8 max-w-4xl mx-auto">
          <div className="text-center space-y-3">
            <div className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-wider">
              Answers &amp; Guidance
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-xs sm:text-sm text-slate-300">
              Clear answers regarding our Anti-Nuke architecture, music engine, and setup.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;

              return (
                <div
                  key={index}
                  className="rounded-xl border border-white/10 bg-[#0d101a]/70 overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 font-semibold text-sm sm:text-base text-white hover:text-indigo-300 transition-colors"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 shrink-0 text-slate-400 transition-transform duration-200 ${
                        isOpen ? "rotate-180 text-indigo-400" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-4 sm:px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-white/5 font-normal">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ==================================================================== */}
        {/* 7. HIGH-CONVERSION CTA (Kerit Cloud Section-CTA Style)                */}
        {/* ==================================================================== */}
        <div className="p-8 sm:p-14 rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/60 via-[#0d101a] to-[#07080c] text-center space-y-6 shadow-2xl relative overflow-hidden">
          
          {/* Subtle Ambient Glow */}
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent" />

          <div className="max-w-2xl mx-auto space-y-3 relative z-10">
            <span className="font-mono text-xs uppercase tracking-widest text-indigo-400 font-bold">
              Instant Guild Activation
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
              Ready to Secure and Empower Your Community?
            </h2>
            <p className="text-xs sm:text-base text-slate-300 leading-relaxed">
              Deploy DV-BOT in under 60 seconds. Zero setup fees, instant Gateway protection, and full web dashboard control.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 relative z-10 pt-2">
            {user ? (
              <Link
                to="/dashboard"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-lg shadow-indigo-600/30 hover:scale-[1.02]"
              >
                <span>Go to Server Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <a
                href="/auth/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl text-sm font-bold bg-[#5865F2] hover:bg-[#4752c4] text-white transition-all shadow-lg shadow-[#5865F2]/30 hover:scale-[1.02]"
              >
                <Disc className="w-5 h-5" />
                <span>Log in with Discord</span>
              </a>
            )}
            <Link
              to="/docs"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all"
            >
              <span>Explore Documentation</span>
              <ExternalLink className="w-4 h-4 opacity-70" />
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 pt-4 text-[11px] font-mono text-slate-400 relative z-10">
            <span className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-400" /> Free Tier Available
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-400" /> No Credit Card Required
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-400" /> Setup Under 60s
            </span>
          </div>
        </div>

      </main>

      <Footer botInfo={botInfo} />
    </div>
  );
}