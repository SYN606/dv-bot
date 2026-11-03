import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  getGuildMeta,
  getTicketConfig,
  updateTicketConfig,
  getTicketPanels,
  saveTicketPanel,
  deleteTicketPanel,
  deployTicketPanel,
  getTicketsList,
  getTicketAnalytics,
  getTicketNotes,
  addTicketNote,
  deleteTicketNote,
  getTicketEvents,
  transitionTicketState,
} from "../../api/client";

export const DEFAULT_TICKET_CONFIG = {
  enabled: false,
  transcript_channel_id: "",
  logging_channel_id: "",
  category_id: "",
  support_role_ids: [],
  max_tickets_per_user: 3,
  ticket_counter: 0,
  channel_name_pattern: "ticket-{number}",
  auto_close_hours: 0,
  save_transcripts: true,
};

export const DEFAULT_PANEL = {
  id: "",
  title: "🎫 Support & Inquiries",
  description: "Need help? Click the button below to open a private ticket.",
  color: "#6366F1",
  image_url: "",
  channel_id: "",
  channel_name_pattern: "",
  button_text: "Open Ticket",
  button_emoji: "📩",
  button_style: "Primary",
  select_placeholder: "Select a department or reason...",
  enable_reason_categories: false,
  reason_categories: [],
};

