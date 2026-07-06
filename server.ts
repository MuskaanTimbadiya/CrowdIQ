import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import {
  SimulationState,
  StadiumInfo,
  GateStatus,
  TransitHub,
  RoadStatus,
  CrowdIncident,
  OptimizationAction,
  Announcement
} from "./src/types";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Initialize Gemini SDK with User-Agent header for AI Studio
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
} else {
  console.warn("WARNING: GEMINI_API_KEY environment variable is not set. AI services will run in fallback simulation mode.");
}

// Global In-Memory Simulation State
let currentStadiumId = "metlife";
let currentPhase: "ingress" | "halftime" | "egress" = "ingress";

const stadiums: Record<string, StadiumInfo> = {
  metlife: {
    id: "metlife",
    name: "MetLife Stadium (NY/NJ Host City)",
    city: "East Rutherford, NJ, USA",
    capacity: 82500,
    currentAttendance: 76400,
    matchInfo: "Argentina vs. England (Quarter-Final)",
    timeToKickoff: "75 mins before Kickoff"
  },
  azteca: {
    id: "azteca",
    name: "Estadio Azteca",
    city: "Mexico City, Mexico",
    capacity: 87500,
    currentAttendance: 84100,
    matchInfo: "Mexico vs. Germany (Round of 16)",
    timeToKickoff: "90 mins before Kickoff"
  },
  sofi: {
    id: "sofi",
    name: "SoFi Stadium",
    city: "Los Angeles, CA, USA",
    capacity: 70000,
    currentAttendance: 68500,
    matchInfo: "USA vs. Brazil (Group Stage)",
    timeToKickoff: "+15 mins after Match"
  }
};

const defaultGates = (stadiumId: string): GateStatus[] => {
  const coeff = stadiumId === "metlife" ? 1.0 : stadiumId === "azteca" ? 1.1 : 0.85;
  return [
    {
      id: "gate_a",
      name: "Gate A (North Plaza / Rail Ingress)",
      status: "CONGESTED",
      queueCount: Math.round(1850 * coeff),
      throughputRate: Math.round(110 * coeff),
      avgWaitTime: 18,
      assignedVolunteers: 18,
      accessibilityFriendly: true
    },
    {
      id: "gate_b",
      name: "Gate B (East Promenade / Shuttle)",
      status: "OPEN",
      queueCount: Math.round(450 * coeff),
      throughputRate: Math.round(120 * coeff),
      avgWaitTime: 4,
      assignedVolunteers: 12,
      accessibilityFriendly: true
    },
    {
      id: "gate_c",
      name: "Gate C (South Plaza / Main Parking)",
      status: "CRITICAL",
      queueCount: Math.round(3400 * coeff),
      throughputRate: Math.round(95 * coeff),
      avgWaitTime: 36,
      assignedVolunteers: 15,
      accessibilityFriendly: false
    },
    {
      id: "gate_d",
      name: "Gate D (West Deck / VIP & Suites)",
      status: "OPEN",
      queueCount: Math.round(150 * coeff),
      throughputRate: Math.round(40 * coeff),
      avgWaitTime: 3,
      assignedVolunteers: 10,
      accessibilityFriendly: true
    },
    {
      id: "gate_e",
      name: "Gate E (Disabled Access / Premium)",
      status: "OPEN",
      queueCount: Math.round(80 * coeff),
      throughputRate: Math.round(25 * coeff),
      avgWaitTime: 3,
      assignedVolunteers: 14,
      accessibilityFriendly: true
    }
  ];
};

