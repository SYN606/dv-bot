import { useState, useEffect, useCallback, useMemo } from "react";
import {
  getGuildMeta,
  getTicketConfig,
  updateTicketConfig,
  getTicketPanels,
  saveTicketPanel,
  deleteTicketPanel,
  deployTicketPanel,
  getTicketsList,
} from "../../api/client";

export const DEFAULT_TICKET_CONFIG = {
  enabled: false,
  transcript_channel_id: "",
  category_id: "",
  support_role_ids: [],
  max_tickets_per_user: 3,
  auto_close_hours: 0,
};

export const DEFAULT_PANEL = {
  id: "",
  title: "🎫 Support & Inquiries",
  description: "Need help? Select the appropriate department or reason from the menu below to open a private ticket.",
  color: "#6366F1",
  image_url: "",
  channel_id: "",
  button_text: "Open Ticket",
  button_emoji: "📩",
  button_style: "Primary",
  select_placeholder: "Select a department or reason...",
  enable_reason_categories: true,
  reason_categories: [
    {
      id: "general",
      label: "General Support",
      emoji: "❓",
      description: "Questions, community help, or server feedback",
      require_reason: false,
    },
    {
      id: "report",
      label: "Player Report",
      emoji: "🚨",
      description: "Report harassment, rule breakers, or scams",
      require_reason: true,
    },
    {
      id: "billing",
      label: "Billing & Store",
      emoji: "💳",
      description: "Payment issues, store perks, or donation inquiries",
      require_reason: true,
    },
  ],
};

export function useTickets(guildId: string, showToast?: any) {
  const [config, setConfig] = useState<any>(DEFAULT_TICKET_CONFIG);
  const [initialConfig, setInitialConfig] = useState<any>(DEFAULT_TICKET_CONFIG);
  const [panels, setPanels] = useState<any[]>([]);
  const [ticketsData, setTicketsData] = useState<{ tickets: any[]; total: number }>({ tickets: [], total: 0 });
  const [channels, setChannels] = useState<any[]>([]);
  const [categoryChannels, setCategoryChannels] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [savingPanel, setSavingPanel] = useState(false);
  const [deployingPanelId, setDeployingPanelId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!guildId) return;
    setLoading(true);
    setError(null);

    try {
      const [meta, configRes, panelsRes, ticketsRes] = await Promise.all([
        getGuildMeta(guildId).catch(() => null),
        getTicketConfig(guildId).catch(() => DEFAULT_TICKET_CONFIG),
        getTicketPanels(guildId).catch(() => []),
        getTicketsList(guildId, { limit: 25 }).catch(() => ({ tickets: [], total: 0 })),
      ]);

      const rawChannels = meta?.channels || [];
      const textChs = rawChannels.filter((ch: any) => ch.type === 0 || ch.type === 5 || ch.type === undefined);
      const catChs = rawChannels.filter((ch: any) => ch.type === 4);

      setChannels(textChs);
      setCategoryChannels(catChs);
      setRoles(meta?.roles || []);

      const safeConfig = {
        ...DEFAULT_TICKET_CONFIG,
        ...(configRes || {}),
        transcript_channel_id: configRes?.transcript_channel_id || "",
        category_id: configRes?.category_id || "",
        support_role_ids: Array.isArray(configRes?.support_role_ids) ? configRes.support_role_ids : [],
      };

      setConfig(safeConfig);
      setInitialConfig(safeConfig);
      setPanels(Array.isArray(panelsRes) ? panelsRes : []);
      setTicketsData(ticketsRes || { tickets: [], total: 0 });
    } catch (err: any) {
      console.error("[USE TICKETS ERROR]:", err);
      setError(err.message || "Failed to load ticket configuration.");
      showToast?.("Failed to load ticket settings", "error");
    } finally {
      setLoading(false);
    }
  }, [guildId, showToast]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const updateConfigField = useCallback((key: string, value: any) => {
    setConfig((prev: any) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const hasConfigChanges = useMemo(() => {
    return JSON.stringify(config) !== JSON.stringify(initialConfig);
  }, [config, initialConfig]);

  const saveConfig = useCallback(async () => {
    if (!guildId) return;
    setSavingConfig(true);

    try {
      const res = await updateTicketConfig(guildId, config);
      const updated = {
        ...DEFAULT_TICKET_CONFIG,
        ...(res?.config || config),
      };
      setConfig(updated);
      setInitialConfig(updated);
      showToast?.("Ticket settings saved successfully!", "success");
    } catch (err: any) {
      console.error("[SAVE TICKET CONFIG ERROR]:", err);
      showToast?.(err.message || "Failed to save ticket settings", "error");
    } finally {
      setSavingConfig(false);
    }
  }, [guildId, config, showToast]);

  const savePanel = useCallback(
    async (panelData: any) => {
      if (!guildId) return;
      setSavingPanel(true);

      try {
        const res = await saveTicketPanel(guildId, panelData);
        if (res?.panel) {
          setPanels((prev) => {
            const idx = prev.findIndex((p) => p.id === res.panel.id);
            if (idx >= 0) {
              const copy = [...prev];
              copy[idx] = res.panel;
              return copy;
            }
            return [...prev, res.panel];
          });
          showToast?.("Ticket panel saved successfully!", "success");
          return res.panel;
        }
      } catch (err: any) {
        showToast?.(err.message || "Failed to save panel", "error");
      } finally {
        setSavingPanel(false);
      }
    },
    [guildId, showToast]
  );

  const removePanel = useCallback(
    async (panelId: string) => {
      if (!guildId) return;
      try {
        await deleteTicketPanel(guildId, panelId);
        setPanels((prev) => prev.filter((p) => p.id !== panelId));
        showToast?.("Panel deleted successfully", "info");
      } catch (err: any) {
        showToast?.(err.message || "Failed to delete panel", "error");
      }
    },
    [guildId, showToast]
  );

  const deploy = useCallback(
    async (panelId: string) => {
      if (!guildId) return;
      setDeployingPanelId(panelId);

      try {
        const res = await deployTicketPanel(guildId, panelId);
        showToast?.(res?.message || "Ticket panel posted to Discord!", "success");
        const updatedPanels = await getTicketPanels(guildId);
        setPanels(updatedPanels || []);
      } catch (err: any) {
        showToast?.(err.message || "Failed to deploy panel to channel", "error");
      } finally {
        setDeployingPanelId(null);
      }
    },
    [guildId, showToast]
  );

  const fetchTickets = useCallback(
    async (status = "all") => {
      if (!guildId) return;
      try {
        const res = await getTicketsList(guildId, { status, limit: 50 });
        setTicketsData(res || { tickets: [], total: 0 });
      } catch (err) {
        console.error("[FETCH TICKETS ERROR]:", err);
      }
    },
    [guildId]
  );

  return {
    config,
    panels,
    ticketsData,
    channels,
    categoryChannels,
    roles,
    loading,
    savingConfig,
    savingPanel,
    deployingPanelId,
    hasConfigChanges,
    error,
    updateConfigField,
    saveConfig,
    savePanel,
    removePanel,
    deploy,
    fetchTickets,
    refresh: fetchAll,
  };
}
