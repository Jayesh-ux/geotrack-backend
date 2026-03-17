import React from "react";
import { RefreshCw, MapPin, ArrowLeft, Battery, Activity, Target } from "lucide-react";

const NeumorphicCard = ({ children, className = "" }) => (
  <div
    className={`p-5 rounded-2xl ${className}`}
    style={{
      background: '#ecf0f3',
      boxShadow: '6px 6px 12px rgba(163,177,198,0.6), -6px -6px 12px rgba(255,255,255, 0.5)',
      border: '1px solid rgba(255,255,255,0.8)',
    }}
  >
    {children}
  </div>
);

const UserLogsPage = ({ selectedUser, locationLogs, onBack, onRefresh }) => {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button 
            onClick={onBack}
            className="flex items-center gap-2 mb-2 text-sm font-semibold transition-all hover:scale-105"
            style={{ color: '#667eea' }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Users
          </button>
          <h2 className="text-2xl font-bold" style={{ color: '#1e293b' }}>
            Location Logs
            {selectedUser ? ` - ${selectedUser.full_name || selectedUser.email}` : ""}
          </h2>
          {selectedUser && (
            <p className="text-sm" style={{ color: '#64748b' }}>
              User ID: {selectedUser.id?.substring(0, 12)}...
            </p>
          )}
        </div>
        <button
          onClick={onRefresh}
          className="px-5 py-3 rounded-xl font-semibold text-sm transition-all hover:scale-105 flex items-center gap-2"
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            boxShadow: '4px 4px 8px rgba(102, 126, 234, 0.4)',
          }}
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <NeumorphicCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#94a3b8' }}>
                Total Logs
              </p>
              <h3 className="text-2xl font-bold" style={{ color: '#1e293b' }}>
                {locationLogs.length}
              </h3>
            </div>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                boxShadow: '3px 3px 6px rgba(0,0,0,0.15)',
              }}
            >
              <MapPin className="w-5 h-5 text-white" />
            </div>
          </div>
        </NeumorphicCard>

        <NeumorphicCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#94a3b8' }}>
                With Pincode
              </p>
              <h3 className="text-2xl font-bold" style={{ color: '#1e293b' }}>
                {locationLogs.filter(log => log.pincode).length}
              </h3>
            </div>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                boxShadow: '3px 3px 6px rgba(0,0,0,0.15)',
              }}
            >
              <Target className="w-5 h-5 text-white" />
            </div>
          </div>
        </NeumorphicCard>

        <NeumorphicCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#94a3b8' }}>
                Avg Accuracy
              </p>
              <h3 className="text-2xl font-bold" style={{ color: '#1e293b' }}>
                {locationLogs.length > 0 
                  ? Math.round(locationLogs.reduce((sum, log) => sum + (log.accuracy || 0), 0) / locationLogs.length)
                  : 0}m
              </h3>
            </div>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                boxShadow: '3px 3px 6px rgba(0,0,0,0.15)',
              }}
            >
              <Activity className="w-5 h-5 text-white" />
            </div>
          </div>
        </NeumorphicCard>

        <NeumorphicCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#94a3b8' }}>
                Avg Battery
              </p>
              <h3 className="text-2xl font-bold" style={{ color: '#1e293b' }}>
                {locationLogs.length > 0 
                  ? Math.round(locationLogs.reduce((sum, log) => sum + (log.battery || 0), 0) / locationLogs.length)
                  : 0}%
              </h3>
            </div>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                boxShadow: '3px 3px 6px rgba(0,0,0,0.15)',
              }}
            >
              <Battery className="w-5 h-5 text-white" />
            </div>
          </div>
        </NeumorphicCard>
      </div>

      {/* Logs Table */}
      <NeumorphicCard>
        {locationLogs.length === 0 ? (
          <div className="text-center py-12">
            <MapPin className="w-16 h-16 mx-auto mb-4" style={{ color: '#cbd5e1' }} />
            <h3 className="text-xl font-semibold mb-2" style={{ color: '#1e293b' }}>No location logs found</h3>
            <p style={{ color: '#64748b' }}>This user hasn't recorded any location data yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto" style={{ maxHeight: '600px' }}>
            <table className="w-full">
              <thead style={{ position: 'sticky', top: 0, background: '#ecf0f3', zIndex: 10 }}>
                <tr style={{ borderBottom: '2px solid rgba(148, 163, 184, 0.2)' }}>
                  <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide" style={{ color: '#94a3b8' }}>
                    Time
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide" style={{ color: '#94a3b8' }}>
                    Coordinates
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide" style={{ color: '#94a3b8' }}>
                    Pincode
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide" style={{ color: '#94a3b8' }}>
                    Activity
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide" style={{ color: '#94a3b8' }}>
                    Accuracy
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide" style={{ color: '#94a3b8' }}>
                    Battery
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide" style={{ color: '#94a3b8' }}>
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody>
                {locationLogs.map((log, idx) => (
                  <tr
                    key={log.id}
                    className="hover:bg-gray-50 transition-colors"
                    style={{
                      borderBottom: idx !== locationLogs.length - 1 ? '1px solid rgba(148, 163, 184, 0.1)' : 'none'
                    }}
                  >
                    <td className="py-3 px-4 text-sm" style={{ color: '#1e293b' }}>
                      {new Date(log.timestamp).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <div className="flex flex-col gap-1">
                        <span style={{ color: '#1e293b', fontFamily: 'monospace', fontSize: '12px' }}>
                          {log.latitude?.toFixed(6)}, {log.longitude?.toFixed(6)}
                        </span>
                        <a
                          href={`https://www.google.com/maps?q=${log.latitude},${log.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium hover:underline"
                          style={{ color: '#667eea' }}
                        >
                          View on Maps →
                        </a>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm" style={{ color: '#1e293b' }}>
                      {log.pincode || "-"}
                    </td>
                    <td className="py-3 px-4 text-sm" style={{ color: '#1e293b' }}>
                      {log.activity || "-"}
                    </td>
                    <td className="py-3 px-4 text-sm" style={{ color: '#1e293b' }}>
                      {log.accuracy != null ? `${log.accuracy}m` : "-"}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <span
                        className="px-2 py-1 rounded-full text-xs font-semibold"
                        style={{
                          background: log.battery >= 50 ? 'rgba(67, 233, 123, 0.2)' : log.battery >= 20 ? 'rgba(250, 112, 154, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                          color: log.battery >= 50 ? '#43e97b' : log.battery >= 20 ? '#fa709a' : '#ef4444'
                        }}
                      >
                        {log.battery != null ? `${log.battery}%` : "-"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm" style={{ color: '#64748b' }}>
                      {log.notes || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </NeumorphicCard>
    </div>
  );
};

export default UserLogsPage;