const defaultTransit = (stadiumId: string): TransitHub[] => {
  return [
    {
      id: "rail_transit",
      name: "Metropolitan Express Rail",
      type: "TRAIN",
      status: "HEAVY",
      currentLoad: 85,
      avgWaitTime: 22
    },
    {
      id: "shuttle_bus",
      name: "Tournament Shuttle Hub (Lots F/G)",
      type: "SHUTTLE",
      status: "MODERATE",
      currentLoad: 60,
      avgWaitTime: 12
    },
    {
      id: "rideshare_hub",
      name: "FIFA Ride-Share Zone (Lot D)",
      type: "RIDESHARE",
      status: "HEAVY",
      currentLoad: 90,
      avgWaitTime: 28
    },
    {
      id: "parking_main",
      name: "General Parking (Lots A, B, C)",
      type: "PARKING",
      status: "HEAVY",
      currentLoad: 92,
      avgWaitTime: 15,
      availableSpaces: 340,
      totalSpaces: 12000
    },
    {
      id: "parking_south",
      name: "South Overflow Parking (Lot H)",
      type: "PARKING",
      status: "FLUID",
      currentLoad: 42,
      avgWaitTime: 3,
      availableSpaces: 2150,
      totalSpaces: 5000
    }
  ];
};

const defaultRoads = (stadiumId: string): RoadStatus[] => {
  return [
    {
      id: "road_highway_n",
      name: "I-95 / Expressway North",
      direction: "Northbound",
      congestion: "HIGH",
      avgSpeed: 18,
      delayMinutes: 14,
      laneControlsActive: false
    },
    {
      id: "road_highway_s",
      name: "I-95 / Expressway South",
      direction: "Southbound",
      congestion: "MEDIUM",
      avgSpeed: 35,
      delayMinutes: 5,
      laneControlsActive: false
    },
    {
      id: "road_stadium_blvd",
      name: "Stadium Boulevard Entrance",
      direction: "Eastbound",
      congestion: "GRIDLOCK",
      avgSpeed: 4,
      delayMinutes: 25,
      laneControlsActive: true
    },
    {
      id: "road_bypass_ave",
      name: "FIFA Park-and-Ride Bypass",
      direction: "Westbound",
      congestion: "LOW",
      avgSpeed: 45,
      delayMinutes: 0,
      laneControlsActive: false
    }
  ];
};

const defaultIncidents = (): CrowdIncident[] => {
  return [
    {
      id: "inc_1",
      location: "Gate C Ticket Scanners",
      severity: "WARNING",
      description: "Network dropout on 4 wireless scanners causing Gate C ingress bottleneck.",
      timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
      resolved: false
    },
    {
      id: "inc_2",
      location: "North Transit Station Platform 2",
      severity: "CRITICAL",
      description: "Severe pedestrian gridlock at stairs. Escalator out of service for safety checks.",
      timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
      resolved: false
    }
  ];
};

const defaultOptimizations = (): OptimizationAction[] => {
  return [
    {
      id: "opt_1",
      title: "Activate Counter-flow Lanes on Stadium Blvd",
      description: "Dynamically reverse 2 central lanes to allow ingress-only traffic from Highway 95.",
      type: "TRAFFIC_CONTROL",
      urgency: "HIGH",
      estimatedImpact: "Reduces road delay by 10-12 minutes on Stadium Boulevard.",
      applied: false,
      aiJustification: "Highly effective for ingress stage because North/East access roads are currently choked while outbound lanes are completely empty."
    },
    {
      id: "opt_2",
      title: "Reroute Incoming Fans to Gate B & D",
      description: "Trigger digital signage, mobile app notifications, and volunteer megaphone guidance directing Gate C queue holders to auxiliary Gate B.",
      type: "GATE_REDIRECTION",
      urgency: "CRITICAL",
      estimatedImpact: "Bypasses 36-minute wait time at Gate C; loads open gates B & D.",
      applied: false,
      aiJustification: "Gate C has reached a critical queue level (3,400 fans) with ticket scanner failure, while Gate B and D have idle capacity with average wait times under 4 minutes."
    }
  ];
};

// State Object
let state: SimulationState = {
  stadium: stadiums.metlife,
  gates: defaultGates("metlife"),
  transit: defaultTransit("metlife"),
  roads: defaultRoads("metlife"),
  incidents: defaultIncidents(),
  optimizations: defaultOptimizations(),
  lastUpdated: new Date().toISOString()
};

