import dotenv from "dotenv";
dotenv.config();

export const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production";
export const PORT = process.env.PORT || 5000;
export const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
export const MIDDLEWARE_TOKEN = process.env.MIDDLEWARE_TOKEN || "tally-middleware-secret-key-12345";
// Allow localhost, deployed Render domains, AND any device on the local Wi-Fi (192.168.x.x)
// This is required for the Android app and on-LAN browser access to work without CORS errors.
export const CORS_ORIGIN = (origin, callback) => {
  const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "https://geo-track-em3s.onrender.com",
    "https://dashboard-tsw3.onrender.com",
    "https://lisence-system.onrender.com",
  ];

  // No origin = direct API call (Postman, curl, mobile native) — allow it
  if (!origin) return callback(null, true);

  // Allow any origin on the local network (192.168.x.x or 10.x.x.x)
  if (
    allowedOrigins.includes(origin) ||
    /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(origin) ||
    /^http:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(origin) ||
    /^http:\/\/172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(origin)
  ) {
    return callback(null, true);
  }

  callback(new Error(`CORS: Origin ${origin} not allowed`));
};

// 🆕 EMAIL CONFIGURATION
export const EMAIL_CONFIG = {
  service: 'gmail',
  user: process.env.EMAIL_USER || 'your-app-email@gmail.com',
  pass: process.env.EMAIL_PASSWORD || 'your-app-password-here',
  from: process.env.EMAIL_FROM || 'GeoTrack <your-app-email@gmail.com>'
};