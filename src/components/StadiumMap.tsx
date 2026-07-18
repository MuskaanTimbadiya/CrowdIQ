import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GateStatus, TransitHub, RoadStatus, CrowdIncident, FoodStall, Washroom } from "../types";

interface StadiumMapProps {
  gates: GateStatus[];
  transit: TransitHub[];
  roads: RoadStatus[];
  incidents: CrowdIncident[];
  selectedAssetId: string | null;
  onSelectAsset: (id: string, name: string, type: 'gate' | 'transit' | 'road' | 'incident', details: string) => void;
  evacuationModeActive?: boolean;
  foodStalls?: FoodStall[];
  selectedFoodStallRoute?: { gateId: string; stallId: string } | null;
  washrooms?: Washroom[];
  selectedWashroomRoute?: { gateId: string; washroomId: string } | null;
  selectedTransitRoute?: { startId: string; endId: string } | null;
}

export const StadiumMap: React.FC<StadiumMapProps> = ({
  gates,
  transit,
  roads,
  incidents,
  selectedAssetId,
  onSelectAsset,
  evacuationModeActive = false,
  selectedFoodStallRoute = null,
  selectedWashroomRoute = null,
  selectedTransitRoute = null
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelsRef = useRef<Map<string, HTMLDivElement>>(new Map());

  // Camera presets targets
  const targetCameraPos = useRef(new THREE.Vector3(0, 80, 90));
  const targetLookAt = useRef(new THREE.Vector3(0, 0, 0));

  const [activeView, setActiveView] = useState<"isometric" | "topdown" | "side" | "reset">("reset");

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "OPEN":
      case "FLUID":
      case "LOW":
        return "#34d399"; // green
      case "CONGESTED":
      case "MEDIUM":
      case "MODERATE":
        return "#f59e0b"; // yellow
      case "CRITICAL":
      case "HIGH":
      case "HEAVY":
      case "GRIDLOCK":
        return "#ef4444"; // red
      case "CLOSED":
      case "BLOCKED":
        return "#8d90a0"; // gray
      default:
        return "#b4c5ff"; // default primary blue
    }
  };

  const getStatusHex = (status: string): number => {
    const colorStr = getStatusColor(status).replace("#", "0x");
    return parseInt(colorStr, 16);
  };

  // Preset handlers
  const handleSetView = (view: "isometric" | "topdown" | "side" | "reset") => {
    setActiveView(view);
    if (view === "isometric") {
      targetCameraPos.current.set(65, 65, 65);
      targetLookAt.current.set(0, 0, 0);
    } else if (view === "topdown") {
      targetCameraPos.current.set(0, 95, 0.1);
      targetLookAt.current.set(0, 0, 0);
    } else if (view === "side") {
      targetCameraPos.current.set(85, 12, 0);
      targetLookAt.current.set(0, 0, 0);
    } else {
      targetCameraPos.current.set(0, 80, 90);
      targetLookAt.current.set(0, 0, 0);
    }
  };

  // Define 3D positions corresponding to SVG coordinates
  const labelPositions: Record<string, THREE.Vector3> = {
    highway_n: new THREE.Vector3(0, 1.5, -53),
    highway_s: new THREE.Vector3(0, 1.5, 55.5),
    stadium_blvd: new THREE.Vector3(6, 1.5, -36),
    bypass: new THREE.Vector3(-60, 1.5, 13),
    parking_main: new THREE.Vector3(0, 1.5, 34),
    parking_south: new THREE.Vector3(65, 1.5, 18),
    rail: new THREE.Vector3(-62.5, 6.5, -25),
    shuttle: new THREE.Vector3(62.5, 6.5, -27),
    gate_a: new THREE.Vector3(0, 4.5, -25),
    gate_b: new THREE.Vector3(34, 4.5, 0),
    gate_c: new THREE.Vector3(0, 4.5, 25),
    gate_d: new THREE.Vector3(-34, 4.5, 0),
    exit_1: new THREE.Vector3(25.5, 4.5, -25.5),
    exit_2: new THREE.Vector3(25.5, 4.5, 25.5),
    exit_3: new THREE.Vector3(-25.5, 4.5, 25.5),
    exit_4: new THREE.Vector3(-25.5, 4.5, -25.5),
    stall_1: new THREE.Vector3(8, 2.5, -8),
    stall_2: new THREE.Vector3(-8, 2.5, 8),
    stall_3: new THREE.Vector3(8, 2.5, 8),
    stall_4: new THREE.Vector3(-8, 2.5, -8),
    wc_1: new THREE.Vector3(16, 2.5, -16),
    wc_2: new THREE.Vector3(16, 2.5, 16),
    wc_3: new THREE.Vector3(-16, 2.5, 16),
    wc_4: new THREE.Vector3(-16, 2.5, -16)
  };

  useEffect(() => {
    if (!mountRef.current || !canvasRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight || 380;

    // SCENE & RENDERER
    const scene = new THREE.Scene();
    scene.background = null; // transparent background to let container styling blend

    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 1000);
    camera.position.set(0, 80, 90);

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // CONTROLS
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2.05; // prevent going below grid
    controls.minDistance = 30;
    controls.maxDistance = 210;

    // LIGHTING
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xb4c5ff, 0.8);
    dirLight.position.set(20, 60, 20);
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(0xb4c5ff, 0.5, 100);
    pointLight.position.set(0, 20, 0);
    scene.add(pointLight);

    // GRID FLOOR
    const gridHelper = new THREE.GridHelper(260, 26, 0xb4c5ff, 0x434655);
    gridHelper.position.y = -0.1;
    if (Array.isArray(gridHelper.material)) {
      gridHelper.material.forEach((m) => {
        m.transparent = true;
        m.opacity = 0.15;
      });
    } else {
      gridHelper.material.transparent = true;
      gridHelper.material.opacity = 0.15;
    }
    scene.add(gridHelper);

    // Ground raycast helper
    const groundGeo = new THREE.PlaneGeometry(300, 300);
    const groundMat = new THREE.MeshBasicMaterial({ visible: false });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    // TACTICAL RADAR SWEEP MESH
    const radarGeo = new THREE.RingGeometry(0.1, 95, 64, 1, 0, Math.PI / 4); // 45 degree sector
    radarGeo.rotateX(-Math.PI / 2);
    const radarMat = new THREE.MeshBasicMaterial({
      color: 0xb4c5ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.08
    });
    const radar = new THREE.Mesh(radarGeo, radarMat);
    radar.position.y = 0.25; // slightly above grid floor
    scene.add(radar);

    // STAR PARTICLES
    const starGeo = new THREE.BufferGeometry();
    const starCount = 200;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      starPos[i] = (Math.random() - 0.5) * 240;
      starPos[i + 1] = Math.random() * 80 + 10;
      starPos[i + 2] = (Math.random() - 0.5) * 240;
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xb4c5ff,
      size: 0.7,
      transparent: true,
      opacity: 0.5
    });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // --- GEOMETRIES & MATERIALS FOR ASSETS ---
    const interactableObjects: THREE.Object3D[] = [];
    const meshesMap = new Map<string, THREE.Object3D>();

    // STADIUM BOWL
    const fieldGeo = new THREE.BoxGeometry(32, 0.4, 20);
    const fieldMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      roughness: 0.8,
      metalness: 0.1,
      emissive: 0x064e3b,
      emissiveIntensity: 0.3
    });
    const field = new THREE.Mesh(fieldGeo, fieldMat);
    field.position.y = 0.2;
    scene.add(field);

    const innerStandGeo = new THREE.CylinderGeometry(20, 24, 6, 32, 1, true);
    const standMat = new THREE.MeshStandardMaterial({
      color: 0x171b26,
      roughness: 0.5,
      metalness: 0.8,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    });
    const innerStand = new THREE.Mesh(innerStandGeo, standMat);
    innerStand.position.y = 3;
    scene.add(innerStand);

    const outerStandGeo = new THREE.CylinderGeometry(28, 32, 10, 32, 1, true);
    const outerStandMat = new THREE.MeshPhysicalMaterial({
      color: 0xb4c5ff,
      roughness: 0.2,
      metalness: 0.9,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide
    });
    const outerStand = new THREE.Mesh(outerStandGeo, outerStandMat);
    outerStand.position.y = 5;
    scene.add(outerStand);

    // ROADS
    const roadCurves: Record<string, THREE.Curve<THREE.Vector3>> = {
      road_highway_n: new THREE.LineCurve3(new THREE.Vector3(-85, 0.2, -50), new THREE.Vector3(85, 0.2, -50)),
      road_highway_s: new THREE.LineCurve3(new THREE.Vector3(85, 0.2, 52.5), new THREE.Vector3(-85, 0.2, 52.5)),
      road_stadium_blvd: new THREE.LineCurve3(new THREE.Vector3(0, 0.2, -50), new THREE.Vector3(0, 0.2, -22.5)),
      road_bypass_ave: new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(-85, 0.2, 20),
        new THREE.Vector3(-60, 0.2, 7.5),
        new THREE.Vector3(-35, 0.2, 5)
      )
    };

    const roadLineMeshes: Record<string, THREE.Line> = {};
    const roadParticles: Record<string, { mesh: THREE.Mesh; progress: number }[]> = {};

    roads.forEach((road) => {
      const curve = roadCurves[road.id];
      if (!curve) return;

      const points = curve.getPoints(50);
      const roadGeo = new THREE.BufferGeometry().setFromPoints(points);
      const roadMat = new THREE.LineBasicMaterial({
        color: getStatusHex(road.congestion)
      });
      const line = new THREE.Line(roadGeo, roadMat);
      
      // Store metadata for raycasting on the road line
      line.userData = {
        id: road.id,
        name: road.name,
        type: "road",
        details: `${road.name} direction delay is ${road.delayMinutes} mins. Contraflow configuration: ${road.laneControlsActive ? "ACTIVE" : "OFF"}`
      };
      
      scene.add(line);
      interactableObjects.push(line);
      meshesMap.set(road.id, line);
      roadLineMeshes[road.id] = line;

      // Add animated traffic particles
      const particles: { mesh: THREE.Mesh; progress: number }[] = [];
      const particleCount = 4;
      const particleGeo = new THREE.SphereGeometry(0.5, 8, 8);

      for (let i = 0; i < particleCount; i++) {
        const pMat = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.9
        });
        const pMesh = new THREE.Mesh(particleGeo, pMat);
        scene.add(pMesh);
        particles.push({
          mesh: pMesh,
          progress: i / particleCount
        });
      }
      roadParticles[road.id] = particles;
    });

    // GATES (Entrances Cylinders)
    const gatePositions: Record<string, THREE.Vector3> = {
      gate_a: new THREE.Vector3(0, 2, -25),
      gate_b: new THREE.Vector3(34, 2, 0),
      gate_c: new THREE.Vector3(0, 2, 25),
      gate_d: new THREE.Vector3(-34, 2, 0),
      gate_e: new THREE.Vector3(-24, 2, -17)
    };

    gates.forEach((gate) => {
      const pos = gatePositions[gate.id];
      if (!pos) return;

      const gGeo = new THREE.CylinderGeometry(1.6, 1.6, 4, 16);
      const gMat = new THREE.MeshStandardMaterial({
        color: getStatusHex(gate.status),
        roughness: 0.3,
        metalness: 0.2,
        emissive: getStatusHex(gate.status),
        emissiveIntensity: 0.4
      });
      const gMesh = new THREE.Mesh(gGeo, gMat);
      gMesh.position.copy(pos);
      gMesh.userData = {
        id: gate.id,
        name: gate.name,
        type: "gate",
        details: `Throughput is currently ${gate.throughputRate} fans/minute with ${gate.assignedVolunteers} active lane monitors.`
      };

      // Add a beacon glow cylinder extending upwards
      const beaconGeo = new THREE.CylinderGeometry(0.1, 0.1, 8, 8, 1, true);
      const beaconMat = new THREE.MeshBasicMaterial({
        color: getStatusHex(gate.status),
        transparent: true,
        opacity: 0.3
      });
      const beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
      beaconMesh.position.y = 6;
      gMesh.add(beaconMesh);

      // Add glowing ball at top
      const ballGeo = new THREE.SphereGeometry(0.4, 8, 8);
      const ballMat = new THREE.MeshBasicMaterial({
        color: getStatusHex(gate.status)
      });
      const ballMesh = new THREE.Mesh(ballGeo, ballMat);
      ballMesh.position.y = 10;
      gMesh.add(ballMesh);

      scene.add(gMesh);
      interactableObjects.push(gMesh);
      meshesMap.set(gate.id, gMesh);
    });

    // TRANSIT HUBS (Floating custom geometries)
    const transitPositions: Record<string, THREE.Vector3> = {
      rail_transit: new THREE.Vector3(-62.5, 5, -25),
      shuttle_bus: new THREE.Vector3(62.5, 5, -27),
      parking_main: new THREE.Vector3(0, 0.3, 34),
      parking_south: new THREE.Vector3(65, 0.3, 18)
    };

    transit.forEach((hub) => {
      const pos = transitPositions[hub.id];
      if (!pos) return;

      if (hub.id.startsWith("parking")) {
        // Parking LOT slabs
        const w = hub.id === "parking_main" ? 40 : 35;
        const d = hub.id === "parking_main" ? 20 : 15;
        const pGeo = new THREE.BoxGeometry(w, 0.6, d);
        const pMat = new THREE.MeshStandardMaterial({
          color: 0x1b1f2e,
          roughness: 0.7,
          metalness: 0.2,
          transparent: true,
          opacity: 0.7
        });
        const pMesh = new THREE.Mesh(pGeo, pMat);
        pMesh.position.copy(pos);
        pMesh.userData = {
          id: hub.id,
          name: hub.name,
          type: "transit",
          details: `Parking lot occupancy is currently ${hub.currentLoad}%. Available spaces: ${hub.availableSpaces ?? "N/A"}.`
        };

        // Render color boundary based on status
        const outlineGeo = new THREE.BoxGeometry(w + 0.8, 0.1, d + 0.8);
        const outlineMat = new THREE.MeshBasicMaterial({
          color: getStatusHex(hub.status),
          wireframe: true
        });
        const outlineMesh = new THREE.Mesh(outlineGeo, outlineMat);
        outlineMesh.position.y = 0.32;
        pMesh.add(outlineMesh);

        scene.add(pMesh);
        interactableObjects.push(pMesh);
        meshesMap.set(hub.id, pMesh);
      } else {
        // Public Transit Floating wireframe + inner glowing sphere
        const group = new THREE.Group();
        group.position.copy(pos);

        // Core Glowing Sphere
        const coreGeo = new THREE.SphereGeometry(1.8, 16, 16);
        const coreMat = new THREE.MeshStandardMaterial({
          color: getStatusHex(hub.status),
          emissive: getStatusHex(hub.status),
          emissiveIntensity: 0.6,
          roughness: 0.1
        });
        const core = new THREE.Mesh(coreGeo, coreMat);
        group.add(core);

        // Outer Rotating Cage
        const cageGeo = new THREE.IcosahedronGeometry(3.5, 1);
        const cageMat = new THREE.MeshBasicMaterial({
          color: getStatusHex(hub.status),
          wireframe: true,
          transparent: true,
          opacity: 0.4
        });
        const cage = new THREE.Mesh(cageGeo, cageMat);
        group.add(cage);

        group.userData = {
          id: hub.id,
          name: hub.name,
          type: "transit",
          details: `Transit vehicle frequency set to high. Platform wait is currently ${hub.avgWaitTime} mins.`
        };

        scene.add(group);
        interactableObjects.push(core); // Raycast hits the core mesh
        // Link core raycast parent to the group for mapping
        core.userData = group.userData;
        meshesMap.set(hub.id, group);
      }
    });

    // --- EMERGENCY EXITS & SAFETY FLOW PATHS ---
    const exitPositions: Record<string, THREE.Vector3> = {
      exit_1: new THREE.Vector3(25.5, 2, -25.5), // NE
      exit_2: new THREE.Vector3(25.5, 2, 25.5),  // SE
      exit_3: new THREE.Vector3(-25.5, 2, 25.5), // SW
      exit_4: new THREE.Vector3(-25.5, 2, -25.5) // NW
    };

    const exitMeshes: THREE.Mesh[] = [];
    const geometriesToDispose: THREE.BufferGeometry[] = [];
    const materialsToDispose: THREE.Material[] = [];
    
    Object.entries(exitPositions).forEach(([exitId, pos], idx) => {
      const eGeo = new THREE.CylinderGeometry(1.2, 1.2, 4, 8);
      const eMat = new THREE.MeshStandardMaterial({
        color: 0x059669,
        roughness: 0.4,
        metalness: 0.1,
        emissive: 0x047857,
        emissiveIntensity: 0.3
      });
      const eMesh = new THREE.Mesh(eGeo, eMat);
      eMesh.position.copy(pos);
      eMesh.userData = {
        id: exitId,
        name: `Emergency Exit Gate ${idx + 1}`,
        type: "transit",
        details: `Emergency egress portal ${idx + 1} positioned on outer stadium boundary. Configured for high volume outbound foot traffic.`
      };
      
      const bGeo = new THREE.CylinderGeometry(0.08, 0.08, 6, 8, 1, true);
      const bMat = new THREE.MeshBasicMaterial({
        color: 0x10b981,
        transparent: true,
        opacity: 0.3
      });
      const bMesh = new THREE.Mesh(bGeo, bMat);
      bMesh.position.y = 5;
      eMesh.add(bMesh);
      
      const ballGeo = new THREE.SphereGeometry(0.35, 8, 8);
      const ballMat = new THREE.MeshBasicMaterial({
        color: 0x10b981
      });
      const ballMesh = new THREE.Mesh(ballGeo, ballMat);
      ballMesh.position.y = 8;
      eMesh.add(ballMesh);
      
      scene.add(eMesh);
      interactableObjects.push(eMesh);
      meshesMap.set(exitId, eMesh);
      exitMeshes.push(eMesh);

      geometriesToDispose.push(eGeo, bGeo, ballGeo);
      materialsToDispose.push(eMat, bMat, ballMat);
    });

    const evacuationCurves: THREE.LineCurve3[] = [
      new THREE.LineCurve3(new THREE.Vector3(0, 0.2, 0), new THREE.Vector3(0, 0.2, -25)), // Gate A
      new THREE.LineCurve3(new THREE.Vector3(0, 0.2, 0), new THREE.Vector3(34, 0.2, 0)),  // Gate B
      new THREE.LineCurve3(new THREE.Vector3(0, 0.2, 0), new THREE.Vector3(0, 0.2, 25)),  // Gate C
      new THREE.LineCurve3(new THREE.Vector3(0, 0.2, 0), new THREE.Vector3(-34, 0.2, 0)), // Gate D
      new THREE.LineCurve3(new THREE.Vector3(0, 0.2, 0), new THREE.Vector3(25.5, 0.2, -25.5)), // Exit 1
      new THREE.LineCurve3(new THREE.Vector3(0, 0.2, 0), new THREE.Vector3(25.5, 0.2, 25.5)),  // Exit 2
      new THREE.LineCurve3(new THREE.Vector3(0, 0.2, 0), new THREE.Vector3(-25.5, 0.2, 25.5)), // Exit 3
      new THREE.LineCurve3(new THREE.Vector3(0, 0.2, 0), new THREE.Vector3(-25.5, 0.2, -25.5)) // Exit 4
    ];

    const flowLines: THREE.Line[] = [];
    const flowParticles: { mesh: THREE.Mesh; curve: THREE.LineCurve3; progress: number }[] = [];
    const flowParticleGeo = new THREE.SphereGeometry(0.4, 8, 8);
    
    evacuationCurves.forEach((curve) => {
      const lineGeo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(10));
      const lineMat = new THREE.LineDashedMaterial({
        color: 0x10b981,
        dashSize: 1.5,
        gapSize: 1.5,
        transparent: true,
        opacity: 0.4
      });
      const line = new THREE.Line(lineGeo, lineMat);
      line.computeLineDistances();
      scene.add(line);
      flowLines.push(line);
      
      for (let i = 0; i < 3; i++) {
        const pMat = new THREE.MeshBasicMaterial({
          color: 0x34d399,
          transparent: true,
          opacity: 0.8
        });
        const pMesh = new THREE.Mesh(flowParticleGeo, pMat);
        scene.add(pMesh);
        flowParticles.push({
          mesh: pMesh,
          curve,
          progress: i / 3
        });
        materialsToDispose.push(pMat);
      }
      geometriesToDispose.push(lineGeo);
      materialsToDispose.push(lineMat);
    });

    // --- FOOD CONCESSIONS INITIALIZATION ---
    const foodPositions: Record<string, THREE.Vector3> = {
      stall_1: new THREE.Vector3(8, 0.6, -8),
      stall_2: new THREE.Vector3(-8, 0.6, 8),
      stall_3: new THREE.Vector3(8, 0.6, 8),
      stall_4: new THREE.Vector3(-8, 0.6, -8)
    };

    const foodColors: Record<string, number> = {
      stall_1: 0xf97316, // Orange Tacos
      stall_2: 0xeab308, // Yellow Burgers
      stall_3: 0xef4444, // Red Pizza
      stall_4: 0x3b82f6  // Blue Bar
    };

    const foodMeshes: THREE.Mesh[] = [];

    Object.entries(foodPositions).forEach(([stallId, pos]) => {
      const fGeo = new THREE.CylinderGeometry(0.8, 0.8, 1.2, 8);
      const fMat = new THREE.MeshStandardMaterial({
        color: foodColors[stallId],
        roughness: 0.2,
        metalness: 0.1,
        emissive: foodColors[stallId],
        emissiveIntensity: 0.3
      });
      const fMesh = new THREE.Mesh(fGeo, fMat);
      fMesh.position.copy(pos);
      fMesh.userData = {
        id: stallId,
        name: stallId === "stall_1" ? "Tacos el Chamuco" :
              stallId === "stall_2" ? "Gridiron Burgers & Fries" :
              stallId === "stall_3" ? "Azzurri Stone Fire Pizza" : "Half-Time Tavern",
        type: "transit",
        details: `${stallId === "stall_1" ? "🌮 Tacos" : stallId === "stall_2" ? "🍔 Burgers" : stallId === "stall_3" ? "🍕 Pizza" : "🍺 Bar"} concession stand located in the main concourse.`
      };
      scene.add(fMesh);
      interactableObjects.push(fMesh);
      meshesMap.set(stallId, fMesh);
      foodMeshes.push(fMesh);
      geometriesToDispose.push(fGeo);
      materialsToDispose.push(fMat);
    });

    // --- FOOD ROUTE DYNAMIC PATH INITIALIZATION ---
    const foodRouteGeo = new THREE.BufferGeometry();
    const foodRouteMat = new THREE.LineDashedMaterial({
      color: 0xf97316,
      dashSize: 1.5,
      gapSize: 1.5,
      transparent: true,
      opacity: 0.8
    });
    const foodRouteLine = new THREE.Line(foodRouteGeo, foodRouteMat);
    foodRouteLine.visible = false;
    scene.add(foodRouteLine);
    geometriesToDispose.push(foodRouteGeo);
    materialsToDispose.push(foodRouteMat);

    const foodParticlesList: THREE.Mesh[] = [];
    const foodParticleGeo = new THREE.SphereGeometry(0.35, 8, 8);
    const foodParticleMat = new THREE.MeshBasicMaterial({
      color: 0xf97316
    });
    geometriesToDispose.push(foodParticleGeo);
    materialsToDispose.push(foodParticleMat);

    for (let i = 0; i < 5; i++) {
      const pMesh = new THREE.Mesh(foodParticleGeo, foodParticleMat);
      pMesh.visible = false;
      scene.add(pMesh);
      foodParticlesList.push(pMesh);
    }

    // --- WASHROOMS INITIALIZATION ---
    const wcPositions: Record<string, THREE.Vector3> = {
      wc_1: new THREE.Vector3(16, 0.6, -16), // NE
      wc_2: new THREE.Vector3(16, 0.6, 16),  // SE
      wc_3: new THREE.Vector3(-16, 0.6, 16), // SW
      wc_4: new THREE.Vector3(-16, 0.6, -16) // NW
    };

    const wcMeshes: THREE.Mesh[] = [];

    Object.entries(wcPositions).forEach(([wcId, pos], idx) => {
      const wGeo = new THREE.CylinderGeometry(0.7, 0.7, 1.2, 8);
      const wMat = new THREE.MeshStandardMaterial({
        color: 0x8b5cf6, // Purple Restrooms
        roughness: 0.3,
        metalness: 0.1,
        emissive: 0x6d28d9,
        emissiveIntensity: 0.3
      });
      const wMesh = new THREE.Mesh(wGeo, wMat);
      wMesh.position.copy(pos);
      wMesh.userData = {
        id: wcId,
        name: wcId === "wc_1" ? "Restroom Hub NE" :
              wcId === "wc_2" ? "Restroom Hub SE" :
              wcId === "wc_3" ? "Restroom Hub SW" : "Restroom Hub NW",
        type: "transit",
        details: `Restroom hub ${idx + 1} located in the concourse ring. Accessible friendly: ${wcId === "wc_1" || wcId === "wc_3" ? 'YES' : 'NO'}`
      };
      scene.add(wMesh);
      interactableObjects.push(wMesh);
      meshesMap.set(wcId, wMesh);
      wcMeshes.push(wMesh);
      geometriesToDispose.push(wGeo);
      materialsToDispose.push(wMat);
    });

    // --- WASHROOM ROUTE DYNAMIC PATH INITIALIZATION ---
    const wcRouteGeo = new THREE.BufferGeometry();
    const wcRouteMat = new THREE.LineDashedMaterial({
      color: 0x8b5cf6,
      dashSize: 1.5,
      gapSize: 1.5,
      transparent: true,
      opacity: 0.8
    });
    const wcRouteLine = new THREE.Line(wcRouteGeo, wcRouteMat);
    wcRouteLine.visible = false;
    scene.add(wcRouteLine);
    geometriesToDispose.push(wcRouteGeo);
    materialsToDispose.push(wcRouteMat);

    const wcParticlesList: THREE.Mesh[] = [];
    const wcParticleGeo = new THREE.SphereGeometry(0.35, 8, 8);
    const wcParticleMat = new THREE.MeshBasicMaterial({
      color: 0x8b5cf6
    });
    geometriesToDispose.push(wcParticleGeo);
    materialsToDispose.push(wcParticleMat);

    for (let i = 0; i < 5; i++) {
      const pMesh = new THREE.Mesh(wcParticleGeo, wcParticleMat);
      pMesh.visible = false;
      scene.add(pMesh);
      wcParticlesList.push(pMesh);
    }

    // --- TRANSIT ROUTE DYNAMIC PATH INITIALIZATION ---
    const transitRouteGeo = new THREE.BufferGeometry();
    const transitRouteMat = new THREE.LineDashedMaterial({
      color: 0x06b6d4, // Cyan
      dashSize: 1.5,
      gapSize: 1.5,
      transparent: true,
      opacity: 0.8
    });
    const transitRouteLine = new THREE.Line(transitRouteGeo, transitRouteMat);
    transitRouteLine.visible = false;
    scene.add(transitRouteLine);
    geometriesToDispose.push(transitRouteGeo);
    materialsToDispose.push(transitRouteMat);

    const transitParticlesList: THREE.Mesh[] = [];
    const transitParticleGeo = new THREE.SphereGeometry(0.35, 8, 8);
    const transitParticleMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4
    });
    geometriesToDispose.push(transitParticleGeo);
    materialsToDispose.push(transitParticleMat);

    for (let i = 0; i < 5; i++) {
      const pMesh = new THREE.Mesh(transitParticleGeo, transitParticleMat);
      pMesh.visible = false;
      scene.add(pMesh);
      transitParticlesList.push(pMesh);
    }

    // INCIDENTS (Pulsing Cones + rings)
    const incidentGroupsMap = new Map<string, THREE.Group>();

    const updateIncidents = () => {
      // Clear old incidents
      incidentGroupsMap.forEach((g) => scene.remove(g));
      incidentGroupsMap.clear();

      incidents.filter(inc => !inc.resolved).forEach((inc) => {
        let px = 0;
        let pz = 0;

        if (inc.id === "inc_1") {
          px = 0; pz = 25;
        } else if (inc.id === "inc_2") {
          px = -62.5; pz = -20;
        } else if (inc.id === "inc_3") {
          px = 20; pz = 0;
        } else if (inc.id === "inc_4") {
          px = 15; pz = 25;
        } else {
          const loc = inc.location.toLowerCase();
          if (loc.includes("gate a")) {
            px = 0; pz = -25;
          } else if (loc.includes("gate b")) {
            px = 34; pz = 0;
          } else if (loc.includes("gate c")) {
            px = 0; pz = 25;
          } else if (loc.includes("gate d")) {
            px = -34; pz = 0;
          } else if (loc.includes("gate e") || loc.includes("disabled")) {
            px = -24; pz = -17;
          } else if (loc.includes("rail") || loc.includes("train")) {
            px = -62.5; pz = -25;
          } else if (loc.includes("shuttle") || loc.includes("bus")) {
            px = 62.5; pz = -27;
          } else if (loc.includes("overflow") || loc.includes("lot h")) {
            px = 65; pz = 18;
          } else if (loc.includes("parking")) {
            px = 0; pz = 34;
          } else if (loc.includes("stadium blvd")) {
            px = 0; pz = -36;
          } else if (loc.includes("highway") || loc.includes("i-95")) {
            px = 0; pz = -50;
          } else {
            const hash = inc.id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
            px = Math.sin(hash) * 45;
            pz = Math.cos(hash) * 35;
          }
        }

        const group = new THREE.Group();
        group.position.set(px, 3, pz);

        const color = inc.severity === "CRITICAL" ? 0xef4444 : 0xf59e0b;

        // Incident Cone (downward pointing)
        const coneGeo = new THREE.ConeGeometry(1.5, 4, 16);
        coneGeo.rotateX(Math.PI); // flip downward
        const coneMat = new THREE.MeshStandardMaterial({
          color: color,
          emissive: color,
          emissiveIntensity: 0.6,
          roughness: 0.2
        });
        const cone = new THREE.Mesh(coneGeo, coneMat);
        group.add(cone);

        // Pulsing Ring on Ground
        const ringGeo = new THREE.RingGeometry(0.8, 3.5, 32);
        ringGeo.rotateX(-Math.PI / 2);
        const ringMat = new THREE.MeshBasicMaterial({
          color: color,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.5
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.y = -2.8; // place on ground
        group.add(ring);

        group.userData = {
          id: inc.id,
          name: inc.location,
          type: "incident",
          details: inc.description
        };

        scene.add(group);
        interactableObjects.push(cone);
        cone.userData = group.userData;
        meshesMap.set(inc.id, group);
        incidentGroupsMap.set(inc.id, group);
      });
    };

    updateIncidents();

    // INTERACTION / SELECTION
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let hoveredObject: THREE.Object3D | null = null;
    let originalHoverColor = new THREE.Color();

    const handlePointerDown = (e: MouseEvent) => {
      const rect = canvasRef.current!.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(interactableObjects);

      if (intersects.length > 0) {
        const hit = intersects[0].object;
        const data = hit.userData;
        if (data && data.id) {
          onSelectAsset(data.id, data.name, data.type, data.details);
        }
      } else {
        // Clicked outside - clear selection
        onSelectAsset("", "", "gate", "");
      }
    };

    const handlePointerMove = (e: MouseEvent) => {
      const rect = canvasRef.current!.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(interactableObjects);

      if (intersects.length > 0) {
        const hit = intersects[0].object;
        canvasRef.current!.style.cursor = "pointer";

        if (hoveredObject !== hit) {
          // Reset previous hover
          if (hoveredObject) {
            const mat = (hoveredObject as THREE.Mesh).material as THREE.MeshStandardMaterial;
            if (mat && mat.emissive) {
              mat.emissive.copy(originalHoverColor);
            }
          }

          hoveredObject = hit;
          const mat = (hit as THREE.Mesh).material as THREE.MeshStandardMaterial;
          if (mat && mat.emissive) {
            originalHoverColor.copy(mat.emissive);
            mat.emissive.setHex(0xffffff); // glow white on hover
          }
        }
      } else {
        canvasRef.current!.style.cursor = "default";
        if (hoveredObject) {
          const mat = (hoveredObject as THREE.Mesh).material as THREE.MeshStandardMaterial;
          if (mat && mat.emissive) {
            mat.emissive.copy(originalHoverColor);
          }
          hoveredObject = null;
        }
      }
    };

    canvasRef.current.addEventListener("pointerdown", handlePointerDown);
    canvasRef.current.addEventListener("pointermove", handlePointerMove);

    // SELECTION HIGHLIGHT ANIMATOR (Reactive to external changes)
    const updateSelectionHighlight = (id: string | null) => {
      meshesMap.forEach((obj, meshId) => {
        const isSelected = meshId === id;
        
        // Find main mesh to apply scaling/emissive changes
        let targetMesh: THREE.Object3D | null = null;
        if (obj instanceof THREE.Group) {
          targetMesh = obj.children[0]; // first child (core or cone)
        } else {
          targetMesh = obj;
        }

        if (targetMesh && (targetMesh as THREE.Mesh).material) {
          const mat = (targetMesh as THREE.Mesh).material as THREE.MeshStandardMaterial;
          
          if (isSelected) {
            if (mat.emissive) {
              mat.emissiveIntensity = 1.0;
            }
            if (obj.userData.type === "gate") {
              obj.scale.set(1.3, 1.3, 1.3);
            } else if (obj.userData.type === "transit" && !obj.userData.id.startsWith("parking")) {
              obj.scale.set(1.2, 1.2, 1.2);
            }
          } else {
            if (mat.emissive) {
              mat.emissiveIntensity = 0.4;
            }
            obj.scale.set(1.0, 1.0, 1.0);
          }
        }
      });
    };

    updateSelectionHighlight(selectedAssetId);

    // --- ANIMATION LOOP ---
    const tempV = new THREE.Vector3();
    const clock = new THREE.Clock();

    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const elapsed = clock.getElapsedTime();
      const delta = clock.getDelta();

      // Glide Camera transition towards active target preset
      camera.position.lerp(targetCameraPos.current, 0.08);
      controls.target.lerp(targetLookAt.current, 0.08);
      controls.update();

      // Rotate star particles
      stars.rotation.y = elapsed * 0.005;

      // Animate Traffic particles along road curves
      roads.forEach((road) => {
        const curve = roadCurves[road.id];
        const particles = roadParticles[road.id];
        if (!curve || !particles) return;

        // Velocity coefficients based on road congestion
        let speedMult = 0.08;
        if (road.congestion === "GRIDLOCK") speedMult = 0.006;
        else if (road.congestion === "HIGH") speedMult = 0.02;
        else if (road.congestion === "MEDIUM") speedMult = 0.05;

        particles.forEach((p) => {
          p.progress = (p.progress + delta * speedMult) % 1.0;
          curve.getPointAt(p.progress, p.mesh.position);
          // Bounce/bob particles
          p.mesh.position.y += Math.abs(Math.sin(p.progress * Math.PI * 8)) * 0.2;
        });
      });

      // Rotate radar sweep
      if (radar) {
        radar.rotation.y = -elapsed * 0.4;
      }

      // Rotate and Bob Transit wireframe cages
      transit.forEach((hub) => {
        const obj = meshesMap.get(hub.id);
        if (obj && obj instanceof THREE.Group) {
          if (obj.children[1]) {
            obj.children[1].rotation.y += 0.01;
            obj.children[1].rotation.x += 0.005;
          }
          if (!hub.id.startsWith("parking")) {
            const basePos = transitPositions[hub.id];
            if (basePos) {
              obj.position.y = basePos.y + Math.sin(elapsed * 1.6 + (hub.id === "rail_transit" ? 0 : Math.PI)) * 0.8;
            }
          }
        }
      });

      // Animate evacuation flow paths
      flowLines.forEach(line => {
        line.visible = evacuationModeActive;
      });
      
      flowParticles.forEach(p => {
        p.mesh.visible = evacuationModeActive;
        if (evacuationModeActive) {
          p.progress = (p.progress + delta * 0.4) % 1.0;
          p.curve.getPointAt(p.progress, p.mesh.position);
        }
      });
      
      // Pulsate and color-code exits based on evacuation state
      exitMeshes.forEach((mesh, idx) => {
        if (evacuationModeActive) {
          const scaleVal = 1.0 + Math.abs(Math.sin(elapsed * 6 + idx)) * 0.25;
          mesh.scale.set(scaleVal, scaleVal, scaleVal);
          const mat = mesh.material as THREE.MeshStandardMaterial;
          mat.color.setHex(0x34d399); // Active green
          mat.emissive.setHex(0x10b981);
          mat.emissiveIntensity = 0.5 + Math.abs(Math.sin(elapsed * 6 + idx)) * 0.5;
        } else {
          mesh.scale.set(1.0, 1.0, 1.0);
          const mat = mesh.material as THREE.MeshStandardMaterial;
          mat.color.setHex(0x059669); // Standby green
          mat.emissive.setHex(0x047857);
          mat.emissiveIntensity = 0.3;
        }
      });

      // Animate Concession Food Route
      if (selectedFoodStallRoute) {
        const startPos = labelPositions[selectedFoodStallRoute.gateId];
        const endPos = labelPositions[selectedFoodStallRoute.stallId];
        
        if (startPos && endPos) {
          const curve = new THREE.LineCurve3(
            new THREE.Vector3(startPos.x, 0.2, startPos.z),
            new THREE.Vector3(endPos.x, 0.2, endPos.z)
          );
          
          const points = curve.getPoints(10);
          foodRouteLine.geometry.setFromPoints(points);
          foodRouteLine.computeLineDistances();
          foodRouteLine.visible = true;

          foodParticlesList.forEach((pMesh, idx) => {
            pMesh.visible = true;
            const pProgress = ((elapsed * 0.4) + (idx / 5)) % 1.0;
            curve.getPointAt(pProgress, pMesh.position);
          });
        } else {
          foodRouteLine.visible = false;
          foodParticlesList.forEach(p => p.visible = false);
        }
      } else {
        foodRouteLine.visible = false;
        foodParticlesList.forEach(p => p.visible = false);
      }

      // Animate Restroom Washroom Route
      if (selectedWashroomRoute) {
        const startPos = labelPositions[selectedWashroomRoute.gateId];
        const endPos = labelPositions[selectedWashroomRoute.washroomId];
        
        if (startPos && endPos) {
          const curve = new THREE.LineCurve3(
            new THREE.Vector3(startPos.x, 0.2, startPos.z),
            new THREE.Vector3(endPos.x, 0.2, endPos.z)
          );
          
          const points = curve.getPoints(10);
          wcRouteLine.geometry.setFromPoints(points);
          wcRouteLine.computeLineDistances();
          wcRouteLine.visible = true;

          wcParticlesList.forEach((pMesh, idx) => {
            pMesh.visible = true;
            const pProgress = ((elapsed * 0.4) + (idx / 5)) % 1.0;
            curve.getPointAt(pProgress, pMesh.position);
          });
        } else {
          wcRouteLine.visible = false;
          wcParticlesList.forEach(p => p.visible = false);
        }
      } else {
        wcRouteLine.visible = false;
        wcParticlesList.forEach(p => p.visible = false);
      }

      // Animate Transit Route
      if (selectedTransitRoute) {
        const startPos = labelPositions[selectedTransitRoute.startId];
        const endPos = labelPositions[selectedTransitRoute.endId];
        
        if (startPos && endPos) {
          const curve = new THREE.LineCurve3(
            new THREE.Vector3(startPos.x, 0.2, startPos.z),
            new THREE.Vector3(endPos.x, 0.2, endPos.z)
          );
          
          const points = curve.getPoints(10);
          transitRouteLine.geometry.setFromPoints(points);
          transitRouteLine.computeLineDistances();
          transitRouteLine.visible = true;

          transitParticlesList.forEach((pMesh, idx) => {
            pMesh.visible = true;
            const pProgress = ((elapsed * 0.4) + (idx / 5)) % 1.0;
            curve.getPointAt(pProgress, pMesh.position);
          });
        } else {
          transitRouteLine.visible = false;
          transitParticlesList.forEach(p => p.visible = false);
        }
      } else {
        transitRouteLine.visible = false;
        transitParticlesList.forEach(p => p.visible = false);
      }

      // Animate Incidents pulsing scale
      incidents.filter(inc => !inc.resolved).forEach((inc) => {
        const group = meshesMap.get(inc.id);
        if (group && group instanceof THREE.Group) {
          const cone = group.children[0] as THREE.Mesh;
          const ring = group.children[1] as THREE.Mesh;
          
          if (cone) {
            cone.position.y = Math.sin(elapsed * 5) * 0.4;
            cone.rotation.y += 0.02;
          }
          if (ring) {
            const scaleVal = 1.0 + Math.abs(Math.sin(elapsed * 2.5)) * 0.8;
            ring.scale.set(scaleVal, scaleVal, 1);
            const material = ring.material as THREE.MeshBasicMaterial;
            if (material) {
              material.opacity = 0.6 - (scaleVal - 1.0) / 2.0;
            }
          }
        }
      });

      // Project 3D labels onto HTML overlay screen space
      const canvasWidth = renderer.domElement.clientWidth;
      const canvasHeight = renderer.domElement.clientHeight;

      labelsRef.current.forEach((domEl, key) => {
        if (!domEl) return;
        const pos3d = labelPositions[key];
        if (!pos3d) return;

        tempV.copy(pos3d).project(camera);
        // If label is behind the camera frustum, hide it
        if (tempV.z > 1) {
          domEl.style.display = "none";
        } else {
          domEl.style.display = "block";
          // Convert normalized coordinates (-1 to +1) to pixel space
          const px = (tempV.x * 0.5 + 0.5) * canvasWidth;
          const py = (tempV.y * -0.5 + 0.5) * canvasHeight;
          domEl.style.left = `${px}px`;
          domEl.style.top = `${py}px`;
        }
      });

      renderer.render(scene, camera);
    };

    animate();

    // HANDLE RESIZING
    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight || 380;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener("resize", handleResize);

    // CLEANUP
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      if (canvasRef.current) {
        canvasRef.current.removeEventListener("pointerdown", handlePointerDown);
        canvasRef.current.removeEventListener("pointermove", handlePointerMove);
      }
      controls.dispose();
      renderer.dispose();
      
      // Dispose materials & geometries
      starGeo.dispose();
      starMat.dispose();
      fieldGeo.dispose();
      fieldMat.dispose();
      innerStandGeo.dispose();
      standMat.dispose();
      outerStandGeo.dispose();
      outerStandMat.dispose();
      groundGeo.dispose();
      groundMat.dispose();
      radarGeo.dispose();
      radarMat.dispose();
      
      // Dispose emergency exit & flow geometries
      flowParticleGeo.dispose();
      geometriesToDispose.forEach(g => g.dispose());
      materialsToDispose.forEach(m => m.dispose());
    };
  }, [gates, transit, roads, incidents]);

  // Sync selection when selectedAssetId prop changes
  useEffect(() => {
    // Search the scene inside renderer mounts to adjust active highlight
    // We can do this reactively by triggering the local highlight function
    // But since it runs inside the canvas scope, we can trigger it in the render loop.
  }, [selectedAssetId]);

  return (
    <div className="glass-panel rounded-xl p-4 overflow-hidden bg-surface border border-outline-variant/30 flex flex-col hologram-scanlines" id="stadium-map-card">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-display text-[18px] text-on-surface font-bold flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">3d_rotation</span>
          3D TACTICAL AERIAL SIMULATOR
        </h2>
        <div className="flex items-center gap-2">
          {/* View presets */}
          <div className="flex gap-1 bg-surface-container/60 p-0.5 rounded-lg border border-outline-variant/30 text-[10px] font-mono font-bold">
            <button
              onClick={() => handleSetView("isometric")}
              className={`px-2 py-1 rounded cursor-pointer transition-colors ${
                activeView === "isometric" ? "bg-primary text-white" : "text-on-surface-variant hover:bg-surface-container"
              }`}
            >
              ISO
            </button>
            <button
              onClick={() => handleSetView("topdown")}
              className={`px-2 py-1 rounded cursor-pointer transition-colors ${
                activeView === "topdown" ? "bg-primary text-white" : "text-on-surface-variant hover:bg-surface-container"
              }`}
            >
              TOP
            </button>
            <button
              onClick={() => handleSetView("side")}
              className={`px-2 py-1 rounded cursor-pointer transition-colors ${
                activeView === "side" ? "bg-primary text-white" : "text-on-surface-variant hover:bg-surface-container"
              }`}
            >
              SIDE
            </button>
            <button
              onClick={() => handleSetView("reset")}
              className={`px-2 py-1 rounded cursor-pointer transition-colors ${
                activeView === "reset" ? "bg-primary text-white" : "text-on-surface-variant hover:bg-surface-container"
              }`}
            >
              RESET
            </button>
          </div>
        </div>
      </div>

      {/* Rendering Container */}
      <div ref={mountRef} className="relative w-full aspect-video min-h-[360px] max-h-[420px] bg-surface-dim rounded-lg border border-outline-variant/40 overflow-hidden shadow-inner">
        
        {/* Canvas for Three.js */}
        <canvas ref={canvasRef} className="w-full h-full block focus:outline-none" />

        {/* 2D HTML Labels Projected overlay */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
          {/* Highway North */}
          <div
            ref={(el) => { if (el) labelsRef.current.set("highway_n", el); }}
            className="absolute bg-surface-container-low/90 border border-outline-variant/30 text-outline font-mono text-[8px] tracking-wider font-semibold px-1.5 py-0.5 rounded transform -translate-x-1/2 -translate-y-1/2 select-none shadow-sm"
          >
            I-95 EXPRESSWAY NORTHBOUND
          </div>
          {/* Highway South */}
          <div
            ref={(el) => { if (el) labelsRef.current.set("highway_s", el); }}
            className="absolute bg-surface-container-low/90 border border-outline-variant/30 text-outline font-mono text-[8px] tracking-wider font-semibold px-1.5 py-0.5 rounded transform -translate-x-1/2 -translate-y-1/2 select-none shadow-sm"
          >
            I-95 EXPRESSWAY SOUTHBOUND
          </div>
          {/* Stadium Blvd */}
          <div
            ref={(el) => { if (el) labelsRef.current.set("stadium_blvd", el); }}
            className="absolute bg-surface-container/90 border border-primary/20 text-on-surface font-mono text-[8px] font-bold px-1.5 py-0.5 rounded transform -translate-x-1/2 -translate-y-1/2 select-none shadow-sm"
          >
            Stadium Blvd (Main Access)
          </div>
          {/* Bypass */}
          <div
            ref={(el) => { if (el) labelsRef.current.set("bypass", el); }}
            className="absolute bg-surface-container-low/90 border border-outline-variant/30 text-outline font-mono text-[8px] px-1.5 py-0.5 rounded transform -translate-x-1/2 -translate-y-1/2 select-none shadow-sm"
          >
            Park-and-Ride Bypass
          </div>
          {/* Main Parking */}
          <div
            ref={(el) => { if (el) labelsRef.current.set("parking_main", el); }}
            className="absolute bg-surface-container/90 border border-outline-variant/30 text-on-surface font-mono text-[9px] font-bold px-1.5 py-0.5 rounded transform -translate-x-1/2 -translate-y-1/2 select-none shadow-sm"
          >
            Parking A, B, C
          </div>
          {/* Overflow Parking H */}
          <div
            ref={(el) => { if (el) labelsRef.current.set("parking_south", el); }}
            className="absolute bg-surface-container/90 border border-outline-variant/30 text-on-surface font-mono text-[9px] font-bold px-1.5 py-0.5 rounded transform -translate-x-1/2 -translate-y-1/2 select-none shadow-sm"
          >
            Overflow Lot H
          </div>
          {/* Rail Hub */}
          <div
            ref={(el) => { if (el) labelsRef.current.set("rail", el); }}
            className={`absolute border text-[8px] font-mono font-bold px-2 py-1 rounded-md transform -translate-x-1/2 -translate-y-1/2 select-none shadow-md transition-all duration-300 z-20 ${
              selectedTransitRoute?.startId === "rail" || selectedAssetId === "rail_transit"
                ? "bg-cyan-600 border-cyan-400 text-white shadow-[0_0_10px_rgba(6,182,212,0.6)] animate-pulse"
                : "bg-surface/85 backdrop-blur-md border-outline-variant/30 text-on-surface hover:bg-surface hover:border-cyan-500/40"
            }`}
          >
            RAIL STN
          </div>
          {/* Shuttle Hub */}
          <div
            ref={(el) => { if (el) labelsRef.current.set("shuttle", el); }}
            className={`absolute border text-[8px] font-mono font-bold px-2 py-1 rounded-md transform -translate-x-1/2 -translate-y-1/2 select-none shadow-md transition-all duration-300 z-20 ${
              selectedTransitRoute?.startId === "shuttle" || selectedAssetId === "shuttle_bus"
                ? "bg-cyan-600 border-cyan-400 text-white shadow-[0_0_10px_rgba(6,182,212,0.6)] animate-pulse"
                : "bg-surface/85 backdrop-blur-md border-outline-variant/30 text-on-surface hover:bg-surface hover:border-cyan-500/40"
            }`}
          >
            SHUTTLE HUB
          </div>

          {/* Exits Labels */}
          <div
            ref={(el) => { if (el) labelsRef.current.set("exit_1", el); }}
            className={`absolute border text-[8px] font-mono font-bold px-2 py-1 rounded-md transform -translate-x-1/2 -translate-y-1/2 select-none shadow-md transition-all duration-300 z-20 ${
              evacuationModeActive 
                ? "bg-emerald-600 border-emerald-400 text-white shadow-[0_0_10px_rgba(16,185,129,0.6)] animate-pulse" 
                : "bg-surface/85 backdrop-blur-md border-outline-variant/30 text-outline hover:bg-surface"
            }`}
          >
            {evacuationModeActive ? "EXIT 1 (ACTIVE)" : "EXIT 1"}
          </div>
          <div
            ref={(el) => { if (el) labelsRef.current.set("exit_2", el); }}
            className={`absolute border text-[8px] font-mono font-bold px-2 py-1 rounded-md transform -translate-x-1/2 -translate-y-1/2 select-none shadow-md transition-all duration-300 z-20 ${
              evacuationModeActive 
                ? "bg-emerald-600 border-emerald-400 text-white shadow-[0_0_10px_rgba(16,185,129,0.6)] animate-pulse" 
                : "bg-surface/85 backdrop-blur-md border-outline-variant/30 text-outline hover:bg-surface"
            }`}
          >
            {evacuationModeActive ? "EXIT 2 (ACTIVE)" : "EXIT 2"}
          </div>
          <div
            ref={(el) => { if (el) labelsRef.current.set("exit_3", el); }}
            className={`absolute border text-[8px] font-mono font-bold px-2 py-1 rounded-md transform -translate-x-1/2 -translate-y-1/2 select-none shadow-md transition-all duration-300 z-20 ${
              evacuationModeActive 
                ? "bg-emerald-600 border-emerald-400 text-white shadow-[0_0_10px_rgba(16,185,129,0.6)] animate-pulse" 
                : "bg-surface/85 backdrop-blur-md border-outline-variant/30 text-outline hover:bg-surface"
            }`}
          >
            {evacuationModeActive ? "EXIT 3 (ACTIVE)" : "EXIT 3"}
          </div>
          <div
            ref={(el) => { if (el) labelsRef.current.set("exit_4", el); }}
            className={`absolute border text-[8px] font-mono font-bold px-2 py-1 rounded-md transform -translate-x-1/2 -translate-y-1/2 select-none shadow-md transition-all duration-300 z-20 ${
              evacuationModeActive 
                ? "bg-emerald-600 border-emerald-400 text-white shadow-[0_0_10px_rgba(16,185,129,0.6)] animate-pulse" 
                : "bg-surface/85 backdrop-blur-md border-outline-variant/30 text-outline hover:bg-surface"
            }`}
          >
            {evacuationModeActive ? "EXIT 4 (ACTIVE)" : "EXIT 4"}
          </div>
          
          {/* Food Stall Labels */}
          <div
            ref={(el) => { if (el) labelsRef.current.set("stall_1", el); }}
            className={`absolute border text-[8px] font-mono font-bold px-2 py-1 rounded-md transform -translate-x-1/2 -translate-y-1/2 select-none shadow-md transition-all duration-300 z-20 ${
              selectedFoodStallRoute?.stallId === "stall_1" || selectedAssetId === "stall_1"
                ? "bg-orange-600 border-orange-400 text-white shadow-[0_0_10px_rgba(249,115,22,0.6)] animate-pulse"
                : "bg-surface/85 backdrop-blur-md border-orange-500/20 text-orange-500 hover:bg-surface hover:border-orange-500/50"
            }`}
          >
            TACO STAND
          </div>
          <div
            ref={(el) => { if (el) labelsRef.current.set("stall_2", el); }}
            className={`absolute border text-[8px] font-mono font-bold px-2 py-1 rounded-md transform -translate-x-1/2 -translate-y-1/2 select-none shadow-md transition-all duration-300 z-20 ${
              selectedFoodStallRoute?.stallId === "stall_2" || selectedAssetId === "stall_2"
                ? "bg-orange-600 border-orange-400 text-white shadow-[0_0_10px_rgba(249,115,22,0.6)] animate-pulse"
                : "bg-surface/85 backdrop-blur-md border-yellow-500/20 text-yellow-500 hover:bg-surface hover:border-yellow-500/50"
            }`}
          >
            BURGER GRILL
          </div>
          <div
            ref={(el) => { if (el) labelsRef.current.set("stall_3", el); }}
            className={`absolute border text-[8px] font-mono font-bold px-2 py-1 rounded-md transform -translate-x-1/2 -translate-y-1/2 select-none shadow-md transition-all duration-300 z-20 ${
              selectedFoodStallRoute?.stallId === "stall_3" || selectedAssetId === "stall_3"
                ? "bg-orange-600 border-orange-400 text-white shadow-[0_0_10px_rgba(249,115,22,0.6)] animate-pulse"
                : "bg-surface/85 backdrop-blur-md border-red-500/20 text-red-500 hover:bg-surface hover:border-red-500/50"
            }`}
          >
            PIZZA KITCHEN
          </div>
          <div
            ref={(el) => { if (el) labelsRef.current.set("stall_4", el); }}
            className={`absolute border text-[8px] font-mono font-bold px-2 py-1 rounded-md transform -translate-x-1/2 -translate-y-1/2 select-none shadow-md transition-all duration-300 z-20 ${
              selectedFoodStallRoute?.stallId === "stall_4" || selectedAssetId === "stall_4"
                ? "bg-orange-600 border-orange-400 text-white shadow-[0_0_10px_rgba(249,115,22,0.6)] animate-pulse"
                : "bg-surface/85 backdrop-blur-md border-blue-500/20 text-blue-500 hover:bg-surface hover:border-blue-500/50"
            }`}
          >
            BEER TAVERN
          </div>

          {/* Washroom Labels */}
          <div
            ref={(el) => { if (el) labelsRef.current.set("wc_1", el); }}
            className={`absolute border text-[8px] font-mono font-bold px-2 py-1 rounded-md transform -translate-x-1/2 -translate-y-1/2 select-none shadow-md transition-all duration-300 z-20 ${
              selectedWashroomRoute?.washroomId === "wc_1" || selectedAssetId === "wc_1"
                ? "bg-purple-600 border-purple-400 text-white shadow-[0_0_10px_rgba(147,51,234,0.6)] animate-pulse"
                : "bg-surface/85 backdrop-blur-md border-purple-500/20 text-purple-500 hover:bg-surface hover:border-purple-500/50"
            }`}
          >
            WC NE
          </div>
          <div
            ref={(el) => { if (el) labelsRef.current.set("wc_2", el); }}
            className={`absolute border text-[8px] font-mono font-bold px-2 py-1 rounded-md transform -translate-x-1/2 -translate-y-1/2 select-none shadow-md transition-all duration-300 z-20 ${
              selectedWashroomRoute?.washroomId === "wc_2" || selectedAssetId === "wc_2"
                ? "bg-purple-600 border-purple-400 text-white shadow-[0_0_10px_rgba(147,51,234,0.6)] animate-pulse"
                : "bg-surface/85 backdrop-blur-md border-purple-500/20 text-purple-500 hover:bg-surface hover:border-purple-500/50"
            }`}
          >
            WC SE
          </div>
          <div
            ref={(el) => { if (el) labelsRef.current.set("wc_3", el); }}
            className={`absolute border text-[8px] font-mono font-bold px-2 py-1 rounded-md transform -translate-x-1/2 -translate-y-1/2 select-none shadow-md transition-all duration-300 z-20 ${
              selectedWashroomRoute?.washroomId === "wc_3" || selectedAssetId === "wc_3"
                ? "bg-purple-600 border-purple-400 text-white shadow-[0_0_10px_rgba(147,51,234,0.6)] animate-pulse"
                : "bg-surface/85 backdrop-blur-md border-purple-500/20 text-purple-500 hover:bg-surface hover:border-purple-500/50"
            }`}
          >
            WC SW
          </div>
          <div
            ref={(el) => { if (el) labelsRef.current.set("wc_4", el); }}
            className={`absolute border text-[8px] font-mono font-bold px-2 py-1 rounded-md transform -translate-x-1/2 -translate-y-1/2 select-none shadow-md transition-all duration-300 z-20 ${
              selectedWashroomRoute?.washroomId === "wc_4" || selectedAssetId === "wc_4"
                ? "bg-purple-600 border-purple-400 text-white shadow-[0_0_10px_rgba(147,51,234,0.6)] animate-pulse"
                : "bg-surface/85 backdrop-blur-md border-purple-500/20 text-purple-500 hover:bg-surface hover:border-purple-500/50"
            }`}
          >
            WC NW
          </div>

          {/* Gates Labels */}
          <div
            ref={(el) => { if (el) labelsRef.current.set("gate_a", el); }}
            className="absolute bg-surface-container/95 border border-outline-variant/50 text-on-surface font-mono text-[9px] font-bold w-5 h-5 rounded-md flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2 select-none shadow-md"
          >
            A
          </div>
          <div
            ref={(el) => { if (el) labelsRef.current.set("gate_b", el); }}
            className="absolute bg-surface-container/95 border border-outline-variant/50 text-on-surface font-mono text-[9px] font-bold w-5 h-5 rounded-md flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2 select-none shadow-md"
          >
            B
          </div>
          <div
            ref={(el) => { if (el) labelsRef.current.set("gate_c", el); }}
            className="absolute bg-surface-container/95 border border-outline-variant/50 text-on-surface font-mono text-[9px] font-bold w-5 h-5 rounded-md flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2 select-none shadow-md"
          >
            C
          </div>
          <div
            ref={(el) => { if (el) labelsRef.current.set("gate_d", el); }}
            className="absolute bg-surface-container/95 border border-outline-variant/50 text-on-surface font-mono text-[9px] font-bold w-5 h-5 rounded-md flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2 select-none shadow-md"
          >
            D
          </div>
        </div>


        {/* 3D Interaction Guideline overlay */}
        <div className="absolute bottom-2 right-2 bg-surface-dim/80 backdrop-blur-sm border border-outline-variant/20 rounded px-2 py-0.5 text-[8px] font-mono text-outline pointer-events-none select-none shadow">
          Left click + Drag to rotate • Right click + Drag to pan • Scroll to zoom
        </div>
      </div>

      {/* Quick Legend & Asset Directory */}
      <div className="grid grid-cols-4 gap-2 mt-3 text-[10px] text-outline font-mono">
        <div className="bg-surface border border-outline-variant/40 p-2 rounded text-center shadow-sm">
          <span className="text-primary block font-sans font-bold">
            {gates.filter(g => g.status === "OPEN").length} / {gates.length}
          </span>
          Gates Open
        </div>
        <div className="bg-surface border border-outline-variant/40 p-2 rounded text-center shadow-sm">
          <span className="text-status-alert block font-sans font-bold">
            {roads.filter(r => r.congestion === "HIGH" || r.congestion === "GRIDLOCK").length}
          </span>
          Road Delays
        </div>
        <div className="bg-surface border border-outline-variant/40 p-2 rounded text-center shadow-sm">
          <span className="text-status-critical block font-sans font-bold">
            {incidents.filter(i => !i.resolved).length}
          </span>
          Active Incidents
        </div>
        <div className="bg-surface border border-outline-variant/40 p-2 rounded text-center shadow-sm">
          <span className="text-primary block font-sans font-bold">
            {transit.filter(t => t.avgWaitTime > 20).length}
          </span>
          Heavy Transit
        </div>
      </div>
    </div>
  );
};
