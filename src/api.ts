import { SimulationState, ChatMessage, Announcement } from "./types";

const API_BASE = "/api";

export const api = {
  fetchState: async (): Promise<{ state: SimulationState, activeAnnouncements: Announcement[], currentPhase: string }> => {
    const res = await fetch(`${API_BASE}/state`);
    if (!res.ok) throw new Error("Failed to fetch state");
    return res.json();
  },

  setPhase: async (phase: string, stadiumId: string) => {
    const res = await fetch(`${API_BASE}/state/phase`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phase, stadiumId })
    });
    if (!res.ok) throw new Error("Failed to set phase");
    return res.json();
  },

  resolveIncident: async (id: string) => {
    const res = await fetch(`${API_BASE}/incidents/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });
    if (!res.ok) throw new Error("Failed to resolve incident");
    return res.json();
  },

  injectIncident: async (location: string, severity: string, description: string) => {
    const res = await fetch(`${API_BASE}/incidents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ location, severity, description })
    });
    if (!res.ok) throw new Error("Failed to inject incident");
    return res.json();
  },

  applyOptimization: async (id: string) => {
    const res = await fetch(`${API_BASE}/optimizations/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });
    if (!res.ok) throw new Error("Failed to apply optimization");
    return res.json();
  },

  setWeather: async (weather: string) => {
    const res = await fetch(`${API_BASE}/state/weather`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weather })
    });
    if (!res.ok) throw new Error("Failed to set weather");
    return res.json();
  },

  setEvacuation: async (active: boolean) => {
    const res = await fetch(`${API_BASE}/state/evacuation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active })
    });
    if (!res.ok) throw new Error("Failed to set evacuation");
    return res.json();
  },

  redeployStaff: async (gateId: string, change: number) => {
    const res = await fetch(`${API_BASE}/staff/redeploy`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gateId, change })
    });
    if (!res.ok) throw new Error("Failed to redeploy staff");
    return res.json();
  },

  optimizeAI: async () => {
    const res = await fetch(`${API_BASE}/ai/optimize`, {
      method: "POST"
    });
    if (!res.ok) throw new Error("Failed to get AI optimizations");
    return res.json();
  },

  getGuidance: async (message: string, chatHistory: ChatMessage[], userLanguage: string) => {
    const res = await fetch(`${API_BASE}/ai/guidance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, chatHistory, userLanguage })
    });
    if (!res.ok) throw new Error("Failed to get AI guidance");
    return res.json();
  },

  draftBroadcast: async (incidentLocation: string, incidentDescription: string, urgency: string) => {
    const res = await fetch(`${API_BASE}/ai/broadcast-draft`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ incidentLocation, incidentDescription, urgency })
    });
    if (!res.ok) throw new Error("Failed to draft broadcast");
    return res.json();
  },

  publishBroadcast: async (announcement: Announcement) => {
    const res = await fetch(`${API_BASE}/broadcast/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ announcement })
    });
    if (!res.ok) throw new Error("Failed to publish broadcast");
    return res.json();
  },

  clearBroadcast: async (id: string) => {
    const res = await fetch(`${API_BASE}/broadcast/clear`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });
    if (!res.ok) throw new Error("Failed to clear broadcast");
    return res.json();
  }
};
