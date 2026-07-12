import { IncomingMessage, ServerResponse } from "http";

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    // Dynamically import the Express app to catch load-time errors
    const serverModule = await import("../server");
    const app = serverModule.default;
    
    // Pass the request and response to the Express app
    return app(req, res);
  } catch (error: any) {
    console.error("Vercel Serverless Function Crash:", error);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({
      error: "Vercel Serverless Function Crash during import",
      message: error.message,
      stack: error.stack,
      envKeys: Object.keys(process.env).filter(key => {
        const k = key.toUpperCase();
        return !k.includes("SECRET") && !k.includes("KEY") && !k.includes("PASSWORD") && !k.includes("TOKEN") && !k.includes("AUTH");
      })
    }));
  }
}
