import React from "react";
import { 
  RefreshCw, 
  MapPin, 
  CheckCircle, 
  XCircle, 
  User,
  DollarSign,
  Calendar,
  Eye,
  TrendingUp
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

const StatCard = ({ title, value, subtitle, icon: Icon, gradient }) => (
  <NeumorphicCard>
    <div className="flex items-center justify-between mb-2">
      <div className="flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#94a3b8' }}>
          {title}
        </p>
        <h3 className="text-3xl font-bold" style={{ color: '#1e293b' }}>
          {value}
        </h3>
      </div>
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{
          background: gradient,
          boxShadow: '3px 3px 6px rgba(0,0,0,0.15)',
        }}
      >
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
    <p className="text-xs" style={{ color: '#64748b' }}>{subtitle}</p>
  </NeumorphicCard>
);

const UsersPage = ({
  users,
  userClockIns,
  userExpenses,
  userMeetings,
  onRefresh,
  onViewLogs,
  onViewMeetings,
  onViewExpenses,
}) => {
  const totalExpenses = Object.values(userExpenses).reduce((sum, val) => sum + (val || 0), 0);
  const clockedInCount = Object.values(userClockIns).filter((c) => c?.clocked_in).length;

  return (
    <div className="space-y-5">
      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          title="Total Users"
          value={users.length}
          subtitle="Active team members"
          icon={User}
          gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
        />
        <StatCard
          title="Clocked In"
          value={clockedInCount}
          subtitle="Currently working"
          icon={CheckCircle}
          gradient="linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
        />
        <StatCard
          title="With Location"
          value={users.filter((u) => u.pincode).length}
          subtitle="Have GPS tracking"
          icon={MapPin}
          gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
        />
        <StatCard
          title="Total Expenses"
          value={`₹${(totalExpenses / 1000).toFixed(1)}K`}
          subtitle="Cumulative spending"
          icon={DollarSign}
          gradient="linear-gradient(135deg, #fa709a 0%, #fee140 100%)"
        />
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {users.length === 0 ? (
          <div className="col-span-full">
            <NeumorphicCard>
              <div className="text-center py-12">
                <User className="w-16 h-16 mx-auto mb-4" style={{ color: '#cbd5e1' }} />
                <h3 className="text-xl font-semibold mb-2" style={{ color: '#1e293b' }}>No users found</h3>
                <p style={{ color: '#64748b' }}>Start by adding team members</p>
              </div>
            </NeumorphicCard>
          </div>
        ) : (
          users.map((user) => {
            const isOnline = userClockIns[user.id]?.clocked_in;
            const lastSeen = userClockIns[user.id]?.last_seen;
            const userExpense = userExpenses[user.id] || 0;
            const meetings = userMeetings[user.id] || { total: 0, completed: 0, inProgress: 0 };

            return (
              <NeumorphicCard key={user.id} className="hover:shadow-xl transition-all duration-300">
                {/* Header with Status */}
                <div className="mb-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="relative">
                      <div
                        className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                        style={{
                          background: isOnline 
                            ? 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
                            : 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)',
                          boxShadow: '3px 3px 6px rgba(0,0,0,0.15)',
                        }}
                      >
                        {(user.full_name || user.email || "").substring(0, 2).toUpperCase()}
                      </div>
                      {isOnline && (
                        <div 
                          className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full"
                          style={{ 
                            background: '#43e97b',
                            border: '2px solid #ecf0f3',
                          }}
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-bold mb-1 truncate" style={{ color: '#1e293b' }}>
                        {user.full_name || "No name"}
                      </h3>
                      <p className="text-xs font-mono truncate" style={{ color: '#64748b' }}>
                        {user.id?.substring(0, 12)}...
                      </p>
                    </div>
                  </div>
                </div>

                {/* Email */}
                <div className="mb-3">
                  <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#94a3b8' }}>Email</p>
                  <p className="text-sm font-medium truncate" style={{ color: '#1e293b' }}>{user.email}</p>
                </div>

                {/* Status */}
                <div className="mb-4">
                  <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#94a3b8' }}>Status</p>
                  {lastSeen ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold" style={{ color: '#1e293b' }}>Active</p>
                        <p className="text-xs truncate" style={{ color: '#64748b' }}>
                          {new Date(lastSeen).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <XCircle className="w-4 h-4" style={{ color: '#94a3b8' }} />
                      <p className="text-sm" style={{ color: '#64748b' }}>Not clocked in</p>
                    </div>
                  )}
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div 
                    className="p-3 rounded-xl"
                    style={{ 
                      background: 'rgba(102, 126, 234, 0.1)',
                      border: '1px solid rgba(102, 126, 234, 0.2)',
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="w-4 h-4" style={{ color: '#667eea' }} />
                      <p className="text-xs font-medium" style={{ color: '#667eea' }}>Meetings</p>
                    </div>
                    <p className="text-lg font-bold" style={{ color: '#1e293b' }}>{meetings.total}</p>
                    <p className="text-xs" style={{ color: '#64748b' }}>{meetings.completed} done</p>
                  </div>

                  <div 
                    className="p-3 rounded-xl"
                    style={{ 
                      background: 'rgba(67, 233, 123, 0.1)',
                      border: '1px solid rgba(67, 233, 123, 0.2)',
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <DollarSign className="w-4 h-4" style={{ color: '#43e97b' }} />
                      <p className="text-xs font-medium" style={{ color: '#43e97b' }}>Expenses</p>
                    </div>
                    <p className="text-lg font-bold" style={{ color: '#1e293b' }}>₹{userExpense.toLocaleString()}</p>
                    <p className="text-xs" style={{ color: '#64748b' }}>Total spent</p>
                  </div>
                </div>

                {/* Location */}
                {user.pincode && (
                  <div 
                    className="flex items-center gap-2 p-3 rounded-xl mb-4"
                    style={{ 
                      background: 'rgba(240, 147, 251, 0.1)',
                      border: '1px solid rgba(240, 147, 251, 0.2)',
                    }}
                  >
                    <MapPin className="w-4 h-4" style={{ color: '#f093fb' }} />
                    <div>
                      <p className="text-xs font-medium" style={{ color: '#f093fb' }}>Location</p>
                      <p className="text-sm font-semibold" style={{ color: '#1e293b' }}>Pincode: {user.pincode}</p>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => onViewLogs(user)}
                    className="px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:scale-105"
                    style={{
                      background: '#ecf0f3',
                      boxShadow: '3px 3px 6px rgba(163,177,198,0.4), -3px -3px 6px rgba(255,255,255, 0.8)',
                      color: '#667eea',
                    }}
                  >
                    <Eye className="w-3 h-3 mx-auto mb-1" />
                    Logs
                  </button>
                  <button
                    onClick={() => onViewMeetings(user)}
                    className="px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:scale-105"
                    style={{
                      background: '#ecf0f3',
                      boxShadow: '3px 3px 6px rgba(163,177,198,0.4), -3px -3px 6px rgba(255,255,255, 0.8)',
                      color: '#f093fb',
                    }}
                  >
                    <Calendar className="w-3 h-3 mx-auto mb-1" />
                    Meet
                  </button>
                  <button
                    onClick={() => onViewExpenses(user)}
                    className="px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:scale-105"
                    style={{
                      background: '#ecf0f3',
                      boxShadow: '3px 3px 6px rgba(163,177,198,0.4), -3px -3px 6px rgba(255,255,255, 0.8)',
                      color: '#43e97b',
                    }}
                  >
                    <TrendingUp className="w-3 h-3 mx-auto mb-1" />
                    Expense
                  </button>
                </div>
              </NeumorphicCard>
            );
          })
        )}
      </div>
    </div>
  );
};

export default UsersPage;