import React, { useEffect, useRef, useState, useCallback } from "react";

const API_BASE_URL = "https://geo-track-1.onrender.com";

// ─── Helpers ────────────────────────────────────────────────────────────────
function getAgentStatus(timestamp) {
  if (!timestamp) return "offline";
  const diff = (Date.now() - new Date(timestamp)) / 60000;
  if (diff <= 5) return "online";
  if (diff <= 30) return "idle";
  return "offline";
}

function timeAgo(ts) {
  if (!ts) return "Never";
  const diff = Math.floor((Date.now() - new Date(ts)) / 60000);
  if (diff < 1) return "Just now";
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return `${Math.floor(diff / 1440)}d ago`;
}

const STATUS_CONFIG = {
  online:  { color: "#22c55e", glow: "rgba(34,197,94,0.35)",  label: "Online",  dot: "#22c55e" },
  idle:    { color: "#f59e0b", glow: "rgba(245,158,11,0.35)", label: "Idle",    dot: "#f59e0b" },
  offline: { color: "#94a3b8", glow: "rgba(148,163,184,0.2)", label: "Offline", dot: "#94a3b8" },
};

// ─── Custom SVG Marker factories ─────────────────────────────────────────────
function getAgentDivIcon(status) {
  const cfg = STATUS_CONFIG[status];
  const pulseHtml = status === 'online' 
    ? `<div style="position:absolute;top:3px;left:0;width:28px;height:28px;border-radius:50%;background:${cfg.color};animation:ripple 2s ease-out infinite;opacity:0"></div>` 
    : '';

  // Teardrop pin + silhouette for agent (representing clocked in / live position)
  const svg = `<svg width="28" height="34" viewBox="0 0 28 34" style="position:relative;z-index:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.25))">
    <path d="M14 1C7.4 1 2 6.4 2 13c0 9.3 12 20 12 20s12-10.7 12-20C26 6.4 20.6 1 14 1z" fill="${cfg.color}" stroke="#fff" stroke-width="1.5"/>
    <circle cx="14" cy="11" r="4" fill="#fff"/>
    <rect x="10" y="16" width="8" height="5" rx="1" fill="#fff"/>
  </svg>`;

  return window.L.divIcon({
    className: 'custom-leaflet-div-icon',
    html: `<div style="position:relative;width:28px;height:34px">${pulseHtml}${svg}</div>`,
    iconSize: [28, 34],
    iconAnchor: [14, 34],
    popupAnchor: [0, -34]
  });
}

function getClientDivIcon(hasGps) {
  const color = hasGps ? '#4CAF50' : '#E53935';
  const innerHtml = hasGps 
    ? `<path d="M9 13l3.5 3.5L19 10" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`
    : `<text x="14" y="16" text-anchor="middle" fill="#fff" font-size="10" font-weight="bold">!</text>`;

  const svg = `<svg width="28" height="34" viewBox="0 0 28 34" style="filter:drop-shadow(0 2px 4px rgba(0,0,0,0.25))">
    <path d="M14 1C7.4 1 2 6.4 2 13c0 9.3 12 20 12 20s12-10.7 12-20C26 6.4 20.6 1 14 1z" fill="${color}" stroke="#fff" stroke-width="1.5"/>
    ${innerHtml}
  </svg>`;

  return window.L.divIcon({
    className: 'custom-leaflet-div-icon',
    html: `<div style="width:28px;height:34px">${svg}</div>`,
    iconSize: [28, 34],
    iconAnchor: [14, 34],
    popupAnchor: [0, -34]
  });
}

