# FIFA World Cup 2026™ Stadium Traffic & Fan Guidance AI
### 🏟️ Real-Time Crowd Operations Command Center & Multilingual Dispatch Core

Welcome to the **FIFA World Cup 2026™ Stadium Traffic & Fan Guidance AI Platform**, a cutting-edge full-stack Event Transport & Crowd Logistics Command Center built with **React**, **Three.js (WebGL)**, **Vite**, **Express**, **Tailwind CSS**, and the native **Google GenAI SDK** powered by **Gemini 3.5 Flash**.

---

## 1. Chosen Challenge Vertical
**Mega-Event Venue Operations, Transport & Crowd Logistics**  
Managing the movement of 70,000 to 85,000 fans under time-critical deadlines (such as kickoff and post-match egress) requires rapid, data-grounded decision making. This solution acts as a smart digital co-pilot for Stadium Command Staff, bridging sensor-driven simulations with GenAI intelligence to optimize operations, clear bottlenecks, and guide fans in their native languages.

---

## 2. Dynamic 3D WebGL Aerial Simulator Map
The solution features a rich **Three.js WebGL Tactical Simulator** rendering an interactive overhead view of the stadium bowl, concourses, and external transportation assets:
*   **3D Camera Presets**: Staff can instantly switch viewpoints between **Top-Down (Map)**, **Side-Angle (Concourse)**, **Isometric Overview**, or reset to the default orbital view.
*   **Tactical Scanning Overlays**: Displays a continuous animated **24rpm Radar Sector Sweep** rotating dynamically to represent crowd density sweeps.
*   **Bobbing Transit Nodes**: Animated wireframe cages representing the Rail and Shuttle platforms hover gently on harmonic sine-waves to indicate live connectivity.
*   **Aesthetic Shimmers & Micro-Animations**: Sleek button light streaks and card fade-in effects provide a premium, modern Midnight Tactical dark mode styling.

---

## 3. Concourse Navigations & Wayfinding Directories
The system guides fans through the lower and upper stadium levels with custom routes:
*   **🍔 Concessions & Food Directory**: Displays live wait times and nearest gate access for food stalls (🌮 Tacos, 🍔 Burgers, 🍕 Pizza, 🍺 Bar). Clicking "Navigate" highlights an **orange dashed path** in 3D WebGL with streaming orange particles flowing from the gate.
*   **🚻 Restroom & WC Directory**: Tracks restroom occupancy levels and wait times. Clicking "Navigate" renders a **purple dashed path** in 3D WebGL with streaming purple particles to the facility, detailing accessibility features.
*   **💬 Chatbot Waypoint Interceptor**: The Volunt-AI chatbot intercepts concession and washroom queries locally, automatically triggering tab transitions and generating walking-route paths on the 3D map.

---

## 4. Safety Egress & Evacuation Simulation
*   **Emergency Exits**: Adds 4 glowing green tactical exit portals (NE, SE, SW, NW quadrants) around the stadium perimeter with vertical light beacons.
*   **Evacuation Flow Lines**: When a stadium-wide evacuation drill is toggled, the simulator draws **8 green exit pathways** connecting the pitch to all exit gates, streaming green safety particles outward in real time.
*   **Broadcast Banner Alert**: Flashes a high-visibility hazard warning in the UI, synchronized with automated translations.

---

## 5. Grounded Gemini AI Integrations
1.  **Gemini AI Dispatch Core**: Evaluates real-time gate capacities, road speeds, and ongoing incidents. It generates quantified, instantly deployable operational adjustments (e.g. counter-flow lanes, gate redirection triggers) with expected impacts and logical reasoning.
2.  **FIFA Volunt-AI Guidance Assistant**: An interactive chat interface simulating a crowd-aware venue helper. It reads the exact real-time sensor metrics, road speeds, and active incident lists to generate contextually perfect waypoint directions, step-free accessibility advice, and transit routing in the user's preferred language.
3.  **Dynamic Overhead Broadcast Writer**: Generates concise, formal public address (PA) overhead announcements and digital board warnings based on live incident locations, translated instantly into the tournament's primary official languages (English, Spanish, French, and Portuguese).

---

## 6. How the Solution Works
*   **Simulate Incidents**: Command staff can inject custom simulated anomalies (e.g., ticket scanner outages, parking lot accidents).
*   **Resolve Anomalies**: Resolving an incident dynamically cascades changes to throughput rates and clears bottlenecks across the map.
*   **Apply AI Recommendations**: Staff can click "Apply" on Gemini-generated optimizations, which triggers visual consequences on the map and updates transport metrics immediately.

---

## 7. Key Architectural Highlights
*   **Type Safety**: Built with robust TypeScript on both backend (`server.ts`) and frontend (`src/`).
*   **Security**: No API keys are exposed to the client; all LLM operations use the server-side `@google/genai` SDK with strict schema safety.
*   **Vercel Serverless Ready**: Fully configured for serverless hosting on Vercel via `vercel.json` and `api/index.ts`.
*   **API Test Suite**: Self-contained integration testing using Node's native fetch API.

---

## 8. Automated Testing & Verification
To verify that the server endpoints and LLM completions function correctly, run the integration test suite:
```bash
npm run test
```
This runs automated assertions verifying state loads, simulated incident injections, resolutions, AI optimizations, and translations.
