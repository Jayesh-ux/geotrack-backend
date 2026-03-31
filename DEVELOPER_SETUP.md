# 🔐 Developer Setup Guide: Testing with Your Own Credentials

This guide will help you set up a local development environment for the **Geo-Track** project without needing production access.

### 📋 Prerequisites
Before you begin, ensure you have the following:
- [Node.js](https://nodejs.org/) installed.
- [Git](https://git-scm.com/) installed.
- A personal Google account (for Google Maps and Gmail SMTP).

---

### 🛠️ Step 1: Clone and Install
First, clone the repository and install the dependencies:
```bash
git clone <repository-url>
cd Geo-Track
npm install
```

### 🗝️ Step 2: Create Your .env File
The `.env` file stores secret credentials and is already ignored by Git (via `.gitignore`). **Never share this file or commit it.**

1. Look for the `.env.example` file in the root directory.
2. Create a copy named `.env`:
   ```bash
   cp .env.example .env
   ```
3. Open `.env` and replace the placeholder values with your personal credentials (see below).

---

### 📂 Step 3: Getting Your Own Credentials

#### 1. Database (PostgreSQL)
You need a personal database for testing.
- **Local Option**: Install [PostgreSQL](https://www.postgresql.org/download/) and create a database named `geotrack_local`.
- **Cloud Option (Free)**: Use [Supabase](https://supabase.com/) or [Render](https://render.com/)'s free tier.
- **Update .env**: `DATABASE_URL=postgresql://user:password@localhost:5432/geotrack_local`

#### 2. Google Maps API Key
For map features and geocoding.
- Go to the [Google Cloud Console](https://console.cloud.google.com/).
- Create a project and enable **Maps SDK for JavaScript**, **Geocoding API**, and **Places API**.
- Create an API key in **APIs & Services > Credentials**.
- **Update .env**: `GOOGLE_MAPS_API_KEY=your_personal_key`

#### 3. Email Testing (Gmail SMTP)
To test email notifications.
- Use a personal Gmail account.
- Enable **2-Step Verification** in Google Account settings.
- Go to [App Passwords](https://myaccount.google.com/apppasswords), create one for "Mail" on "Windows Computer".
- **Update .env**:
  - `GMAIL_USER=your_email@gmail.com`
  - `GMAIL_APP_PASSWORD=your_16_character_app_password`

#### 4. JWT & Tokens
- **JWT_SECRET**: Use any long random string (e.g., `my-dev-secret-geotrack-789`).
- **MIDDLEWARE_TOKEN**: Use any random string.

---

### 🚀 Step 4: Run the Application
Start the development server:
```bash
npm run dev
```
The application will now use your isolated credentials, ensuring you don't affect production data while developing.

> [!TIP]
> Always keep `NODE_ENV=development` in your local `.env` file to enable detailed logging and debugging.