// ─── Legend Component ─────────────────────────────────────────────────────────
function MapLegend() {
  return (
    <div style={{
      position: "absolute", bottom: 24, left: 16, zIndex: 1000,
      background: "rgba(15,23,42,0.92)",
      backdropFilter: "blur(12px)",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 16, padding: "16px 20px",
      boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      minWidth: 200,
    }}>
      <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, margin: "0 0 12px" }}>
        Map Legend
      </p>

      {/* Agents */}
      <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 6px" }}>Agents</p>
      {[
        { color: "#22c55e", glow: "rgba(34,197,94,0.5)", label: "Online", sub: "Active < 5 min" },
        { color: "#f59e0b", glow: "rgba(245,158,11,0.5)", label: "Idle", sub: "5 – 30 min ago" },
        { color: "#94a3b8", glow: "none",                 label: "Offline", sub: "> 30 min ago" },
      ].map(({ color, glow, label, sub }) => (
        <div key={label} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <div style={{
            width: 12, height: 12, borderRadius: "50%", background: color, flexShrink: 0,
            boxShadow: glow !== "none" ? `0 0 8px ${glow}` : "none",
          }} />
          <div>
            <span style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>{label}</span>
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginLeft: 6 }}>{sub}</span>
          </div>
        </div>
      ))}

      {/* Divider */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", margin: "10px 0" }} />

      {/* Clients */}
      <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 6px" }}>Clients</p>
      {[
        { color: "#3b82f6", label: "Client (GPS)",    sub: "Location verified" },
        { color: "#94a3b8", label: "Client (No GPS)", sub: "Missing coordinates" },
      ].map(({ color, label, sub }) => (
        <div key={label} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <div style={{ width: 12, height: 12, borderRadius: 3, background: color, flexShrink: 0 }} />
          <div>
            <span style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>{label}</span>
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginLeft: 6 }}>{sub}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────
function StatsBar({ agents, clients }) {
  const online  = agents.filter(a => getAgentStatus(a.timestamp) === "online").length;
  const idle    = agents.filter(a => getAgentStatus(a.timestamp) === "idle").length;
  const offline = agents.filter(a => getAgentStatus(a.timestamp) === "offline").length;
  const withGps = clients.filter(c => c.latitude && c.longitude).length;

  return (
    <div style={{
      position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)",
      zIndex: 1000, display: "flex", gap: 8,
    }}>
      {[
        { label: "Online", count: online,  color: "#22c55e", bg: "rgba(34,197,94,0.15)"  },
        { label: "Idle",   count: idle,    color: "#f59e0b", bg: "rgba(245,158,11,0.15)" },
        { label: "Offline",count: offline, color: "#94a3b8", bg: "rgba(148,163,184,0.1)" },
        { label: "Clients",count: withGps, color: "#3b82f6", bg: "rgba(59,130,246,0.15)" },
      ].map(({ label, count, color, bg }) => (
        <div key={label} style={{
          background: "rgba(15,23,42,0.88)",
          backdropFilter: "blur(10px)",
          border: `1px solid ${color}40`,
          borderRadius: 12, padding: "8px 14px",
          display: "flex", alignItems: "center", gap: 8,
          boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
        }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: color,
            boxShadow: `0 0 6px ${color}` }} />
          <span style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>{count}</span>
          <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>{label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Agent Sidebar ────────────────────────────────────────────────────────────
function AgentSidebar({ agents, onSelectAgent, selectedAgent, onViewJourney }) {
  const [search, setSearch] = useState("");
  const filtered = agents.filter(a =>
    (a.fullName || a.email || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{
      position: "absolute", top: 0, right: 0, bottom: 0, width: 300, zIndex: 999,
      background: "rgba(15,23,42,0.95)",
      backdropFilter: "blur(16px)",
      borderLeft: "1px solid rgba(255,255,255,0.08)",
      display: "flex", flexDirection: "column",
    }}>
      <div style={{ padding: "20px 16px 12px" }}>
        <p style={{ color: "#fff", fontSize: 15, fontWeight: 700, margin: "0 0 12px" }}>
          Field Agents
          <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, fontWeight: 400, marginLeft: 8 }}>
            ({agents.length})
          </span>
        </p>
        <input
          placeholder="Search agents..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: "100%", boxSizing: "border-box", padding: "10px 12px",
            background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10, color: "#fff", fontSize: 13, outline: "none",
            fontFamily: "Inter, sans-serif",
          }}
        />
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "0 12px 12px" }}>
        {filtered.map(agent => {
          const status = getAgentStatus(agent.timestamp);
          const cfg = STATUS_CONFIG[status];
          const isSelected = selectedAgent?.id === agent.id;
          return (
            <div
              key={agent.id}
              onClick={() => onSelectAgent(agent)}
              style={{
                padding: "12px", borderRadius: 12, marginBottom: 8, cursor: "pointer",
                background: isSelected ? "rgba(102,126,234,0.2)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${isSelected ? "rgba(102,126,234,0.5)" : "rgba(255,255,255,0.06)"}`,
                transition: "all 0.15s",
              }}
              onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
              onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: `linear-gradient(135deg, ${cfg.color}40, ${cfg.color}20)`,
                    border: `2px solid ${cfg.color}60`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: cfg.color, fontWeight: 800, fontSize: 13,
                  }}>
                    {(agent.fullName || agent.email || "?").substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p style={{ color: "#fff", fontSize: 13, fontWeight: 600, margin: 0 }}>
                      {agent.fullName || agent.email?.split("@")[0] || "Agent"}
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.color,
                        boxShadow: `0 0 4px ${cfg.color}` }} />
                      <span style={{ color: cfg.color, fontSize: 11, fontWeight: 600 }}>{cfg.label}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <span style={{
                  padding: "2px 8px", borderRadius: 6,
                  background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", fontSize: 11,
                }}>
                  🕐 {timeAgo(agent.timestamp)}
                </span>
                {agent.battery != null && (
                  <span style={{
                    padding: "2px 8px", borderRadius: 6,
                    background: agent.battery > 30 ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                    color: agent.battery > 30 ? "#22c55e" : "#ef4444", fontSize: 11,
                  }}>
                    🔋 {agent.battery}%
                  </span>
                )}
                {agent.activity && (
                  <span style={{
                    padding: "2px 8px", borderRadius: 6,
                    background: "rgba(102,126,234,0.1)", color: "#a5b4fc", fontSize: 11,
                  }}>
                    {agent.activity}
                  </span>
                )}
              </div>

              {isSelected && (
                <button
                  onClick={e => { e.stopPropagation(); onViewJourney(agent); }}
                  style={{
                    marginTop: 10, width: "100%", padding: "8px",
                    background: "linear-gradient(135deg, #667eea, #764ba2)",
                    border: "none", borderRadius: 8, color: "#fff",
                    fontSize: 12, fontWeight: 600, cursor: "pointer",
                    fontFamily: "Inter, sans-serif",
                  }}
                >
                  📅 View Journey
                </button>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "32px 0", color: "rgba(255,255,255,0.3)" }}>
            No agents found
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main LiveMapPage ─────────────────────────────────────────────────────────
const LiveMapPage = ({ onViewJourney }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const [agents, setAgents] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [showClients, setShowClients] = useState(true);

  const token = localStorage.getItem("token");

  const fetchData = useCallback(async () => {
    try {
      const [agentsRes, clientsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/admin/team-locations`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/admin/clients?limit=5000`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const agentsData = await agentsRes.json();
      const clientsData = await clientsRes.json();
      setAgents(agentsData.agents || []);
      setClients(clientsData.clients || []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("LiveMap fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Init map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current || !window.L) return;
    const L = window.L;
    const map = L.map(mapRef.current, {
      center: [20.5937, 78.9629],
      zoom: 5,
      zoomControl: false,
    });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: "abcd", maxZoom: 19,
    }).addTo(map);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    mapInstanceRef.current = map;
  }, []);

  // Render markers whenever data changes
  useEffect(() => {
    const L = window.L;
    if (!mapInstanceRef.current || !L) return;
    const map = mapInstanceRef.current;

    // Clear old markers
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    const bounds = [];

    // Agent markers
    agents.forEach(agent => {
      if (!agent.latitude || !agent.longitude) return;
      const status = getAgentStatus(agent.timestamp);
      const cfg = STATUS_CONFIG[status];
      const icon = getAgentDivIcon(status);
      const marker = L.marker([agent.latitude, agent.longitude], { icon })
        .addTo(map)
        .bindPopup(`
          <div style="font-family: Inter, sans-serif; min-width: 200px; padding: 4px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
              <div style="width:36px;height:36px;border-radius:8px;background:linear-gradient(135deg,${cfg.color}40,${cfg.color}20);border:2px solid ${cfg.color};display:flex;align-items:center;justify-content:center;color:${cfg.color};font-weight:800;font-size:13px;">
                ${(agent.fullName || agent.email || "?").substring(0, 2).toUpperCase()}
              </div>
              <div>
                <strong style="font-size:14px;color:#1e293b;">${agent.fullName || agent.email?.split("@")[0] || "Agent"}</strong><br>
                <span style="font-size:11px;color:${cfg.color};font-weight:600;">● ${cfg.label}</span>
              </div>
            </div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px;">
              <span style="padding:3px 8px;border-radius:6px;background:#f1f5f9;font-size:11px;color:#475569;">🕐 ${timeAgo(agent.timestamp)}</span>
              ${agent.battery != null ? `<span style="padding:3px 8px;border-radius:6px;background:${agent.battery > 30 ? "#dcfce7" : "#fee2e2"};font-size:11px;color:${agent.battery > 30 ? "#16a34a" : "#dc2626"};">🔋 ${agent.battery}%</span>` : ""}
              ${agent.activity ? `<span style="padding:3px 8px;border-radius:6px;background:#ede9fe;font-size:11px;color:#7c3aed;">${agent.activity}</span>` : ""}
            </div>
            <div style="margin-top:8px;font-size:11px;color:#94a3b8;">
              📍 ${agent.latitude?.toFixed(4)}, ${agent.longitude?.toFixed(4)}
            </div>
          </div>
        `, { maxWidth: 260 });
      markersRef.current.push(marker);
      bounds.push([agent.latitude, agent.longitude]);
    });

    // Client markers
    if (showClients) {
      clients.forEach(client => {
        if (!client.latitude || !client.longitude) return;
        const icon = getClientDivIcon(client.latitude && client.longitude);
        const marker = L.marker([client.latitude, client.longitude], { icon })
          .addTo(map)
          .bindPopup(`
            <div style="font-family: Inter, sans-serif; padding: 4px;">
              <strong style="font-size:14px;color:#1e293b;">${client.name || "Client"}</strong><br>
              <span style="font-size:11px;padding:2px 6px;border-radius:4px;background:${client.status === "active" ? "#dcfce7" : "#f1f5f9"};color:${client.status === "active" ? "#16a34a" : "#64748b"};">${client.status || "unknown"}</span><br>
              ${client.phone ? `<span style="font-size:12px;color:#64748b;margin-top:4px;display:block;">📞 ${client.phone}</span>` : ""}
              ${client.pincode ? `<span style="font-size:12px;color:#64748b;">📍 ${client.pincode}</span>` : ""}
            </div>
          `, { maxWidth: 220 });
        markersRef.current.push(marker);
      });
    }

    if (bounds.length > 0 && agents.length > 0) {
      map.fitBounds(bounds, { padding: [60, 60] });
    }
  }, [agents, clients, showClients]);

  // Auto-refresh every 30s
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleSelectAgent = (agent) => {
    setSelectedAgent(agent);
    if (agent.latitude && agent.longitude && mapInstanceRef.current) {
      mapInstanceRef.current.setView([agent.latitude, agent.longitude], 14, { animate: true });
    }
  };

  return (
    <div style={{ position: "relative", height: "calc(100vh - 96px)", borderRadius: 20, overflow: "hidden",
      boxShadow: "0 8px 32px rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.3)" }}>

      {/* Map container */}
      <div ref={mapRef} style={{ width: "100%", height: "100%" }} />

      {/* Loading overlay */}
      {loading && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 2000,
          background: "rgba(15,23,42,0.8)", display: "flex",
          alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16,
        }}>
          <div style={{
            width: 48, height: 48, border: "4px solid rgba(102,126,234,0.3)",
            borderTopColor: "#667eea", borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }} />
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, margin: 0 }}>Loading map data...</p>
        </div>
      )}

      {/* Stats bar */}
      <StatsBar agents={agents} clients={clients} />

      {/* Legend */}
      <MapLegend />

      {/* Controls */}
      <div style={{
        position: "absolute", top: 16, left: 16, zIndex: 1000,
        display: "flex", flexDirection: "column", gap: 8,
      }}>
        <button
          onClick={fetchData}
          style={{
            padding: "10px 16px", borderRadius: 12,
            background: "rgba(15,23,42,0.88)", backdropFilter: "blur(10px)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 8,
            boxShadow: "0 4px 16px rgba(0,0,0,0.3)", fontFamily: "Inter, sans-serif",
          }}
        >
          🔄 Refresh
        </button>
        <button
          onClick={() => setShowClients(s => !s)}
          style={{
            padding: "10px 16px", borderRadius: 12,
            background: showClients ? "rgba(59,130,246,0.2)" : "rgba(15,23,42,0.88)",
            backdropFilter: "blur(10px)",
            border: `1px solid ${showClients ? "rgba(59,130,246,0.4)" : "rgba(255,255,255,0.1)"}`,
            color: showClients ? "#60a5fa" : "#fff", fontSize: 13, fontWeight: 600,
            cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
            boxShadow: "0 4px 16px rgba(0,0,0,0.3)", fontFamily: "Inter, sans-serif",
          }}
        >
          🏢 {showClients ? "Hide" : "Show"} Clients
        </button>
        {lastUpdated && (
          <div style={{
            padding: "8px 12px", borderRadius: 10,
            background: "rgba(15,23,42,0.7)", backdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "rgba(255,255,255,0.4)", fontSize: 11,
          }}>
            Updated {lastUpdated.toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* Agent Sidebar */}
      <AgentSidebar
        agents={agents}
        selectedAgent={selectedAgent}
        onSelectAgent={handleSelectAgent}
        onViewJourney={onViewJourney}
      />

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes ripple { 0% { transform: scale(0.6); opacity: 0.6; } 100% { transform: scale(2.2); opacity: 0; } }
        .custom-leaflet-div-icon { background: none; border: none; }
      `}</style>
    </div>
  );
};

export default LiveMapPage;
