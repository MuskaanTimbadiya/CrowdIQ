import { Request, Response, NextFunction } from "express";
import { z, ZodSchema } from "zod";

// Middleware to validate request body
export const validateRequest = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Invalid request data",
          details: error.issues,
        });
      }
      return res.status(400).json({ error: "Invalid request data" });
    }
  };
};

// 1. Phase Schema
export const phaseSchema = z.object({
  phase: z.enum(["ingress", "halftime", "egress"]),
  stadiumId: z.string().min(1).max(50).optional(),
});

// 2. Incident Resolve Schema
export const resolveIncidentSchema = z.object({
  id: z.string().min(1).max(100),
});

// 3. Create Incident Schema
export const createIncidentSchema = z.object({
  location: z.string().min(3).max(100),
  severity: z.enum(["INFO", "WARNING", "CRITICAL"]),
  description: z.string().min(5).max(500),
});

// 4. Apply Optimization Schema
export const applyOptimizationSchema = z.object({
  id: z.string().min(1).max(100),
});

// 5. AI Optimize Schema (No body required, but we can enforce empty object if needed)
export const aiOptimizeSchema = z.object({}).passthrough();

// 6. AI Guidance Schema
export const aiGuidanceSchema = z.object({
  message: z.string().min(1).max(1000),
  userLanguage: z.string().min(2).max(50).optional().default("English"),
  chatHistory: z.array(
    z.object({
      id: z.string().optional(),
      sender: z.enum(["user", "ai", "system"]),
      text: z.string(),
      timestamp: z.string().optional(),
      language: z.string().optional(),
      suggestedActions: z.array(z.string()).optional(),
    })
  ).max(50).optional().default([]),
});

// 7. AI Broadcast Draft Schema
export const aiBroadcastDraftSchema = z.object({
  incidentLocation: z.string().min(1).max(100),
  incidentDescription: z.string().min(1).max(500),
  urgency: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional().default("HIGH"),
});

// 8. Publish Broadcast Schema
export const publishBroadcastSchema = z.object({
  announcement: z.object({
    id: z.string().min(1).max(100),
    title: z.string().min(1).max(200),
    content: z.string().min(1).max(1000),
    targetAudience: z.enum(["ALL_FANS", "GATE_C_ONLY", "TRAIN_PASSENGERS", "STAFF", "ACCESSIBILITY_NEEDS"]),
    priority: z.enum(["NORMAL", "HIGH", "URGENT"]),
    languages: z.array(z.string()).min(1).max(10),
    broadcastActive: z.boolean(),
    timestamp: z.string(),
  }),
});

// 9. Clear Broadcast Schema
export const clearBroadcastSchema = z.object({
  id: z.string().min(1).max(100),
});

// 10. Weather Schema
export const weatherSchema = z.object({
  weather: z.enum(["SUNNY", "RAINY", "LIGHTNING_STORM"]),
});

// 11. Evacuation Schema
export const evacuationSchema = z.object({
  active: z.boolean(),
});

// 12. Redeploy Staff Schema
export const redeployStaffSchema = z.object({
  gateId: z.string().min(1).max(100),
  change: z.number().int().min(-100).max(100),
});
