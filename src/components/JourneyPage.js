import React, { useState, useEffect } from "react";

const API_BASE_URL = "https://geo-track-1.onrender.com";

function timeStr(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
}
function dateStr(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}
function duration(start, end) {
  if (!start || !end) return null;
  const mins = Math.round((new Date(end) - new Date(start)) / 60000);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

const TOKEN_COLORS = {
  location: { bg: "rgba(102,126,234,0.12)", border: "rgba(102,126,234,0.3)", dot: "#667eea", icon: "📍" },
  meeting_start: { bg: "rgba(67,233,123,0.12)", border: "rgba(67,233,123,0.3)", dot: "#43e97b", icon: "🤝" },
  meeting_end:   { bg: "rgba(240,147,251,0.12)", border: "rgba(240,147,251,0.3)", dot: "#f093fb", icon: "✅" },
  expense:       { bg: "rgba(250,112,154,0.12)", border: "rgba(250,112,154,0.3)", dot: "#fa709a", icon: "💸" },
  clock_in:      { bg: "rgba(34,197,94,0.15)",  border: "rgba(34,197,94,0.4)",   dot: "#22c55e", icon: "⏱️" },
  clock_out:     { bg: "rgba(148,163,184,0.12)", border: "rgba(148,163,184,0.3)", dot: "#94a3b8", icon: "⏹️" },
};

function EventDot({ type }) {
  const cfg = TOKEN_COLORS[type] || TOKEN_COLORS.location;
  return (
    <div style={{
      width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
      background: cfg.bg, border: `2px solid ${cfg.border}`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 18, boxShadow: `0 0 12px ${cfg.border}`,
    }}>
      {cfg.icon}
    </div>
  );
}

function TimelineLine({ color }) {
  return (
    <div style={{
      width: 2, flexShrink: 0, margin: "0 19px",
      background: `linear-gradient(to bottom, ${color}60, ${color}20)`,
      minHeight: 32,
    }} />
  );
}

function StatBadge({ label, value, color }) {
  return (
    <div style={{
      padding: "12px 20px", borderRadius: 16,
      background: "#ecf0f3",
      boxShadow: "6px 6px 12px rgba(163,177,198,0.5), -6px -6px 12px rgba(255,255,255,0.8)",
      border: "1px solid rgba(255,255,255,0.8)",
      textAlign: "center", minWidth: 100,
    }}>
      <p style={{ color, fontSize: 22, fontWeight: 800, margin: "0 0 2px" }}>{value}</p>
      <p style={{ color: "#94a3b8", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.6, margin: 0 }}>{label}</p>
    </div>
  );
}

const JourneyPage = ({ selectedUser, onBack }) => {
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [journey, setJourney] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!selectedUser?.id) return;
    fetchJourney();
    // eslint-disable-next-line
  }, [selectedUser, date]);

  const fetchJourney = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${API_BASE_URL}/admin/users/${selectedUser.id}/unified-journey?startDate=${date}&endDate=${date}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error("Failed to fetch journey");
      const data = await res.json();
      setJourney(data);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  // Build unified timeline events
  const buildTimeline = () => {
    if (!journey) return [];
    const events = [];

    const logs = journey.locationLogs || [];
    const meetings = journey.meetings || [];
    const expenses = journey.expenses || [];

    // Clock-in = first location log
    if (logs.length > 0) {
      events.push({ type: "clock_in", ts: logs[0].timestamp, data: logs[0] });
    }

    // Location stops (sample every 5th to avoid clutter)
    const stopSample = logs.filter((_, i) => i > 0 && i < logs.length - 1 && i % 5 === 0);
    stopSample.forEach(log => {
      events.push({ type: "location", ts: log.timestamp, data: log });
    });

    // Meeting start & end events
    meetings.forEach(m => {
      if (m.start_time) events.push({ type: "meeting_start", ts: m.start_time, data: m });
      if (m.end_time)   events.push({ type: "meeting_end",   ts: m.end_time,   data: m });
    });

    // Expenses
    expenses.forEach(exp => {
      const ts = exp.travelDate ? new Date(Number(exp.travelDate)).toISOString() : exp.createdAt;
      events.push({ type: "expense", ts, data: exp });
    });

    // Clock-out = last location log
    if (logs.length > 1) {
      events.push({ type: "clock_out", ts: logs[logs.length - 1].timestamp, data: logs[logs.length - 1] });
    }

    // Sort chronologically
    return events.sort((a, b) => new Date(a.ts) - new Date(b.ts));
  };

  const timeline = buildTimeline();
  const meetings = journey?.meetings || [];
  const expenses = journey?.expenses || [];
  const logs = journey?.locationLogs || [];

  const clockIn  = logs[0]?.timestamp;
  const clockOut = logs[logs.length - 1]?.timestamp;
  const totalDuration = clockIn && clockOut ? duration(clockIn, clockOut) : null;
  const completedMeetings = meetings.filter(m => m.status === "COMPLETED" || m.status === "completed").length;
  const totalExpenseAmt = expenses.reduce((s, e) => s + (Number(e.amountSpent) || 0), 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <button
            onClick={onBack}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "none", border: "none", cursor: "pointer",
              color: "#667eea", fontSize: 13, fontWeight: 600, marginBottom: 6,
              padding: 0, fontFamily: "Inter, sans-serif",
            }}
          >
            ← Back to Team
          </button>
          <h2 style={{ color: "#1e293b", fontSize: 22, fontWeight: 800, margin: 0 }}>
            Journey Timeline
          </h2>
          <p style={{ color: "#64748b", fontSize: 14, margin: "4px 0 0" }}>
            {selectedUser?.full_name || selectedUser?.email} • {dateStr(date + "T00:00:00")}
          </p>
        </div>

        {/* Date picker */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <input
            type="date"
            value={date}
            max={new Date().toISOString().split("T")[0]}
            onChange={e => setDate(e.target.value)}
            style={{
              padding: "10px 16px", borderRadius: 12,
              background: "#ecf0f3",
              boxShadow: "inset 4px 4px 8px #c5c8cf, inset -4px -4px 8px #ffffff",
              border: "none", outline: "none",
              color: "#1e293b", fontSize: 14, fontWeight: 600,
              fontFamily: "Inter, sans-serif", cursor: "pointer",
            }}
          />
          <button
            onClick={fetchJourney}
            style={{
              padding: "10px 20px", borderRadius: 12,
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              border: "none", color: "#fff", fontWeight: 700, fontSize: 14,
              cursor: "pointer", fontFamily: "Inter, sans-serif",
              boxShadow: "4px 4px 12px rgba(102,126,234,0.4)",
            }}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      {journey && (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <StatBadge label="Clock In"   value={clockIn ? timeStr(clockIn) : "—"} color="#22c55e" />
          <StatBadge label="Clock Out"  value={clockOut ? timeStr(clockOut) : "—"} color="#94a3b8" />
          <StatBadge label="Duration"   value={totalDuration || "—"} color="#667eea" />
          <StatBadge label="Meetings"   value={completedMeetings} color="#43e97b" />
          <StatBadge label="Locations"  value={logs.length} color="#4facfe" />
          <StatBadge label="Expenses"   value={`₹${totalExpenseAmt.toLocaleString()}`} color="#fa709a" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          padding: "16px 20px", borderRadius: 16,
          background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
          color: "#ef4444", fontSize: 14,
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{
          padding: 48, borderRadius: 20, textAlign: "center",
          background: "#ecf0f3",
          boxShadow: "6px 6px 12px rgba(163,177,198,0.5), -6px -6px 12px rgba(255,255,255,0.8)",
        }}>
          <div style={{
            width: 40, height: 40, border: "4px solid rgba(102,126,234,0.3)",
            borderTopColor: "#667eea", borderRadius: "50%",
            animation: "spin 0.8s linear infinite", margin: "0 auto 16px",
          }} />
          <p style={{ color: "#64748b", margin: 0 }}>Loading journey for {dateStr(date + "T00:00:00")}...</p>
        </div>
      )}

      {/* No data */}
      {!loading && journey && timeline.length === 0 && (
        <div style={{
          padding: 48, borderRadius: 20, textAlign: "center",
          background: "#ecf0f3",
          boxShadow: "6px 6px 12px rgba(163,177,198,0.5), -6px -6px 12px rgba(255,255,255,0.8)",
        }}>
          <p style={{ fontSize: 40, margin: "0 0 12px" }}>📭</p>
          <h3 style={{ color: "#1e293b", fontWeight: 700, margin: "0 0 8px" }}>No activity on this date</h3>
          <p style={{ color: "#64748b", margin: 0 }}>The agent had no recorded location data for {dateStr(date + "T00:00:00")}.</p>
        </div>
      )}

      {/* Timeline */}
      {!loading && timeline.length > 0 && (
        <div style={{
          padding: "24px", borderRadius: 20,
          background: "#ecf0f3",
          boxShadow: "6px 6px 12px rgba(163,177,198,0.5), -6px -6px 12px rgba(255,255,255,0.8)",
        }}>
          <h3 style={{ color: "#1e293b", fontWeight: 700, fontSize: 15, margin: "0 0 24px", display: "flex", alignItems: "center", gap: 8 }}>
            📋 Daily Timeline
            <span style={{ color: "#94a3b8", fontSize: 12, fontWeight: 400 }}>{timeline.length} events</span>
          </h3>

          <div style={{ display: "flex", flexDirection: "column" }}>
            {timeline.map((event, idx) => {
              const cfg = TOKEN_COLORS[event.type] || TOKEN_COLORS.location;
              const isLast = idx === timeline.length - 1;

              // Render content per event type
              let content = null;

              if (event.type === "clock_in") {
                content = (
                  <div>
                    <p style={{ color: "#1e293b", fontWeight: 700, fontSize: 14, margin: "0 0 4px" }}>🟢 Clocked In</p>
                    <p style={{ color: "#64748b", fontSize: 12, margin: 0 }}>
                      {timeStr(event.ts)} • {event.data.pincode ? `Area: ${event.data.pincode}` : "GPS active"}
                      {event.data.battery != null && ` • 🔋 ${event.data.battery}%`}
                    </p>
                  </div>
                );
              } else if (event.type === "clock_out") {
                content = (
                  <div>
                    <p style={{ color: "#1e293b", fontWeight: 700, fontSize: 14, margin: "0 0 4px" }}>⏹️ Clocked Out</p>
                    <p style={{ color: "#64748b", fontSize: 12, margin: 0 }}>
                      {timeStr(event.ts)} • Total time: {totalDuration || "N/A"}
                      {event.data.battery != null && ` • 🔋 ${event.data.battery}%`}
                    </p>
                  </div>
                );
              } else if (event.type === "location") {
                content = (
                  <div>
                    <p style={{ color: "#1e293b", fontWeight: 600, fontSize: 13, margin: "0 0 2px" }}>
                      Location Update
                    </p>
                    <p style={{ color: "#94a3b8", fontSize: 11, margin: 0 }}>
                      {timeStr(event.ts)}
                      {event.data.pincode && ` • ${event.data.pincode}`}
                      {event.data.activity && ` • ${event.data.activity}`}
                      {event.data.latitude && ` • ${Number(event.data.latitude).toFixed(4)}, ${Number(event.data.longitude).toFixed(4)}`}
                    </p>
                  </div>
                );
              } else if (event.type === "meeting_start") {
                const m = event.data;
                content = (
                  <div style={{
                    padding: "12px 16px", borderRadius: 12,
                    background: "rgba(67,233,123,0.08)", border: "1px solid rgba(67,233,123,0.2)",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <p style={{ color: "#1e293b", fontWeight: 700, fontSize: 14, margin: 0 }}>
                        🤝 Meeting Started — {m.client_name || m.clientName || "Client"}
                      </p>
                      <span style={{
                        padding: "2px 10px", borderRadius: 20,
                        background: "rgba(67,233,123,0.2)", color: "#43e97b",
                        fontSize: 11, fontWeight: 700,
                      }}>
                        {m.status || "IN PROGRESS"}
                      </span>
                    </div>
                    <p style={{ color: "#64748b", fontSize: 12, margin: "0 0 4px" }}>
                      🕐 {timeStr(m.start_time || m.startTime)}
                      {m.start_latitude && ` • 📍 ${Number(m.start_latitude).toFixed(4)}, ${Number(m.start_longitude).toFixed(4)}`}
                    </p>
                    {m.client_address && <p style={{ color: "#94a3b8", fontSize: 11, margin: 0 }}>{m.client_address}</p>}
                    {m.start_latitude && m.start_longitude && (
                      <a href={`https://www.google.com/maps?q=${m.start_latitude},${m.start_longitude}`}
                        target="_blank" rel="noopener noreferrer"
                        style={{ color: "#667eea", fontSize: 12, textDecoration: "none", display: "inline-block", marginTop: 4 }}>
                        View on Maps →
                      </a>
                    )}
                  </div>
                );
              } else if (event.type === "meeting_end") {
                const m = event.data;
                const dur = duration(m.start_time || m.startTime, m.end_time || m.endTime);
                content = (
                  <div style={{
                    padding: "12px 16px", borderRadius: 12,
                    background: "rgba(240,147,251,0.08)", border: "1px solid rgba(240,147,251,0.2)",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <p style={{ color: "#1e293b", fontWeight: 700, fontSize: 14, margin: 0 }}>
                        ✅ Meeting Ended — {m.client_name || m.clientName || "Client"}
                      </p>
                      {dur && (
                        <span style={{
                          padding: "2px 10px", borderRadius: 20,
                          background: "rgba(102,126,234,0.15)", color: "#667eea",
                          fontSize: 11, fontWeight: 700,
                        }}>
                          ⏱ {dur}
                        </span>
                      )}
                    </div>
                    <p style={{ color: "#64748b", fontSize: 12, margin: "0 0 4px" }}>
                      🕐 {timeStr(m.end_time || m.endTime)}
                      {m.end_latitude && ` • 📍 ${Number(m.end_latitude).toFixed(4)}, ${Number(m.end_longitude).toFixed(4)}`}
                    </p>
                    {m.comments && <p style={{ color: "#94a3b8", fontSize: 12, margin: "4px 0 0", fontStyle: "italic" }}>"{m.comments}"</p>}
                    {m.end_latitude && m.end_longitude && (
                      <a href={`https://www.google.com/maps?q=${m.end_latitude},${m.end_longitude}`}
                        target="_blank" rel="noopener noreferrer"
                        style={{ color: "#667eea", fontSize: 12, textDecoration: "none", display: "inline-block", marginTop: 4 }}>
                        View on Maps →
                      </a>
                    )}
                  </div>
                );
              } else if (event.type === "expense") {
                const exp = event.data;
                content = (
                  <div style={{
                    padding: "12px 16px", borderRadius: 12,
                    background: "rgba(250,112,154,0.08)", border: "1px solid rgba(250,112,154,0.2)",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                      <p style={{ color: "#1e293b", fontWeight: 700, fontSize: 14, margin: 0 }}>
                        💸 {exp.tripName || exp.trip_name || "Expense"}
                      </p>
                      <span style={{ color: "#43e97b", fontWeight: 800, fontSize: 15 }}>
                        ₹{Number(exp.amountSpent).toLocaleString()}
                      </span>
                    </div>
                    <p style={{ color: "#64748b", fontSize: 12, margin: 0 }}>
                      {exp.transportMode || exp.transport_mode || "Transport"}
                      {exp.distanceKm && ` • ${exp.distanceKm} km`}
                      {exp.startLocation && ` • ${exp.startLocation} → ${exp.endLocation}`}
                    </p>
                  </div>
                );
              }

              return (
                <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: 0 }}>
                  {/* Left: dot + line */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginRight: 16, width: 40 }}>
                    <EventDot type={event.type} />
                    {!isLast && <TimelineLine color={cfg.dot} />}
                  </div>

                  {/* Right: time + content */}
                  <div style={{ flex: 1, paddingTop: 8, paddingBottom: isLast ? 0 : 24 }}>
                    <p style={{ color: "#94a3b8", fontSize: 11, fontWeight: 600, margin: "0 0 6px", textTransform: "uppercase", letterSpacing: 0.6 }}>
                      {timeStr(event.ts)}
                    </p>
                    {content}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Meetings Summary Table */}
      {!loading && meetings.length > 0 && (
        <div style={{
          padding: "24px", borderRadius: 20,
          background: "#ecf0f3",
          boxShadow: "6px 6px 12px rgba(163,177,198,0.5), -6px -6px 12px rgba(255,255,255,0.8)",
        }}>
          <h3 style={{ color: "#1e293b", fontWeight: 700, fontSize: 15, margin: "0 0 16px" }}>
            🤝 Meetings ({meetings.length})
          </h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid rgba(148,163,184,0.2)" }}>
                  {["Client", "Status", "Started", "Ended", "Duration", "Location"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "8px 12px", color: "#94a3b8", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {meetings.map((m, i) => {
                  const dur = duration(m.start_time || m.startTime, m.end_time || m.endTime);
                  const isCompleted = (m.status || "").toUpperCase() === "COMPLETED";
                  return (
                    <tr key={m.id || i} style={{ borderBottom: "1px solid rgba(148,163,184,0.1)" }}>
                      <td style={{ padding: "12px", fontSize: 13, fontWeight: 600, color: "#1e293b" }}>
                        {m.client_name || m.clientName || "—"}
                      </td>
                      <td style={{ padding: "12px" }}>
                        <span style={{
                          padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                          background: isCompleted ? "rgba(67,233,123,0.15)" : "rgba(79,172,254,0.15)",
                          color: isCompleted ? "#43e97b" : "#4facfe",
                        }}>
                          {m.status || "—"}
                        </span>
                      </td>
                      <td style={{ padding: "12px", fontSize: 12, color: "#64748b" }}>{timeStr(m.start_time || m.startTime)}</td>
                      <td style={{ padding: "12px", fontSize: 12, color: "#64748b" }}>{timeStr(m.end_time || m.endTime)}</td>
                      <td style={{ padding: "12px", fontSize: 12, color: "#667eea", fontWeight: 600 }}>{dur || "—"}</td>
                      <td style={{ padding: "12px" }}>
                        {m.start_latitude ? (
                          <a href={`https://maps.google.com?q=${m.start_latitude},${m.start_longitude}`}
                            target="_blank" rel="noopener noreferrer"
                            style={{ color: "#667eea", fontSize: 12, textDecoration: "none" }}>
                            📍 View
                          </a>
                        ) : <span style={{ color: "#94a3b8", fontSize: 12 }}>No GPS</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default JourneyPage;
