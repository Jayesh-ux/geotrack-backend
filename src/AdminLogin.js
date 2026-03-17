import React, { useState } from "react";

const API_BASE_URL = "https://geo-track-1.onrender.com";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
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
        // Handle new error types from multi-company backend
        if (data.error === "NoCompanyAssigned") {
          throw new Error("Your account is not assigned to any company. Contact super admin.");
        }
        if (data.error === "CompanyInactive") {
          throw new Error("Your company account is inactive. Contact super admin.");
        }
        throw new Error(data.message || "Invalid email or password");
      }

      const { token, user } = data;

      // Decode token to check admin status and company info
      const payload = JSON.parse(atob(token.split(".")[1]));
      
      // ✅ NEW: Check if user is admin OR super admin
      if (!payload.isAdmin && !payload.isSuperAdmin) {
        throw new Error("You are not authorized to access the admin dashboard.");
      }

      // ✅ NEW: Store additional company context
      localStorage.setItem("token", token);
      localStorage.setItem("userEmail", user.email);
      localStorage.setItem("userName", user.fullName || "");
      localStorage.setItem("isAdmin", user.isAdmin ? "true" : "false");
      localStorage.setItem("isSuperAdmin", user.isSuperAdmin ? "true" : "false");
      localStorage.setItem("companyId", user.companyId || "");
      localStorage.setItem("companyName", user.companyName || "");
      localStorage.setItem("companySubdomain", user.companySubdomain || "");

      console.log("✅ Login successful:", {
        email: user.email,
        isAdmin: user.isAdmin,
        isSuperAdmin: user.isSuperAdmin,
        companyId: user.companyId,
        companyName: user.companyName
      });

      window.location.href = "/dashboard";
    } catch (err) {
      setError(err.message);
      console.error("❌ Login error:", err);
    }

    setLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white shadow-lg rounded-lg p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          Admin Login
        </h1>

        {error && (
          <div className="bg-red-100 text-red-700 text-sm p-3 mb-4 rounded">
            {error}
          </div>
        )}

        <input
          type="email"
          placeholder="Email"
          className="w-full p-2 border rounded mb-3"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={loading}
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full p-2 border rounded mb-6"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={loading}
        />

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Signing in..." : "Login"}
        </button>

        <div className="mt-4 text-xs text-gray-500 text-center">
          <p>Multi-company system • Company assignment required</p>
        </div>
      </div>
    </div>
  );
}