export function useTickets(guildId: string, showToast?: any) {
  const showToastRef = useRef(showToast);
  useEffect(() => {
    showToastRef.current = showToast;
  }, [showToast]);

  const [config, setConfig] = useState<any>(DEFAULT_TICKET_CONFIG);
  const [initialConfig, setInitialConfig] = useState<any>(DEFAULT_TICKET_CONFIG);
  const [panels, setPanels] = useState<any[]>([]);
  const [ticketsData, setTicketsData] = useState<{ tickets: any[]; total: number }>({ tickets: [], total: 0 });
  const [analytics, setAnalytics] = useState<any>(null);
  const [channels, setChannels] = useState<any[]>([]);
  const [categoryChannels, setCategoryChannels] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [savingPanel, setSavingPanel] = useState(false);
  const [deployingPanelId, setDeployingPanelId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async (force = false) => {
    if (!guildId) return;
    setLoading(true);
    setError(null);

    try {
      const [meta, configRes, panelsRes, ticketsRes, analyticsRes] = await Promise.all([
        getGuildMeta(guildId, force).catch(() => null),
        getTicketConfig(guildId).catch(() => DEFAULT_TICKET_CONFIG),
        getTicketPanels(guildId).catch(() => []),
        getTicketsList(guildId, { limit: 50 }).catch(() => ({ tickets: [], total: 0 })),
        getTicketAnalytics(guildId).catch(() => null),
      ]);

      const rawCategories = Array.isArray(meta?.categories) ? meta.categories : [];
      const rawChannels = Array.isArray(meta?.channels) ? meta.channels : [];
      const textChs = rawChannels.filter((ch: any) => ch.type === 0 || ch.type === 5 || ch.type === undefined);
      const catChs = (rawCategories.length > 0 ? rawCategories : rawChannels.filter((ch: any) => ch.type === 4 || ch.type === "4"))
        .map((cat: any) => ({
          id: String(cat.id),
          name: cat.name || "Unnamed Category",
          type: 4,
        }));

      setChannels(textChs);
      setCategoryChannels(catChs);
      setRoles(meta?.roles || []);
      setAnalytics(analyticsRes);

      const safeConfig = {
        ...DEFAULT_TICKET_CONFIG,
        ...(configRes || {}),
        transcript_channel_id: configRes?.transcript_channel_id || "",
        logging_channel_id: configRes?.logging_channel_id || "",
        category_id: configRes?.category_id || "",
        save_transcripts: configRes?.save_transcripts === undefined ? true : Boolean(configRes.save_transcripts),
        support_role_ids: Array.isArray(configRes?.support_role_ids) ? configRes.support_role_ids : [],
      };

      setConfig(safeConfig);
      setInitialConfig(safeConfig);
      setPanels(Array.isArray(panelsRes) ? panelsRes : []);
      setTicketsData(ticketsRes || { tickets: [], total: 0 });
    } catch (err: any) {
      console.error("[USE TICKETS ERROR]:", err);
      setError(err.message || "Failed to load ticket configuration.");
      showToastRef.current?.("Failed to load ticket settings", "error");
    } finally {
      setLoading(false);
    }
  }, [guildId]);

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

  const saveConfig = useCallback(
    async (overridePayload?: any) => {
      if (!guildId) return;
      setSavingConfig(true);

      try {
        const payloadToSend = overridePayload ? { ...config, ...overridePayload } : config;
        const res = await updateTicketConfig(guildId, payloadToSend);
        const updated = {
          ...DEFAULT_TICKET_CONFIG,
          ...(res?.config || payloadToSend),
        };
        setConfig(updated);
        setInitialConfig(updated);
        showToastRef.current?.("Ticket settings saved successfully!", "success");
        return updated;
      } catch (err: any) {
        console.error("[SAVE TICKET CONFIG ERROR]:", err);
        showToastRef.current?.(err.message || "Failed to save ticket settings", "error");
        return null;
      } finally {
        setSavingConfig(false);
      }
    },
    [guildId, config]
  );

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
          showToastRef.current?.("Ticket panel saved successfully!", "success");
          return res.panel;
        }
      } catch (err: any) {
        showToastRef.current?.(err.message || "Failed to save panel", "error");
        return null;
      } finally {
        setSavingPanel(false);
      }
    },
    [guildId]
  );

  const removePanel = useCallback(
    async (panelId: string) => {
      if (!guildId) return;
      try {
        await deleteTicketPanel(guildId, panelId);
        setPanels((prev) => prev.filter((p) => p.id !== panelId));
        showToastRef.current?.("Panel deleted successfully", "info");
      } catch (err: any) {
        showToastRef.current?.(err.message || "Failed to delete panel", "error");
      }
    },
    [guildId]
  );

  const deploy = useCallback(
    async (panelId: string) => {
      if (!guildId) return;
      setDeployingPanelId(panelId);

      try {
        const res = await deployTicketPanel(guildId, panelId);
        showToastRef.current?.(res?.message || "Ticket panel posted to Discord!", "success");
        const updatedPanels = await getTicketPanels(guildId);
        setPanels(updatedPanels || []);
      } catch (err: any) {
        showToastRef.current?.(err.message || "Failed to deploy panel to channel", "error");
      } finally {
        setDeployingPanelId(null);
      }
    },
    [guildId]
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

  const fetchNotes = useCallback(
    async (ticketId: string) => {
      if (!guildId || !ticketId) return [];
      try {
        return await getTicketNotes(guildId, ticketId);
      } catch (err) {
        console.error("[FETCH NOTES ERROR]:", err);
        return [];
      }
    },
    [guildId]
  );

  const addNote = useCallback(
    async (ticketId: string, content: string) => {
      if (!guildId || !ticketId) return null;
      try {
        const note = await addTicketNote(guildId, ticketId, content);
        showToastRef.current?.("Internal note recorded", "success");
        return note;
      } catch (err: any) {
        showToastRef.current?.(err.message || "Failed to add note", "error");
        return null;
      }
    },
    [guildId]
  );

  const deleteNote = useCallback(
    async (ticketId: string, noteId: string) => {
      if (!guildId || !ticketId || !noteId) return;
      try {
        await deleteTicketNote(guildId, ticketId, noteId);
        showToastRef.current?.("Note deleted", "info");
      } catch (err: any) {
        showToastRef.current?.("Failed to delete note", "error");
      }
    },
    [guildId]
  );

  const fetchEvents = useCallback(
    async (ticketId: string) => {
      if (!guildId || !ticketId) return [];
      try {
        return await getTicketEvents(guildId, ticketId);
      } catch (err) {
        console.error("[FETCH EVENTS ERROR]:", err);
        return [];
      }
    },
    [guildId]
  );

  const transitionTicket = useCallback(
    async (ticketId: string, nextStatus: string, reason?: string) => {
      if (!guildId || !ticketId) return false;
      try {
        await transitionTicketState(guildId, ticketId, nextStatus, reason);
        showToastRef.current?.(`Ticket status changed to ${nextStatus}`, "success");
        await fetchTickets();
        return true;
      } catch (err: any) {
        showToastRef.current?.(err.message || "Status change failed", "error");
        return false;
      }
    },
    [guildId, fetchTickets]
  );

  return {
    config,
    panels,
    ticketsData,
    analytics,
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
    fetchNotes,
    addNote,
    deleteNote,
    fetchEvents,
    transitionTicket,
    refresh: fetchAll,
  };
}