// Global active announcements list
let activeAnnouncements: Announcement[] = [
  {
    id: "ann_1",
    title: "Gate C Scanner Delays",
    content: "ATTENTION ALL FANS AT GATE C: We are experiencing ticket scanner slowdowns. Please use Gate B or Gate D for faster entry. Your ticket will work at any gate.",
    targetAudience: "GATE_C_ONLY",
    priority: "HIGH",
    languages: ["English", "Spanish"],
    broadcastActive: true,
    timestamp: new Date().toISOString()
  },
  {
    id: "ann_2",
    title: "Transit Platform Overcrowding",
    content: "Please slow your approach to the train platform. Platform 2 is temporarily metering entry for passenger safety.",
    targetAudience: "TRAIN_PASSENGERS",
    priority: "HIGH",
    languages: ["English", "Spanish", "Portuguese"],
    broadcastActive: true,
    timestamp: new Date().toISOString()
  }
];

// Helper to recalculate wait times dynamically based on queue and throughput
const updateWaitTimesAndQueues = () => {
  // Update Gates
  state.gates = state.gates.map(gate => {
    if (gate.status === "CLOSED") {
      return { ...gate, queueCount: 0, avgWaitTime: 0 };
    }
    // Calculate avgWaitTime = queueCount / throughputRate
    const wait = gate.throughputRate > 0 ? Math.round(gate.queueCount / gate.throughputRate) : 0;
    let status = gate.status;
    if (wait > 30) status = "CRITICAL";
    else if (wait > 15) status = "CONGESTED";
    else status = "OPEN";

    return {
      ...gate,
      status,
      avgWaitTime: wait
    };
  });

  // Update Road delays
  state.roads = state.roads.map(road => {
    let delay = road.delayMinutes;
    if (road.congestion === "GRIDLOCK") delay = Math.round(delay * 1.1 + 1);
    else if (road.congestion === "HIGH") delay = Math.round(delay * 1.05);
    else if (road.congestion === "LOW") delay = 0;

    return {
      ...road,
      delayMinutes: delay
    };
  });

  state.lastUpdated = new Date().toISOString();
};

// API Endpoints

// 1. Get Simulation State
app.get("/api/state", (req, res) => {
  res.json({
    state,
    activeAnnouncements,
    currentPhase
  });
});

