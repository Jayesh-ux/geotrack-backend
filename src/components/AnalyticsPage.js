import React from "react";
import {LineChart,Line,AreaChart,Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Activity,
  MapPin,
  Target,
  Clock,
  AlertCircle,
  Award,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import PlanUsageWidget from "./PlanUsageWidget";


const NeumorphicCard = ({ children, className = "", noBorder = false }) => (
  <div
    className={`p-5 rounded-2xl ${className}`}
    style={{
      background: '#ecf0f3',
      boxShadow: '6px 6px 12px rgba(163,177,198,0.6), -6px -6px 12px rgba(255,255,255, 0.5)',
      border: noBorder ? 'none' : '1px solid rgba(255,255,255,0.8)',
    }}
  >
    {children}
  </div>
);

const CompactStatCard = ({ title, value, change, isPositive, icon: Icon, gradient }) => (
  <NeumorphicCard className="relative overflow-hidden">
    <div className="flex items-center justify-between mb-2">
      <div className="flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#94a3b8' }}>
          {title}
        </p>
        <h3 className="text-2xl font-bold" style={{ color: '#1e293b' }}>
          {typeof value === "number" ? value.toLocaleString() : value}
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
    {change !== undefined && (
      <div className="flex items-center gap-1">
        {isPositive ? (
          <TrendingUp className="w-3 h-3 text-green-500" />
        ) : (
          <TrendingDown className="w-3 h-3 text-red-500" />
        )}
        <span 
          className="text-xs font-semibold"
          style={{ color: isPositive ? '#10b981' : '#ef4444' }}
        >
          {Math.abs(change)}% {isPositive ? 'increase' : 'decrease'}
        </span>
      </div>
    )}
  </NeumorphicCard>
);

const InsightCard = ({ icon: Icon, gradient, title, value, subtitle }) => (
  <NeumorphicCard>
    <div className="flex items-center gap-3">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{
          background: gradient,
          boxShadow: '2px 2px 4px rgba(0,0,0,0.1)',
        }}
      >
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate" style={{ color: '#64748b' }}>{title}</p>
        <p className="text-lg font-bold" style={{ color: '#1e293b' }}>{value}</p>
        {subtitle && (
          <p className="text-xs truncate" style={{ color: '#94a3b8' }}>{subtitle}</p>
        )}
      </div>
    </div>
  </NeumorphicCard>
);

