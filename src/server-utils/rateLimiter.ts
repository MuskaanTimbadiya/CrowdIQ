import rateLimit from "express-rate-limit";
import slowDown from "express-slow-down";
import { Request } from "express";
import dotenv from "dotenv";

dotenv.config();

// Helper to parse env numbers with a default
const getEnvNumber = (key: string, defaultValue: number): number => {
  const value = process.env[key];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

// 1. Moderate limits for public endpoints (e.g. read-only state)
export const publicLimiter = rateLimit({
  validate: { xForwardedForHeader: false, default: false },
  windowMs: getEnvNumber("RATE_LIMIT_PUBLIC_WINDOW_MS", 15 * 60 * 1000), // 15 minutes
  max: getEnvNumber("RATE_LIMIT_PUBLIC_MAX", 100), // Limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { error: "Too many requests from this IP, please try again later." },
});

// 2. Looser limits for authenticated API actions (e.g. creating incidents)
export const aiLimiter = rateLimit({
  validate: { xForwardedForHeader: false, default: false },
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: "Too many AI requests from this IP, please try again later." }
});

export const apiLimiter = rateLimit({
  validate: { xForwardedForHeader: false, default: false },
  windowMs: getEnvNumber("RATE_LIMIT_API_WINDOW_MS", 15 * 60 * 1000),
  max: getEnvNumber("RATE_LIMIT_API_MAX", 500),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many API requests, please try again later." },
});

// 3. Stricter limits for authentication endpoints based on IP (spam prevention)
export const authIpLimiter = rateLimit({
  validate: { xForwardedForHeader: false, default: false },
  windowMs: getEnvNumber("RATE_LIMIT_AUTH_IP_WINDOW_MS", 15 * 60 * 1000),
  max: getEnvNumber("RATE_LIMIT_AUTH_IP_MAX", 50),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many authentication attempts from this IP, please try again later." },
});

// 4. Exponential backoff per account (by email) for auth endpoints
const authDelayAfter = getEnvNumber("RATE_LIMIT_AUTH_ACCOUNT_DELAY_AFTER", 3);
const authBaseDelayMs = getEnvNumber("RATE_LIMIT_AUTH_ACCOUNT_DELAY_MS", 1000);

export const authAccountLimiter = slowDown({
  windowMs: getEnvNumber("RATE_LIMIT_AUTH_ACCOUNT_WINDOW_MS", 15 * 60 * 1000),
  delayAfter: authDelayAfter,
  delayMs: (hits: number, _req: Request) => {
    // delayAfter defaults to 3. 
    // If hits is 4, delay is authBaseDelayMs * 2^0
    // If hits is 5, delay is authBaseDelayMs * 2^1, etc.
    const delayAttempts = hits - authDelayAfter;
    if (delayAttempts <= 0) return 0;
    
    // Exponential backoff
    const delay = authBaseDelayMs * Math.pow(2, delayAttempts - 1);
    
    // Cap delay to 1 minute to prevent unreasonable hold up
    return Math.min(delay, 60000); 
  },
  validate: { xForwardedForHeader: false, default: false },
  keyGenerator: (req: Request) => {
    // Key by email if provided, otherwise fallback to IP
    const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    return req.body?.email || String(clientIp);
  }
});