// 2. Trigger Simulation Phase Update
app.post("/api/state/phase", (req, res) => {
  const { phase, stadiumId } = req.body;
  if (stadiumId && stadiums[stadiumId]) {
    currentStadiumId = stadiumId;
    state.stadium = stadiums[stadiumId];
  }

  if (phase && ["ingress", "halftime", "egress"].includes(phase)) {
    currentPhase = phase;
    const coeff = currentStadiumId === "metlife" ? 1.0 : currentStadiumId === "azteca" ? 1.15 : 0.85;

    if (phase === "ingress") {
      state.stadium.currentAttendance = Math.round(state.stadium.capacity * 0.92);
      state.stadium.timeToKickoff = "75 mins before Kickoff";
      state.gates = defaultGates(currentStadiumId);
      state.transit = defaultTransit(currentStadiumId);
      state.roads = defaultRoads(currentStadiumId);
      state.incidents = defaultIncidents();
    } else if (phase === "halftime") {
      state.stadium.currentAttendance = Math.round(state.stadium.capacity * 0.98);
      state.stadium.timeToKickoff = "Halftime Intermission";
      state.gates = state.gates.map(g => ({
        ...g,
        status: "OPEN",
        queueCount: Math.round(50 * coeff),
        avgWaitTime: 1
      }));
      state.transit = state.transit.map(t => ({
        ...t,
        status: "FLUID",
        currentLoad: 15,
        avgWaitTime: 2
      }));
      state.roads = state.roads.map(r => ({
        ...r,
        congestion: "LOW",
        avgSpeed: 50,
        delayMinutes: 0
      }));
      state.incidents = [
        {
          id: "inc_3",
          location: "Concession Block East (Lower Concourse)",
          severity: "WARNING",
          description: "Extreme pedestrian bottleneck forming near restrooms & beer stands during Halftime rush.",
          timestamp: new Date().toISOString(),
          resolved: false
        }
      ];
    } else if (phase === "egress") {
      state.stadium.currentAttendance = state.stadium.capacity;
      state.stadium.timeToKickoff = "+15 mins after Match";
      state.gates = state.gates.map(g => {
        // Egress reversing: gates are fully open outbound, throughput high
        return {
          ...g,
          name: g.name.replace("Ingress", "Egress"),
          status: g.id === "gate_c" ? "CRITICAL" : "CONGESTED",
          queueCount: g.id === "gate_c" ? Math.round(5800 * coeff) : Math.round(2500 * coeff),
          throughputRate: Math.round(200 * coeff),
          avgWaitTime: g.id === "gate_c" ? 29 : 12
        };
      });
      state.transit = state.transit.map(t => {
        return {
          ...t,
          status: t.type === "PARKING" ? "MODERATE" : "BLOCKED",
          currentLoad: 98,
          avgWaitTime: t.type === "TRAIN" ? 45 : t.type === "RIDESHARE" ? 55 : 30
        };
      });
      state.roads = state.roads.map(r => {
        return {
          ...r,
          congestion: r.id === "road_bypass_ave" ? "MEDIUM" : "GRIDLOCK",
          avgSpeed: r.id === "road_bypass_ave" ? 25 : 3,
          delayMinutes: r.id === "road_bypass_ave" ? 8 : 42
        };
      });
      state.incidents = [
        {
          id: "inc_4",
          location: "South Parking Exit Toll Gate",
          severity: "WARNING",
          description: "Exit gate barrier stuck closed in Lane 4. Causing secondary backups.",
          timestamp: new Date().toISOString(),
          resolved: false
        }
      ];
    }
  }

  // Generate customized AI optimizations
  state.optimizations = defaultOptimizations();
  updateWaitTimesAndQueues();
  res.json({
    state,
    activeAnnouncements,
    currentPhase
  });
});

// 3. Resolve an Incident
app.post("/api/incidents/resolve", (req, res) => {
  const { id } = req.body;
  state.incidents = state.incidents.map(inc => {
    if (inc.id === id) {
      return { ...inc, resolved: true };
    }
    return inc;
  });

  // If scanner issue resolved, reduce Gate C queue and set to OPEN/CONGESTED
  if (id === "inc_1") {
    state.gates = state.gates.map(g => {
      if (g.id === "gate_c") {
        return {
          ...g,
          status: "CONGESTED",
          throughputRate: g.throughputRate + 40,
          queueCount: Math.max(200, g.queueCount - 1200)
        };
      }
      return g;
    });
  }

  updateWaitTimesAndQueues();
  res.json(state);
});

// 4. Create manual incident
app.post("/api/incidents", (req, res) => {
  const { location, severity, description } = req.body;
  const newIncident: CrowdIncident = {
    id: `inc_${Date.now()}`,
    location: location || "Stadium Perimeter",
    severity: severity || "INFO",
    description: description || "No details provided.",
    timestamp: new Date().toISOString(),
    resolved: false
  };
  state.incidents.unshift(newIncident);
  res.json(state);
});

