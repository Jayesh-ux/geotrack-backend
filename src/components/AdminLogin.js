import React, { useState } from "react";

const API_BASE_URL = "https://geo-track-1.onrender.com";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === "NoCompanyAssigned") {
          throw new Error("Your account is not assigned to any company. Contact super admin.");
        }
        if (data.error === "CompanyInactive") {
          throw new Error("Your company account is inactive. Contact super admin.");
        }
        throw new Error(data.message || "Invalid email or password");
      }

      const { token, user } = data;
      const payload = JSON.parse(atob(token.split(".")[1]));

      if (!payload.isAdmin && !payload.isSuperAdmin) {
        throw new Error("You are not authorized to access the admin dashboard.");
      }

      localStorage.setItem("token", token);
      localStorage.setItem("userEmail", user.email);
      localStorage.setItem("userName", user.fullName || "");
      localStorage.setItem("isAdmin", user.isAdmin ? "true" : "false");
      localStorage.setItem("isSuperAdmin", user.isSuperAdmin ? "true" : "false");
      localStorage.setItem("companyId", user.companyId || "");
      localStorage.setItem("companyName", user.companyName || "");
      localStorage.setItem("companySubdomain", user.companySubdomain || "");

      window.location.href = "/dashboard";
    } catch (err) {
      setError(err.message);
    }

    setLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") handleLogin();
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Animated background orbs */}
      <div style={{
        position: "absolute", width: 500, height: 500, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(102,126,234,0.15) 0%, transparent 70%)",
        top: -100, left: -100, pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", width: 400, height: 400, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(118,75,162,0.15) 0%, transparent 70%)",
        bottom: -80, right: -80, pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", width: 300, height: 300, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(67,233,123,0.08) 0%, transparent 70%)",
        top: "40%", right: "20%", pointerEvents: "none",
      }} />

      {/* Grid pattern */}
      <div style={{
        position: "absolute", inset: 0, opacity: 0.03,
        backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
        pointerEvents: "none",
      }} />

      {/* Login Card */}
      <div style={{
        width: "100%",
        maxWidth: 440,
        background: "rgba(255,255,255,0.05)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 24,
        overflow: "hidden",
        boxShadow: "0 32px 80px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)",
      }}>

        {/* Top accent bar */}
        <div style={{
          height: 4,
          background: "linear-gradient(90deg, #667eea 0%, #764ba2 50%, #43e97b 100%)",
        }} />

        <div style={{ padding: "44px 40px 40px" }}>
          {/* Logo + Brand */}
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <div style={{
              width: 72, height: 72, borderRadius: 20, margin: "0 auto 16px",
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 8px 24px rgba(102,126,234,0.4)",
            }}>
              <img src="/logo.png" alt="GeoTrack" style={{ width: 46, height: 46, objectFit: "contain" }} />
            </div>
            <h1 style={{ color: "#ffffff", fontSize: 26, fontWeight: 800, margin: "0 0 6px", letterSpacing: "-0.5px" }}>
              GeoTrack Admin
            </h1>
            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 14, margin: 0 }}>
              Real-time agent tracking & analytics
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div style={{
              marginBottom: 20, padding: "12px 16px",
              background: "rgba(239,68,68,0.12)",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: 12, display: "flex", alignItems: "center", gap: 10,
            }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(239,68,68,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ color: "#ef4444", fontSize: 12, fontWeight: 700 }}>!</span>
              </div>
              <p style={{ color: "#fca5a5", fontSize: 13, margin: 0, fontWeight: 500 }}>{error}</p>
            </div>
          )}

          {/* Email Field */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.8 }}>
              Email Address
            </label>
            <div style={{ position: "relative" }}>
              <div style={{
                position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
                width: 18, height: 18, opacity: 0.5,
              }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                </svg>
              </div>
              <input
                type="email"
                placeholder="admin@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={loading}
                style={{
                  width: "100%", boxSizing: "border-box",
                  padding: "14px 16px 14px 44px",
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 12, color: "#ffffff", fontSize: 14,
                  outline: "none", transition: "border 0.2s, background 0.2s",
                  fontFamily: "Inter, sans-serif",
                }}
                onFocus={(e) => { e.target.style.borderColor = "rgba(102,126,234,0.6)"; e.target.style.background = "rgba(102,126,234,0.08)"; }}
                onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.12)"; e.target.style.background = "rgba(255,255,255,0.07)"; }}
              />
            </div>
          </div>

          {/* Password Field */}
          <div style={{ marginBottom: 28 }}>
            <label style={{ display: "block", color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.8 }}>
              Password
            </label>
            <div style={{ position: "relative" }}>
              <div style={{
                position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
                width: 18, height: 18, opacity: 0.5,
              }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={loading}
                style={{
                  width: "100%", boxSizing: "border-box",
                  padding: "14px 48px 14px 44px",
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 12, color: "#ffffff", fontSize: 14,
                  outline: "none", transition: "border 0.2s, background 0.2s",
                  fontFamily: "Inter, sans-serif",
                }}
                onFocus={(e) => { e.target.style.borderColor = "rgba(102,126,234,0.6)"; e.target.style.background = "rgba(102,126,234,0.08)"; }}
                onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.12)"; e.target.style.background = "rgba(255,255,255,0.07)"; }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                style={{
                  position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer", padding: 0,
                  width: 20, height: 20, opacity: 0.5,
                }}
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Login Button */}
          <button
            onClick={handleLogin}
            disabled={loading}
            style={{
              width: "100%",
              padding: "16px",
              background: loading
                ? "rgba(102,126,234,0.5)"
                : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              border: "none", borderRadius: 14,
              color: "#ffffff", fontSize: 15, fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: loading ? "none" : "0 8px 24px rgba(102,126,234,0.4)",
              transition: "all 0.2s",
              fontFamily: "Inter, sans-serif",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            }}
            onMouseEnter={(e) => { if (!loading) e.target.style.transform = "translateY(-1px)"; }}
            onMouseLeave={(e) => { e.target.style.transform = "translateY(0)"; }}
          >
            {loading ? (
              <>
                <div style={{
                  width: 18, height: 18,
                  border: "2px solid rgba(255,255,255,0.3)",
                  borderTopColor: "#fff", borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                }} />
                Signing in...
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>
                </svg>
                Sign in to Dashboard
              </>
            )}
          </button>

          {/* Footer note */}
          <div style={{ marginTop: 24, textAlign: "center" }}>
            <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 12, margin: 0 }}>
              🔒 Secure Admin Access • Multi-company system
            </p>
          </div>
        </div>

        {/* Bottom strip with feature pills */}
        <div style={{
          padding: "16px 40px 20px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap",
        }}>
          {["📍 Live Tracking", "📊 Analytics", "🗺️ Map View", "📅 Journey"].map((f) => (
            <span key={f} style={{
              padding: "4px 10px", borderRadius: 20,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.35)", fontSize: 11, fontWeight: 500,
            }}>{f}</span>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: rgba(255,255,255,0.25) !important; }
      `}</style>
    </div>
  );
}
