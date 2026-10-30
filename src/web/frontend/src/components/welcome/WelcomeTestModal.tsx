import React, { useState, useEffect } from "react";
import { Send, MessageSquare, UserMinus, Mail, Clock, ShieldCheck, Sparkles, AlertCircle } from "lucide-react";
import Modal from "../ui/Modal";
import { ChannelSelector } from "../discord";

interface WelcomeTestModalProps {
  open: boolean;
  onClose: () => void;
  initialType?: "channel" | "leave" | "dm";
  channels?: any[];
  config: any;
  hasChanges?: boolean;
  testing?: boolean;
  onSendTest: (params?: any) => Promise<boolean | void>;
}

export default function WelcomeTestModal({
  open,
  onClose,
  initialType = "channel",
  channels = [],
  config,
  hasChanges = false,
  testing = false,
  onSendTest,
}: WelcomeTestModalProps) {
  const [testType, setTestType] = useState<"channel" | "leave" | "dm">(initialType);
  const [useCustomChannel, setUseCustomChannel] = useState(false);
  const [customChannelId, setCustomChannelId] = useState("");
  const [autoDeleteSeconds, setAutoDeleteSeconds] = useState(30);

  useEffect(() => {
    if (open) {
      setTestType(initialType);
      const defaultChan = initialType === "leave" ? config?.leave_channel_id : config?.welcome_channel_id;
      setCustomChannelId(defaultChan || "");
      setUseCustomChannel(!defaultChan);
    }
  }, [open]);

  const configuredChannelId = testType === "leave" ? config?.leave_channel_id : config?.welcome_channel_id;
  const configuredChannelName = channels.find((c: any) => c.id === configuredChannelId)?.name;

  const handleDispatch = async () => {
    const targetChannel = useCustomChannel ? customChannelId : configuredChannelId;
    const success = await onSendTest({
      type: testType,
      channelId: testType === "dm" ? null : targetChannel,
      autoDeleteSeconds,
      config,
    });
    if (success) {
      onClose();
    }
  };

  const isChannelType = testType === "channel" || testType === "leave";
  const effectiveChannelId = useCustomChannel ? customChannelId : configuredChannelId;
  const canSend = !testing && (!isChannelType || Boolean(effectiveChannelId));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Dispatch Discord Test Message"
      description="Safely test your onboarding & departure greetings in live Discord channels or sandbox testing rooms."
      maxWidth="max-w-lg"
    >
      <div className="space-y-5 mt-2">
        {/* Draft Notice Banner */}
        <div className={`p-3.5 rounded-2xl border flex items-start gap-3 ${
          hasChanges
            ? "bg-amber-500/10 border-amber-500/20 text-amber-200"
            : "bg-indigo-500/10 border-indigo-500/20 text-indigo-200"
        }`}>
          {hasChanges ? (
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          ) : (
            <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
          )}
          <div className="text-xs space-y-0.5">
            <p className="font-semibold">
              {hasChanges ? "Testing Unsaved Draft Preview" : "Testing Current Active Configuration"}
            </p>
            <p className="opacity-80">
              {hasChanges
                ? "Your in-progress form edits will be dispatched directly to Discord without requiring a database save."
                : "The test message will reflect the settings currently live in your server."}
            </p>
          </div>
        </div>

        {/* 1. Test Type Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2">
            Select Message Type
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => {
                setTestType("channel");
                if (!config?.welcome_channel_id) setUseCustomChannel(true);
              }}
              className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                testType === "channel"
                  ? "bg-indigo-600/25 border-indigo-500/40 text-white shadow-md shadow-indigo-900/30 ring-1 ring-indigo-500"
                  : "bg-slate-800/60 border-white/5 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              <MessageSquare className={`w-4 h-4 mb-2 ${testType === "channel" ? "text-indigo-400" : "text-slate-400"}`} />
              <div>
                <span className="block text-xs font-bold leading-tight">Welcome</span>
                <span className="block text-[10px] text-slate-400 mt-0.5">Channel Msg</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setTestType("leave");
                if (!config?.leave_channel_id) setUseCustomChannel(true);
              }}
              className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                testType === "leave"
                  ? "bg-rose-600/25 border-rose-500/40 text-white shadow-md shadow-rose-900/30 ring-1 ring-rose-500"
                  : "bg-slate-800/60 border-white/5 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              <UserMinus className={`w-4 h-4 mb-2 ${testType === "leave" ? "text-rose-400" : "text-slate-400"}`} />
              <div>
                <span className="block text-xs font-bold leading-tight">Goodbye</span>
                <span className="block text-[10px] text-slate-400 mt-0.5">Leave Notice</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setTestType("dm")}
              className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                testType === "dm"
                  ? "bg-emerald-600/25 border-emerald-500/40 text-white shadow-md shadow-emerald-900/30 ring-1 ring-emerald-500"
                  : "bg-slate-800/60 border-white/5 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              <Mail className={`w-4 h-4 mb-2 ${testType === "dm" ? "text-emerald-400" : "text-slate-400"}`} />
              <div>
                <span className="block text-xs font-bold leading-tight">Direct DM</span>
                <span className="block text-[10px] text-slate-400 mt-0.5">Send to You</span>
              </div>
            </button>
          </div>
        </div>

        {/* 2. Destination Route (for channel/leave) */}
        {isChannelType && (
          <div className="p-4 rounded-2xl bg-slate-800/50 border border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-200">
                Target Destination
              </label>
              <div className="inline-flex p-0.5 rounded-lg bg-slate-900 border border-white/10 text-[11px]">
                <button
                  type="button"
                  onClick={() => setUseCustomChannel(false)}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                    !useCustomChannel
                      ? "bg-indigo-600 text-white shadow"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Configured Channel
                </button>
                <button
                  type="button"
                  onClick={() => setUseCustomChannel(true)}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                    useCustomChannel
                      ? "bg-indigo-600 text-white shadow"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Override / Sandbox
                </button>
              </div>
            </div>

            {!useCustomChannel ? (
              <div className="text-xs text-slate-300 flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-white/5">
                <span>
                  Configured channel:{" "}
                  <strong className="text-white font-semibold">
                    {configuredChannelName ? `#${configuredChannelName}` : "None selected"}
                  </strong>
                </span>
                {!configuredChannelId && (
                  <span className="text-[11px] text-amber-400 font-medium">Please pick a sandbox channel</span>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Choose Override / Testing Channel
                </label>
                <ChannelSelector
                  channels={channels}
                  value={customChannelId}
                  onChange={(val: string) => setCustomChannelId(val)}
                  allowedTypes={["text"]}
                  placeholder="Select sandbox / testing channel..."
                />
              </div>
            )}

            {!effectiveChannelId && (
              <div className="flex items-center gap-1.5 text-xs text-rose-400 pt-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Select a channel to dispatch the test to.</span>
              </div>
            )}
          </div>
        )}

        {/* DM Informational Note */}
        {testType === "dm" && (
          <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-white/5 text-xs text-slate-300 leading-relaxed">
            The onboarding greeting will be sent directly to your private Discord account. Please ensure your
            direct messages are enabled for this server in Discord settings.
          </div>
        )}

        {/* 3. Auto-Delete / Cleanup Options */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Auto-Delete Test Message</span>
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Keep", value: 0 },
              { label: "10 Seconds", value: 10 },
              { label: "30 Seconds", value: 30 },
              { label: "60 Seconds", value: 60 },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setAutoDeleteSeconds(opt.value)}
                className={`py-2 px-2 text-center rounded-xl border text-xs font-medium transition-all ${
                  autoDeleteSeconds === opt.value
                    ? "bg-indigo-600/30 border-indigo-500/40 text-white font-semibold shadow-sm"
                    : "bg-slate-800/60 border-white/5 text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5">
            {autoDeleteSeconds > 0
              ? `The bot will automatically delete the test message after ${autoDeleteSeconds} seconds to keep your channel clean.`
              : "The test message will remain in the channel permanently."}
          </p>
        </div>

        {/* Dialog Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
          <button
            type="button"
            disabled={testing}
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-all"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={!canSend}
            onClick={handleDispatch}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02]"
          >
            <Send className={`w-3.5 h-3.5 ${testing ? "animate-spin" : ""}`} />
            <span>{testing ? "Dispatching..." : "Send Test Message"}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