// 5. Apply an optimization action
app.post("/api/optimizations/apply", (req, res) => {
  const { id } = req.body;
  state.optimizations = state.optimizations.map(opt => {
    if (opt.id === id) {
      return { ...opt, applied: true, appliedAt: new Date().toLocaleTimeString() };
    }
    return opt;
  });

  // Apply visual feedback consequences
  const opt = state.optimizations.find(o => o.id === id);
  if (opt) {
    if (opt.type === "TRAFFIC_CONTROL") {
      state.roads = state.roads.map(r => {
        if (r.id === "road_stadium_blvd") {
          return {
            ...r,
            congestion: "MEDIUM",
            avgSpeed: 24,
            delayMinutes: Math.max(3, r.delayMinutes - 15),
            laneControlsActive: true
          };
        }
        return r;
      });
    } else if (opt.type === "GATE_REDIRECTION") {
      state.gates = state.gates.map(g => {
        if (g.id === "gate_c") {
          return {
            ...g,
            queueCount: Math.max(100, g.queueCount - 1500),
            status: "OPEN"
          };
        } else if (g.id === "gate_b") {
          return {
            ...g,
            queueCount: g.queueCount + 600,
            status: "CONGESTED"
          };
        } else if (g.id === "gate_d") {
          return {
            ...g,
            queueCount: g.queueCount + 600,
            status: "CONGESTED"
          };
        }
        return g;
      });
    }
  }

  updateWaitTimesAndQueues();
  res.json(state);
});

