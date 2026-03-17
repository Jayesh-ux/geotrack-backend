import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import AdminLogin from "./AdminLogin";
import Dashboard from './components/Dashboard';

function App() {
  const token = localStorage.getItem("token");
  let isAdmin = false;

  if (token) {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      isAdmin = payload.isAdmin === true;
    } catch (e) {}
  }

  return (
    <Routes>
      {/* Login page (public) */}
      <Route path="/login" element={<AdminLogin />} />

      {/* Dashboard page (admin only) */}
      <Route
        path="/dashboard"
        element={token && isAdmin ? <Dashboard /> : <Navigate to="/login" replace />}
      />

      {/* Default fallback: redirect user to the correct page */}
      <Route
        path="*"
        element={<Navigate to={token && isAdmin ? "/dashboard" : "/login"} replace />}
      />
    </Routes>
  );
}

export default App;
