import React, { useState, useEffect } from "react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import { ChannelSelector } from "../discord";
import { Settings, Send, Check, ShieldCheck, AlertCircle } from "lucide-react";

export default function AuditLogConfigModal({
  open,
  onClose,
  guildId,
  channels = [],
  currentChannelId = "",
  onSaveConfig,
  savingConfig = false,
  onSendTest,
  testingLog = false,
}) {
  const [selectedChannelId, setSelectedChannelId] = useState(currentChannelId);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    setSelectedChannelId(currentChannelId || "");
    setTestResult(null);
  }, [currentChannelId, open]);

  const handleSave = async () => {
    const success = await onSaveConfig(selectedChannelId);
    if (success) {
      onClose();
    }
  };

  const handleTest = async () => {
    setTestResult(null);
    const success = await onSendTest();
    if (success) {
      setTestResult({ success: true, message: "Test embed successfully delivered to channel!" });
    } else {
      setTestResult({ success: false, message: "Failed to dispatch test embed. Verify bot channel permissions." });
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => !savingConfig && onClose()}
      title="Moderation Audit Log Settings"
      maxWidth="max-w-lg"
    >
      <div className="space-y-6 pt-2">
        <div>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-4">
            Select the private text channel where Digital Vigital should dispatch automated moderation logs (kicks, bans, timeouts, and warning escalations).
          </p>

          <label className="block text-xs font-mono text-slate-400 uppercase tracking-widest font-bold mb-2">
            Target Discord Channel
          </label>
          <ChannelSelector
            guildId={guildId}
            channels={channels}
            value={selectedChannelId}
            onChange={(val) => {
              setSelectedChannelId(val);
              setTestResult(null);
            }}
            allowedTypes={[0, 5]}
            placeholder="Select a moderation log channel..."
            specialOptions={[
              { value: "", label: "None / Disabled", description: "Disable automated mod logging" },
            ]}
          />
        </div>

        {/* Test Dispatch Box */}
        {selectedChannelId && (
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-white/5 flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-white">Test Bot Permissions</div>
              <div className="text-[11px] text-slate-400">Send a test moderation embed to this channel</div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleTest}
              isLoading={testingLog}
              loadingText="Sending..."
              className="text-xs"
            >
              <Send className="w-3.5 h-3.5 mr-1.5" />
              Send Test
            </Button>
          </div>
        )}

        {testResult && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
              testResult.success
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                : "bg-rose-500/10 border-rose-500/20 text-rose-300"
            }`}
          >
            {testResult.success ? (
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{testResult.message}</span>
          </div>
        )}

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={savingConfig}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            isLoading={savingConfig}
            loadingText="Saving..."
            className="text-xs px-5 py-2"
          >
            <Check className="w-3.5 h-3.5 mr-1.5" />
            Save Configuration
          </Button>
        </div>
      </div>
    </Modal>
  );
}