// 6. Gemini-powered dynamic overall analysis and generation of custom operational adjustments
app.post("/api/ai/optimize", async (req, res) => {
  if (!ai) {
    // Return standard mock optimization list as fallback
    const mockOptimizations: OptimizationAction[] = [
      ...state.optimizations,
      {
        id: `opt_ai_${Date.now()}`,
        title: "Dynamic Volunteer Re-deployment to North Rail Station",
        description: "Deploy 12 crowd ambassadors from Gate D and West Deck to the Metropolitan Express Rail stairs to hand-direct pedestrian flow and guide accessibility paths.",
        type: "TRANSIT_BOOST",
        urgency: "HIGH",
        estimatedImpact: "Reduces platform bottleneck delay by 15 mins; stabilizes escalator crowd flow safety.",
        applied: false,
        aiJustification: "Escalator out of service and stairs are extremely bottlenecked. Deploying ambassadors will split traffic and keep volunteers exactly where the pressure is highest."
      }
    ];
    state.optimizations = mockOptimizations;
    return res.json({ optimizations: state.optimizations, fallback: true });
  }

  try {
    const prompt = `
      You are the Tournament Operations AI Coordinator for FIFA World Cup 2026.
      Analyze the current real-time stadium traffic, road status, gate queues, transit delays, and incidents.
      Generate 2 high-priority, highly-actionable custom optimization actions that the stadium operations team can instantly deploy.
      
      STADIUM: ${state.stadium.name} in ${state.stadium.city}
      MATCH PHASE: ${currentPhase.toUpperCase()} (${state.stadium.timeToKickoff})
      CURRENT ATTENDANCE: ${state.stadium.currentAttendance} / ${state.stadium.capacity}
      
      GATES STATUS:
      ${state.gates.map(g => `- ${g.name}: Queue: ${g.queueCount} fans, Wait: ${g.avgWaitTime} mins, Throughput: ${g.throughputRate}/min, Status: ${g.status}`).join("\n")}
      
      TRANSIT & PARKING STATUS:
      ${state.transit.map(t => `- ${t.name} (${t.type}): Wait: ${t.avgWaitTime} mins, Load: ${t.currentLoad}%, Available Spaces: ${t.availableSpaces || 'N/A'}`).join("\n")}
      
      ROADS STATUS:
      ${state.roads.map(r => `- ${r.name} (${r.direction}): Congestion: ${r.congestion}, Speed: ${r.avgSpeed} mph, Delay: ${r.delayMinutes} mins, Contraflow Active: ${r.laneControlsActive}`).join("\n")}
      
      ACTIVE INCIDENTS:
      ${state.incidents.filter(i => !i.resolved).map(i => `- [${i.severity}] ${i.location}: ${i.description}`).join("\n") || "None"}
      
      Output exactly a JSON array matching the Schema structure below. Do not wrap with Markdown blocks other than standard JSON.
      JSON Schema required:
      {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "title": "string (clear, direct action, max 8 words)",
            "description": "string (specific deployment instruction)",
            "type": "string (must be one of: 'TRAFFIC_CONTROL', 'GATE_REDIRECTION', 'TRANSIT_BOOST', 'ANNOUNCEMENT')",
            "urgency": "string (must be one of: 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL')",
            "estimatedImpact": "string (quantified operational improvement)",
            "aiJustification": "string (brief reasoning linking back to the incidents or queue levels)"
          },
          "required": ["title", "description", "type", "urgency", "estimatedImpact", "aiJustification"]
        }
      }
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              type: { type: Type.STRING, enum: ["TRAFFIC_CONTROL", "GATE_REDIRECTION", "TRANSIT_BOOST", "ANNOUNCEMENT"] },
              urgency: { type: Type.STRING, enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"] },
              estimatedImpact: { type: Type.STRING },
              aiJustification: { type: Type.STRING }
            },
            required: ["title", "description", "type", "urgency", "estimatedImpact", "aiJustification"]
          }
        }
      }
    });

    const text = response.text || "[]";
    const parsed = JSON.parse(text);
    
    const formatted = parsed.map((item: any, idx: number) => ({
      id: `opt_ai_${Date.now()}_${idx}`,
      title: item.title,
      description: item.description,
      type: item.type,
      urgency: item.urgency,
      estimatedImpact: item.estimatedImpact,
      applied: false,
      aiJustification: item.aiJustification
    }));

    // Keep the standard ones but prepend the fresh AI suggestions
    state.optimizations = [...formatted, ...state.optimizations];
    res.json({ optimizations: state.optimizations });
  } catch (error: any) {
    console.error("Gemini Optimize Error:", error);
    res.status(500).json({ error: "Failed to generate AI optimizations", details: error.message });
  }
});

// 7. Gemini-powered Multilingual Fan Guidance Chat Bot
app.post("/api/ai/guidance", async (req, res) => {
  const { message, chatHistory, userLanguage = "English" } = req.body;

  if (!ai) {
    // Fallback response when no API key
    const replyText = `[No API Key - Offline Mode] Hello there! I'm your FIFA 2026 World Cup helper. Currently at ${state.stadium.name}. Gate C is very crowded with a 36-minute wait time. I recommend entering through Gate B or D which have under 4 minutes wait time. Let me know if you need parking or transit recommendations!`;
    const fallbackMessage = {
      id: `msg_${Date.now()}`,
      sender: "ai",
      text: replyText,
      timestamp: new Date().toISOString(),
      suggestedActions: ["How to reach Gate B?", "Where is accessibility parking?", "Show transit options"]
    };
    return res.json({ message: fallbackMessage });
  }

  try {
    const formattedHistory = chatHistory
      ? chatHistory.slice(-5).map((m: any) => `${m.sender.toUpperCase()}: ${m.text}`).join("\n")
      : "";

    const prompt = `
      You are the Multilingual AI Stadium Assistant (FIFA Volunt-AI) stationed inside/outside ${state.stadium.name} (${state.stadium.city}) for the FIFA World Cup 2026.
      Your job is to assist fans, visitors, venue staff, or volunteers with real-time crowd-aware routing, transit assistance, accessibility advice, and match guidance.
      Always check the live stadium simulation numbers below to give exact, dynamic, crowd-smart answers. NEVER make up gate wait times if you can read them from this context.
      
      === LIVE STADIUM OPERATIONAL CONTEXT ===
      Stadium: ${state.stadium.name} in ${state.stadium.city}
      Match: ${state.stadium.matchInfo}
      Phase: ${currentPhase.toUpperCase()} (${state.stadium.timeToKickoff})
      Attendance: ${state.stadium.currentAttendance} / ${state.stadium.capacity}
      
      GATES STATUS:
      ${state.gates.map(g => `- ${g.name}: Queue: ${g.queueCount} fans, Wait: ${g.avgWaitTime} mins, Throughput: ${g.throughputRate}/min, Status: ${g.status}, Accessibility: ${g.accessibilityFriendly ? 'Fully Friendly' : 'Stairs Only'}`).join("\n")}
      
      TRANSIT & PARKING STATUS:
      ${state.transit.map(t => `- ${t.name} (${t.type}): Wait: ${t.avgWaitTime} mins, Load: ${t.currentLoad}%, Available Parking: ${t.availableSpaces !== undefined ? `${t.availableSpaces} spaces left` : 'N/A'}`).join("\n")}
      
      ROADS STATUS:
      ${state.roads.map(r => `- ${r.name} (${r.direction}): Congestion: ${r.congestion}, Delay: ${r.delayMinutes} mins, Speed: ${r.avgSpeed} mph`).join("\n")}
      
      ACTIVE INCIDENTS:
      ${state.incidents.filter(i => !i.resolved).map(i => `- [${i.severity}] ${i.location}: ${i.description}`).join("\n") || "None"}
      
      === FAN REQUEST ===
      User's preferred language or system default: ${userLanguage}
      Message: "${message}"
      
      === CHAT HISTORY ===
      ${formattedHistory}

      === RESPONSE INSTRUCTIONS ===
      1. Respond directly in the language that the user is typing or requesting (e.g., English, Spanish, Portuguese, French, etc.). Be exceptionally helpful, warm, and clear.
      2. Ground your advice in the live data. If they ask about parking, point them to Lots with high space availability (e.g. Lot H has ${state.transit.find(t => t.id === "parking_south")?.availableSpaces || 'lots'} spaces left). If they ask about entrance, steer them away from CRITICAL congestion gates.
      3. If they ask for routing, try to provide a logical dynamic path (e.g., "Park at South Lot H, take the South Shuttle Bus, and enter through Gate B to bypass the Gate C gridlock").
      4. Output your response strictly in the JSON format matching the schema below. Keep response warm and direct.

      JSON Schema:
      {
        "text": "string (your main markdown-formatted message to the fan)",
        "language": "string (the language you responded in)",
        "suggestedActions": ["array of 2-3 short user action buttons based on your response"],
        "suggestedRoute": {
          "path": ["array of 3-5 waypoint strings, e.g. 'South Lot H', 'South Shuttle Bus Route', 'Gate B Portal'"],
          "travelTime": number (total travel + wait time in minutes),
          "mode": "string (e.g., 'Shuttle + Walking' or 'Train')",
          "congestedAreas": ["any congested zones on this route, or empty if none"]
        }
      }
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING },
            language: { type: Type.STRING },
            suggestedActions: { type: Type.ARRAY, items: { type: Type.STRING } },
            suggestedRoute: {
              type: Type.OBJECT,
              properties: {
                path: { type: Type.ARRAY, items: { type: Type.STRING } },
                travelTime: { type: Type.NUMBER },
                mode: { type: Type.STRING },
                congestedAreas: { type: Type.ARRAY, items: { type: Type.STRING } }
              }
            }
          },
          required: ["text", "language"]
        }
      }
    });

    const parsed = JSON.parse(response.text || "{}");
    const formattedReply = {
      id: `msg_${Date.now()}`,
      sender: "ai" as const,
      text: parsed.text || "I'm sorry, I could not generate a response. Please let me know how I can help.",
      timestamp: new Date().toISOString(),
      language: parsed.language || "English",
      suggestedActions: parsed.suggestedActions || [],
      suggestedRoute: parsed.suggestedRoute || undefined
    };

    res.json({ message: formattedReply });
  } catch (error: any) {
    console.error("Gemini Fan Guidance Error:", error);
    res.status(500).json({ error: "Failed to process chat with AI", details: error.message });
  }
});

// 8. Generate dynamic broadcast overhead announcement draft using Gemini
app.post("/api/ai/broadcast-draft", async (req, res) => {
  const { incidentLocation, incidentDescription, urgency = "HIGH" } = req.body;

  if (!ai) {
    // Offline / Mock broadcast draft
    const fallbackDraft = {
      id: `ann_draft_${Date.now()}`,
      title: `Advisory: ${incidentLocation || 'Stadium update'}`,
      content: `SAFETY NOTICE: Regarding ${incidentLocation}. ${incidentDescription || 'Please remain calm and follow volunteer directions.'} Plan your path accordingly. Thank you for your cooperation.`,
      targetAudience: "ALL_FANS",
      priority: urgency === "CRITICAL" ? "URGENT" : "HIGH",
      languages: ["English", "Spanish"],
      broadcastActive: false,
      timestamp: new Date().toISOString()
    };
    return res.json({ draft: fallbackDraft });
  }

  try {
    const prompt = `
      You are the emergency PA and digital screen announcer for the FIFA World Cup 2026 stadium management team.
      Draft a formal, extremely clear, concise, and calm public safety broadcast or overhead notice based on this incident:
      - Location: ${incidentLocation}
      - Situation: ${incidentDescription}
      - Severity: ${urgency}
      
      Generate translations of the announcement content in English, Spanish (Español), and French/Portuguese, matching the global audience.
      Output exactly a JSON object matching this schema:
      {
        "title": "string (short digital notice title, max 5 words)",
        "content": "string (the PA announcement text in English, Spanish, and Portuguese merged or structured nicely so they can read, clear and reassuring, under 80 words total)",
        "targetAudience": "string (must be one of: 'ALL_FANS', 'GATE_C_ONLY', 'TRAIN_PASSENGERS', 'STAFF', 'ACCESSIBILITY_NEEDS')",
        "languages": ["array of language strings included, e.g. ['English', 'Spanish', 'Portuguese']"]
      }
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            content: { type: Type.STRING },
            targetAudience: { type: Type.STRING, enum: ["ALL_FANS", "GATE_C_ONLY", "TRAIN_PASSENGERS", "STAFF", "ACCESSIBILITY_NEEDS"] },
            languages: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["title", "content", "targetAudience", "languages"]
        }
      }
    });

    const parsed = JSON.parse(response.text || "{}");
    const draft: Announcement = {
      id: `ann_draft_${Date.now()}`,
      title: parsed.title || `Advisory: ${incidentLocation}`,
      content: parsed.content || `${incidentDescription}`,
      targetAudience: parsed.targetAudience || "ALL_FANS",
      priority: urgency === "CRITICAL" ? "URGENT" : "HIGH",
      languages: parsed.languages || ["English", "Spanish"],
      broadcastActive: false,
      timestamp: new Date().toISOString()
    };

    res.json({ draft });
  } catch (error: any) {
    console.error("Gemini Broadcast Draft Error:", error);
    res.status(500).json({ error: "Failed to draft announcement with AI", details: error.message });
  }
});

// 9. Post / Publish a broadcast announcement to the digital boards
app.post("/api/broadcast/publish", (req, res) => {
  const { announcement } = req.body;
  if (announcement) {
    const published: Announcement = {
      ...announcement,
      id: `ann_pub_${Date.now()}`,
      broadcastActive: true,
      timestamp: new Date().toISOString()
    };
    activeAnnouncements.unshift(published);
    res.json({ success: true, activeAnnouncements });
  } else {
    res.status(400).json({ error: "No announcement data provided" });
  }
});

// 10. Clear/Deactivate a broadcast
app.post("/api/broadcast/clear", (req, res) => {
  const { id } = req.body;
  activeAnnouncements = activeAnnouncements.map(ann => {
    if (ann.id === id) {
      return { ...ann, broadcastActive: false };
    }
    return ann;
  });
  res.json({ success: true, activeAnnouncements });
});


// Serve React build in production, otherwise Vite dev middleware in development
const startServer = async () => {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`FIFA World Cup 2026 Traffic AI server running on port ${PORT}`);
  });
};

startServer().catch((err) => {
  console.error("Server Start Failed:", err);
});
