import React from "react";
import {
  RefreshCw,
  Clock,
  MapPin,
  Calendar,
  MessageSquare,
  Paperclip,
  ArrowLeft,
  CheckCircle,
  Activity,
  User,
} from "lucide-react";

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

const UserMeetingsPage = ({
  selectedUser,
  meetings,
  pagination,
  onBack,
  onRefresh,
  onPageChange,
}) => {
  const gotoPage = (p) => {
    if (p < 1 || p > (pagination.totalPages || 1)) return;
    onPageChange(p);
  };

  // Calculate stats
  const completedCount = meetings.filter(m => m.status === "COMPLETED").length;
  const inProgressCount = meetings.filter(m => m.status === "IN_PROGRESS").length;
  const totalDuration = meetings.reduce((sum, m) => {
    const start = m.startTime ? new Date(m.startTime) : null;
    const end = m.endTime ? new Date(m.endTime) : null;
    return sum + (start && end ? Math.round((end - start) / 60000) : 0);
  }, 0);
  const avgDuration = meetings.length > 0 ? Math.round(totalDuration / meetings.length) : 0;

  // Pagination with first and last
  const pages = [];
  const startPage = Math.max(1, pagination.page - 1);
  const endPage = Math.min(pagination.totalPages, pagination.page + 1);
  
  if (startPage > 1) pages.push(1);
  if (startPage > 2) pages.push('...');
  for (let i = startPage; i <= endPage; i++) pages.push(i);
  if (endPage < pagination.totalPages - 1) pages.push('...');
  if (endPage < pagination.totalPages) pages.push(pagination.totalPages);

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
            Meeting Logs
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
                Total Meetings
              </p>
              <h3 className="text-2xl font-bold" style={{ color: '#1e293b' }}>
                {pagination.total || meetings.length}
              </h3>
            </div>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                boxShadow: '3px 3px 6px rgba(0,0,0,0.15)',
              }}
            >
              <Calendar className="w-5 h-5 text-white" />
            </div>
          </div>
        </NeumorphicCard>

        <NeumorphicCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#94a3b8' }}>
                Completed
              </p>
              <h3 className="text-2xl font-bold" style={{ color: '#1e293b' }}>
                {completedCount}
              </h3>
            </div>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                boxShadow: '3px 3px 6px rgba(0,0,0,0.15)',
              }}
            >
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
          </div>
        </NeumorphicCard>

        <NeumorphicCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#94a3b8' }}>
                In Progress
              </p>
              <h3 className="text-2xl font-bold" style={{ color: '#1e293b' }}>
                {inProgressCount}
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
                Avg Duration
              </p>
              <h3 className="text-2xl font-bold" style={{ color: '#1e293b' }}>
                {avgDuration}m
              </h3>
            </div>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                boxShadow: '3px 3px 6px rgba(0,0,0,0.15)',
              }}
            >
              <Clock className="w-5 h-5 text-white" />
            </div>
          </div>
        </NeumorphicCard>
      </div>

      {/* Meetings List */}
      {meetings.length === 0 ? (
        <NeumorphicCard>
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 mx-auto mb-4" style={{ color: '#cbd5e1' }} />
            <h3 className="text-xl font-semibold mb-2" style={{ color: '#1e293b' }}>No meetings found</h3>
            <p style={{ color: '#64748b' }}>This user hasn't recorded any meetings yet</p>
          </div>
        </NeumorphicCard>
      ) : (
        <div className="space-y-4">
          {meetings.map((meeting) => {
            const startLat = Number(meeting.startLatitude);
            const startLng = Number(meeting.startLongitude);
            const endLat = Number(meeting.endLatitude);
            const endLng = Number(meeting.endLongitude);

            const startTime = meeting.startTime ? new Date(meeting.startTime) : null;
            const endTime = meeting.endTime ? new Date(meeting.endTime) : null;
            const duration = startTime && endTime ? Math.round((endTime - startTime) / 60000) : null;

            return (
              <NeumorphicCard key={meeting.id} className="hover:shadow-xl transition-all duration-300">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{
                        background: meeting.status === "COMPLETED" 
                          ? 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
                          : 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                        boxShadow: '3px 3px 6px rgba(0,0,0,0.15)',
                      }}
                    >
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold" style={{ color: '#1e293b' }}>
                        {meeting.clientName || "Unknown Client"}
                      </h3>
                      <span
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold"
                        style={{
                          background: meeting.status === "COMPLETED" 
                            ? 'rgba(67, 233, 123, 0.2)' 
                            : 'rgba(79, 172, 254, 0.2)',
                          color: meeting.status === "COMPLETED" ? '#43e97b' : '#4facfe',
                        }}
                      >
                        {meeting.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Time Info */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="flex items-start gap-2">
                    <Clock className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#667eea' }} />
                    <div>
                      <p className="text-xs font-semibold" style={{ color: '#94a3b8' }}>Started</p>
                      <p className="text-sm" style={{ color: '#1e293b' }}>
                        {startTime ? startTime.toLocaleString() : "-"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Clock className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#43e97b' }} />
                    <div>
                      <p className="text-xs font-semibold" style={{ color: '#94a3b8' }}>Ended</p>
                      <p className="text-sm" style={{ color: '#1e293b' }}>
                        {endTime ? endTime.toLocaleString() : "-"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Duration */}
                {duration !== null && (
                  <div className="flex items-center gap-2 mb-4 p-3 rounded-xl" style={{ background: 'rgba(102, 126, 234, 0.1)' }}>
                    <Calendar className="w-4 h-4" style={{ color: '#667eea' }} />
                    <span className="text-sm font-semibold" style={{ color: '#667eea' }}>
                      Duration: {duration} minutes
                    </span>
                  </div>
                )}

                {/* Location Links */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-3 rounded-xl" style={{ background: 'rgba(67, 233, 123, 0.1)' }}>
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin className="w-4 h-4" style={{ color: '#43e97b' }} />
                      <p className="text-xs font-medium" style={{ color: '#43e97b' }}>Start Location</p>
                    </div>
                    {isFinite(startLat) && isFinite(startLng) ? (
                      <a
                        href={`https://www.google.com/maps?q=${startLat},${startLng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium hover:underline"
                        style={{ color: '#1e293b' }}
                      >
                        {startLat.toFixed(4)}, {startLng.toFixed(4)} →
                      </a>
                    ) : (
                      <span className="text-xs" style={{ color: '#94a3b8' }}>No data</span>
                    )}
                  </div>

                  <div className="p-3 rounded-xl" style={{ background: 'rgba(240, 147, 251, 0.1)' }}>
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin className="w-4 h-4" style={{ color: '#f093fb' }} />
                      <p className="text-xs font-medium" style={{ color: '#f093fb' }}>End Location</p>
                    </div>
                    {isFinite(endLat) && isFinite(endLng) ? (
                      <a
                        href={`https://www.google.com/maps?q=${endLat},${endLng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium hover:underline"
                        style={{ color: '#1e293b' }}
                      >
                        {endLat.toFixed(4)}, {endLng.toFixed(4)} →
                      </a>
                    ) : (
                      <span className="text-xs" style={{ color: '#94a3b8' }}>No data</span>
                    )}
                  </div>
                </div>

                {/* Comments */}
                {meeting.comments && (
                  <div className="flex items-start gap-2 mb-3 p-3 rounded-xl" style={{ background: 'rgba(148, 163, 184, 0.1)' }}>
                    <MessageSquare className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#64748b' }} />
                    <p className="text-sm" style={{ color: '#1e293b' }}>{meeting.comments}</p>
                  </div>
                )}

                {/* Attachments */}
                {meeting.attachments && meeting.attachments.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Paperclip className="w-4 h-4" style={{ color: '#94a3b8' }} />
                    <div className="text-sm" style={{ color: '#64748b' }}>
                      {meeting.attachments.map((a, idx) => (
                        <a
                          key={idx}
                          href={a}
                          target="_blank"
                          rel="noreferrer"
                          className="underline mr-2 font-medium"
                          style={{ color: '#667eea' }}
                        >
                          Attachment {idx + 1}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Client Address */}
                {meeting.clientAddress && (
                  <div className="mt-3 text-xs" style={{ color: '#64748b' }}>
                    Address: {meeting.clientAddress}
                  </div>
                )}
              </NeumorphicCard>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <NeumorphicCard>
          <div className="flex items-center justify-between">
            <p className="text-sm" style={{ color: '#64748b' }}>
              Page <span className="font-semibold" style={{ color: '#1e293b' }}>{pagination.page}</span> of{" "}
              <span className="font-semibold" style={{ color: '#1e293b' }}>{pagination.totalPages}</span>
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => gotoPage(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="px-4 py-2 rounded-xl font-semibold text-sm transition-all hover:scale-105 disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  background: '#ecf0f3',
                  boxShadow: '3px 3px 6px rgba(163,177,198,0.4), -3px -3px 6px rgba(255,255,255, 0.8)',
                  color: '#667eea',
                }}
              >
                Previous
              </button>
              {pages.map((p, idx) => (
                p === '...' ? (
                  <span key={`ellipsis-${idx}`} className="px-2 py-2 text-sm" style={{ color: '#94a3b8' }}>...</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => gotoPage(p)}
                    className="px-4 py-2 rounded-xl font-semibold text-sm transition-all hover:scale-105"
                    style={
                      p === pagination.page
                        ? {
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                            boxShadow: '4px 4px 8px rgba(102, 126, 234, 0.4)',
                          }
                        : {
                            background: '#ecf0f3',
                            boxShadow: '3px 3px 6px rgba(163,177,198,0.4), -3px -3px 6px rgba(255,255,255, 0.8)',
                            color: '#667eea',
                          }
                    }
                  >
                    {p}
                  </button>
                )
              ))}
              <button
                onClick={() => gotoPage(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="px-4 py-2 rounded-xl font-semibold text-sm transition-all hover:scale-105 disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  background: '#ecf0f3',
                  boxShadow: '3px 3px 6px rgba(163,177,198,0.4), -3px -3px 6px rgba(255,255,255, 0.8)',
                  color: '#667eea',
                }}
              >
                Next
              </button>
            </div>
          </div>
        </NeumorphicCard>
      )}
    </div>
  );
};

export default UserMeetingsPage;