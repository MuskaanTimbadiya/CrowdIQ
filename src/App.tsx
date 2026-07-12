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

export default function App() {
  // Core states
  const [state, setState] = useState<SimulationState | null>(null);
  const [activeAnnouncements, setActiveAnnouncements] = useState<Announcement[]>([]);
  const [currentPhase, setCurrentPhase] = useState<"ingress" | "halftime" | "egress">("ingress");
  const [selectedStadiumId, setSelectedStadiumId] = useState<string>("metlife");
  const [activeTab, setActiveTab] = useState<string>("perimeter");

  // Theme state & persistence
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("theme");
    return (saved as "light" | "dark") || "dark";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Time Travel Offset Slider state (in minutes)
  const [timeOffset, setTimeOffset] = useState<number>(0);

  // Time Travel occupancy and delay helper calculations
  const getForecastedAttendance = (offset: number) => {
    if (offset < 0) {
      const progress = (offset + 90) / 90; // 0 to 1
      return 0.1 + 0.83 * Math.sin((progress * Math.PI) / 2);
    } else {
      const progress = offset / 60; // 0 to 1
      return 0.93 - 0.15 * progress;
    }
  };

  const getForecastedDelay = (offset: number) => {
    if (offset < 0) {
      const diff = Math.abs(offset + 30);
      return Math.max(2, Math.round(35 - diff * 0.4));
    } else {
      const diff = Math.abs(offset - 40);
      return Math.max(3, Math.round(45 - diff * 0.6));
    }
  };

  // Interaction / Selection states
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [selectedAssetName, setSelectedAssetName] = useState<string>("");
  const [selectedAssetType, setSelectedAssetType] = useState<'gate' | 'transit' | 'road' | 'incident' | ''>("");
  const [selectedFoodStallRoute, setSelectedFoodStallRoute] = useState<{ gateId: string; stallId: string } | null>(null);
  const [selectedWashroomRoute, setSelectedWashroomRoute] = useState<{ gateId: string; washroomId: string } | null>(null);
  const [selectedTransitRoute, setSelectedTransitRoute] = useState<{ startId: string; endId: string } | null>(null);
  const [selectedAssetDetails, setSelectedAssetDetails] = useState<string>("");

  // Assistant states
  const [showAssistant, setShowAssistant] = useState<boolean>(true);

  // Chat states
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    {
      id: "msg_init",
      sender: "system",
      text: "👋 Welcome to FIFA 2026 Arena Volunt-AI Guidance. I am connected directly to stadium control systems to assist with route optimization, traffic bypasses, and multi-lingual help.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [currentMessage, setCurrentMessage] = useState<string>("");
  const [userLanguage, setUserLanguage] = useState<string>("English");
  const [loadingGuidance, setLoadingGuidance] = useState<boolean>(false);
  const [localTime, setLocalTime] = useState<string>("");

  useEffect(() => {
    setLocalTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    const interval = setInterval(() => {
      setLocalTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
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
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
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

  const handleUpdateWeather = async (weather: "SUNNY" | "RAINY" | "LIGHTNING_STORM") => {
    try {
      addLog(`WEATHER WARNING: Setting system atmospheric parameters to ${weather}...`);
      const res = await fetch("/api/state/weather", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weather })
      });
      if (res.ok) {
        const updatedState = await res.json();
        setState(updatedState);
        addLog(`System weather updated to ${weather}. Congestion speeds and wait times recalculated.`);
      }
    } catch (e) {
      console.error("Failed to update weather:", e);
    }
  };

  const handleToggleEvacuation = async (active: boolean) => {
    try {
      addLog(active ? "⚠️ CRITICAL STATUS: INITIATING EMERGENCY EVACUATION PROTOCOLS!" : "System returning to normal stadium operations...");
      const res = await fetch("/api/state/evacuation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active })
      });
      if (res.ok) {
        const updatedState = await res.json();
        setState(updatedState);
        addLog(active ? "EVACUATION OVERRIDE: All portals configured outbound. Traffic contraflow engaged." : "Evacuation state cleared successfully.");
      }
    } catch (e) {
      console.error("Failed to toggle evacuation:", e);
    }
  };

  const handleRedeployStaff = async (gateId: string, change: number) => {
    try {
      const res = await fetch("/api/staff/redeploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gateId, change })
      });
      if (res.ok) {
        const updatedState = await res.json();
        setState(updatedState);
        const gateName = state?.gates.find(g => g.id === gateId)?.name || gateId;
        addLog(`REDISTRIBUTION: Shifted ${change > 0 ? "+" : ""}${change} volunteers at ${gateName}.`);
      } else {
        const errData = await res.json();
        addLog(`STAFF DENIED: ${errData.error || "Cannot complete redeployment shift."}`);
      }
    } catch (e) {
      console.error("Failed to redeploy staff:", e);
    }
  };

  const handleSpeak = (text: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
      addLog(`TEXT-TO-SPEECH: Speaking announcement preview.`);
    } else {
      addLog(`SPEECH ERROR: Text-to-Speech is not supported in this browser.`);
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
      addLog("Failed to reach Gemini AI. Loaded local rules.");
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
        addLog(`Gemini drafted dynamic notice: "${data.draft.title}".`);
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

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      sender: "user",
      text: msgText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatHistory(prev => [...prev, userMsg]);
    setCurrentMessage("");
    setLoadingGuidance(true);

    const textLower = msgText.toLowerCase();

    // INTERCEPT: South Overflow Parking / Lot H
    if (
      textLower.includes("south overflow parking") || 
      textLower.includes("lot h") || 
      (textLower.includes("parking") && textLower.includes("south") && textLower.includes("inside"))
    ) {
      setTimeout(() => {
        setSelectedTransitRoute({ startId: "parking_south", endId: "gate_b" });
        setSelectedFoodStallRoute(null);
        setSelectedWashroomRoute(null);
        setActiveTab("perimeter");

        const aiResponse: ChatMessage = {
          id: `ai_transit_${Date.now()}`,
          sender: "ai",
          text: `🚗 **South Overflow Parking (Lot H) Navigation Engaged!**\n\nSince **Gate C** (South Plaza) is severely congested with a **36-minute delay**, we recommend bypassing it entirely:\n\n1. **Route to Gate B (Recommended)**: Follow the East perimeter walkway or board the Tournament Shuttle. Gate B is open and has only a **4-minute wait time**.\n2. **Alternative (Gate D)**: Walk west along the perimeter to Gate D (West Deck), which is open with a **3-minute wait time**.\n\nThe pedestrian path from Lot H to Gate B has been highlighted on the 3D map in **cyan** with flowing path animations.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestedRoute: {
            path: ["South Overflow Parking (Lot H)", "South Shuttle/Walkway", "Gate B Portal"],
            travelTime: 8,
            mode: "Walking + Shuttle",
            congestedAreas: ["Gate C Plaza"]
          },
          suggestedActions: ["How to reach Gate B?", "Where is accessibility parking?", "Show transit options"]
        };
        setChatHistory(prev => [...prev, aiResponse]);
        setLoadingGuidance(false);
      }, 800);
      return;
    }

    // INTERCEPT: How to reach Gate B
    if (textLower.includes("reach gate b") || textLower.includes("how to reach gate b")) {
      setTimeout(() => {
        setSelectedTransitRoute({ startId: "shuttle", endId: "gate_b" });
        setSelectedFoodStallRoute(null);
        setSelectedWashroomRoute(null);
        setActiveTab("perimeter");

        const aiResponse: ChatMessage = {
          id: `ai_transit_${Date.now()}`,
          sender: "ai",
          text: `🚶 **Gate B Ingress Route Engaged!**\n\nGate B (East Promenade / Shuttle) is currently open with a **4-minute wait time**. To reach it from the **Tournament Shuttle Hub (Lots F/G)**:\n\n- Walk directly eastward along the East Promenade corridor (about 2-3 minutes walk).\n- The path is clear, fluid, and accessibility-friendly.\n\nThe walking route has been highlighted on the 3D map in **cyan** with flowing animations.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestedRoute: {
            path: ["East Shuttle Hub (Lots F/G)", "East Promenade", "Gate B Portal"],
            travelTime: 3,
            mode: "Walking",
            congestedAreas: []
          },
          suggestedActions: ["Route from Lot H", "Show transit options"]
        };
        setChatHistory(prev => [...prev, aiResponse]);
        setLoadingGuidance(false);
      }, 800);
      return;
    }

    // INTERCEPT: How to reach Gate D
    if (textLower.includes("reach gate d") || textLower.includes("how to reach gate d")) {
      setTimeout(() => {
        setSelectedTransitRoute({ startId: "rail", endId: "gate_d" });
        setSelectedFoodStallRoute(null);
        setSelectedWashroomRoute(null);
        setActiveTab("perimeter");

        const aiResponse: ChatMessage = {
          id: `ai_transit_${Date.now()}`,
          sender: "ai",
          text: `🚶 **Gate D Ingress Route Engaged!**\n\nGate D (West Deck / VIP & Suites) is currently open with a **3-minute wait time**. To reach it from the **Metropolitan Express Rail station**:\n\n- Exit the Rail Terminal and walk west towards the VIP Concourse entrance (about 4 minutes walk).\n- This pathway bypasses the congested main ticket plaza.\n\nThe walking route has been highlighted on the 3D map in **cyan** with flowing animations.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestedRoute: {
            path: ["Rail Station", "West Concourse Walkway", "Gate D Portal"],
            travelTime: 4,
            mode: "Walking",
            congestedAreas: []
          },
          suggestedActions: ["Route from Lot H", "Show transit options"]
        };
        setChatHistory(prev => [...prev, aiResponse]);
        setLoadingGuidance(false);
      }, 800);
      return;
    }

    // INTERCEPT: Accessibility parking
    if (textLower.includes("accessibility parking") || textLower.includes("accessible parking") || textLower.includes("disabled parking")) {
      setTimeout(() => {
        setSelectedTransitRoute(null);
        setSelectedFoodStallRoute(null);
        setSelectedWashroomRoute(null);

        const aiResponse: ChatMessage = {
          id: `ai_accessibility_${Date.now()}`,
          sender: "ai",
          text: `♿ **Accessibility & Disabled Parking Information**\n\n- **Dedicated Lot**: Designated accessible parking is available in the **West Deck** immediately adjacent to **Gate E** (Disabled Access / Premium).\n- **Access Road**: Enter via **Stadium Blvd** and follow the purple accessibility signs.\n- **Entry Gate**: Gate E is fully step-free, accessibility-friendly, and currently has a **3-minute wait time**.\n- **Plaza Support**: ADA assistance carts are patrolling the external rings to help transport fans to gate entrances.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestedActions: ["Show transit options", "Route from Lot H"]
        };
        setChatHistory(prev => [...prev, aiResponse]);
        setLoadingGuidance(false);
      }, 800);
      return;
    }

    // INTERCEPT: Transit options
    if (textLower.includes("transit options") || textLower.includes("show transit options")) {
      setTimeout(() => {
        setSelectedTransitRoute(null);
        setSelectedFoodStallRoute(null);
        setSelectedWashroomRoute(null);

        const aiResponse: ChatMessage = {
          id: `ai_transit_options_${Date.now()}`,
          sender: "ai",
          text: `🚆 **Tournament Transit & Parking Overview**\n\n- **Express Rail**: Metropolitan Express Rail is running but experiencing **HEAVY** load (85% capacity) with an average **22-minute platform wait**.\n- **Shuttles**: Tournament Shuttle Hub (Lots F/G) has **MODERATE** load (60% capacity) and an average **12-minute wait**.\n- **General Parking**: Lots A, B, C are near capacity (92% load) with severe backups. Use **South Overflow Parking (Lot H)**, which is only at **42% capacity** and has **2,150+ available spaces**!`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestedActions: ["Route from Lot H", "How to reach Gate B?", "Where is accessibility parking?"]
        };
        setChatHistory(prev => [...prev, aiResponse]);
        setLoadingGuidance(false);
      }, 800);
      return;
    }

    if (textLower.includes("food") || textLower.includes("stall") || textLower.includes("concession") || textLower.includes("taco") || textLower.includes("burger") || textLower.includes("pizza") || textLower.includes("beer")) {
      setTimeout(() => {
        let targetStallId = "stall_1";
        let targetStallName = "Tacos el Chamuco";
        let gateId = "gate_a";
        let waitText = "8m";
        let locText = "Concourse Sect 114";
        if (textLower.includes("burger")) {
          targetStallId = "stall_2";
          targetStallName = "Gridiron Burgers & Fries";
          gateId = "gate_b";
          waitText = "18m";
          locText = "Concourse Sect 101";
        } else if (textLower.includes("pizza")) {
          targetStallId = "stall_3";
          targetStallName = "Azzurri Stone Fire Pizza";
          gateId = "gate_c";
          waitText = "12m";
          locText = "Concourse Sect 128";
        } else if (textLower.includes("beer") || textLower.includes("drink") || textLower.includes("bar")) {
          targetStallId = "stall_4";
          targetStallName = "Half-Time Tavern";
          gateId = "gate_d";
          waitText = "4m";
          locText = "Concourse Sect 142";
        }

        setSelectedFoodStallRoute({ gateId, stallId: targetStallId });
        setSelectedWashroomRoute(null);
        setSelectedTransitRoute(null);
        setActiveTab("perimeter");

        const aiResponse: ChatMessage = {
          id: `ai_food_${Date.now()}`,
          sender: "ai",
          text: `🍔 Concession Navigation Engaged!\n\nI have generated the pedestrian routing path to **${targetStallName}** (${locText}). Current wait time at this stand is **${waitText}**. The walking path is plotted on the 3D map in orange, starting from Gate ${gateId.replace("gate_", "").toUpperCase()}.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestedRoute: {
            path: [gateId.replace("gate_", "Gate ").toUpperCase(), targetStallName],
            travelTime: parseInt(waitText) || 5,
            mode: "Concourse Walkway",
            congestedAreas: []
          }
        };
        setChatHistory(prev => [...prev, aiResponse]);
        setLoadingGuidance(false);
      }, 800);
      return;
    }

    if (textLower.includes("washroom") || textLower.includes("restroom") || textLower.includes("toilet") || textLower.includes("wc") || textLower.includes("bathroom")) {
      setTimeout(() => {
        let targetWcId = "wc_2";
        let targetWcName = "Restroom Hub SE";
        let gateId = "gate_b";
        let waitText = "1m";
        let locText = "Concourse Sect 122";
        let accessibilityText = "Standard Restroom Facilities";
        
        if (textLower.includes("north") || textLower.includes("ne") || textLower.includes("wc1") || textLower.includes("accessible")) {
          targetWcId = "wc_1";
          targetWcName = "Restroom Hub NE";
          gateId = "gate_a";
          waitText = "8m";
          locText = "Concourse Sect 110";
          accessibilityText = "Wheelchair Accessible & Standard Facilities";
        } else if (textLower.includes("southwest") || textLower.includes("sw") || textLower.includes("wc3")) {
          targetWcId = "wc_3";
          targetWcName = "Restroom Hub SW";
          gateId = "gate_c";
          waitText = "12m";
          locText = "Concourse Sect 130";
          accessibilityText = "Wheelchair Accessible & Standard Facilities";
        } else if (textLower.includes("northwest") || textLower.includes("nw") || textLower.includes("wc4")) {
          targetWcId = "wc_4";
          targetWcName = "Restroom Hub NW";
          gateId = "gate_d";
          waitText = "3m";
          locText = "Concourse Sect 145";
          accessibilityText = "Standard Restroom Facilities";
        }

        setSelectedWashroomRoute({ gateId, washroomId: targetWcId });
        setSelectedFoodStallRoute(null);
        setSelectedTransitRoute(null);
        setActiveTab("perimeter");

        const aiResponse: ChatMessage = {
          id: `ai_wc_${Date.now()}`,
          sender: "ai",
          text: `🚻 Restroom Navigation Engaged!\n\nI have generated the pedestrian routing path to **${targetWcName}** (${locText}). Current wait time is **${waitText}**. Facilities: *${accessibilityText}*. The walking path is plotted on the 3D map in purple, starting from Gate ${gateId.replace("gate_", "").toUpperCase()}.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestedRoute: {
            path: [gateId.replace("gate_", "Gate ").toUpperCase(), targetWcName],
            travelTime: parseInt(waitText) || 2,
            mode: "Concourse Walkway",
            congestedAreas: []
          }
        };
        setChatHistory(prev => [...prev, aiResponse]);
        setLoadingGuidance(false);
      }, 800);
      return;
    }

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
        if (data.message.suggestedRoute && data.message.suggestedRoute.path.length > 0) {
          // If the server-provided route starts at Lot H (parking_south) or other known points, highlight it on map
          const pathStart = data.message.suggestedRoute.path[0].toLowerCase();
          const pathEnd = data.message.suggestedRoute.path[data.message.suggestedRoute.path.length - 1].toLowerCase();
          
          let startId = "";
          let endId = "";
          if (pathStart.includes("lot h") || pathStart.includes("south overflow")) startId = "parking_south";
          else if (pathStart.includes("shuttle")) startId = "shuttle";
          else if (pathStart.includes("rail")) startId = "rail";
          
          if (pathEnd.includes("gate b")) endId = "gate_b";
          else if (pathEnd.includes("gate d")) endId = "gate_d";
          else if (pathEnd.includes("gate a")) endId = "gate_a";
          else if (pathEnd.includes("gate c")) endId = "gate_c";

          if (startId && endId) {
            setSelectedTransitRoute({ startId, endId });
            setSelectedFoodStallRoute(null);
            setSelectedWashroomRoute(null);
          }
        }
      } else {
        throw new Error("Guidance endpoint error");
      }
    } catch (e) {
      console.error("Chat Guidance Error:", e);
      setSelectedTransitRoute({ startId: "parking_south", endId: "gate_b" });
      setSelectedFoodStallRoute(null);
      setSelectedWashroomRoute(null);
      const errorMsg: ChatMessage = {
        id: `err_${Date.now()}`,
        sender: "ai",
        text: "⚠️ Real-time AI offline. Note Gate C is highly congested (36 min delay). Use Gate B or D for faster entry!",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedRoute: {
          path: ["South Overflow Parking (Lot H)", "South Shuttle Pathway", "Gate B (East Promenade)"],
          travelTime: 8,
          mode: "Walking + Shuttle",
          congestedAreas: ["Gate C Plaza"]
        },
        suggestedActions: ["How to reach Gate B?", "Where is accessibility parking?", "Show transit options"]
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
      addLog(`Selected: ${name} (${type.toUpperCase()})`);
    }
  };

  const scrollToId = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const renderAICore = () => {
    return (
      <div className="glass-panel rounded-xl p-5 border-t-4 border-primary bg-surface shadow-xl hologram-scanlines">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary">psychology</span>
          </div>
          <div>
            <h3 className="font-orbitron font-semibold text-sm text-on-surface uppercase tracking-wider">Gemini AI Dispatch</h3>
            <p className="text-[9px] font-mono text-outline tracking-widest uppercase">Engine v2.5 Tactical</p>
          </div>
        </div>
        
        <p className="text-[11px] text-on-surface-variant mb-4 leading-relaxed bg-primary/5 p-3 rounded-lg border border-primary/10 font-sans">
          Evaluating live gate processing and vehicular delays. Generates dynamic operational recommendations.
        </p>
        
        <button
          onClick={handleTriggerAIOptimize}
          disabled={loadingAI}
          className="w-full bg-primary py-2.5 rounded-xl text-white font-bold font-orbitron text-xs flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-primary/30 transition-all active:scale-95 cursor-pointer disabled:opacity-50 shimmer-btn"
        >
          <span className="material-symbols-outlined text-sm">auto_fix_high</span>
          {loadingAI ? "Analyzing..." : "OPTIMIZE COMMAND"}
        </button>
        
        <div className="mt-4 space-y-3 max-h-[170px] overflow-y-auto pr-1">
          {state?.optimizations.slice(0, 2).map((opt) => (
            <div key={opt.id} className={`p-2.5 rounded-lg text-xs border font-mono ${
              opt.applied ? "bg-surface-container-low border-outline-variant/30 opacity-70" : "bg-primary/5 border-primary/20"
            }`}>
              <div className="flex justify-between items-start gap-2">
                <span className="font-bold text-on-surface leading-snug flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px] text-primary">bolt</span>
                  {opt.title}
                </span>
                <span className={`text-[8px] px-1 rounded uppercase font-bold shrink-0 ${
                  opt.urgency === 'CRITICAL' ? 'bg-status-critical/10 text-status-critical' : 'bg-status-alert/10 text-status-alert'
                }`}>{opt.urgency}</span>
              </div>
              <p className="text-[10px] text-on-surface-variant mt-1.5 leading-relaxed font-sans">{opt.description}</p>
              <div className="mt-2.5 pt-2 border-t border-outline-variant/20 flex justify-between items-center text-[9px] text-outline">
                <span>Impact: {opt.estimatedImpact}</span>
                {opt.applied ? (
                  <span className="text-status-go font-bold flex items-center gap-0.5">
                    <span className="material-symbols-outlined text-[10px]">check_circle</span> Active
                  </span>
                ) : (
                  <button
                    onClick={() => handleApplyOptimization(opt.id, opt.title)}
                    className="text-primary hover:underline font-bold cursor-pointer"
                  >
                    Deploy
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-surface-dim text-on-surface flex flex-col font-sans selection:bg-primary selection:text-on-primary pt-20" id="main-application-container">
      
      {/* CRITICAL EVACUATION DRILL ACTIVE BANNER */}
      {state?.evacuationModeActive && (
        <div className="bg-status-critical text-white py-2.5 px-4 flex items-center justify-between z-50 shadow-lg border-b border-status-critical/30 animate-pulse font-mono">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] animate-spin">warning</span>
            <span className="text-xs uppercase font-bold tracking-wider">
              EMERGENCY DRILL ACTIVE: FULL VENUE EVACUATION PROTOCOLS IN PROGRESS
            </span>
          </div>
          <button
            onClick={() => handleToggleEvacuation(false)}
            className="bg-white text-status-critical hover:bg-white/90 text-[10px] uppercase font-bold tracking-wider px-3 py-1 rounded cursor-pointer transition-colors shadow shimmer-btn"
          >
            Deactivate Drill
          </button>
        </div>
      )}

      {/* GLOBAL ACTIVE EMERGENCY SCROLLING TICKER */}
      {activeAnnouncements.some(a => a.broadcastActive) && (
        <div className="bg-status-critical/10 border-b border-status-critical/20 py-2 px-4 overflow-hidden relative flex items-center z-30 shadow-sm">
          <div className="bg-status-critical text-white text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded flex items-center gap-1 shrink-0 animate-pulse font-orbitron">
            <span className="material-symbols-outlined text-[12px]">volume_up</span> BROADCAST TICKER
          </div>
          <div className="ml-4 flex gap-8 animate-marquee whitespace-nowrap text-xs font-mono font-medium text-status-critical">
            {activeAnnouncements.filter(a => a.broadcastActive).map((ann) => (
              <span key={ann.id} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-status-critical rounded-full animate-ping" />
                <strong>[{ann.title}]</strong> {ann.content} (Target: {ann.targetAudience})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* TOP NAVIGATION HEADER */}
      <header className="fixed top-0 left-0 right-0 z-40 flex justify-between items-center w-full px-8 h-20 bg-surface/90 backdrop-blur-md border-b border-outline-variant/30 shadow-sm" id="main-header">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 select-none">
            <span className="material-symbols-outlined text-primary text-2xl animate-pulse">radar</span>
            <span className="font-orbitron font-black text-xl text-primary tracking-widest">CROWDIQ</span>
          </div>
          <div className="h-8 w-[1px] bg-outline-variant hidden md:block"></div>
          <nav className="hidden lg:flex items-center gap-6">
            {['perimeter', 'gates', 'logistics', 'incidents', 'broadcast'].map((tab) => (
              <span
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`font-orbitron text-xs cursor-pointer pb-1 transition-all uppercase tracking-wider ${
                  activeTab === tab 
                    ? 'text-primary border-b-2 border-primary font-bold' 
                    : 'text-on-surface-variant font-medium hover:text-primary'
                }`}
              >
                {tab}
              </span>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {/* Match telemetry pill */}
          <div className="hidden xl:flex items-center gap-4 glass-panel px-4 py-2 rounded-lg border border-primary/10 bg-surface-container-low select-none">
            <div className="flex flex-col items-center">
              <span className="font-mono text-[8px] text-outline uppercase tracking-wider leading-none">Quarter-Final</span>
              <span className="font-orbitron font-bold text-[10px] text-on-surface mt-1">ARG vs ENG</span>
            </div>
            <div className="h-5 w-[1px] bg-outline-variant"></div>
            <div className="flex flex-col items-center">
              <span className="font-mono text-[8px] text-outline uppercase tracking-wider leading-none">Local Time</span>
              <span className="font-mono text-[10px] text-primary font-bold mt-1">{localTime || "00:00:00 AM"}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 bg-surface-container border border-outline-variant/30 p-1 rounded-lg">
            <span className="text-[8px] text-outline font-orbitron uppercase tracking-wider font-semibold px-1">Phase:</span>
            <select
              value={currentPhase}
              onChange={(e) => handlePhaseChange(e.target.value as any)}
              className="bg-surface border border-outline-variant/30 text-[10px] text-on-surface rounded px-1.5 py-0.5 font-mono focus:outline-none focus:ring-1 focus:ring-primary/60 transition-all cursor-pointer font-bold uppercase"
            >
              <option value="ingress">Ingress</option>
              <option value="halftime">Halftime</option>
              <option value="egress">Egress</option>
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 bg-surface-container border border-outline-variant/30 p-1 rounded-lg">
            <span className="text-[8px] text-outline font-orbitron uppercase tracking-wider font-semibold px-1">Arena:</span>
            <select
              value={selectedStadiumId}
              onChange={(e) => {
                setSelectedStadiumId(e.target.value);
                handlePhaseChange(currentPhase, e.target.value);
              }}
              className="bg-surface border border-outline-variant/30 text-[10px] text-on-surface rounded px-1.5 py-0.5 font-mono focus:outline-none focus:ring-1 focus:ring-primary/60 transition-all cursor-pointer font-bold"
            >
              <option value="metlife">MetLife (NY/NJ)</option>
              <option value="azteca">Azteca (MX)</option>
              <option value="sofi">SoFi (LA)</option>
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 bg-surface-container border border-outline-variant/30 p-1 rounded-lg">
            <span className="text-[8px] text-outline font-orbitron uppercase tracking-wider font-semibold px-1">Atmosphere:</span>
            <select
              value={state?.weather || "SUNNY"}
              onChange={(e) => handleUpdateWeather(e.target.value as any)}
              className="bg-surface border border-outline-variant/30 text-[10px] text-on-surface rounded px-1.5 py-0.5 font-mono focus:outline-none focus:ring-1 focus:ring-primary/60 transition-all cursor-pointer font-bold"
            >
              <option value="SUNNY">Sunny</option>
              <option value="RAINY">Rainy</option>
              <option value="LIGHTNING_STORM">Storm</option>
            </select>
          </div>

          <button
            onClick={fetchState}
            className="w-9 h-9 rounded-lg border border-outline-variant/30 flex items-center justify-center text-on-surface hover:bg-surface-container-high transition-all cursor-pointer"
            title="Sync State"
          >
            <span className="material-symbols-outlined text-lg">refresh</span>
          </button>
          
          <button
            onClick={() => setTheme(p => p === "light" ? "dark" : "light")}
            className="w-9 h-9 rounded-lg border border-outline-variant/30 flex items-center justify-center text-on-surface hover:bg-surface-container-high transition-all cursor-pointer"
            title={theme === "light" ? "Switch to Dark Theme" : "Switch to Light Theme"}
          >
            <span className="material-symbols-outlined text-lg">
              {theme === "light" ? "dark_mode" : "light_mode"}
            </span>
          </button>

          <div className="w-9 h-9 rounded-md border border-primary/20 overflow-hidden shadow-inner hidden md:block">
            <img className="w-full h-full object-cover" alt="Director Avatar" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCPkq0M20VwenWX3hOvHaSdjSAh__Y7H8ZdC4qhDw9rGyzBvZo2wZmW1rZWvjdcmgO56Kk4AbamaWocDNun37m-Cym_vZf3y0P6womwIKdQ1QCLvWv8yVkpePJo9qo8Y7R-klEWnV2hDEw2orNgu8RvRcadB8xEsWmit3RYKjG3_8yheqrFP-mCZ6KI6aPNsTTGCg0HPQIjJl3wShxiGTM-_MsjtWH41M7ijlqHZCMVjrnBLykgmWc"/>
          </div>
        </div>
      </header>

      {/* MAIN LAYOUT CONTAINER */}
      <main className="flex-1 p-6 md:p-8 pb-16 max-w-[1800px] w-full mx-auto" id="dashboard-grid-container">
        
        {/* TIME TRAVEL PROJECTION SLIDER */}
        <div className="glass-panel rounded-xl p-5 mb-6 bg-surface border border-outline-variant/30 flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-sm">
          <div className="flex-grow">
            <div className="flex justify-between items-center mb-2">
              <span className="font-orbitron text-xs uppercase tracking-widest text-primary font-bold flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] animate-pulse">analytics</span>
                Occupancy Forecasting Console
              </span>
              <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                {timeOffset === 0 ? "LIVE REAL-TIME" : timeOffset < 0 ? `${timeOffset}m (HISTORICAL)` : `+${timeOffset}m (PROJECTION)`}
              </span>
            </div>
            <input
              type="range"
              min="-90"
              max="60"
              value={timeOffset}
              onChange={(e) => setTimeOffset(Number(e.target.value))}
              className="w-full h-1 bg-surface-container-highest rounded-lg appearance-none cursor-pointer accent-primary focus:outline-none"
            />
            <div className="flex justify-between text-[8px] text-outline font-mono mt-2 uppercase tracking-widest font-bold">
              <span>-90m (Gates Open)</span>
              <span>-60m</span>
              <span>-30m (Peak Ingress)</span>
              <span className="font-black text-primary">0m (Kickoff)</span>
              <span>+30m</span>
              <span>+60m (Egress Exit)</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 shrink-0 bg-surface-container-low p-3 rounded-lg border border-outline-variant/30 w-full md:w-auto">
            <div className="text-center md:w-28">
              <span className="text-[8px] text-outline block uppercase font-bold tracking-wider font-orbitron">Forecast Load</span>
              <span className="font-mono text-lg text-status-go font-bold mt-1 block">
                {Math.round(getForecastedAttendance(timeOffset) * 100)}%
              </span>
            </div>
            <div className="text-center md:w-28 border-l border-outline-variant/20">
              <span className="text-[8px] text-outline block uppercase font-bold tracking-wider font-orbitron">Projected Delay</span>
              <span className="font-mono text-lg text-status-critical font-bold mt-1 block">
                {getForecastedDelay(timeOffset)} mins
              </span>
            </div>
          </div>
        </div>

        {activeTab === "perimeter" && (
          <div className="grid grid-cols-12 gap-6">
            {/* Middle Column (Lg: 8): Map & Roads */}
            <div className="col-span-12 lg:col-span-8 flex flex-col gap-6 animate-stagger-1" id="main-map-column">
              {state && (
                <StadiumMap
                  gates={state.gates}
                  transit={state.transit}
                  roads={state.roads}
                  incidents={state.incidents}
                  selectedAssetId={selectedAssetId}
                  onSelectAsset={selectAssetOnMap}
                  evacuationModeActive={state.evacuationModeActive}
                  foodStalls={state.foodStalls}
                  selectedFoodStallRoute={selectedFoodStallRoute}
                  washrooms={state.washrooms}
                  selectedWashroomRoute={selectedWashroomRoute}
                  selectedTransitRoute={selectedTransitRoute}
                />
              )}
              {/* Access Roadways & Congestion */}
              <div>
                <h3 className="font-orbitron text-xs uppercase text-outline mb-3 font-bold tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary text-base">alt_route</span>
                  Access Roadways &amp; Congestion Telemetry
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {state?.roads.map((road) => {
                    const isSelected = selectedAssetId === road.id;
                    const delayColor = road.delayMinutes > 15 ? "text-status-critical" : "text-status-go";
                    const congestionColor = 
                      road.congestion === "LOW" ? "text-status-go" :
                      road.congestion === "MEDIUM" ? "text-status-alert" : "text-status-critical";

                    return (
                      <div
                        key={road.id}
                        onClick={() => selectAssetOnMap(road.id, road.name, 'road', `${road.name} direction delay is ${road.delayMinutes} mins. Contraflow configuration: ${road.laneControlsActive ? 'ACTIVE' : 'OFF'}`)}
                        className={`glass-panel rounded-xl p-4 bg-surface cursor-pointer transition-all border ${
                          isSelected ? "border-primary shadow-md animate-pulse-glow-primary bg-surface-container-low" : "border-outline-variant/40 hover:bg-surface-container-low"
                        }`}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <h4 className="font-orbitron text-[10px] text-on-surface font-bold leading-tight uppercase tracking-wider">{road.name}</h4>
                          <span className="material-symbols-outlined text-outline text-[16px]">
                            {road.congestion === "LOW" ? "trending_down" : "trending_up"}
                          </span>
                        </div>
                        <div className="space-y-1.5 font-mono text-[10px]">
                          <div className="flex justify-between"><span className="text-outline">Congestion</span><span className={`font-bold ${congestionColor}`}>{road.congestion}</span></div>
                          <div className="flex justify-between"><span className="text-outline">Avg Speed</span><span className="text-on-surface font-bold">{road.avgSpeed} MPH</span></div>
                          <div className="flex justify-between"><span className="text-outline">Entry Delay</span><span className={`font-bold ${delayColor}`}>+{road.delayMinutes} MINS</span></div>
                        </div>
                        {road.laneControlsActive && (
                          <div className="mt-3 p-1.5 bg-status-critical/10 border border-status-critical/20 rounded text-[9px] text-center text-status-critical font-bold uppercase tracking-widest animate-pulse">REVERSIBLE LANE ACTIVE</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* AI Dispatch side-panel */}
            <div className="col-span-12 lg:col-span-4 flex flex-col gap-6 animate-stagger-2">
              {renderAICore()}
            </div>
          </div>
        )}

        {activeTab === "gates" && (
          <div className="grid grid-cols-12 gap-6">
            {/* Center column - Portals & Gate Queues */}
            <div className="col-span-12 lg:col-span-8 flex flex-col gap-6 animate-stagger-1">
              {/* Portals & Gate Queues */}
              <div id="gates-card" className="glass-panel rounded-xl flex flex-col bg-surface overflow-hidden shadow-sm">
                <div className="p-4 border-b border-outline-variant/30 flex justify-between items-center bg-surface-container-low/50">
                  <span className="font-orbitron text-xs uppercase text-on-surface font-bold tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-primary text-base">sensor_door</span>
                    Portals &amp; Gate Telemetry
                  </span>
                  <span className="px-2 py-0.5 bg-surface-container-highest rounded text-[9px] font-mono text-primary font-bold border border-primary/20">~10M AVG WAIT</span>
                </div>
                <div className="p-4 space-y-4">
                  {state?.gates.map((gate) => {
                    const isSelected = selectedAssetId === gate.id;
                    const borderLeftColor = 
                      gate.status === "OPEN" ? "border-l-status-go" :
                      gate.status === "CONGESTED" ? "border-l-status-alert" : "border-l-status-critical";
                    
                    const waitTextColor = 
                      gate.status === "OPEN" ? "text-status-go" :
                      gate.status === "CONGESTED" ? "text-status-alert" : "text-status-critical";

                    return (
                      <div
                        key={gate.id}
                        onClick={() => selectAssetOnMap(gate.id, gate.name, 'gate', `Throughput is currently ${gate.throughputRate} fans/minute with ${gate.assignedVolunteers} active lane monitors.`)}
                        className={`p-3 bg-surface-container-low border rounded-lg border-l-4 cursor-pointer transition-all ${borderLeftColor} ${
                          isSelected ? "border-primary shadow-md bg-surface animate-pulse-glow-primary" : "border-outline-variant/50 hover:bg-surface-container/50"
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-orbitron text-xs text-on-surface font-bold tracking-wide uppercase">{gate.name}</h4>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                            gate.status === "OPEN" ? "bg-status-go/10 text-status-go" :
                            gate.status === "CONGESTED" ? "bg-status-alert/10 text-status-alert" : "bg-status-critical/10 text-status-critical"
                          }`}>
                            {gate.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                          <div>
                            <p className="text-[9px] text-outline uppercase">Queue Size</p>
                            <p className="font-bold text-on-surface mt-0.5">{gate.queueCount.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-[9px] text-outline uppercase">Wait Time</p>
                            <p className={`font-bold mt-0.5 ${waitTextColor}`}>{gate.avgWaitTime} mins</p>
                          </div>
                          <div>
                            <p className="text-[9px] text-outline uppercase">Processing Flow</p>
                            <p className="text-on-surface mt-0.5 font-bold">{gate.throughputRate}/min</p>
                          </div>
                        </div>
                        <div className="mt-2.5 pt-2 border-t border-outline-variant/30 flex items-center justify-between text-[10px] text-outline">
                          <div className="flex items-center gap-1.5 font-bold text-on-surface">
                            <span className="material-symbols-outlined text-[13px] text-primary">engineering</span>
                            <span>{gate.assignedVolunteers} Stewards</span>
                            <div className="flex gap-1 ml-2">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleRedeployStaff(gate.id, -1); }}
                                className="w-5 h-5 rounded bg-surface-container hover:bg-primary/20 text-on-surface flex items-center justify-center font-bold border border-outline-variant/30 cursor-pointer text-xs"
                                title="Reduce Volunteers"
                              >
                                -
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleRedeployStaff(gate.id, 1); }}
                                className="w-5 h-5 rounded bg-surface-container hover:bg-primary/20 text-on-surface flex items-center justify-center font-bold border border-outline-variant/30 cursor-pointer text-xs"
                                title="Assign Volunteer"
                              >
                                +
                              </button>
                            </div>
                          </div>
                          {gate.accessibilityFriendly && (
                            <span className="text-status-go font-bold flex items-center gap-0.5">
                              <span className="material-symbols-outlined text-[12px]">accessible</span> Accessible
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* AI Dispatch side-panel */}
            <div className="col-span-12 lg:col-span-4 flex flex-col gap-6 animate-stagger-2">
              {renderAICore()}
            </div>
          </div>
        )}

        {activeTab === "logistics" && (
          <div className="grid grid-cols-12 gap-6">
            {/* Arena Fill Rate and Parking/Transit */}
            <div className="col-span-12 lg:col-span-4 flex flex-col gap-6 animate-stagger-1">
              {state && (
                <div className="glass-panel rounded-xl p-5 relative overflow-hidden bg-surface shadow-sm">
                  <div className="absolute top-3 right-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-status-go animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                  </div>
                  <div className="flex justify-between items-end mb-3">
                    <span className="font-orbitron text-xs uppercase text-outline font-bold tracking-wider flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-primary text-base">stadium</span>
                      Arena Load Factor
                    </span>
                    <span className="font-orbitron font-bold text-lg text-status-go tracking-wide">
                      {Math.round((state.stadium.currentAttendance / state.stadium.capacity) * 100)}%
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-surface-container-highest rounded-full overflow-hidden border border-outline-variant/20 p-[1px]">
                    <div
                      className="h-full bg-status-go rounded-full transition-all duration-1000"
                      style={{ width: `${(state.stadium.currentAttendance / state.stadium.capacity) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-3 text-[10px] font-mono">
                    <div className="flex flex-col">
                      <span className="text-outline uppercase text-[8px]">Attendance</span>
                      <span className="text-on-surface font-bold mt-0.5">
                        {state.stadium.currentAttendance.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-outline uppercase text-[8px]">Capacity</span>
                      <span className="text-on-surface mt-0.5 font-bold">
                        {state.stadium.capacity.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {state?.foodStalls && (
                <div className="glass-panel rounded-xl p-4 bg-surface shadow-sm border border-outline-variant/30 flex flex-col">
                  <h4 className="font-orbitron text-xs text-on-surface uppercase mb-3 flex items-center gap-2 font-bold tracking-wider select-none">
                    <span className="material-symbols-outlined text-primary text-base">restaurant</span>
                    Concessions &amp; Food Stalls
                  </h4>
                  <div className="space-y-3.5">
                    {state.foodStalls.map((stall) => {
                      const isStallRouted = selectedFoodStallRoute?.stallId === stall.id;
                      const waitColor = 
                        stall.waitTime < 10 ? "text-status-go" :
                        stall.waitTime < 15 ? "text-status-alert" : "text-status-critical";
                      
                      const iconName = 
                        stall.type === "TACOS" ? "fastfood" :
                        stall.type === "BURGERS" ? "lunch_dining" :
                        stall.type === "PIZZA" ? "local_pizza" : "local_bar";

                      return (
                        <div key={stall.id} className={`p-3 border rounded-lg transition-all ${
                          isStallRouted ? "border-primary bg-primary/5 shadow-sm" : "border-outline-variant/30 bg-surface"
                        }`}>
                          <div className="flex justify-between items-start">
                            <div className="flex items-start gap-2">
                              <span className="material-symbols-outlined text-primary text-base shrink-0 mt-0.5">{iconName}</span>
                              <div>
                                <span className="text-xs font-bold text-on-surface block select-none uppercase tracking-wide">{stall.name}</span>
                                <span className="text-[9px] font-mono text-outline select-none">{stall.location}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className={`text-xs font-mono font-bold block select-none ${waitColor}`}>{stall.waitTime}m wait</span>
                              <span className="text-[8px] font-mono text-outline uppercase select-none font-bold">{stall.status}</span>
                            </div>
                          </div>
                          <div className="mt-3.5 flex justify-between items-center text-[10px]">
                            <span className="text-[9px] font-mono text-outline select-none">Gate: {stall.nearestGateId.replace("gate_", "").toUpperCase()}</span>
                            <button
                              onClick={() => {
                                if (isStallRouted) {
                                  setSelectedFoodStallRoute(null);
                                } else {
                                  setSelectedFoodStallRoute({
                                    gateId: stall.nearestGateId,
                                    stallId: stall.id
                                  });
                                  setSelectedWashroomRoute(null);
                                  setSelectedTransitRoute(null);
                                  selectAssetOnMap(stall.id, stall.name, "transit", `${stall.name} is a ${stall.type} concession stand located at ${stall.location}. Wait time: ${stall.waitTime} minutes.`);
                                }
                              }}
                              className={`text-[9px] font-mono font-bold py-1 px-2.5 rounded cursor-pointer transition-all uppercase tracking-wider ${
                                isStallRouted 
                                  ? "bg-primary text-white shadow-sm" 
                                  : "bg-surface-container hover:bg-primary/10 text-primary border border-primary/20"
                              }`}
                            >
                              {isStallRouted ? "Cancel Route" : "Navigate"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {state?.washrooms && (
                <div className="glass-panel rounded-xl p-4 bg-surface shadow-sm border border-outline-variant/30 flex flex-col mt-4">
                  <h4 className="font-orbitron text-xs text-on-surface uppercase mb-3 flex items-center gap-2 font-bold tracking-wider select-none">
                    <span className="material-symbols-outlined text-primary text-base">wc</span>
                    Restroom Facilities
                  </h4>
                  <div className="space-y-3.5">
                    {state.washrooms.map((wc) => {
                      const isWcRouted = selectedWashroomRoute?.washroomId === wc.id;
                      const waitColor = 
                        wc.waitTime < 5 ? "text-status-go" :
                        wc.waitTime < 10 ? "text-status-alert" : "text-status-critical";

                      return (
                        <div key={wc.id} className={`p-3 border rounded-lg transition-all ${
                          isWcRouted ? "border-primary bg-primary/5 shadow-sm" : "border-outline-variant/30 bg-surface"
                        }`}>
                          <div className="flex justify-between items-start">
                            <div className="flex items-start gap-2">
                              <span className="material-symbols-outlined text-primary text-base shrink-0 mt-0.5">wc</span>
                              <div>
                                <span className="text-xs font-bold text-on-surface block select-none uppercase tracking-wide">{wc.name}</span>
                                <span className="text-[9px] font-mono text-outline select-none">{wc.location}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className={`text-xs font-mono font-bold block select-none ${waitColor}`}>{wc.waitTime}m wait</span>
                              <span className="text-[8px] font-mono text-outline uppercase select-none font-bold">{wc.status}</span>
                            </div>
                          </div>
                          <div className="mt-3.5 flex justify-between items-center text-[10px]">
                            <div className="flex items-center gap-2 select-none">
                              <span className="text-[9px] font-mono text-outline">Gate: {wc.nearestGateId.replace("gate_", "").toUpperCase()}</span>
                              {wc.accessibilityFriendly && (
                                <span className="material-symbols-outlined text-xs text-primary" title="Accessibility Friendly">accessible</span>
                              )}
                            </div>
                            <button
                              onClick={() => {
                                if (isWcRouted) {
                                  setSelectedWashroomRoute(null);
                                } else {
                                  setSelectedWashroomRoute({
                                    gateId: wc.nearestGateId,
                                    washroomId: wc.id
                                  });
                                  setSelectedFoodStallRoute(null);
                                  setSelectedTransitRoute(null);
                                  selectAssetOnMap(wc.id, wc.name, "transit", `${wc.name} is a restroom facility located at ${wc.location}. Current wait time: ${wc.waitTime} minutes. Accessible friendly: ${wc.accessibilityFriendly ? 'YES' : 'NO'}`);
                                }
                              }}
                              className={`text-[9px] font-mono font-bold py-1 px-2.5 rounded cursor-pointer transition-all uppercase tracking-wider ${
                                isWcRouted 
                                  ? "bg-primary text-white shadow-sm" 
                                  : "bg-surface-container hover:bg-primary/10 text-primary border border-primary/20"
                              }`}
                            >
                              {isWcRouted ? "Cancel Route" : "Navigate"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="col-span-12 lg:col-span-8 flex flex-col gap-6 animate-stagger-2">
              <div id="transit-card" className="glass-panel rounded-xl flex flex-col bg-surface overflow-hidden shadow-sm">
                <div className="p-4 border-b border-outline-variant/30 bg-surface-container-low/50">
                  <span className="font-orbitron text-xs uppercase text-on-surface font-bold tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-primary text-base">commute</span>
                    Terminal Transport &amp; Hub Loadings
                  </span>
                </div>
                
                <div className="p-4 space-y-3">
                  {state?.transit.map((hub) => {
                    const isSelected = selectedAssetId === hub.id;
                    const barColor = 
                      hub.status === "FLUID" ? "bg-status-go" :
                      hub.status === "MODERATE" ? "bg-status-alert" : "bg-status-critical";
                    
                    const percentage = hub.currentLoad;

                    return (
                      <div
                        key={hub.id}
                        onClick={() => selectAssetOnMap(hub.id, hub.name, 'transit', `Transit vehicle frequency has been set to high flow with dynamic metering rules applied.`)}
                        className={`flex items-center gap-4 p-3.5 cursor-pointer rounded-lg border transition-all ${
                          isSelected ? "border-primary bg-surface shadow-sm animate-pulse-glow-primary bg-surface-container-low" : "border-transparent hover:bg-surface-container-low"
                        }`}
                      >
                        <span className="material-symbols-outlined text-primary">
                          {hub.type === "TRAIN" ? "train" :
                           hub.type === "SHUTTLE" ? "airport_shuttle" :
                           hub.type === "RIDESHARE" ? "hail" : "local_parking"}
                        </span>
                        <div className="flex-grow min-w-0">
                          <div className="flex justify-between items-baseline mb-1">
                            <p className="font-orbitron text-[10px] text-on-surface font-bold uppercase tracking-wider truncate">{hub.name}</p>
                            <span className="font-mono text-[9px] text-outline uppercase font-semibold">Wait Time: {hub.avgWaitTime}m</span>
                          </div>
                          <div className="w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                            <div className={`h-full ${barColor}`} style={{ width: `${percentage}%` }}></div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          {hub.availableSpaces !== undefined ? (
                            <span className="font-mono text-xs text-status-go font-bold">{hub.availableSpaces.toLocaleString()} spaces</span>
                          ) : (
                            <span className={`font-mono text-xs font-bold ${
                              hub.status === "FLUID" ? "text-status-go" :
                              hub.status === "MODERATE" ? "text-status-alert" : "text-status-critical"
                            }`}>{percentage}%</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "incidents" && (
          <div className="grid grid-cols-12 gap-6">
            {/* Left side - Incidents Response */}
            <div className="col-span-12 lg:col-span-8 flex flex-col gap-6 animate-stagger-1">
              <div id="incidents-card" className="glass-panel rounded-xl flex flex-col bg-surface overflow-hidden border border-outline-variant/30 shadow-sm">
                <div className="p-4 bg-surface-container-low/50 flex justify-between items-center border-b border-outline-variant/20">
                  <span className="font-orbitron text-xs text-on-surface uppercase font-bold tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-primary text-base">emergency_share</span>
                    Tactical Incident Response Desk
                  </span>
                  <span className="bg-status-critical/10 text-status-critical border border-status-critical/20 px-2 py-0.5 rounded text-[9px] font-bold font-orbitron">
                    {state?.incidents.filter(i => !i.resolved).length || 0} ACTIVE
                  </span>
                </div>
                
                <div className="p-4 space-y-3">
                  {state?.incidents.length === 0 ? (
                    <p className="text-xs text-outline text-center py-4 font-mono">No active incidents reported.</p>
                  ) : (
                    state?.incidents.map((inc) => (
                      <div
                        key={inc.id}
                        className={`p-3 rounded-lg border transition-all ${
                          inc.resolved ? "bg-surface-container-low border-outline-variant/20 opacity-60" :
                          inc.severity === "CRITICAL" ? "bg-status-critical/5 border-status-critical/30 animate-pulse-glow-critical" : "bg-status-alert/5 border-status-alert/30 animate-pulse-glow-warning"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className={`material-symbols-outlined text-[16px] ${
                            inc.severity === "CRITICAL" ? "text-status-critical" : "text-status-alert"
                          }`}>
                            {inc.severity === "CRITICAL" ? "groups" : "router"}
                          </span>
                          <span className="font-orbitron text-xs text-on-surface font-bold truncate uppercase tracking-wider">{inc.location}</span>
                        </div>
                        <p className="text-[10px] text-on-surface-variant mb-2.5 font-sans leading-relaxed">{inc.description}</p>
                        {!inc.resolved && (
                          <button
                            onClick={() => handleResolveIncident(inc.id, inc.location)}
                            className="text-[9px] font-bold text-primary uppercase border-b border-primary hover:border-b-2 transition-all cursor-pointer font-mono"
                          >
                            Resolve Incident
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Quick Trigger Simulated Anomaly Form */}
                <div className="border-t border-outline-variant/30 p-3 bg-surface-container-low/30">
                  {!showIncidentForm ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowIncidentForm(true)}
                        className="flex-1 bg-surface-container hover:bg-surface-container-high border border-outline-variant/50 text-on-surface-variant text-xs py-2 rounded-lg transition-colors font-mono font-bold flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider"
                      >
                        <span className="material-symbols-outlined text-sm">add_circle</span> Inject Anomaly
                      </button>
                      <button
                        onClick={() => handleToggleEvacuation(!state?.evacuationModeActive)}
                        className={`flex-1 border text-xs py-2 rounded-lg transition-colors font-mono font-bold flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider ${
                          state?.evacuationModeActive 
                            ? "bg-status-go/10 border-status-go text-status-go hover:bg-status-go/20"
                            : "bg-status-critical/10 border-status-critical text-status-critical hover:bg-status-critical/20"
                        }`}
                      >
                        <span className="material-symbols-outlined text-sm">warning</span>
                        {state?.evacuationModeActive ? "Clear Evacuation Drill" : "Evacuation Drill"}
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleCreateIncident} className="space-y-2.5 text-xs flex flex-col">
                      <div className="flex justify-between items-center pb-1.5 border-b border-outline-variant/20">
                        <span className="font-orbitron font-bold text-on-surface uppercase tracking-wider">INJECT ANOMALY</span>
                        <button
                          type="button"
                          onClick={() => setShowIncidentForm(false)}
                          className="text-outline hover:text-primary font-mono text-[9px] cursor-pointer"
                        >
                          [CANCEL]
                        </button>
                      </div>
                      <div>
                        <input
                          type="text"
                          placeholder="Incident Location (e.g. Gate A ticket booths)"
                          value={incidentForm.location}
                          onChange={(e) => setIncidentForm(prev => ({ ...prev, location: e.target.value }))}
                          className="w-full bg-surface border border-outline-variant/60 rounded px-2 py-1.5 text-on-surface focus:outline-none focus:border-primary font-sans"
                          required
                        />
                      </div>
                      <div className="flex gap-2">
                        <select
                          value={incidentForm.severity}
                          onChange={(e) => setIncidentForm(prev => ({ ...prev, severity: e.target.value as any }))}
                          className="flex-1 bg-surface border border-outline-variant/60 rounded px-1.5 py-1.5 text-on-surface focus:outline-none font-mono font-bold"
                        >
                          <option value="INFO">INFO</option>
                          <option value="WARNING">WARNING</option>
                          <option value="CRITICAL">CRITICAL</option>
                        </select>
                        <button
                          type="submit"
                          className="bg-primary hover:brightness-110 text-white font-bold py-1 px-4 rounded cursor-pointer shimmer-btn font-orbitron uppercase text-[10px] tracking-wider"
                        >
                          Trigger
                        </button>
                      </div>
                      <div>
                        <input
                          type="text"
                          placeholder="Impact Description..."
                          value={incidentForm.description}
                          onChange={(e) => setIncidentForm(prev => ({ ...prev, description: e.target.value }))}
                          className="w-full bg-surface border border-outline-variant/60 rounded px-2 py-1.5 text-on-surface focus:outline-none focus:border-primary font-sans"
                          required
                        />
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </div>

            {/* AI Dispatch side-panel */}
            <div className="col-span-12 lg:col-span-4 flex flex-col gap-6 animate-stagger-2">
              {renderAICore()}
            </div>
          </div>
        )}

        {activeTab === "broadcast" && (
          <div className="grid grid-cols-12 gap-6">
            {/* Left side - Dynamic Overhead Broadcasts */}
            <div className="col-span-12 lg:col-span-6 flex flex-col gap-6 animate-stagger-1">
              <div id="broadcasts-card" className="glass-panel rounded-xl p-4 bg-surface border border-outline-variant/30 shadow-sm">
                <h4 className="font-orbitron text-xs text-on-surface uppercase mb-3 flex items-center gap-2 font-bold tracking-wider">
                  <span className="material-symbols-outlined text-primary text-base">sensors</span>
                  Multilingual Dispatch Core
                </h4>
                
                <div className="space-y-3.5 text-xs">
                  <div className="flex gap-2">
                    <select
                      value={broadcastForm.location}
                      onChange={(e) => setBroadcastForm(p => ({ ...p, location: e.target.value }))}
                      className="flex-1 bg-surface-container border border-outline-variant/50 rounded p-1.5 text-on-surface font-sans"
                    >
                      <option value="Gate C Plaza Entrance">Gate C Main Gate</option>
                      <option value="North Rail Ingress stairs">North Rail Station</option>
                      <option value="East Parking Lot F/G Corridor">East Shuttle Hub</option>
                      <option value="South Overflow Parking Lot H">South Parking H</option>
                    </select>
                    <select
                      value={broadcastForm.urgency}
                      onChange={(e) => setBroadcastForm(p => ({ ...p, urgency: e.target.value }))}
                      className="bg-surface-container border border-outline-variant/50 rounded p-1.5 text-on-surface font-mono font-bold"
                    >
                      <option value="NORMAL">NORMAL</option>
                      <option value="HIGH">HIGH</option>
                      <option value="CRITICAL">CRITICAL</option>
                    </select>
                  </div>
                  <input
                    type="text"
                    value={broadcastForm.description}
                    onChange={(e) => setBroadcastForm(p => ({ ...p, description: e.target.value }))}
                    placeholder="Describe issue (e.g. Ticket scanner slows down...)"
                    className="w-full bg-surface-container border border-outline-variant/50 rounded p-2 text-on-surface font-sans"
                  />
                  <button
                    onClick={handleDraftAnnouncement}
                    disabled={draftingAnnouncement}
                    className="w-full py-2.5 bg-primary/10 border border-primary/20 text-primary rounded-lg text-[10px] font-bold font-orbitron uppercase tracking-widest hover:bg-primary/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shimmer-btn"
                  >
                    <span className="material-symbols-outlined text-sm">smart_toy</span>
                    {draftingAnnouncement ? "Drafting..." : "Draft with Gemini AI"}
                  </button>

                  {announcementDraft && (
                    <div className="bg-surface-container border border-outline-variant/40 p-3 rounded-lg text-[10px] animate-fade-in space-y-2 mt-2 font-mono">
                      <div className="flex justify-between items-center pb-1.5 border-b border-outline-variant/20">
                        <span className="font-bold text-primary uppercase font-orbitron tracking-wider">DRAFT ADVISORY</span>
                        <span className="text-[8px] text-outline uppercase font-bold">{announcementDraft.languages.join(", ")}</span>
                      </div>
                      <strong className="text-on-surface block uppercase text-[11px] font-orbitron">[{announcementDraft.title}]</strong>
                      <p className="text-on-surface-variant leading-relaxed max-h-[100px] overflow-y-auto font-sans text-xs">{announcementDraft.content}</p>
                      <div className="flex justify-end gap-2 pt-2 border-t border-outline-variant/20">
                        <button onClick={() => setAnnouncementDraft(null)} className="text-outline hover:text-on-surface text-[9px] font-bold cursor-pointer uppercase font-mono">Discard</button>
                        <button onClick={() => handleSpeak(announcementDraft.content)} className="bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant/30 px-2.5 py-1 rounded font-bold cursor-pointer text-[9px] uppercase font-mono">Play Voice</button>
                        <button onClick={handlePublishAnnouncement} className="bg-primary hover:brightness-115 text-white px-2.5 py-1 rounded font-bold cursor-pointer text-[9px] uppercase font-mono">Publish</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right side - Active Digital Boards stream */}
            <div className="col-span-12 lg:col-span-6 flex flex-col gap-6 animate-stagger-2">
              <div className="glass-panel rounded-xl p-4 bg-surface border border-outline-variant/30 shadow-sm">
                <h4 className="font-orbitron text-xs text-on-surface uppercase mb-3 flex items-center gap-2 font-bold tracking-wider">
                  <span className="material-symbols-outlined text-primary text-base">ad_units</span>
                  Active Digital Board Announcements
                </h4>
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {activeAnnouncements.length === 0 ? (
                    <p className="text-xs text-outline text-center py-8 font-mono">No broadcasts active on stadium boards.</p>
                  ) : (
                    activeAnnouncements.map((ann) => (
                      <div key={ann.id} className="p-3 border border-outline-variant/30 rounded-lg bg-surface-container-low font-mono text-xs flex justify-between items-start gap-4 shadow-sm">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-status-critical animate-pulse shadow-[0_0_6px_rgba(239,68,68,0.5)]"></span>
                            <span className="font-bold text-on-surface uppercase text-[11px] font-orbitron tracking-wide">[{ann.title}]</span>
                            <span className="text-[8px] bg-outline-variant/20 text-outline px-1 rounded uppercase font-bold border border-outline-variant/20">{ann.targetAudience}</span>
                          </div>
                          <p className="text-on-surface-variant text-[11px] leading-relaxed font-sans">{ann.content}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleSpeak(ann.content)}
                            className="text-[9px] font-bold text-primary border border-primary/30 hover:bg-primary/10 px-2 py-1 rounded transition-colors font-mono cursor-pointer uppercase tracking-wider"
                            title="Play Announcement Speech"
                          >
                            Play
                          </button>
                          <button
                            onClick={() => handleClearAnnouncement(ann.id, ann.title)}
                            className="text-[9px] font-bold text-status-critical border border-status-critical/30 hover:bg-status-critical/10 px-2 py-1 rounded transition-colors font-mono cursor-pointer uppercase tracking-wider"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* FLOATING CHAT ASSISTANT WIDGET */}
      <div className="fixed bottom-12 right-8 w-80 glass-panel rounded-2xl shadow-2xl border-primary/10 flex flex-col overflow-hidden z-50 bg-surface/95 transition-all">
        <div className="p-3 bg-primary flex justify-between items-center text-white">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center border border-white/10 shadow-inner">
              <span className="material-symbols-outlined text-white text-[18px]">smart_toy</span>
            </div>
            <div>
              <p className="font-orbitron text-[10px] font-bold leading-none tracking-widest">FIFA VOLUNT-AI</p>
              <p className="text-[8px] text-white/80 mt-1 font-mono uppercase">Tactical Support Core</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={userLanguage}
              onChange={(e) => setUserLanguage(e.target.value)}
              className="bg-primary-dark/20 text-white rounded text-[9px] border border-white/25 focus:outline-none py-0.5 px-1.5 font-mono cursor-pointer font-bold"
            >
              <option value="English" className="text-on-surface">EN</option>
              <option value="Spanish" className="text-on-surface">ES</option>
              <option value="Portuguese" className="text-on-surface">PT</option>
              <option value="French" className="text-on-surface">FR</option>
            </select>
            <button
              onClick={() => setShowAssistant(!showAssistant)}
              className="text-white/80 hover:text-white transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">{showAssistant ? "expand_more" : "expand_less"}</span>
            </button>
          </div>
        </div>

        {showAssistant && (
          <>
            <div className="p-4 h-64 overflow-y-auto space-y-3 text-[11px] bg-surface-container-low/40">
              {chatHistory.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col gap-1 max-w-[85%] rounded-xl p-2.5 shadow-sm border animate-fade-in ${
                    msg.sender === "user"
                      ? "bg-primary/5 border-primary/20 text-on-surface self-end ml-auto"
                      : msg.sender === "system"
                        ? "bg-surface-container border-outline-variant/30 text-outline text-[9px] self-center w-full text-center rounded-md py-1 font-mono"
                        : "bg-surface border-outline-variant/30 text-on-surface self-start mr-auto"
                  }`}
                >
                  <p className="leading-relaxed whitespace-pre-wrap font-sans">{msg.text}</p>
                  
                  {msg.suggestedRoute && (
                    <div className="mt-2 pt-2 border-t border-outline-variant/20 text-[9px] space-y-1.5 font-mono">
                      <span className="text-primary font-bold flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">navigation</span>
                        Route ({msg.suggestedRoute.mode}):
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {msg.suggestedRoute.path.map((wp, wIdx) => (
                          <span key={wIdx} className="flex items-center gap-1 font-mono">
                            {wIdx > 0 && <span className="text-outline text-[8px]">&raquo;</span>}
                            <span className="bg-surface-container border border-outline-variant/30 text-on-surface-variant px-1.5 py-0.5 rounded text-[8px] font-bold">
                              {wp}
                            </span>
                          </span>
                        ))}
                      </div>
                      <div className="text-[8px] text-outline mt-1">
                        Travel Time: <strong className="text-on-surface font-bold">{msg.suggestedRoute.travelTime}m</strong>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {loadingGuidance && (
                <div className="bg-surface border border-outline-variant/30 rounded-xl p-2.5 max-w-[80%] self-start mr-auto shadow-sm animate-fade-in flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full bounce-dot-1"></span>
                  <span className="w-1.5 h-1.5 bg-primary rounded-full bounce-dot-2"></span>
                  <span className="w-1.5 h-1.5 bg-primary rounded-full bounce-dot-3"></span>
                  <span className="text-[9px] font-mono text-outline ml-1.5">Generating crowd-smart route...</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="p-2 border-t border-outline-variant/20 bg-surface-container-low flex flex-wrap gap-1">
              <button
                onClick={() => handleSendChatMessage("How do I bypass the massive Gate C crowd delay?")}
                className="bg-surface hover:bg-surface-container-high border border-outline-variant/50 rounded-lg py-1 px-2 text-[9px] text-primary font-semibold transition-all cursor-pointer truncate max-w-[140px] font-mono uppercase"
              >
                Bypass Gate C Wait
              </button>
              <button
                onClick={() => handleSendChatMessage("I am at South Overflow Parking. How do I get inside?")}
                className="bg-surface hover:bg-surface-container-high border border-outline-variant/50 rounded-lg py-1 px-2 text-[9px] text-primary font-semibold transition-all cursor-pointer truncate max-w-[140px] font-mono uppercase"
              >
                Route from Lot H
              </button>
              <button
                onClick={() => handleSendChatMessage("Where is the nearest food stall and how do I get there?")}
                className="bg-surface hover:bg-surface-container-high border border-outline-variant/50 rounded-lg py-1 px-2 text-[9px] text-primary font-semibold transition-all cursor-pointer truncate max-w-[140px] font-mono uppercase"
              >
                Food Stall Route
              </button>
              <button
                onClick={() => handleSendChatMessage("Where is the nearest washroom facility and how do I get there?")}
                className="bg-surface hover:bg-surface-container-high border border-outline-variant/50 rounded-lg py-1 px-2 text-[9px] text-primary font-semibold transition-all cursor-pointer truncate max-w-[140px] font-mono uppercase"
              >
                Washroom Route
              </button>
            </div>

            <div className="p-3 border-t border-outline-variant/20 bg-surface">
              <div className="relative flex items-center">
                <input
                  type="text"
                  placeholder="Ask for crowd-smart routing advice..."
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendChatMessage(currentMessage)}
                  className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl py-1.5 pl-3 pr-8 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary font-sans"
                />
                <button
                  onClick={() => handleSendChatMessage(currentMessage)}
                  className="absolute right-2.5 text-primary hover:scale-110 transition-transform cursor-pointer flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-[18px]">send</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer: Persistent Telemetry Logs */}
      <footer className="fixed bottom-0 left-0 right-0 h-10 z-40 bg-surface/90 backdrop-blur-md border-t border-outline-variant/30 flex items-center justify-between px-8 shadow-inner" id="main-footer">
        <div className="flex items-center gap-4">
          <span className="font-orbitron text-[9px] text-on-surface uppercase tracking-widest flex items-center gap-1.5 font-black shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-status-go animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.6)]"></span>
            Telemetry Stream
          </span>
          <div className="overflow-hidden whitespace-nowrap w-[400px] md:w-[700px] text-outline text-[10px] font-medium font-mono select-none">
            <div className="inline-block animate-marquee whitespace-nowrap">
              {operationLogs.map((log, idx) => (
                <span key={idx} className="mr-8">» {log}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-6 text-[9px] text-outline shrink-0 font-mono uppercase tracking-wider font-bold">
          <span>CrowdIQ Operations Terminal</span>
        </div>
      </footer>

    </div>
  );
}