const AnalyticsPage = ({
  analyticsData,
  syncStatus,
  onRefresh,
  onGoToClients,
  onGoToUsers,
  onSelectUser,
}) => {

  if (!analyticsData) return null;
  
  const { stats, trends, distribution } = analyticsData;

  // Calculate valuable metrics
  const conversionRate =
  stats.totalClients > 0
    ? ((stats.activeClients / stats.totalClients) * 100).toFixed(1)
    : "0.0";
  const clientsPerArea = stats.uniquePincodes > 0 ? Math.round(stats.totalClients / stats.uniquePincodes) : 0;
  
  // Calculate growth
  const lastMonth = trends?.[trends.length - 1]?.clients ?? 0;
const prevMonth = trends?.[trends.length - 2]?.clients ?? 0;

  const growth = prevMonth > 0 ? (((lastMonth - prevMonth) / prevMonth) * 100).toFixed(1) : 0;

  // NEW: Data for visualizations
  const clientStatusData = [
    { name: 'Active', value: stats.activeClients, color: '#43e97b' },
    { name: 'Inactive', value: stats.totalClients - stats.activeClients, color: '#f093fb' }
  ];

  const gpsStatusData = [
    { name: 'With GPS', value: stats.withCoordinates, color: '#4facfe' },
    { name: 'Missing GPS', value: stats.totalClients - stats.withCoordinates, color: '#fa709a' }
  ];

  // Mock top areas - replace with real data from your distribution prop
  const topAreasData = Array.isArray(distribution)
  ? distribution.slice(0, 5)
  : [];


  // Mock user leaderboard - you'll need to add this data from backend
  const userLeaderboard = Array.isArray(analyticsData.leaderboard)
  ? analyticsData.leaderboard
  : [];



  // Generate smart action items
  const inactiveCount = stats.totalClients - stats.activeClients;
  const missingGPS = stats.totalClients - stats.withCoordinates;
  
  const actionItems = [
    {
      icon: AlertTriangle,
      color: '#ef4444',
      title: `${inactiveCount} clients inactive >30 days`,
      action: 'Review engagement strategy',
      show: inactiveCount > 0
    },
    {
      icon: MapPin,
      color: '#f59e0b',
      title: `${missingGPS} clients missing GPS`,
      action: 'Schedule geocoding batch',
      show: missingGPS > 0
    },
    {
      icon: CheckCircle,
      color: '#10b981',
      title: `${stats.coordinatesCoverage}% GPS coverage`,
      action: stats.coordinatesCoverage > 80 ? 'Excellent coverage!' : 'Needs improvement',
      show: true
    }
  ].filter(item => item.show);

  return (
  <div className="space-y-5">
    {/* Plan Usage Widget */}
    <PlanUsageWidget />

    {/* Key Metrics Row */}
    <div className="grid grid-cols-3 gap-4">
      <div onClick={() => onGoToClients()} className="cursor-pointer">
        <CompactStatCard
          title="Total Clients"
          value={stats.totalClients}
          change={parseFloat(growth)}
          isPositive={growth > 0}
          icon={Users}
          gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
        />
      </div>

      <div onClick={() => onGoToClients()} className="cursor-pointer">
        <CompactStatCard
          title="Active Rate"
          value={`${conversionRate}%`}
          change={2.3}
          isPositive={true}
          icon={Activity}
          gradient="linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
        />
      </div>

      <div onClick={() => onGoToClients()} className="cursor-pointer">
        <CompactStatCard
          title="GPS Coverage"
          value={`${stats.coordinatesCoverage}%`}
          change={5.1}
          isPositive={true}
          icon={MapPin}
          gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
        />
      </div>
    </div>

    {/* Insights Grid */}
    <div className="grid grid-cols-6 gap-3">
      <div onClick={() => onGoToUsers()} className="cursor-pointer">
        <InsightCard
          icon={Users}
          gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
          title="Team Size"
          value={stats.totalUsers}
          subtitle="Active users"
        />
      </div>

      <div onClick={() => onGoToClients()} className="cursor-pointer">
        <InsightCard
          icon={MapPin}
          gradient="linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
          title="Service Areas"
          value={stats.uniquePincodes}
          subtitle="Unique pincodes"
        />
      </div>

      <InsightCard
        icon={Target}
        gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
        title="Density"
        value={clientsPerArea}
        subtitle="Clients per area"
      />

      <div onClick={() => onGoToClients()} className="cursor-pointer">
        <InsightCard
          icon={Activity}
          gradient="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
          title="Inactive"
          value={inactiveCount}
          subtitle="Need attention"
        />
      </div>

      <div onClick={() => onGoToClients()} className="cursor-pointer">
        <InsightCard
          icon={AlertCircle}
          gradient="linear-gradient(135deg, #fa709a 0%, #fee140 100%)"
          title="Missing GPS"
          value={missingGPS}
          subtitle="Need geocoding"
        />
      </div>

      <InsightCard
        icon={Clock}
        gradient="linear-gradient(135deg, #764ba2 0%, #667eea 100%)"
        title="Total Logs"
        value={`${(stats.totalLogs / 1000).toFixed(1)}K`}
        subtitle="Tracking records"
      />
    </div>

    {/* Action Items */}
    <NeumorphicCard>
      <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: "#1e293b" }}>
        <Target className="w-4 h-4" />
        Action Items
      </h3>

      <div className="space-y-2">
        {actionItems.map((item, idx) => (
          <div
            key={idx}
            onClick={() => onGoToClients()}
            className="flex items-center gap-3 p-3 rounded-xl cursor-pointer"
            style={{
              background: "#ecf0f3",
              boxShadow:
                "inset 2px 2px 4px rgba(163,177,198,0.5), inset -2px -2px 4px rgba(255,255,255,0.7)",
            }}
          >
            <item.icon className="w-5 h-5" style={{ color: item.color }} />
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: "#1e293b" }}>
                {item.title}
              </p>
              <p className="text-xs" style={{ color: "#64748b" }}>
                {item.action}
              </p>
            </div>
          </div>
        ))}
      </div>
    </NeumorphicCard>

    {/* Charts Row 2 */}
