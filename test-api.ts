import app from "./server";
import { SimulationState, CrowdIncident, OptimizationAction, GateStatus, Announcement } from "./src/types";

const PORT = 3001;

async function assertResponse<T>(url: string, options: RequestInit, assertion: (data: T, status: number) => void) {
  const res = await fetch(url, options);
  const data = await res.json() as T;
  assertion(data, res.status);
}

async function runTests() {
  console.log("🚀 Starting CrowdIQ API integration tests...");
  
  const server = app.listen(PORT, async () => {
    console.log(`📡 Temporary test server listening on port ${PORT}`);
    
    try {
      // Test 1: GET /api/state
      await assertResponse(`http://localhost:${PORT}/api/state`, {}, (data: { state: SimulationState, activeAnnouncements: Announcement[], currentPhase: string }, status) => {
        if (status !== 200) throw new Error(`GET /api/state returned ${status}`);
        if (!data.state || !data.activeAnnouncements || !data.currentPhase) {
          throw new Error("GET /api/state response format invalid");
        }
        if (!data.state.foodStalls || data.state.foodStalls.length !== 4) {
          throw new Error("GET /api/state missing or invalid foodStalls list");
        }
        if (!data.state.washrooms || data.state.washrooms.length !== 4) {
          throw new Error("GET /api/state missing or invalid washrooms list");
        }
        console.log("✅ Test 1 Passed: GET /api/state is healthy and contains food stalls & restrooms.");
      });

      // Test 2: POST /api/state/phase
      await assertResponse(`http://localhost:${PORT}/api/state/phase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phase: "halftime", stadiumId: "sofi" })
      }, (data: { state: SimulationState, activeAnnouncements: Announcement[], currentPhase: string }, status) => {
        if (status !== 200) throw new Error(`POST /api/state/phase returned ${status}`);
        if (data.currentPhase !== "halftime" || data.state.stadium.id !== "sofi") {
          throw new Error("POST /api/state/phase failed to transition state");
        }
        console.log("✅ Test 2 Passed: POST /api/state/phase successfully transitioned phase and stadium.");
      });

      // Test 3: POST /api/incidents (simulating anomaly injection)
      await assertResponse(`http://localhost:${PORT}/api/incidents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: "Gate A Ingress",
          severity: "CRITICAL",
          description: "Escalator mechanical failure causing foot congestion"
        })
      }, (data: SimulationState, status) => {
        if (status !== 200) throw new Error(`POST /api/incidents returned ${status}`);
        const newestIncident = data.incidents[0];
        if (newestIncident.location !== "Gate A Ingress" || newestIncident.severity !== "CRITICAL") {
          throw new Error("POST /api/incidents failed to create incident");
        }
        console.log("✅ Test 3 Passed: POST /api/incidents successfully injected simulated incident.");
      });

      // Test 4: POST /api/incidents/resolve
      const newestStateRes = await fetch(`http://localhost:${PORT}/api/state`);
      const newestState = await newestStateRes.json();
      const incidentToResolve = newestState.state.incidents[0];
      
      await assertResponse(`http://localhost:${PORT}/api/incidents/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: incidentToResolve.id })
      }, (data: SimulationState, status) => {
        if (status !== 200) throw new Error(`POST /api/incidents/resolve returned ${status}`);
        const resolvedInc = data.incidents.find((i: CrowdIncident) => i.id === incidentToResolve.id);
        if (!resolvedInc || !resolvedInc.resolved) {
          throw new Error("POST /api/incidents/resolve failed to mark incident as resolved");
        }
        console.log("✅ Test 4 Passed: POST /api/incidents/resolve successfully marked incident as resolved.");
      });

      // Test 5: POST /api/optimizations/apply
      const testOpt = newestState.state.optimizations[0];
      await assertResponse(`http://localhost:${PORT}/api/optimizations/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: testOpt.id })
      }, (data: SimulationState, status) => {
        if (status !== 200) throw new Error(`POST /api/optimizations/apply returned ${status}`);
        const appliedOpt = data.optimizations.find((o: OptimizationAction) => o.id === testOpt.id);
        if (!appliedOpt || !appliedOpt.applied) {
          throw new Error("POST /api/optimizations/apply failed to apply optimization");
        }
        console.log("✅ Test 5 Passed: POST /api/optimizations/apply successfully deployed optimization.");
      });

      // Test 6: POST /api/ai/optimize
      await assertResponse(`http://localhost:${PORT}/api/ai/optimize`, {
        method: "POST"
      }, (data: SimulationState, status) => {
        if (status !== 200) throw new Error(`POST /api/ai/optimize returned ${status}`);
        if (!data.optimizations || data.optimizations.length === 0) {
          throw new Error("POST /api/ai/optimize failed to return optimizations");
        }
        console.log(`✅ Test 6 Passed: POST /api/ai/optimize returned ${data.optimizations.length} optimization suggestions.`);
      });

      // Test 7: POST /api/ai/guidance
      await assertResponse(`http://localhost:${PORT}/api/ai/guidance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "How to bypass Gate C wait?",
          chatHistory: [],
          userLanguage: "English"
        })
      }, (data: { message: string | { text: string } }, status) => {
        if (status !== 200) throw new Error(`POST /api/ai/guidance returned ${status}`);
        if (!data.message) {
          throw new Error("POST /api/ai/guidance returned invalid message content");
        }
        console.log("✅ Test 7 Passed: POST /api/ai/guidance assistant responded successfully.");
      });

      // Test 8: POST /api/ai/broadcast-draft
      await assertResponse(`http://localhost:${PORT}/api/ai/broadcast-draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incidentLocation: "Gate A platform",
          incidentDescription: "pedestrian backup",
          urgency: "HIGH"
        })
      }, (data: { draft: Announcement }, status) => {
        if (status !== 200) throw new Error(`POST /api/ai/broadcast-draft returned ${status}`);
        if (!data.draft || !data.draft.title) {
          throw new Error("POST /api/ai/broadcast-draft failed to create draft");
        }
        console.log("✅ Test 8 Passed: POST /api/ai/broadcast-draft successfully drafted announcement.");
      });

      // Test 9: POST /api/state/weather
      await assertResponse(`http://localhost:${PORT}/api/state/weather`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weather: "RAINY" })
      }, (data: SimulationState, status) => {
        if (status !== 200) throw new Error(`POST /api/state/weather returned ${status}`);
        if (data.weather !== "RAINY") {
          throw new Error("POST /api/state/weather failed to update weather state");
        }
        console.log("✅ Test 9 Passed: POST /api/state/weather successfully set weather state.");
      });

      // Test 10: POST /api/state/evacuation
      await assertResponse(`http://localhost:${PORT}/api/state/evacuation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: true })
      }, (data: SimulationState, status) => {
        if (status !== 200) throw new Error(`POST /api/state/evacuation returned ${status}`);
        if (data.evacuationModeActive !== true) {
          throw new Error("POST /api/state/evacuation failed to engage evacuation mode");
        }
        console.log("✅ Test 10 Passed: POST /api/state/evacuation successfully enabled evacuation mode.");
      });

      // Test 11: POST /api/staff/redeploy
      await assertResponse(`http://localhost:${PORT}/api/staff/redeploy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gateId: "gate_a", change: 2 })
      }, (data: SimulationState, status) => {
        if (status !== 200) throw new Error(`POST /api/staff/redeploy returned ${status}`);
        const gate = data.gates.find((g: GateStatus) => g.id === "gate_a");
        if (!gate || gate.assignedVolunteers < 2) {
          throw new Error("POST /api/staff/redeploy failed to redeploy volunteers");
        }
        console.log("✅ Test 11 Passed: POST /api/staff/redeploy successfully updated staff counts.");
      });

      // Test 12: POST /api/broadcast/publish
      await assertResponse(`http://localhost:${PORT}/api/broadcast/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          announcement: {
            id: "test-ann-1",
            title: "Evacuation Drill",
            content: "Attention: Evacuation drill in progress.",
            targetAudience: "ALL_FANS",
            priority: "URGENT",
            languages: ["English"],
            broadcastActive: true,
            timestamp: new Date().toISOString()
          }
        })
      }, (data: { state: SimulationState, activeAnnouncements: Announcement[], currentPhase: string }, status) => {
        if (status !== 200) throw new Error(`POST /api/broadcast/publish returned ${status}`);
        const activeAnnouncements = data.activeAnnouncements;
        if (!activeAnnouncements || activeAnnouncements.length === 0 || activeAnnouncements[0].content !== "Attention: Evacuation drill in progress.") {
          throw new Error("POST /api/broadcast/publish failed to publish announcement");
        }
        console.log("✅ Test 12 Passed: POST /api/broadcast/publish successfully published announcement.");
      });

      // Test 13: POST /api/broadcast/clear
      const stateForId = await (await fetch(`http://localhost:${PORT}/api/state`)).json();
      const annId = stateForId.activeAnnouncements[0].id;
      
      await assertResponse(`http://localhost:${PORT}/api/broadcast/clear`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: annId })
      }, (data: { state: SimulationState, activeAnnouncements: Announcement[], currentPhase: string }, status) => {
         if (status !== 200) throw new Error(`POST /api/broadcast/clear returned ${status}`);
         const clearedAnn = data.activeAnnouncements.find((a: Announcement) => a.id === annId);
         if (clearedAnn && clearedAnn.broadcastActive === true) {
           throw new Error("POST /api/broadcast/clear failed to clear announcement (broadcastActive still true)");
         }
         console.log("✅ Test 13 Passed: POST /api/broadcast/clear successfully cleared announcement.");
      });

      console.log("\n🎉 ALL CrowdIQ API INTEGRATION TESTS PASSED SUCCESSFULLY!");
      server.close();
      process.exit(0);
    } catch (err: unknown) {
      console.error("\n❌ Test Suite Failed:", (err instanceof Error ? err.message : err));
      server.close();
      process.exit(1);
    }
  });
}

runTests().catch((err) => {
  console.error("Test execution crash:", err);
  process.exit(1);
});
