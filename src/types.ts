/**
 * Type definitions for the FIFA 2026 Stadium Traffic & Fan Guidance AI System
 */

export interface StadiumInfo {
  id: string;
  name: string;
  city: string;
  capacity: number;
  currentAttendance: number;
  matchInfo: string;
  timeToKickoff: string; // e.g. "90 minutes before kickoff" or "+20 mins after match"
}

export interface GateStatus {
  id: string;
  name: string;
  status: 'OPEN' | 'CONGESTED' | 'CRITICAL' | 'CLOSED';
  queueCount: number;
  throughputRate: number; // fans processed per minute
  avgWaitTime: number; // in minutes
  assignedVolunteers: number;
  accessibilityFriendly: boolean;
}

export interface TransitHub {
  id: string;
  name: string;
  type: 'TRAIN' | 'SHUTTLE' | 'RIDESHARE' | 'PARKING';
  status: 'FLUID' | 'MODERATE' | 'HEAVY' | 'BLOCKED';
  currentLoad: number; // percentage or count
  avgWaitTime: number; // in minutes
  availableSpaces?: number; // for parking
  totalSpaces?: number; // for parking
}

export interface RoadStatus {
  id: string;
  name: string;
  direction: string;
  congestion: 'LOW' | 'MEDIUM' | 'HIGH' | 'GRIDLOCK';
  avgSpeed: number; // mph or kmh
  delayMinutes: number;
  laneControlsActive: boolean;
}

export interface CrowdIncident {
  id: string;
  location: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  description: string;
  timestamp: string;
  resolved: boolean;
}

export interface OptimizationAction {
  id: string;
  title: string;
  description: string;
  type: 'TRAFFIC_CONTROL' | 'GATE_REDIRECTION' | 'TRANSIT_BOOST' | 'ANNOUNCEMENT';
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  estimatedImpact: string;
  applied: boolean;
  appliedAt?: string;
  aiJustification: string;
}

export type WeatherCondition = 'SUNNY' | 'RAINY' | 'LIGHTNING_STORM';

export interface SimulationState {
  stadium: StadiumInfo;
  gates: GateStatus[];
  transit: TransitHub[];
  roads: RoadStatus[];
  incidents: CrowdIncident[];
  optimizations: OptimizationAction[];
  lastUpdated: string;
  weather: WeatherCondition;
  evacuationModeActive: boolean;
  totalVolunteersPool: number;
  foodStalls?: FoodStall[];
  selectedFoodStallRoute?: { gateId: string; stallId: string } | null;
  washrooms?: Washroom[];
  selectedWashroomRoute?: { gateId: string; washroomId: string } | null;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai' | 'system';
  text: string;
  timestamp: string;
  language?: string;
  suggestedActions?: string[];
  suggestedRoute?: {
    path: string[];
    travelTime: number;
    mode: string;
    congestedAreas: string[];
  };
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  targetAudience: 'ALL_FANS' | 'GATE_C_ONLY' | 'TRAIN_PASSENGERS' | 'STAFF' | 'ACCESSIBILITY_NEEDS';
  priority: 'NORMAL' | 'HIGH' | 'URGENT';
  languages: string[]; // e.g. ["English", "Spanish", "Portuguese"]
  broadcastActive: boolean;
  timestamp: string;
}

export interface FoodStall {
  id: string;
  name: string;
  type: 'TACOS' | 'BURGERS' | 'PIZZA' | 'BAR';
  waitTime: number; // in minutes
  status: 'FLUID' | 'MODERATE' | 'HEAVY';
  location: string;
  nearestGateId: string;
}

export interface Washroom {
  id: string;
  name: string;
  location: string;
  waitTime: number; // in minutes
  status: 'FLUID' | 'MODERATE' | 'HEAVY';
  accessibilityFriendly: boolean;
  nearestGateId: string;
}