<div className="grid grid-cols-3 gap-4">

  {/* Client Status Pie */}
  <NeumorphicCard>
    <h3 className="text-sm font-bold mb-2" style={{ color: "#1e293b" }}>
      Client Status
    </h3>
    <ResponsiveContainer width="100%" height={180}>
      <PieChart>
        <Pie
          data={clientStatusData}
          dataKey="value"
          innerRadius={45}
          outerRadius={70}
          paddingAngle={5}
        >
          {clientStatusData.map((entry, index) => (
            <Cell key={index} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  </NeumorphicCard>

  {/* GPS Coverage Pie */}
  <NeumorphicCard>
    <h3 className="text-sm font-bold mb-2" style={{ color: "#1e293b" }}>
      GPS Coverage
    </h3>
    <ResponsiveContainer width="100%" height={180}>
      <PieChart>
        <Pie
          data={gpsStatusData}
          dataKey="value"
          innerRadius={45}
          outerRadius={70}
          paddingAngle={5}
        >
          {gpsStatusData.map((entry, index) => (
            <Cell key={index} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  </NeumorphicCard>

  {/* Top Areas */}
  <NeumorphicCard>
    <h3 className="text-sm font-bold mb-2" style={{ color: "#1e293b" }}>
      Top Areas
    </h3>
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={topAreasData} layout="vertical">
        <XAxis type="number" />
        <YAxis type="category" dataKey="area" />
        <Tooltip />
        <Bar dataKey="clients" fill="#667eea" />
      </BarChart>
    </ResponsiveContainer>
  </NeumorphicCard>

</div>


    {/* User Leaderboard */}
    <NeumorphicCard>
      <div className="flex items-center gap-2 mb-4">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
            boxShadow: "2px 2px 4px rgba(250, 112, 154, 0.3)",
          }}
        >
          <Award className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-bold" style={{ color: "#1e293b" }}>
            Top Performers
          </h3>
          <p className="text-xs" style={{ color: "#64748b" }}>
            Best team members this month
          </p>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-3">
        {userLeaderboard.slice(0, 5).map((user, idx) => (
          <div
            key={idx}
            onClick={() => {
              onSelectUser(user);
              onGoToUsers();
            }}
            className="p-3 rounded-xl text-center cursor-pointer hover:scale-[1.03] transition-transform"
            style={{
              background:
                idx === 0
                  ? "linear-gradient(135deg, rgba(250,112,154,0.15), rgba(254,225,64,0.15))"
                  : "#ecf0f3",
              boxShadow:
                "4px 4px 8px rgba(163,177,198,0.5), -4px -4px 8px rgba(255,255,255,0.8)",
            }}
          >
            <div
              className="w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold"
              style={{
                background:
                  idx === 0
                    ? "linear-gradient(135deg,#fa709a,#fee140)"
                    : idx === 1
                    ? "linear-gradient(135deg,#c0c0c0,#e8e8e8)"
                    : idx === 2
                    ? "linear-gradient(135deg,#cd7f32,#e6a57e)"
                    : "#cbd5e1",
              }}
            >
              {idx + 1}
            </div>

            <p className="text-xs font-semibold mb-1" style={{ color: "#1e293b" }}>
              {user.name}
            </p>

            <p className="text-sm font-semibold">
  {user.meetings_held} meetings
</p>
<p className="text-xs text-slate-500">
  {user.clients_created} clients created
</p>


            <p className="text-xs" style={{ color: "#64748b" }}>
              clients
            </p>
          </div>
        ))}
      </div>
    </NeumorphicCard>
  </div>
);
};

export default AnalyticsPage;