import React, { useState, useEffect, useRef } from "react";
import {
  SimulationState,
  GateStatus,
  TransitHub,
  RoadStatus,
  CrowdIncident,
  OptimizationAction,
  ChatMessage,
  Announcement
} from "./types";
import { StadiumMap } from "./components/StadiumMap";
import {
  Compass,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  Volume2,
  Users,
  Train,
  Bus,
  Car,
  Clock,
  Send,
  Sparkles,
  RefreshCw,
  Plus,
  Trash2,
  Languages,
  ShieldAlert,
  ArrowRight,
  Accessibility,
  Check,
  ChevronRight,
  WifiOff,
  Lightbulb
} from "lucide-react";

export default function App() {
  // Core states
  const [state, setState] = useState<SimulationState | null>(null);
  const [activeAnnouncements, setActiveAnnouncements] = useState<Announcement[]>([]);
  const [currentPhase, setCurrentPhase] = useState<"ingress" | "halftime" | "egress">("ingress");
  const [selectedStadiumId, setSelectedStadiumId] = useState<string>("metlife");

  // Interaction / Selection states
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [selectedAssetName, setSelectedAssetName] = useState<string>("");
  const [selectedAssetType, setSelectedAssetType] = useState<'gate' | 'transit' | 'road' | 'incident' | ''>("");
  const [selectedAssetDetails, setSelectedAssetDetails] = useState<string>("");

  // Chat states
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    {
      id: "msg_init",
      sender: "system",
      text: "👋 Welcome to FIFA 2026 Arena Volunt-AI Guidance. I am connected directly to stadium control systems to assist with route optimization, traffic bypasses, and multi-lingual help.",
      timestamp: new Date().toLocaleTimeString()
    }
  ]);
  const [currentMessage, setCurrentMessage] = useState<string>("");
  const [userLanguage, setUserLanguage] = useState<string>("English");
  const [loadingGuidance, setLoadingGuidance] = useState<boolean>(false);
  const [localTime, setLocalTime] = useState<string>("");

  useEffect(() => {
    setLocalTime(new Date().toLocaleTimeString());
    const interval = setInterval(() => {
      setLocalTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Forms states
  const [incidentForm, setIncidentForm] = useState({
    location: "",
    severity: "WARNING" as "INFO" | "WARNING" | "CRITICAL",
    description: ""
  });
  const [showIncidentForm, setShowIncidentForm] = useState(false);

  const [broadcastForm, setBroadcastForm] = useState({
    location: "Gate C Perimeter",
    description: "Ticket scanner hardware malfunction. Use alternate gates.",
    urgency: "HIGH"
  });
  const [announcementDraft, setAnnouncementDraft] = useState<Announcement | null>(null);
  const [draftingAnnouncement, setDraftingAnnouncement] = useState<boolean>(false);

  // Global loading states
  const [loadingAI, setLoadingAI] = useState<boolean>(false);
  const [operationLogs, setOperationLogs] = useState<string[]>([
    "System booted. MetLife Stadium configuration loaded.",
    "Real-time GPS road sensors online.",
    "Pedestrian camera density counters active."
  ]);

  // Chat scroll anchor
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Initial load
  useEffect(() => {
    fetchState();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const addLog = (message: string) => {
    const time = new Date().toLocaleTimeString();
    setOperationLogs(prev => [`[${time}] ${message}`, ...prev.slice(0, 15)]);
  };

  const fetchState = async () => {
    try {
      const res = await fetch("/api/state");
      if (res.ok) {
        const data = await res.json();
        setState(data.state);
        setActiveAnnouncements(data.activeAnnouncements);
        setCurrentPhase(data.currentPhase);
        setSelectedStadiumId(data.state.stadium.id);
      }
    } catch (e) {
      console.error("Failed to fetch state:", e);
    }
  };

  const handlePhaseChange = async (phase: "ingress" | "halftime" | "egress", stadiumId?: string) => {
    try {
      addLog(`Transitioning phase to ${phase.toUpperCase()} for stadium ${stadiumId || selectedStadiumId}...`);
      const res = await fetch("/api/state/phase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phase, stadiumId: stadiumId || selectedStadiumId })
      });
      if (res.ok) {
        const data = await res.json();
        setState(data.state);
        setActiveAnnouncements(data.activeAnnouncements);
        setCurrentPhase(data.currentPhase);
        addLog(`Successfully loaded ${data.state.stadium.name} ${phase.toUpperCase()} state.`);
      }
    } catch (e) {
      console.error("Failed to change simulation phase:", e);
    }
  };

  const handleResolveIncident = async (id: string, location: string) => {
    try {
      addLog(`Initiating safety crews to resolve: ${location}...`);
      const res = await fetch("/api/incidents/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        const updatedState = await res.json();
        setState(updatedState);
        addLog(`RESOLVED: Incident at ${location} has been successfully cleared.`);
        if (selectedAssetId === id) {
          setSelectedAssetId(null);
        }
      }
    } catch (e) {
      console.error("Failed to resolve incident:", e);
    }
  };

  const handleCreateIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incidentForm.location || !incidentForm.description) return;

    try {
      addLog(`REPORTED: New ${incidentForm.severity} incident at ${incidentForm.location}.`);
      const res = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(incidentForm)
      });
      if (res.ok) {
        const updatedState = await res.json();
        setState(updatedState);
        setIncidentForm({ location: "", severity: "WARNING", description: "" });
        setShowIncidentForm(false);
      }
    } catch (e) {
      console.error("Failed to create incident:", e);
    }
  };

  const handleApplyOptimization = async (id: string, title: string) => {
    try {
      addLog(`APPLYING DYNAMIC ADJUSTMENT: ${title}...`);
      const res = await fetch("/api/optimizations/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        const updatedState = await res.json();
        setState(updatedState);
        addLog(`APPLIED: "${title}" is now active in stadium control systems.`);
      }
    } catch (e) {
      console.error("Failed to apply optimization:", e);
    }
  };

  // Gemini API Calls

  const handleTriggerAIOptimize = async () => {
    setLoadingAI(true);
    addLog("Requesting Gemini operations model to generate custom traffic optimization strategies...");
    try {
      const res = await fetch("/api/ai/optimize", {
        method: "POST"
      });
      if (res.ok) {
        const data = await res.json();
        if (state) {
          setState({
            ...state,
            optimizations: data.optimizations
          });
        }
        addLog("Gemini Model analysis complete. Proactive control strategies injected.");
      }
    } catch (e) {
      console.error("Failed to fetch AI optimizations:", e);
      addLog("Failed to reach Gemini AI services. Simulator loaded pre-configured rules.");
    } finally {
      setLoadingAI(false);
    }
  };

  const handleDraftAnnouncement = async () => {
    setDraftingAnnouncement(true);
    addLog(`Invoking Gemini to draft formal multilingual public advisory for: ${broadcastForm.location}...`);
    try {
      const res = await fetch("/api/ai/broadcast-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incidentLocation: broadcastForm.location,
          incidentDescription: broadcastForm.description,
          urgency: broadcastForm.urgency
        })
      });
      if (res.ok) {
        const data = await res.json();
        setAnnouncementDraft(data.draft);
        addLog(`Gemini drafted dynamic notice: "${data.draft.title}" with English, Spanish, French translations.`);
      }
    } catch (e) {
      console.error("Failed to draft announcement:", e);
      addLog("Error drafting notice with Gemini AI.");
    } finally {
      setDraftingAnnouncement(false);
    }
  };

  const handlePublishAnnouncement = async () => {
    if (!announcementDraft) return;
    try {
      const res = await fetch("/api/broadcast/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ announcement: announcementDraft })
      });
      if (res.ok) {
        const data = await res.json();
        setActiveAnnouncements(data.activeAnnouncements);
        addLog(`BROADCASTED: "${announcementDraft.title}" is now flashing on stadium screens.`);
        setAnnouncementDraft(null);
      }
    } catch (e) {
      console.error("Failed to publish announcement:", e);
    }
  };

  const handleClearAnnouncement = async (id: string, title: string) => {
    try {
      const res = await fetch("/api/broadcast/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        const data = await res.json();
        setActiveAnnouncements(data.activeAnnouncements);
        addLog(`DEACTIVATED BROADCAST: "${title}" removed from screens.`);
      }
    } catch (e) {
      console.error("Failed to clear announcement:", e);
    }
  };

  const handleSendChatMessage = async (msgText: string) => {
    if (!msgText.trim()) return;

    // Add user message immediately
    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      sender: "user",
      text: msgText,
      timestamp: new Date().toLocaleTimeString()
    };

    setChatHistory(prev => [...prev, userMsg]);
    setCurrentMessage("");
    setLoadingGuidance(true);

    try {
      const res = await fetch("/api/ai/guidance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msgText,
          chatHistory: [...chatHistory, userMsg],
          userLanguage
        })
      });

      if (res.ok) {
        const data = await res.json();
        setChatHistory(prev => [...prev, data.message]);
      } else {
        throw new Error("Guidance endpoint error");
      }
    } catch (e) {
      console.error("Chat Guidance Error:", e);
      const errorMsg: ChatMessage = {
        id: `err_${Date.now()}`,
        sender: "ai",
        text: "⚠️ I had trouble connecting to the real-time AI core. However, looking at local backups: Please note Gate C is highly choked (36 min delay). Use Gate B or D for faster entrance! How else can I assist you?",
        timestamp: new Date().toLocaleTimeString()
      };
      setChatHistory(prev => [...prev, errorMsg]);
    } finally {
      setLoadingGuidance(false);
    }
  };

  const selectAssetOnMap = (id: string, name: string, type: 'gate' | 'transit' | 'road' | 'incident', details: string) => {
    setSelectedAssetId(id || null);
    setSelectedAssetName(name);
    setSelectedAssetType(type);
    setSelectedAssetDetails(details);
    if (id) {
      addLog(`Selected asset: ${name} (${type.toUpperCase()})`);
    }
  };

  // Helper calculation constants
  const activeCriticalIncidents = state?.incidents.filter(i => !i.resolved && i.severity === "CRITICAL").length || 0;
  const activeWarningIncidents = state?.incidents.filter(i => !i.resolved && i.severity === "WARNING").length || 0;

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-200 flex flex-col font-sans selection:bg-blue-600 selection:text-white" id="main-application-container">
      
      {/* GLOBAL ACTIVE EMERGENCY SCROLLING TICKER */}
      {activeAnnouncements.some(a => a.broadcastActive) && (
        <div className="bg-red-950/90 border-b border-red-700/50 py-1.5 px-4 overflow-hidden relative flex items-center z-50 shadow-md">
          <div className="bg-red-600 text-white text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded flex items-center gap-1 shrink-0 animate-pulse font-mono">
            <Volume2 className="w-3.5 h-3.5" /> LIVE BROADCAST TICKER
          </div>
          <div className="ml-4 flex gap-8 animate-marquee whitespace-nowrap text-xs font-mono font-medium text-red-200">
            {activeAnnouncements.filter(a => a.broadcastActive).map((ann, i) => (
              <span key={ann.id} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-red-400 rounded-full" />
                <strong>[{ann.title}]</strong> {ann.content} (Target: {ann.targetAudience})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* TOP NAVIGATION HEADER */}
      <header className="px-6 py-3.5 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 flex flex-col md:flex-row items-center justify-between gap-4 sticky top-0 z-40 shadow-xl shadow-slate-950/25" id="main-header">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-indigo-500 to-emerald-500 rounded-lg flex items-center justify-center font-display font-extrabold text-white shadow-lg shadow-indigo-500/10 text-xs tracking-wider border border-white/10 animate-pulse">
            CIQ
          </div>
          <div>
            <h1 className="text-base font-display font-bold tracking-tight text-white leading-none uppercase">CROWDIQ OPS COMMAND CENTER</h1>
            <p className="text-[10px] text-slate-400 font-mono tracking-widest mt-1.5 flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
              CrowdIQ Live Intelligence • FIFA World Cup 2026 • MetLife Stadium
            </p>
          </div>
        </div>

        {/* SIMULATOR STADIUM & MATCH STAGE SELECTOR */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-900/90 border border-slate-800/85 p-1 rounded-lg shadow-inner">
          <div className="flex items-center gap-1.5 px-2">
            <span className="text-[9px] text-slate-400 font-mono uppercase tracking-wider font-semibold">Arena:</span>
            <select
              value={selectedStadiumId}
              onChange={(e) => {
                setSelectedStadiumId(e.target.value);
                handlePhaseChange(currentPhase, e.target.value);
              }}
              className="bg-slate-950 border border-slate-800 text-xs text-white rounded-md px-2 py-1 font-sans focus:outline-none focus:ring-1 focus:ring-blue-500/60 focus:border-blue-500/80 transition-all"
            >
              <option value="metlife">MetLife Stadium (NY/NJ)</option>
              <option value="azteca">Estadio Azteca (Mexico City)</option>
              <option value="sofi">SoFi Stadium (Los Angeles)</option>
            </select>
          </div>

          <div className="h-5 w-[1px] bg-slate-800" />

          <div className="flex items-center gap-1 px-1">
            <button
              onClick={() => handlePhaseChange("ingress")}
              className={`text-xs px-3 py-1 rounded-md transition-all font-medium ${
                currentPhase === "ingress"
                  ? "bg-blue-600 text-white shadow shadow-blue-600/20 font-semibold scale-102"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
              title="Simulate Ingress pre-match flow"
            >
              Ingress
            </button>
            <button
              onClick={() => handlePhaseChange("halftime")}
              className={`text-xs px-3 py-1 rounded-md transition-all font-medium ${
                currentPhase === "halftime"
                  ? "bg-blue-600 text-white shadow shadow-blue-600/20 font-semibold scale-102"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
              title="Simulate halftime intermission surge"
            >
              Halftime
            </button>
            <button
              onClick={() => handlePhaseChange("egress")}
              className={`text-xs px-3 py-1 rounded-md transition-all font-medium ${
                currentPhase === "egress"
                  ? "bg-blue-600 text-white shadow shadow-blue-600/20 font-semibold scale-102"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
              title="Simulate post-match massive exit flow"
            >
              Egress
            </button>
          </div>

          <button
            onClick={fetchState}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
            title="Force full state sync"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex gap-4">
            {state && (
              <div className="text-right">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Attendance</p>
                <p className="text-sm font-mono font-bold text-emerald-400">
                  {state.stadium.currentAttendance.toLocaleString()} / {state.stadium.capacity.toLocaleString()}
                </p>
              </div>
            )}
            <div className="text-right border-l border-slate-700 pl-4">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Local Time</p>
              <p className="text-sm font-mono font-bold text-white">{localTime || "18:42:05 EDT"}</p>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shadow-lg">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          </div>
        </div>
      </header>

      {/* SYSTEM META OVERVIEW */}
      {state && (
        <section className="bg-slate-900/40 border-b border-slate-700/50 px-6 py-2 text-xs font-mono" id="sub-header-banner">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-2 text-slate-400">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="flex items-center gap-1 text-white font-semibold">
                🏟️ Match Info: <span className="text-blue-400">{state.stadium.matchInfo}</span>
              </span>
              <span>•</span>
              <span className="text-slate-300">City: {state.stadium.city}</span>
              <span>•</span>
              <span className="text-slate-300">Phase: <span className="text-emerald-400 font-bold uppercase">{currentPhase}</span> ({state.stadium.timeToKickoff})</span>
            </div>
            <div className="text-[11px] text-slate-500">
              Last Telemetry: {new Date(state.lastUpdated).toLocaleTimeString()}
            </div>
          </div>
        </section>
      )}

      {/* MAIN LAYOUT CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 grid grid-cols-1 lg:grid-cols-12 gap-5" id="dashboard-grid-container">
        
        {/* LEFT COLUMN (Lg: 4/12): STADIUM OPERATIONS MONITOR (Telemetry Data) */}
        <section className="lg:col-span-4 flex flex-col gap-4" id="operations-telemetry-column">
          
          {/* STADIUM CAPACITY & ATTENDANCE METER */}
          {state && (
            <div className="bg-[#111827]/80 backdrop-blur-md border border-slate-700/60 rounded-xl p-4 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono text-slate-400 uppercase tracking-wider font-semibold">
                  🏟️ ARENA FILL RATE
                </span>
                <span className="text-xs font-mono font-bold text-blue-400">
                  {Math.round((state.stadium.currentAttendance / state.stadium.capacity) * 100)}% Capacity
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden mb-2.5">
                <div
                  className="bg-gradient-to-r from-blue-500 to-emerald-500 h-full rounded-full transition-all duration-1000"
                  style={{ width: `${(state.stadium.currentAttendance / state.stadium.capacity) * 100}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <div>
                  <span className="text-slate-500">Live Attendance</span>
                  <span className="block text-white font-bold font-sans text-sm">
                    {state.stadium.currentAttendance.toLocaleString()}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500">Max Seat Count</span>
                  <span className="block text-white font-bold font-sans text-sm">
                    {state.stadium.capacity.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* PORTALS & GATES LIST */}
          <div className="bg-[#111827]/80 backdrop-blur-md border border-slate-700/60 rounded-xl p-4 shadow-xl">
            <h3 className="font-display font-semibold text-sm text-white mb-3 tracking-wide uppercase flex items-center justify-between">
              <span>🚪 PORTALS & GATE QUEUES</span>
              <span className="text-[10px] font-mono text-slate-500">Normal Flow: ~10m</span>
            </h3>

            <div className="flex flex-col gap-2.5 max-h-[280px] overflow-y-auto pr-1">
              {state?.gates.map((gate) => {
                const isSelected = selectedAssetId === gate.id;
                return (
                  <div
                    key={gate.id}
                    onClick={() => selectAssetOnMap(gate.id, gate.name, 'gate', `Throughput is currently ${gate.throughputRate} fans/minute with ${gate.assignedVolunteers} active lane monitors.`)}
                    className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                      isSelected
                        ? "bg-blue-950/40 border-blue-500/80 shadow-md"
                        : "bg-slate-800/40 border-slate-700/40 hover:border-slate-600 hover:bg-slate-800/60"
                    }`}
                  >
                    <div className="flex items-center justify-between font-medium mb-1.5">
                      <span className="text-white flex items-center gap-1.5 font-sans font-semibold">
                        <span className={`w-2 h-2 rounded-full ${
                          gate.status === "OPEN" ? "bg-green-500" :
                          gate.status === "CONGESTED" ? "bg-amber-500" : "bg-red-500"
                        }`} />
                        {gate.name}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                        gate.status === "OPEN" ? "bg-green-950 text-green-400 border border-green-900/40" :
                        gate.status === "CONGESTED" ? "bg-amber-950 text-amber-400 border border-amber-900/40" : "bg-red-950 text-red-400 border border-red-900/40"
                      }`}>
                        {gate.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-[11px] font-mono text-slate-400 mt-1">
                      <div>
                        <span className="text-slate-500 text-[10px] block">Queue count</span>
                        <span className="text-white font-sans font-semibold text-[13px]">
                          {gate.queueCount.toLocaleString()} <span className="text-[10px] text-slate-500 font-normal">fans</span>
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block">Wait Time</span>
                        <span className={`font-sans font-bold text-[13px] ${
                          gate.avgWaitTime > 25 ? "text-red-400" :
                          gate.avgWaitTime > 12 ? "text-amber-400" : "text-green-400"
                        }`}>
                          {gate.avgWaitTime} <span className="text-[10px] font-normal text-slate-500">mins</span>
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-500 text-[10px] block">Throughput</span>
                        <span className="text-white font-sans font-semibold">
                          {gate.throughputRate} <span className="text-[10px] font-normal text-slate-500">/min</span>
                        </span>
                      </div>
                    </div>

                    <div className="mt-2 pt-1.5 border-t border-slate-700/60 flex items-center justify-between text-[10px] text-slate-500">
                      <span className="flex items-center gap-0.5">
                        👤 {gate.assignedVolunteers} volunteers
                      </span>
                      {gate.accessibilityFriendly ? (
                        <span className="text-emerald-400 flex items-center gap-0.5 font-mono">
                          <Accessibility className="w-3 h-3" /> Step-Free Access
                        </span>
                      ) : (
                        <span className="text-slate-500 flex items-center gap-0.5 font-mono">
                          ⚠️ Stairs Only
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* PARKING & TRANSIT METRICS */}
          <div className="bg-[#111827]/80 backdrop-blur-md border border-slate-700/60 rounded-xl p-4 shadow-xl">
            <h3 className="font-display font-semibold text-sm text-white mb-3 tracking-wide uppercase flex items-center justify-between">
              <span>🚍 PARKING & TRANSIT LOAD</span>
              <span className="text-[10px] font-mono text-slate-500">Flow Rating</span>
            </h3>

            <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
              {state?.transit.map((hub) => {
                const isSelected = selectedAssetId === hub.id;
                return (
                  <div
                    key={hub.id}
                    onClick={() => selectAssetOnMap(hub.id, hub.name, 'transit', `Transit vehicle frequency has been set to high flow with dynamic metering rules applied.`)}
                    className={`p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                      isSelected
                        ? "bg-blue-950/40 border-blue-500/80 shadow"
                        : "bg-slate-800/40 border-slate-700/40 hover:border-slate-600 hover:bg-slate-800/60"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-white font-semibold flex items-center gap-1.5 font-sans">
                        {hub.type === "TRAIN" ? <Train className="w-3.5 h-3.5 text-blue-400" /> :
                         hub.type === "SHUTTLE" ? <Bus className="w-3.5 h-3.5 text-emerald-400" /> :
                         hub.type === "RIDESHARE" ? <Users className="w-3.5 h-3.5 text-indigo-400" /> :
                         <Car className="w-3.5 h-3.5 text-amber-400" />}
                        {hub.name}
                      </span>
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold ${
                        hub.status === "FLUID" ? "bg-green-950 text-green-400 border border-green-900/40" :
                        hub.status === "MODERATE" ? "bg-amber-950 text-amber-400 border border-amber-900/40" : "bg-red-950 text-red-400 border border-red-900/40"
                      }`}>
                        {hub.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-gray-400">
                      <div>
                        <span className="text-slate-500 text-[10px] block">Delay / Wait</span>
                        <span className="text-white font-sans font-semibold">
                          {hub.avgWaitTime} minutes
                        </span>
                      </div>
                      <div className="text-right">
                        {hub.availableSpaces !== undefined ? (
                          <>
                            <span className="text-slate-500 text-[10px] block">Spaces left</span>
                            <span className="text-emerald-400 font-sans font-semibold">
                              {hub.availableSpaces.toLocaleString()}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="text-slate-500 text-[10px] block">Queue Load</span>
                            <span className="text-white font-sans font-semibold">
                              {hub.currentLoad}% Load
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </section>

        {/* MIDDLE COLUMN (Lg: 5/12): AERIAL MAP VISUALIZER & LIVE INCIDENT FEED */}
        <section className="lg:col-span-5 flex flex-col gap-4" id="main-map-column">
          
          {/* STADIUM INTERACTIVE MAP */}
          {state && (
            <StadiumMap
              gates={state.gates}
              transit={state.transit}
              roads={state.roads}
              incidents={state.incidents}
              selectedAssetId={selectedAssetId}
              onSelectAsset={selectAssetOnMap}
            />
          )}

          {/* ACTIVE ROADWAY CORRIDORS */}
          <div className="bg-[#111827]/80 backdrop-blur-md border border-slate-700/60 rounded-xl p-4 shadow-xl">
            <h3 className="font-display font-semibold text-sm text-white mb-3 tracking-wide uppercase">
              🛣️ ACCESS ROADWAYS & CONGESTION
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {state?.roads.map((road) => {
                const isSelected = selectedAssetId === road.id;
                return (
                  <div
                    key={road.id}
                    onClick={() => selectAssetOnMap(road.id, road.name, 'road', `${road.name} direction delay is ${road.delayMinutes} mins. Contraflow configuration: ${road.laneControlsActive ? 'ACTIVE' : 'OFF'}`)}
                    className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                      isSelected
                        ? "bg-blue-950/40 border-blue-500/80 shadow"
                        : "bg-slate-800/40 border-slate-700/40 hover:border-slate-600 hover:bg-slate-800/60"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white font-semibold font-sans block">
                        {road.name}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {road.direction}
                      </span>
                    </div>

                    <div className="flex items-center justify-between font-mono text-[11px] mt-1.5 text-slate-400">
                      <span>Congestion:</span>
                      <span className={`font-bold ${
                        road.congestion === "LOW" ? "text-green-400" :
                        road.congestion === "MEDIUM" ? "text-amber-400" : "text-red-400"
                      }`}>
                        {road.congestion}
                      </span>
                    </div>

                    <div className="flex items-center justify-between font-mono text-[11px] text-slate-400 mt-0.5">
                      <span>Speed:</span>
                      <span className="text-white font-semibold">{road.avgSpeed} mph</span>
                    </div>

                    <div className="flex items-center justify-between font-mono text-[11px] text-slate-400 mt-0.5">
                      <span>Delay:</span>
                      <span className={`font-bold ${road.delayMinutes > 15 ? "text-red-400" : "text-white"}`}>
                        +{road.delayMinutes} mins
                      </span>
                    </div>

                    {road.laneControlsActive && (
                      <div className="mt-2 bg-blue-950/85 border border-blue-500/30 text-blue-400 text-[9px] font-mono font-bold rounded py-0.5 px-2 text-center">
                        🔄 CONTRAFLOW REVERSIBLE ACTIVE
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* INCIDENT OPERATIONS FEED */}
          <div className="bg-[#111827]/80 backdrop-blur-md border border-slate-700/60 rounded-xl p-4 shadow-xl flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display font-semibold text-sm text-white tracking-wide uppercase flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  INCIDENT RESPONSE COMMAND
                </h3>
                <span className="bg-red-950 text-red-400 border border-red-900/60 text-[10px] font-mono px-2 py-0.5 rounded font-bold">
                  {state?.incidents.filter(i => !i.resolved).length || 0} ACTIVE
                </span>
              </div>

              {/* Incidents List */}
              <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto mb-3 pr-1">
                {state?.incidents.length === 0 ? (
                  <p className="text-xs text-slate-500 font-mono text-center py-4">
                    No active incidents reported. Stadium operations smooth.
                  </p>
                ) : (
                  state?.incidents.map((inc) => (
                    <div
                      key={inc.id}
                      className={`p-2.5 rounded-lg border text-xs flex flex-col justify-between gap-1.5 transition-all ${
                        inc.resolved
                          ? "bg-slate-900/40 border-slate-900 opacity-60"
                          : inc.severity === "CRITICAL"
                            ? "bg-red-950/20 border-red-900/60"
                            : "bg-amber-950/20 border-amber-900/60"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-semibold text-white block">
                            📍 {inc.location}
                          </span>
                          <span className="text-[10px] text-slate-400 mt-0.5 block font-mono">
                            {inc.description}
                          </span>
                        </div>
                        <span className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded ${
                          inc.resolved ? "bg-slate-800 text-slate-400" :
                          inc.severity === "CRITICAL" ? "bg-red-900 text-red-200" : "bg-amber-800 text-amber-100"
                        }`}>
                          {inc.resolved ? "Resolved" : inc.severity}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1 border-t border-slate-700/60">
                        <span>Reported: {new Date(inc.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {!inc.resolved && (
                          <button
                            onClick={() => handleResolveIncident(inc.id, inc.location)}
                            className="bg-emerald-900/80 hover:bg-emerald-800 text-emerald-300 border border-emerald-700/50 px-2 py-0.5 rounded transition-colors cursor-pointer font-sans"
                          >
                            Resolve Issue
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Quick Trigger Form Toggle */}
            <div className="border-t border-slate-700/60 pt-3">
              {!showIncidentForm ? (
                <button
                  onClick={() => setShowIncidentForm(true)}
                  className="w-full bg-slate-900 hover:bg-slate-800 border border-slate-700/60 text-slate-300 text-xs py-2 rounded-lg transition-colors font-medium flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Inject Simulated Incident
                </button>
              ) : (
                <form onSubmit={handleCreateIncident} className="bg-[#090d18] border border-slate-700/60 p-3 rounded-lg text-xs flex flex-col gap-2.5 animate-fade-in">
                  <div className="flex justify-between items-center pb-1 border-b border-slate-850">
                    <span className="font-semibold text-white uppercase tracking-wider">INJECT SIMULATED ANOMALY</span>
                    <button
                      type="button"
                      onClick={() => setShowIncidentForm(false)}
                      className="text-slate-400 hover:text-white font-mono text-[10px]"
                    >
                      [CANCEL]
                    </button>
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Incident Area Location:</label>
                    <input
                      type="text"
                      placeholder="e.g. Gate A ticket booths, Lot F corridor"
                      value={incidentForm.location}
                      onChange={(e) => setIncidentForm(prev => ({ ...prev, location: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-slate-400 block mb-1 font-mono">Severity Level:</label>
                      <select
                        value={incidentForm.severity}
                        onChange={(e) => setIncidentForm(prev => ({ ...prev, severity: e.target.value as any }))}
                        className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white focus:outline-none focus:border-blue-500"
                      >
                        <option value="INFO">INFO (Normal Surge)</option>
                        <option value="WARNING">WARNING (Scanner Halt)</option>
                        <option value="CRITICAL">CRITICAL (Platform Block)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-slate-400 block mb-1">Simulate Anomaly:</label>
                      <button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-1 px-2 rounded cursor-pointer h-[26px] mt-[1px] transition-all"
                      >
                        Trigger Hotspot
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Impact description:</label>
                    <input
                      type="text"
                      placeholder="Scanner failure or pedestrian congestion reasons"
                      value={incidentForm.description}
                      onChange={(e) => setIncidentForm(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>
                </form>
              )}
            </div>

          </div>

        </section>

        {/* RIGHT COLUMN (Lg: 3/12): AI OPERATIONS DECISION PANEL & MULTILINGUAL ASSISTANT */}
        <section className="lg:col-span-3 flex flex-col gap-4 font-sans" id="ai-operations-column">
          
          {/* GEMINI AI OPTIMIZATION PANEL */}
          <div className="bg-[#111827]/80 backdrop-blur-md border border-slate-700/60 rounded-xl p-4 shadow-xl relative overflow-hidden" id="ai-decision-card">
            
            {/* Ambient visual badge */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-blue-600/10 to-transparent pointer-events-none" />

            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-semibold text-sm text-white tracking-wide uppercase flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-blue-400 animate-pulse" />
                GEMINI AI DISPATCH CORE
              </h3>
              <span className="bg-blue-950 text-blue-400 border border-blue-900/40 text-[9px] font-mono font-bold tracking-wider px-1.5 py-0.5 rounded">
                Grounded Model
              </span>
            </div>

            <p className="text-xs text-slate-400 font-sans leading-relaxed mb-3">
              Evaluate real-time gate processing capacities and traffic delay parameters. Generates custom operations plans.
            </p>

            <button
              onClick={handleTriggerAIOptimize}
              disabled={loadingAI}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold py-2 px-3 rounded-lg flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 transition-all cursor-pointer"
            >
              {loadingAI ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Analyzing Stadium Telemetry...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" /> OPTIMIZE TRAFFIC & GATES
                </>
              )}
            </button>

            {/* AI Recommendations Stream */}
            <div className="mt-4 pt-3 border-t border-slate-700/60 flex flex-col gap-2.5 max-h-[220px] overflow-y-auto pr-1">
              {state?.optimizations.slice(0, 3).map((opt) => (
                <div
                  key={opt.id}
                  className={`p-2.5 rounded-lg text-xs flex flex-col gap-1.5 border transition-all ${
                    opt.applied
                      ? "bg-slate-900/60 border-slate-800 opacity-80"
                      : opt.urgency === "CRITICAL"
                        ? "bg-red-950/20 border-red-900/40"
                        : "bg-slate-800/40 border-slate-700/40 hover:border-slate-600 hover:bg-slate-800/60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-1">
                    <span className="font-semibold text-white block">
                      ⚡ {opt.title}
                    </span>
                    <span className={`text-[8px] font-mono font-bold uppercase px-1 rounded ${
                      opt.urgency === "CRITICAL" ? "bg-red-900 text-red-100 border border-red-700/30" : "bg-blue-900 text-blue-100 border border-blue-700/30"
                    }`}>
                      {opt.urgency}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                    {opt.description}
                  </p>

                  <div className="text-[10px] font-mono text-slate-400 bg-slate-950/40 p-1.5 rounded border border-slate-700/50 mt-1">
                    <span className="text-emerald-400 font-bold block">🎯 Expected Impact:</span>
                    {opt.estimatedImpact}
                  </div>

                  <div className="text-[9px] font-mono text-slate-500 italic mt-0.5 leading-relaxed">
                    <strong>AI Justification:</strong> {opt.aiJustification}
                  </div>

                  <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 pt-1.5 border-t border-slate-700/60 mt-1">
                    <span>Target: {opt.type.replace("_", " ")}</span>
                    {opt.applied ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                        <Check className="w-3.5 h-3.5" /> Applied {opt.appliedAt}
                      </span>
                    ) : (
                      <button
                        onClick={() => handleApplyOptimization(opt.id, opt.title)}
                        className="bg-blue-900/80 hover:bg-blue-800 text-blue-200 border border-blue-700/50 px-2.5 py-0.5 rounded transition-all cursor-pointer font-sans text-[10px]"
                      >
                        Deploy Action
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* DYNAMIC PA/SCREEN BROADCAST WRITER */}
          <div className="bg-[#111827]/80 backdrop-blur-md border border-slate-700/60 rounded-xl p-4 shadow-xl">
            <h3 className="font-display font-semibold text-sm text-white mb-2 tracking-wide uppercase flex items-center gap-1.5">
              <Volume2 className="w-4 h-4 text-emerald-400" />
              DYNAMIC OVERHEAD BROADCASTS
            </h3>
            <p className="text-[11px] text-slate-400 font-sans mb-3">
              Draft official multi-lingual announcements automatically based on stadium incidents.
            </p>

            <div className="flex flex-col gap-2.5 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500 font-mono block mb-1">Incident Area:</label>
                  <select
                    value={broadcastForm.location}
                    onChange={(e) => setBroadcastForm(p => ({ ...p, location: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="Gate C Plaza Entrance">Gate C Main Gate</option>
                    <option value="North Rail Ingress stairs">North Rail Station</option>
                    <option value="East Parking Lot F/G Corridor">East Shuttle Hub</option>
                    <option value="South Overflow Parking Lot H">South Parking H</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-mono block mb-1 font-mono">Urgency Priority:</label>
                  <select
                    value={broadcastForm.urgency}
                    onChange={(e) => setBroadcastForm(p => ({ ...p, urgency: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-white focus:outline-none focus:border-blue-500 font-mono"
                  >
                    <option value="NORMAL">NORMAL</option>
                    <option value="HIGH">HIGH SEVERE</option>
                    <option value="CRITICAL">CRITICAL URGENT</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-500 font-mono block mb-1">Context reason / details:</label>
                <input
                  type="text"
                  value={broadcastForm.description}
                  onChange={(e) => setBroadcastForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Ticket scanner slows down..."
                  className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <button
                onClick={handleDraftAnnouncement}
                disabled={draftingAnnouncement}
                className="w-full bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white text-xs font-medium py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer"
              >
                {draftingAnnouncement ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin" /> Drafting Translations...
                  </>
                ) : (
                  <>
                    <Languages className="w-3.5 h-3.5 text-emerald-400" /> Draft Notice with Gemini
                  </>
                )}
              </button>

              {/* Proposed Announcement Draft Display */}
              {announcementDraft && (
                <div className="bg-slate-950 border border-emerald-900/60 p-2.5 rounded-lg text-[11px] animate-fade-in">
                  <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-slate-800">
                    <span className="font-bold text-emerald-400 uppercase tracking-wide">
                      🎯 GEMINI TRANSLATED DRAFT:
                    </span>
                    <span className="text-[9px] text-slate-500 font-mono">
                      {announcementDraft.languages.join(", ")}
                    </span>
                  </div>
                  <strong className="text-white block mb-1 font-mono text-[11px]">
                    [{announcementDraft.title}]
                  </strong>
                  <p className="text-slate-300 font-mono text-[10px] leading-relaxed mb-2 bg-[#090d18] p-1.5 rounded border border-slate-850 max-h-[100px] overflow-y-auto">
                    {announcementDraft.content}
                  </p>
                  <div className="flex justify-end gap-1.5">
                    <button
                      onClick={() => setAnnouncementDraft(null)}
                      className="text-slate-400 hover:text-white px-2 py-0.5 text-[10px]"
                    >
                      Discard
                    </button>
                    <button
                      onClick={handlePublishAnnouncement}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 text-[10px] font-bold rounded shadow transition-all cursor-pointer"
                    >
                      Publish Alert
                    </button>
                  </div>
                </div>
              )}

              {/* Published List / Deletion */}
              {activeAnnouncements.length > 0 && (
                <div className="mt-1 pt-2 border-t border-slate-700/60">
                  <span className="text-[9px] text-slate-500 font-mono uppercase block mb-1">
                    Live Broadcast boards queue:
                  </span>
                  <div className="flex flex-col gap-1.5 max-h-[100px] overflow-y-auto">
                    {activeAnnouncements.map(ann => (
                      <div key={ann.id} className="bg-[#090d18] border border-slate-800 p-1.5 rounded flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className={`text-[8px] font-bold block ${ann.broadcastActive ? "text-red-400" : "text-gray-500"}`}>
                            {ann.broadcastActive ? "● ACTIVE BROADCAST" : "○ SILENCED"}
                          </span>
                          <span className="font-semibold text-white block text-[10px] truncate">
                            {ann.title}
                          </span>
                        </div>
                        {ann.broadcastActive && (
                          <button
                            onClick={() => handleClearAnnouncement(ann.id, ann.title)}
                            className="text-red-400 hover:text-red-300 font-mono text-[10px]"
                            title="Turn off display board notice"
                          >
                            Mute
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* FIFA VOLUNT-AI GUIDANCE ASSISTANT */}
          <div className="bg-[#111827]/80 backdrop-blur-md border border-slate-700/60 rounded-xl p-4 shadow-xl flex-1 flex flex-col justify-between max-h-[460px]" id="fan-assistance-card">
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-display font-semibold text-sm text-white tracking-wide uppercase flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-emerald-400" />
                  FIFA VOLUNT-AI HELPER
                </h3>
                <div className="flex items-center gap-1 text-[10px] font-mono text-slate-400">
                  <Languages className="w-3.5 h-3.5 text-blue-400" />
                  <select
                    value={userLanguage}
                    onChange={(e) => {
                      setUserLanguage(e.target.value);
                      addLog(`Assistant output language updated to: ${e.target.value}`);
                    }}
                    className="bg-slate-950 text-white rounded px-1.5 py-0.5 border border-slate-700 focus:outline-none font-mono"
                  >
                    <option value="English">English</option>
                    <option value="Spanish">Español</option>
                    <option value="Portuguese">Português</option>
                    <option value="French">Français</option>
                  </select>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed mb-2 font-sans">
                Simulates dynamic, crowd-aware fan directions or staff help grounded in real-time sensor metrics.
              </p>

              {/* Chat Thread */}
              <div className="bg-slate-950/60 border border-slate-700/50 rounded-lg p-2.5 h-[160px] overflow-y-auto flex flex-col gap-2 font-mono text-[11px]">
                {chatHistory.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col gap-1 max-w-[90%] rounded-lg p-2 ${
                      msg.sender === "user"
                        ? "bg-blue-600/20 border border-blue-600/40 text-blue-200 self-end"
                        : msg.sender === "system"
                          ? "bg-slate-900 border border-slate-800 text-slate-400 text-[10px]"
                          : "bg-slate-900/95 border border-slate-800 text-slate-200 self-start"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-[9px] text-slate-500 font-sans pb-0.5 border-b border-slate-800/50">
                      <span className="font-bold uppercase tracking-wider">
                        {msg.sender === "user" ? "FAN / VOLUNTEER" : msg.sender === "system" ? "STADIUM SYS" : "AI VOLUNT-AI"}
                      </span>
                      <span>{msg.timestamp}</span>
                    </div>

                    <p className="leading-relaxed whitespace-pre-wrap mt-0.5">{msg.text}</p>

                    {/* Grounded Route waypoints if present */}
                    {msg.suggestedRoute && (
                      <div className="mt-2 pt-2 border-t border-slate-700/60 text-[10px]">
                        <span className="text-emerald-400 font-sans font-bold flex items-center gap-1">
                          🚗 Dynamic Optimization Path ({msg.suggestedRoute.mode}):
                        </span>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          {msg.suggestedRoute.path.map((wp, wIdx) => (
                            <span key={wIdx} className="flex items-center gap-1">
                              {wIdx > 0 && <ChevronRight className="w-3 h-3 text-slate-600" />}
                              <span className="bg-slate-950 border border-slate-700 text-slate-300 py-0.5 px-1.5 rounded-md font-sans font-medium text-[9px]">
                                {wp}
                              </span>
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center justify-between text-slate-500 mt-1.5 text-[9px]">
                          <span>Wait + Transit Time: <strong className="text-white">{msg.suggestedRoute.travelTime} mins</strong></span>
                          {msg.suggestedRoute.congestedAreas.length > 0 && (
                            <span className="text-red-400">Bottlenecks avoided: {msg.suggestedRoute.congestedAreas.join(", ")}</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {loadingGuidance && (
                  <div className="text-slate-500 animate-pulse flex items-center gap-1 self-start p-1.5 font-sans">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Grounding AI response with live sensor values...
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            </div>

            {/* Quick Actions Shortcuts */}
            <div className="mt-3">
              <span className="text-[9px] text-slate-500 uppercase tracking-wider block mb-1 font-mono">
                Ask Volunt-AI (Tap shortcut):
              </span>
              <div className="flex flex-wrap gap-1 mb-2">
                <button
                  onClick={() => handleSendChatMessage("How do I bypass the massive Gate C crowd delay?")}
                  className="bg-slate-900 hover:bg-slate-800 border border-slate-700/60 rounded py-0.5 px-2 text-[10px] text-slate-300 text-left truncate max-w-[190px] cursor-pointer font-sans"
                >
                  🚪 Bypass Gate C queue delay
                </button>
                <button
                  onClick={() => handleSendChatMessage("I am at South Overflow Parking. How do I get inside?")}
                  className="bg-slate-900 hover:bg-slate-800 border border-slate-700/60 rounded py-0.5 px-2 text-[10px] text-slate-300 text-left truncate max-w-[190px] cursor-pointer font-sans"
                >
                  🚌 Route from Parking H
                </button>
                <button
                  onClick={() => handleSendChatMessage("Is there step-free access for wheelchair users?")}
                  className="bg-slate-900 hover:bg-slate-800 border border-slate-700/60 rounded py-0.5 px-2 text-[10px] text-slate-300 text-left truncate max-w-[190px] cursor-pointer font-sans"
                >
                  ♿ Wheelchair & Accessibility Access
                </button>
              </div>

              {/* Chat Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ask for custom route advice..."
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendChatMessage(currentMessage)}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={() => handleSendChatMessage(currentMessage)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white p-2.5 rounded-lg transition-colors cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          </div>

        </section>

      </main>

      {/* OPERATIONS INCIDENT LOG CONSOLE FOOTER */}
      <footer className="bg-slate-950/40 border-t border-slate-800/80 p-5 mt-8 text-xs font-mono shrink-0" id="main-footer">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex-1 w-full min-w-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 uppercase tracking-wider text-[10px] font-bold flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                📶 REAL-TIME TELEMETRY LOGS (STAFF SECURE NET)
              </span>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-900 border border-slate-800 text-emerald-400">5G NETWORK: OPTIMAL</span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-900 border border-slate-800 text-blue-400">SHUTTLE SYSTEMS: ON TIME</span>
              </div>
            </div>
            <div className="bg-slate-950/80 border border-slate-800/80 p-3 rounded-lg text-[10px] text-slate-400 h-20 overflow-y-auto leading-relaxed scrollbar-thin">
              {operationLogs.map((log, i) => (
                <div key={i} className="truncate">
                  <span className="text-blue-500 mr-2 font-bold">»</span>
                  {log}
                </div>
              ))}
            </div>
          </div>
          <div className="text-right text-[10px] text-slate-500 shrink-0 self-end font-sans">
            CrowdIQ • FIFA World Cup 2026 Host Stadium Command Center • GenAI Secured Proxy API
          </div>
        </div>
      </footer>

    </div>
  );
}
