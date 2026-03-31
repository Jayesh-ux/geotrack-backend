# 🚀 Geo-Track Backend Deployment Guide (Render)

This guide will help you deploy the **Geo-Track Backend** on Render step-by-step.

---

## ✅ 1. Prerequisites

Before starting, ensure you have:

* A **Render account** → [https://render.com](https://render.com)
* Access to the **GitHub repository** (backend code)
* Access to required **environment variables** (listed below)

---

## 🚀 2. Deploy Using Blueprint (Recommended)

1. Go to → [https://dashboard.render.com](https://dashboard.render.com)
2. Click **New +** → **Blueprint**
3. Connect your GitHub repository
4. Select the backend repo

👉 Render will automatically create:

* Web Service → `geotrack-backend`
* PostgreSQL DB → `geotrack-db`

---

## ⚙️ 3. Setup Environment Variables (VERY IMPORTANT)

Go to: **Render Dashboard → Web Service → Environment**

Add the following (values are from our current configuration):

| Key | Value Source / Placeholder | Description |
|-----|----------------------------|-------------|
| `JWT_SECRET` | Auto-generated or `your-super-secret-jwt-key-change-me-12345` | Security for authentication. |
| `GOOGLE_MAPS_API_KEY` | `AIzaSyDTjchZjGA7i1W7thKjDAAtCuxCXo7Xw6U` | Geocoding service key. |
| `EMAIL_USER` | `geotrack.noreply@gmail.com` | SMTP User. |
| `EMAIL_PASSWORD` | `inom6413newaccounr7mbb7671` | Gmail App Password (see below). |
| `EMAIL_FROM` | `newaccounr7@gmail.com` | "From" address for all notifications. |
| `LICENSE_WEBHOOK_SECRET` | `your-shared-secret-here` | Key for verifying licensing webhooks. |
| `MIDDLEWARE_TOKEN` | `tally-middleware-secret-key-12345` | Internal security for sync operations. |
| `FRONTEND_URL` | `https://dashboard.geo-track.org` | Dashboard URL for CORS. |
| `NODE_ENV` | `production` | Deployment mode. |

---

## 🔐 4. Gmail Setup (IMPORTANT)

Normal Gmail password will **NOT** work.

Steps:
1. Enable **2-Step Verification** on the Gmail account.
2. Go to → Google Account → Security.
3. Generate **App Password** for "Mail".
4. Use that password in `EMAIL_PASSWORD`.

---

## 🗄️ 5. Database Setup

✅ **No manual setup needed.**

Render will automatically:
* Create the PostgreSQL database.
* Link it via `DATABASE_URL` internally.

---

## 🔄 6. Migrations & Seeding

These run automatically during deploy:
* Migrations → `node scripts/runMigration.js` (Creates tables)
* Seeding → `node utils/seedPincodes.js` (Seeds India pincode data)

👉 Check logs for success:
```bash
✅ Migration completed
✅ Seeding completed
```

---

## 📊 7. How to Check Logs

Go to: **Render Dashboard → Service → Logs → Deploy Logs**

Check for:
* Errors ❌
* Success messages ✅

---

## ✅ 8. Verify Deployment

Once status = **Live**

1. **Open the Base URL**: `https://your-service-name.onrender.com`
   Expected response: `{"message": "Multi-Company Client Tracking API...", "version": "2.1.0"}`

2. **Check Health**: `/ping`
   Expected: `PONG - Server is alive`

---

## ⚠️ 9. Common Issues & Fixes

### ❌ Build Failed
* Check `package.json` scripts.
* Ensure all dependencies are correct.

### ❌ App Crashes After Deploy
* Check Environment Variables. Missing/incorrect variables = most common issue.

### ❌ Database Error
* Ensure `DATABASE_URL` is auto-linked by Render.
* Check DB logs in the Render Postgres dashboard.

### ❌ CORS Error (Frontend not connecting)
* Verify `FRONTEND_URL` in environment variables.
* Check if backend CORS configuration includes your domain.

### ❌ Slow Response / Not Loading
* Free plan tier includes "cold starts" (30–60 seconds after inactivity).

---

## 🔁 10. Manual Setup (Fallback)

If Blueprint fails:
1. Create a **New Web Service** and connect the GitHub repo.
2. Manually add all Environment Variables from Section 3.
3. Create a **New PostgreSQL Database**.
4. Link the database to the web service using the "DATABASE_URL" secret.

---

## 🧠 Final Notes

* **Never** share secrets publicly.
* Double-check every character in environment variables (no extra spaces).
* **Logs are your best friend** for debugging step 6.

🚀 **Done! Your Geo-Track backend is ready for the world.**
