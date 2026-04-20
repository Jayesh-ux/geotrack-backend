import dotenv from "dotenv";
dotenv.config();

// CRITICAL: Warn if using default secrets in production
if (process.env.NODE_ENV === 'production') {
    if (!process.env.JWT_SECRET) console.warn("⚠️ SECURITY: JWT_SECRET not set - using insecure default!");
    if (!process.env.MIDDLEWARE_TOKEN) console.warn("⚠️ SECURITY: MIDDLEWARE_TOKEN not set - using insecure default!");
}
export const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-do-not-use-in-production";
export const PORT = process.env.PORT || 5000;
export const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
export const MIDDLEWARE_TOKEN = process.env.MIDDLEWARE_TOKEN || "dev-middleware-token";
export const CORS_ORIGIN = [
  "http://localhost:3000", 
  "https://geo-track-em3s.onrender.com",
  "https://dashboard-tsw3.onrender.com",
  "https://lisence-system.onrender.com",
  process.env.FRONTEND_URL
].filter(Boolean);

// 🆕 EMAIL CONFIGURATION
// CRITICAL: Warn in production if not configured
if (process.env.NODE_ENV === 'production' && (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD)) {
  console.warn("⚠️ SECURITY: EMAIL credentials not set - email features disabled!");
}
export const EMAIL_CONFIG = {
  service: 'gmail',
  user: process.env.EMAIL_USER,
  pass: process.env.EMAIL_PASSWORD,
  from: process.env.EMAIL_FROM || 'GeoTrack <noreply@geotrack.app>'
};