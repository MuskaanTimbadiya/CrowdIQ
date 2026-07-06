import React from "react";
import { GateStatus, TransitHub, RoadStatus, CrowdIncident } from "../types";

interface StadiumMapProps {
  gates: GateStatus[];
  transit: TransitHub[];
  roads: RoadStatus[];
  incidents: CrowdIncident[];
  selectedAssetId: string | null;
  onSelectAsset: (id: string, name: string, type: 'gate' | 'transit' | 'road' | 'incident', details: string) => void;
}

export const StadiumMap: React.FC<StadiumMapProps> = ({
  gates,
  transit,
  roads,
  incidents,
  selectedAssetId,
  onSelectAsset
}) => {

  const getStatusColor = (status: string) => {
    switch (status) {
      case "OPEN":
      case "FLUID":
      case "LOW":
        return "#059669"; // green (status-go)
      case "CONGESTED":
      case "MEDIUM":
      case "MODERATE":
        return "#d97706"; // yellow (status-alert)
      case "CRITICAL":
      case "HIGH":
      case "HEAVY":
      case "GRIDLOCK":
        return "#dc2626"; // red (status-critical)
      case "CLOSED":
      case "BLOCKED":
        return "#737688"; // gray (outline)
      default:
        return "#004ced"; // blue (primary)
    }
  };

  const getStrokeDashArray = (congestion: string) => {
    switch (congestion) {
      case "GRIDLOCK":
        return "2, 4";
      case "HIGH":
        return "4, 6";
      case "MEDIUM":
        return "10, 5";
      default:
        return "0";
    }
  };

  return (
    <div className="glass-panel rounded-xl p-4 overflow-hidden bg-white border border-outline-variant/30 flex flex-col" id="stadium-map-card">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-display text-[18px] text-on-surface font-bold flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">map</span>
          REAL-TIME AERIAL SIMULATOR
        </h2>
        <div className="flex items-center gap-4 text-[10px] font-mono text-outline uppercase font-semibold">
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-status-go" /> Fluid</div>
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-status-alert" /> Congested</div>
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-status-critical" /> Gridlock</div>
        </div>
      </div>

      <div className="relative w-full aspect-video min-h-[340px] max-h-[420px] bg-[#f0f4f8] rounded-lg border border-outline-variant/40 flex items-center justify-center p-2 overflow-hidden shadow-inner">
        {/* SVG Map Layout */}
        <svg viewBox="0 0 800 450" className="w-full h-full select-none">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#cbd5e1" strokeWidth="0.5" strokeOpacity="0.7" />
            </pattern>
            <radialGradient id="fieldGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#d1fae5" />
              <stop offset="100%" stopColor="#a7f3d0" />
            </radialGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Surrounding Highway - Northbound */}
          <path
            d="M 50 20 L 750 20"
            stroke={getStatusColor(roads.find(r => r.id === "road_highway_n")?.congestion || "LOW")}
            strokeWidth="8"
            strokeLinecap="round"
            fill="none"
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => {
              const r = roads.find(r => r.id === "road_highway_n");
              if (r) onSelectAsset(r.id, r.name, 'road', `${r.direction} delay: ${r.delayMinutes} mins, speed: ${r.avgSpeed} mph.`);
            }}
          />
          <text x="350" y="14" fill="#737688" className="font-mono text-[9px] tracking-wider font-semibold pointer-events-none">
            I-95 EXPRESSWAY NORTHBOUND
          </text>

          {/* Surrounding Highway - Southbound */}
          <path
            d="M 750 430 L 50 430"
            stroke={getStatusColor(roads.find(r => r.id === "road_highway_s")?.congestion || "LOW")}
            strokeWidth="8"
            strokeLinecap="round"
            fill="none"
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => {
              const r = roads.find(r => r.id === "road_highway_s");
              if (r) onSelectAsset(r.id, r.name, 'road', `${r.direction} delay: ${r.delayMinutes} mins, speed: ${r.avgSpeed} mph.`);
            }}
          />
          <text x="350" y="443" fill="#737688" className="font-mono text-[9px] tracking-wider font-semibold pointer-events-none">
            I-95 EXPRESSWAY SOUTHBOUND
          </text>

          {/* Stadium Boulevard Entrance (Inward) */}
          <path
            d="M 400 20 L 400 130"
            stroke={getStatusColor(roads.find(r => r.id === "road_stadium_blvd")?.congestion || "LOW")}
            strokeWidth="10"
            strokeDasharray={getStrokeDashArray(roads.find(r => r.id === "road_stadium_blvd")?.congestion || "LOW")}
            strokeLinecap="round"
            fill="none"
            className="cursor-pointer hover:opacity-80 transition-all duration-1000"
            onClick={() => {
              const r = roads.find(r => r.id === "road_stadium_blvd");
              if (r) onSelectAsset(r.id, r.name, 'road', `Congestion: ${r.congestion}. Lane Contraflow: ${r.laneControlsActive ? 'ACTIVE (Reversed Central Lanes)' : 'INACTIVE'}. Delay: ${r.delayMinutes} mins.`);
            }}
          />
          <text x="412" y="70" fill="#131b2e" className="font-mono text-[9px] tracking-wide font-bold pointer-events-none">
            Stadium Blvd (Main Access)
          </text>

          {/* Park & Ride Bypass Road */}
          <path
            d="M 50 300 Q 150 250 250 240"
            stroke={getStatusColor(roads.find(r => r.id === "road_bypass_ave")?.congestion || "LOW")}
            strokeWidth="6"
            strokeLinecap="round"
            fill="none"
            className="cursor-pointer hover:opacity-80 transition-colors"
            onClick={() => {
              const r = roads.find(r => r.id === "road_bypass_ave");
              if (r) onSelectAsset(r.id, r.name, 'road', `Route is currently ${r.congestion}. Flow is smooth. Delay: ${r.delayMinutes} mins.`);
            }}
          />
          <text x="70" y="255" fill="#737688" className="font-mono text-[9px] pointer-events-none" transform="rotate(-15, 70, 255)">
            Park-and-Ride Bypass
          </text>


          {/* OUTER PARKING LOTS */}
          {/* Parking Lot A, B, C (Main) */}
          <rect
            x="320"
            y="300"
            width="160"
            height="80"
            rx="8"
            fill="#ffffff"
            stroke={getStatusColor(transit.find(t => t.id === "parking_main")?.status || "LOW")}
            strokeWidth="2.5"
            className="cursor-pointer hover:fill-slate-50 transition-all"
            onClick={() => {
              const t = transit.find(t => t.id === "parking_main");
              if (t) onSelectAsset(t.id, t.name, 'transit', `Main Lot load: ${t.currentLoad}%. Available space: ${t.availableSpaces}/${t.totalSpaces}. Wait: ${t.avgWaitTime} mins.`);
            }}
          />
          <text x="400" y="335" textAnchor="middle" fill="#131b2e" className="font-sans text-[11px] font-bold pointer-events-none">
            Parking Lots A, B, C
          </text>
          <text x="400" y="352" textAnchor="middle" fill="#d97706" className="font-mono text-[10px] pointer-events-none">
            Load: {transit.find(t => t.id === "parking_main")?.currentLoad}%
          </text>

          {/* South Overflow Parking Lot H */}
          <rect
            x="590"
            y="260"
            width="150"
            height="70"
            rx="8"
            fill="#ffffff"
            stroke={getStatusColor(transit.find(t => t.id === "parking_south")?.status || "LOW")}
            strokeWidth="2.5"
            className="cursor-pointer hover:fill-slate-50 transition-all"
            onClick={() => {
              const t = transit.find(t => t.id === "parking_south");
              if (t) onSelectAsset(t.id, t.name, 'transit', `Overflow Lot load: ${t.currentLoad}%. Available spaces: ${t.availableSpaces}/${t.totalSpaces}. Rapid shuttle connection to Gate B.`);
            }}
          />
          <text x="665" y="295" textAnchor="middle" fill="#131b2e" className="font-sans text-[11px] font-bold pointer-events-none">
            Overflow Lot H (South)
          </text>
          <text x="665" y="312" textAnchor="middle" fill="#059669" className="font-mono text-[10px] pointer-events-none font-bold">
            {transit.find(t => t.id === "parking_south")?.availableSpaces} Spaces Left
          </text>


          {/* PUBLIC TRANSIT HUBS */}
          {/* Main Train Station (Metropolitan Rail) */}
          <g
            className="cursor-pointer group"
            onClick={() => {
              const t = transit.find(t => t.id === "rail_transit");
              if (t) onSelectAsset(t.id, t.name, 'transit', `Express Rail Service is currently ${t.status}. Platform queue wait time: ${t.avgWaitTime} minutes.`);
            }}
          >
            <circle cx="150" cy="120" r="32" fill="#ffffff" stroke={getStatusColor(transit.find(t => t.id === "rail_transit")?.status || "HEAVY")} strokeWidth="3" />
            <text x="150" y="118" textAnchor="middle" fill="#131b2e" className="font-sans text-[10px] font-bold">
              RAIL
            </text>
            <text x="150" y="132" textAnchor="middle" fill="#dc2626" className="font-mono text-[9px] font-bold">
              {transit.find(t => t.id === "rail_transit")?.avgWaitTime}m wait
            </text>
          </g>

          {/* Tournament Shuttle Bus Hub */}
          <g
            className="cursor-pointer group"
            onClick={() => {
              const t = transit.find(t => t.id === "shuttle_bus");
              if (t) onSelectAsset(t.id, t.name, 'transit', `Tournament Shuttle Hub has ${t.status} loading. Bus frequency is 4 minutes. Backups average ${t.avgWaitTime} mins.`);
            }}
          >
            <circle cx="650" cy="110" r="32" fill="#ffffff" stroke={getStatusColor(transit.find(t => t.id === "shuttle_bus")?.status || "MODERATE")} strokeWidth="3" />
            <text x="650" y="108" textAnchor="middle" fill="#131b2e" className="font-sans text-[10px] font-bold">
              SHUTTLE
            </text>
            <text x="650" y="122" textAnchor="middle" fill="#d97706" className="font-mono text-[9px] font-bold">
              {transit.find(t => t.id === "shuttle_bus")?.avgWaitTime}m wait
            </text>
          </g>


          {/* MAIN STADIUM CENTRAL RING */}
          {/* Outermost Stadium Wall */}
          <ellipse cx="400" cy="220" rx="140" ry="100" fill="#ffffff" stroke="#94a3b8" strokeWidth="4" />
          
          {/* Inner Seating Area */}
          <ellipse cx="400" cy="220" rx="100" ry="70" fill="#f1f3ff" stroke="#cbd5e1" strokeWidth="2" />
          
          {/* Center Football Pitch */}
          <rect x="350" y="195" width="100" height="50" rx="4" fill="url(#fieldGrad)" stroke="#059669" strokeWidth="1.5" />
          <ellipse cx="400" cy="220" rx="12" ry="12" fill="none" stroke="#ffffff" strokeOpacity="0.8" strokeWidth="1" />
          <line x1="400" y1="195" x2="400" y2="245" stroke="#ffffff" strokeOpacity="0.8" strokeWidth="1" />

          {/* Stadium Label */}
          <text x="400" y="174" textAnchor="middle" fill="#131b2e" className="font-sans font-bold text-[10px] tracking-wider" fillOpacity="0.6">
            FIFA WORLD CUP ARENA
          </text>


          {/* GATES (ENTRANCES ARCS) */}
          
          {/* Gate A (North) */}
          <g
            className="cursor-pointer group"
            onClick={() => {
              const g = gates.find(gate => gate.id === "gate_a");
              if (g) onSelectAsset(g.id, g.name, 'gate', `Gate A average queue count: ${g.queueCount} fans. Wait time is ${g.avgWaitTime} minutes.`);
            }}
          >
            <path d="M 370 123 Q 400 115 430 123" stroke={getStatusColor(gates.find(g => g.id === "gate_a")?.status || "LOW")} strokeWidth="8" strokeLinecap="round" fill="none" />
            <circle cx="400" cy="113" r="10" fill="#ffffff" stroke={getStatusColor(gates.find(g => g.id === "gate_a")?.status || "LOW")} strokeWidth="2" />
            <text x="400" y="116" textAnchor="middle" fill="#131b2e" className="font-sans text-[8px] font-bold">A</text>
          </g>

          {/* Gate B (East) */}
          <g
            className="cursor-pointer group"
            onClick={() => {
              const g = gates.find(gate => gate.id === "gate_b");
              if (g) onSelectAsset(g.id, g.name, 'gate', `Gate B average queue count: ${g.queueCount} fans. Wait time is ${g.avgWaitTime} minutes.`);
            }}
          >
            <path d="M 536 200 Q 543 220 536 240" stroke={getStatusColor(gates.find(g => g.id === "gate_b")?.status || "LOW")} strokeWidth="8" strokeLinecap="round" fill="none" />
            <circle cx="548" cy="220" r="10" fill="#ffffff" stroke={getStatusColor(gates.find(g => g.id === "gate_b")?.status || "LOW")} strokeWidth="2" />
            <text x="548" y="223" textAnchor="middle" fill="#131b2e" className="font-sans text-[8px] font-bold">B</text>
          </g>

          {/* Gate C (South) */}
          <g
            className="cursor-pointer group"
            onClick={() => {
              const g = gates.find(gate => gate.id === "gate_c");
              if (g) onSelectAsset(g.id, g.name, 'gate', `Gate C average queue count: ${g.queueCount} fans. Wait time is ${g.avgWaitTime} minutes.`);
            }}
          >
            <path d="M 370 317 Q 400 325 430 317" stroke={getStatusColor(gates.find(g => g.id === "gate_c")?.status || "LOW")} strokeWidth="8" strokeLinecap="round" fill="none" />
            <circle cx="400" cy="327" r="10" fill="#ffffff" stroke={getStatusColor(gates.find(g => g.id === "gate_c")?.status || "LOW")} strokeWidth="2" />
            <text x="400" y="330" textAnchor="middle" fill="#131b2e" className="font-sans text-[8px] font-bold">C</text>
          </g>

          {/* Gate D (West) */}
          <g
            className="cursor-pointer group"
            onClick={() => {
              const g = gates.find(gate => gate.id === "gate_d");
              if (g) onSelectAsset(g.id, g.name, 'gate', `Gate D average queue count: ${g.queueCount} fans. Wait time is ${g.avgWaitTime} minutes.`);
            }}
          >
            <path d="M 264 200 Q 257 220 264 240" stroke={getStatusColor(gates.find(g => g.id === "gate_d")?.status || "LOW")} strokeWidth="8" strokeLinecap="round" fill="none" />
            <circle cx="252" cy="220" r="10" fill="#ffffff" stroke={getStatusColor(gates.find(g => g.id === "gate_d")?.status || "LOW")} strokeWidth="2" />
            <text x="252" y="223" textAnchor="middle" fill="#131b2e" className="font-sans text-[8px] font-bold">D</text>
          </g>

          {/* Gate E (Disabled / Premium) */}
          <g
            className="cursor-pointer group"
            onClick={() => {
              const g = gates.find(gate => gate.id === "gate_e");
              if (g) onSelectAsset(g.id, g.name, 'gate', `Gate E is designated for disabled fans and accessibility services. Queue count: ${g.queueCount} fans, Wait: ${g.avgWaitTime} mins.`);
            }}
          >
            <circle cx="295" cy="145" r="10" fill="#ffffff" stroke={getStatusColor(gates.find(g => g.id === "gate_e")?.status || "LOW")} strokeWidth="2" />
            <text x="295" y="148" textAnchor="middle" fill="#004ced" className="font-sans text-[8px] font-bold">♿</text>
          </g>


          {/* PEDESTRIAN CONCOURSE FLOW PATH LINES */}
          <path d="M 150 152 L 250 220" stroke="#d97706" strokeWidth="2" strokeDasharray="5, 5" fill="none" strokeOpacity="0.5" />
          <path d="M 618 110 L 548 220" stroke="#059669" strokeWidth="2" strokeDasharray="5, 5" fill="none" strokeOpacity="0.5" />
          <path d="M 400 300 L 400 317" stroke="#dc2626" strokeWidth="3" strokeDasharray="4, 4" fill="none" strokeOpacity="0.5" />


          {/* FLASHING INCIDENT HOTSPOT PULSATING CIRCLES */}
          {incidents.filter(inc => !inc.resolved).map((inc) => {
            let x = 400;
            let y = 220;

            if (inc.id === "inc_1") {
              x = 400; y = 330;
            } else if (inc.id === "inc_2") {
              x = 150; y = 140;
            } else if (inc.id === "inc_3") {
              x = 480; y = 220;
            } else if (inc.id === "inc_4") {
              x = 460; y = 320;
            } else {
              const loc = inc.location.toLowerCase();
              if (loc.includes("gate a")) {
                x = 400; y = 123;
              } else if (loc.includes("gate b")) {
                x = 548; y = 220;
              } else if (loc.includes("gate c")) {
                x = 400; y = 327;
              } else if (loc.includes("gate d")) {
                x = 252; y = 220;
              } else if (loc.includes("gate e") || loc.includes("disabled") || loc.includes("accessibility") || loc.includes("wheelchair")) {
                x = 295; y = 145;
              } else if (loc.includes("rail") || loc.includes("train") || loc.includes("station")) {
                x = 150; y = 120;
              } else if (loc.includes("shuttle") || loc.includes("bus")) {
                x = 650; y = 110;
              } else if (loc.includes("overflow") || loc.includes("lot h")) {
                x = 665; y = 295;
              } else if (loc.includes("parking") || loc.includes("lot a") || loc.includes("lot b") || loc.includes("lot c")) {
                x = 400; y = 340;
              } else if (loc.includes("stadium blvd") || loc.includes("boulevard")) {
                x = 400; y = 70;
              } else if (loc.includes("highway") || loc.includes("i-95") || loc.includes("expressway")) {
                x = 400; y = 20;
              } else {
                const hash = inc.id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
                const angle = (hash % 360) * (Math.PI / 180);
                const radius = 90;
                x = Math.round(400 + Math.cos(angle) * radius * 1.2);
                y = Math.round(220 + Math.sin(angle) * radius * 0.9);
              }
            }

            return (
              <g
                key={inc.id}
                className="cursor-pointer animate-pulse"
                onClick={() => onSelectAsset(inc.id, inc.location, 'incident', inc.description)}
              >
                <circle cx={x} cy={y} r="18" fill="none" stroke={inc.severity === "CRITICAL" ? "#dc2626" : "#d97706"} strokeWidth="2.5" strokeOpacity="0.8">
                  <animate attributeName="r" values="8;20;8" dur="1.8s" repeatCount="indefinite" />
                  <animate attributeName="stroke-opacity" values="1;0.2;1" dur="1.8s" repeatCount="indefinite" />
                </circle>
                <circle cx={x} cy={y} r="6" fill={inc.severity === "CRITICAL" ? "#dc2626" : "#d97706"} />
              </g>
            );
          })}
        </svg>

        {/* Selected asset overlays */}
        {selectedAssetId && (
          <div className="absolute bottom-3 left-3 right-3 bg-white/95 backdrop-blur border border-primary/20 rounded-lg p-3 text-xs flex items-center justify-between shadow-xl animate-fade-in">
            <div>
              <span className="font-mono text-[9px] uppercase tracking-wider text-primary font-bold block">
                Selected Asset / Hotspot
              </span>
              <p className="font-display font-bold text-on-surface text-[11px] mt-0.5">
                {selectedAssetId.startsWith("inc") ? "⚠️ INCIDENT: " : ""}
                {selectedAssetId.startsWith("gate") ? "🚪 " : ""}
                {selectedAssetId.startsWith("road") ? "🛣️ " : ""}
                {selectedAssetId.startsWith("parking") || selectedAssetId.startsWith("shuttle") || selectedAssetId.startsWith("rail") ? "🚍 " : ""}
                {
                  gates.find(g => g.id === selectedAssetId)?.name ||
                  transit.find(t => t.id === selectedAssetId)?.name ||
                  roads.find(r => r.id === selectedAssetId)?.name ||
                  incidents.find(i => i.id === selectedAssetId)?.location ||
                  "Stadium Asset"
                }
              </p>
            </div>
            <button
              onClick={() => onSelectAsset("", "", "gate", "")}
              className="text-on-surface-variant hover:text-primary font-mono text-[10px] bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded cursor-pointer transition-colors"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Quick Legend & Asset Directory */}
      <div className="grid grid-cols-4 gap-2 mt-3 text-[10px] text-outline font-mono">
        <div className="bg-white border border-outline-variant/40 p-2 rounded text-center shadow-sm">
          <span className="text-primary block font-sans font-bold">
            {gates.filter(g => g.status === "OPEN").length} / {gates.length}
          </span>
          Gates Open
        </div>
        <div className="bg-white border border-outline-variant/40 p-2 rounded text-center shadow-sm">
          <span className="text-status-alert block font-sans font-bold">
            {roads.filter(r => r.congestion === "HIGH" || r.congestion === "GRIDLOCK").length}
          </span>
          Road Delays
        </div>
        <div className="bg-white border border-outline-variant/40 p-2 rounded text-center shadow-sm">
          <span className="text-status-critical block font-sans font-bold">
            {incidents.filter(i => !i.resolved).length}
          </span>
          Active Incidents
        </div>
        <div className="bg-white border border-outline-variant/40 p-2 rounded text-center shadow-sm">
          <span className="text-primary block font-sans font-bold">
            {transit.filter(t => t.avgWaitTime > 20).length}
          </span>
          Heavy Transit
        </div>
      </div>
    </div>
  );
};
