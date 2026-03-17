// Dashboard.js - Multi-Company Version
import React, { useState, useEffect } from "react";
import { HardDrive, Package, TrendingUp, FileText, Users, LogOut, Home, RefreshCw, Settings, Sparkles, Phone, Building2, ChevronDown } from "lucide-react";

// Import page components
import AnalyticsPage from "./AnalyticsPage";
import ClientsPage from "./ClientsPage";
import UsersPage from "./UsersPage";
import UserLogsPage from "./UserLogsPage";
import UserMeetingsPage from "./UserMeetingsPage";
import UserExpensesPage from "./UserExpensesPage";
import UserManagementPage from "./UserManagementPage";
import ClientServicesPage from './ClientServicesPage';
import ClientServicesModal from './ClientServicesModal';
import CompanyManagementPage from './CompanyManagementPage';
import BillingPlansPage from './BillingPlansPage';
import BillingHistoryPage from './BillingHistoryPage';

const API_BASE_URL = "https://geo-track-1.onrender.com";

const Dashboard = () => {
  const [currentPage, setCurrentPage] = useState("analytics");
  const [analyticsData, setAnalyticsData] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);

  // ✅ NEW: Company context state
  const [userCompany, setUserCompany] = useState({
    id: "",
    name: "",
    subdomain: "",
  });
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // clients + pagination
  const [clients, setClients] = useState([]);
  const [clientsPage, setClientsPage] = useState(1);
  const CLIENTS_PER_PAGE = 50;
  const [clientsTotalPages, setClientsTotalPages] = useState(1);
  const [clientsTotal, setClientsTotal] = useState(0);
  // billing
const [billingOpen, setBillingOpen] = useState(false);  

  // users
  const [users, setUsers] = useState([]);
  const [userExpenses, setUserExpenses] = useState({});
  const [userClockIns, setUserClockIns] = useState({});
  const [userMeetings, setUserMeetings] = useState({});

  // user detail pages
  const [locationLogs, setLocationLogs] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [meetingsPagination, setMeetingsPagination] = useState({ 
    page: 1, limit: 20, total: 0, totalPages: 1 
  });
  const [expenses, setExpenses] = useState([]);
  const [expensesPagination, setExpensesPagination] = useState({ 
    page: 1, limit: 20, total: 0, totalPages: 1 
  });

  const [selectedClientForServices, setSelectedClientForServices] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [syncStatus, setSyncStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ✅ NEW: Auth check with company context
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/login";
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      
      // Check if user is admin or super admin
      if (!payload?.isAdmin && !payload?.isSuperAdmin) {
        alert("Unauthorized – Admin access only");
        localStorage.removeItem("token");
        window.location.href = "/login";
        return;
      }

      setCurrentUserId(payload.id);
      setIsAdmin(payload.isAdmin || false);
      setIsSuperAdmin(payload.isSuperAdmin || false);

      // ✅ NEW: Set company context
      setUserCompany({
        id: payload.companyId || localStorage.getItem("companyId") || "",
        name: localStorage.getItem("companyName") || "No Company",
        subdomain: localStorage.getItem("companySubdomain") || "",
      });

      console.log("🔐 Dashboard loaded:", {
        userId: payload.id,
        isAdmin: payload.isAdmin,
        isSuperAdmin: payload.isSuperAdmin,
        companyId: payload.companyId,
        companyName: localStorage.getItem("companyName")
      });

    } catch (e) {
      console.error("❌ Token parse error:", e);
      alert("Invalid token. Please login again.");
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
  }, []);

  // Outside click close
  useEffect(() => {
    const handler = (e) => {
      if (profileOpen && !e.target.closest(".profile-dropdown")) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [profileOpen]);

  const token = localStorage.getItem("token");

  useEffect(() => {
  if (currentPage === "billingPlans" || currentPage === "billingHistory") {
    setBillingOpen(true);
  }
}, [currentPage])

  // Main fetch whenever page or selectedUser changes
  useEffect(() => {
    fetchData();
  }, [currentPage, selectedUser, clientsPage]);

  // Refresh users frequently when on users or user management page
  useEffect(() => {
    const interval = setInterval(() => {
      if (currentPage === "users" || currentPage === "userManagement") {
        fetchUsers();
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [currentPage]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      if (currentPage === "analytics") {
        await Promise.all([fetchAnalytics(), fetchSyncStatus()]);
      } else if (currentPage === "clients") {
        await fetchClients(clientsPage, CLIENTS_PER_PAGE);
      } else if (currentPage === "users") {
        await fetchUsers();
        await fetchAllUserExpenses();
        await fetchAllUserMeetingsSummary();
      } else if (currentPage === "userManagement") {
        await fetchUsers();
      } else if (currentPage === "userLogs") {
        await fetchUserLogs();
      } else if (currentPage === "userMeetings") {
        await fetchUserMeetingsDetail(meetingsPagination.page, meetingsPagination.limit);
      } else if (currentPage === "userExpenses") {
        await fetchUserExpensesDetail(expensesPagination.page, expensesPagination.limit);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      
      // ✅ NEW: Handle session invalidation
      if (err.message?.includes("SESSION_INVALIDATED") || err.message?.includes("401")) {
        localStorage.clear();
        window.location.href = "/login";
        return;
      }
      
      setError(err.message || "Error loading data");
    }

    setLoading(false);
  };

  // [Keep all your existing fetch functions - they work with the new backend automatically]
  const fetchAnalytics = async () => {
    try {
      const analyticsRes = await fetch(`${API_BASE_URL}/admin/analytics`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!analyticsRes.ok) throw new Error("Failed to fetch analytics");
      const data = await analyticsRes.json();

      const clientsRes = await fetch(`${API_BASE_URL}/admin/clients?limit=10000`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const clientsData = await clientsRes.json();

      setAnalyticsData({
        stats: data.stats,
        trends: data.trends,
        distribution: data.distribution,
        leaderboard: data.leaderboard,
      });

    } catch (err) {
      console.error("Analytics error:", err);
      setError("Failed to load analytics.");
    }
  };

  const fetchClients = async (page = 1, limit = CLIENTS_PER_PAGE) => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/clients?page=${page}&limit=${limit}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch clients");
      const data = await response.json();
      setClients(data.clients || []);
      if (data.pagination) {
        setClientsPage(data.pagination.page || page);
        setClientsTotalPages(data.pagination.totalPages || 1);
        setClientsTotal(data.pagination.total || (data.clients || []).length);
      }
    } catch (err) {
      console.error("Clients error:", err);
      setError("Failed to load clients.");
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/users?limit=1000`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch users");
      const data = await response.json();
      const fetchedUsers = data.users || [];
      setUsers(fetchedUsers);

      if (currentPage === "users") {
        const clockStatusMap = {};
        for (const user of fetchedUsers) {
          try {
            const res = await fetch(`${API_BASE_URL}/admin/clock-status/${user.id}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
              const result = await res.json();
              clockStatusMap[user.id] = {
                clocked_in: result.clocked_in,
                last_seen: result.last_seen,
              };
            }
          } catch (err) {
            console.error(`Clock-status fetch failed → User: ${user.id}`, err);
          }
        }
        setUserClockIns(clockStatusMap);

        const meetingsMap = {};
        for (const user of fetchedUsers) {
          try {
            const res = await fetch(`${API_BASE_URL}/admin/user-meetings/${user.id}?limit=5`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
              const result = await res.json();
              const mList = result.meetings || [];
              meetingsMap[user.id] = {
                total: mList.length,
                completed: mList.filter((m) => m.status === "COMPLETED").length || 0,
                inProgress: mList.filter((m) => m.status === "IN_PROGRESS").length || 0,
              };
            }
          } catch (err) {
            meetingsMap[user.id] = { total: 0, completed: 0, inProgress: 0 };
          }
        }
        setUserMeetings(meetingsMap);
      }
    } catch (err) {
      console.error("Users error:", err);
      setError("Failed to load users.");
    }
  };

  const fetchAllUserExpenses = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/expenses/summary`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        setUserExpenses({});
        return;
      }
      const data = await response.json();
      const map = {};
      (data.summary || []).forEach((row) => {
        map[row.id] = Number(row.total_expense) || 0;
      });
      setUserExpenses(map);
    } catch (err) {
      console.error("Failed to fetch expenses:", err);
    }
  };

  const fetchAllUserMeetingsSummary = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/meetings/summary/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return;
      const data = await response.json();
      const map = {};
      (data.summary || []).forEach((row) => {
        map[row.id] = {
          total: Number(row.total_meetings) || 0,
          completed: Number(row.completed_meetings) || 0,
          inProgress: Number(row.in_progress_meetings) || 0,
        };
      });
      setUserMeetings((prev) => ({ ...prev, ...map }));
    } catch (err) {
      console.error("Failed to fetch meetings summary:", err);
    }
  };

  const fetchSyncStatus = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/sync/latest`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch sync status");
      const data = await response.json();
      setSyncStatus(data.lastSync);
    } catch (err) {
      console.error("Sync status error:", err);
      setSyncStatus(null);
    }
  };

  const fetchUserLogs = async () => {
    if (!selectedUser?.id) return;
    try {
      const response = await fetch(
        `${API_BASE_URL}/admin/location-logs/${selectedUser.id}?limit=200`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) throw new Error("Failed to fetch location logs");
      const data = await response.json();
      setLocationLogs(data.logs || []);
    } catch (err) {
      console.error("Location logs error:", err);
      setLocationLogs([]);
    }
  };

  const fetchUserMeetingsDetail = async (page = 1, limit = 20) => {
    if (!selectedUser?.id) return;
    try {
      const response = await fetch(
        `${API_BASE_URL}/admin/user-meetings/${selectedUser.id}?page=${page}&limit=${limit}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) throw new Error("Failed to fetch meetings");
      const data = await response.json();
      const m = data.meetings || [];
      setMeetings(m);
      if (data.pagination) {
        setMeetingsPagination({
          page: data.pagination.page || page,
          limit: data.pagination.limit || limit,
          total: data.pagination.total || m.length,
          totalPages: data.pagination.totalPages || 1,
        });
      }
    } catch (err) {
      console.error("Meetings error:", err);
      setMeetings([]);
    }
  };

  const fetchUserExpensesDetail = async (page = 1, limit = 20) => {
    if (!selectedUser?.id) return;
    try {
      const response = await fetch(
        `${API_BASE_URL}/admin/user-expenses/${selectedUser.id}?page=${page}&limit=${limit}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) throw new Error("Failed to fetch expenses");
      const data = await response.json();
      const e = data.expenses || [];
      setExpenses(e);
      if (data.pagination) {
        setExpensesPagination({
          page: data.pagination.page || page,
          limit: data.pagination.limit || limit,
          total: data.pagination.total || e.length,
          totalPages: data.pagination.totalPages || 1,
        });
      }
    } catch (err) {
      console.error("Expenses error:", err);
      setExpenses([]);
    }
  };

  const handleViewUserLogs = (user) => {
    setSelectedUser(user);
    setCurrentPage("userLogs");
  };

  const handleViewUserMeetings = (user) => {
    setSelectedUser(user);
    setMeetingsPagination({ page: 1, limit: 20, total: 0, totalPages: 1 });
    setCurrentPage("userMeetings");
  };

  const handleViewUserExpenses = (user) => {
    setSelectedUser(user);
    setExpensesPagination({ page: 1, limit: 20, total: 0, totalPages: 1 });
    setCurrentPage("userExpenses");
  };

  const handleEditClientServices = (client) => {
    setSelectedClientForServices(client);
  };

  const navItems = [
    { id: "analytics", label: "Dashboard", icon: Home },
    { id: "clients", label: "Clients", icon: FileText },
    { id: "clientServices", label: "Client Services", icon: Package },
    { id: "users", label: "Team Activity", icon: Users },
    { id: "userManagement", label: "User Management", icon: Settings },
    ...(isSuperAdmin) ? [
      { id: "companyManagement", label: "Company Management", icon: Building2 },
    ] : []
  ];

  return (
    <div className="min-h-screen" style={{ background: '#ecf0f3' }}>
      {/* Sidebar */}
      <aside 
        className="fixed top-0 left-0 h-full w-72 p-6"
        style={{ background: '#ecf0f3' }}
      >
        {/* Logo */}
        <div 
          className="mb-10 p-6 rounded-3xl flex items-center gap-4"
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            boxShadow: '9px 9px 16px rgba(163,177,198,0.6)',
          }}
        >
          <img src="/logo.png" alt="GeoTrack" className="w-12 h-12 object-contain" />
          <span className="text-2xl font-bold text-white">GeoTrack</span>
        </div>

        {/* ✅ NEW: Company Context Indicator */}
        {!isSuperAdmin && userCompany.name && (
          <div 
            className="mb-6 p-4 rounded-2xl"
            style={{
              background: '#e6eaf0',
              boxShadow: 'inset 4px 4px 8px #c5c8cf, inset -4px -4px 8px #ffffff',
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="w-4 h-4" style={{ color: '#667eea' }} />
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#94a3b8' }}>
                Your Company
              </span>
            </div>
            <p className="text-sm font-bold truncate" style={{ color: '#1e293b' }}>
              {userCompany.name}
            </p>
            {userCompany.subdomain && (
              <p className="text-xs" style={{ color: '#64748b' }}>
                @{userCompany.subdomain}
              </p>
            )}
          </div>
        )}

        {/* ✅ NEW: Super Admin Indicator */}
        {isSuperAdmin && (
          <div 
            className="mb-6 p-4 rounded-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(250,112,154,0.15), rgba(254,225,64,0.15))',
              border: '2px solid rgba(250,112,154,0.3)',
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4" style={{ color: '#fa709a' }} />
              <span className="text-xs font-bold uppercase tracking-wide" style={{ color: '#fa709a' }}>
                Super Admin
              </span>
            </div>
            <p className="text-xs" style={{ color: '#64748b' }}>
              All companies access
            </p>
          </div>
        )}

        {/* Navigation */}
        <nav className="space-y-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id)}
                className="w-full p-5 rounded-2xl flex items-center gap-4 transition-all duration-200"
                style={
                  isActive
                    ? {
                        background: '#e6eaf0',
                        boxShadow: 'inset 8px 8px 16px #c5c8cf, inset -8px -8px 16px #ffffff',
                      }
                    : {
                        background: '#e6eaf0',
                        boxShadow: '8px 8px 16px #c5c8cf, -8px -8px 16px #ffffff',
                      }
                }
              >
                <Icon 
                  className="w-6 h-6" 
                  style={{ color: isActive ? '#667eea' : '#718096' }}
                />
                <span 
                  className="font-semibold text-base"
                  style={{ color: isActive ? '#667eea' : '#718096' }}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Sidebar Metric */}
        <div className="mt-4">
          <button
            onClick={() => setBillingOpen(prev => !prev)}
            className="w-full p-5 rounded-2xl flex items-center gap-4 transition-all duration-200"
            style={{
              background: '#e6eaf0',
              boxShadow: '8px 8px 16px #c5c8cf, -8px -8px 16px #ffffff',
            }}
          >
            <Package className="w-6 h-6 text-slate-600" />
            <span className="font-semibold text-base text-slate-700">
              Pricing & Billing
            </span>
          </button>

          {billingOpen && (
            <div className="ml-6 mt-3 space-y-2">
              <button
                onClick={() => setCurrentPage("billingPlans")}
                className="w-full text-left px-4 py-2 rounded-xl text-sm transition"
                style={{
                  background: currentPage === "billingPlans" ? "#dfe6f3" : "#ecf0f3",
                  fontWeight: currentPage === "billingPlans" ? "600" : "400",
                  color: '#64748b'
                }}
              >
                • Plans
              </button>

              <button
                onClick={() => setCurrentPage("billingHistory")}
                className="w-full text-left px-4 py-2 rounded-xl text-sm transition"
                style={{
                  background: currentPage === "billingHistory" ? "#dfe6f3" : "#ecf0f3",
                  fontWeight: currentPage === "billingHistory" ? "600" : "400",
                  color: '#64748b'
                }}
              >
                • History
              </button>
            </div>
          )}
        </div>

      </aside>

      {/* Main Content */}
      <main className="ml-72 p-6 max-h-screen overflow-y-auto">
        {/* Page Header */}
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-1" style={{ color: '#1e293b' }}>
              {currentPage === "analytics" && "Dashboard Overview"}
              {currentPage === "clients" && "Client Management"}
              {currentPage === "clientServices" && "Client Services"}
              {currentPage === "companyManagement" && "Company Management"}
              {currentPage === "users" && "Team Activity"}
              {currentPage === "userManagement" && "User Management"}
              {currentPage === "userLogs" && "Location Tracking"}
              {currentPage === "userMeetings" && "Meeting History"}
              {currentPage === "userExpenses" && "Expense Reports"}
               {currentPage === "billingPlans" && "Pricing Plans"}       
              {currentPage === "billingHistory" && "Billing History"} 
            </h1>
            <p style={{ color: '#64748b' }}>
              {currentPage === "analytics" && "Monitor your business performance"}
              {currentPage === "clients" && "View and manage all your clients"}
              {currentPage === "clientServices" && "Manage all client service subscriptions"}
              {currentPage === "companyManagement" && "Manage company settings and subscriptions"}
              {currentPage === "users" && "Track your team members"}
              {currentPage === "userManagement" && "Add, edit, and manage user accounts"}
              {currentPage === "userLogs" && "Detailed location history"}
              {currentPage === "userMeetings" && "Complete meeting logs"}
              {currentPage === "userExpenses" && "Track and review expenses"}
              {currentPage === "billingPlans" && "View and manage subscription plans"}     
              {currentPage === "billingHistory" && "View past billing and invoices"} 
            </p>
          </div>

          <div className="flex items-center gap-4">
            {currentPage === "analytics" && syncStatus && (
              <button 
                onClick={fetchData}
                className="w-12 h-12 rounded-xl flex items-center justify-center transition-all hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  boxShadow: '4px 4px 8px rgba(102, 126, 234, 0.4)',
                }}
              >
                <RefreshCw className="w-5 h-5 text-white" />
              </button>
            )}

            {/* Profile Dropdown */}
            <div className="relative profile-dropdown">
              <button
                onClick={() => setProfileOpen(p => !p)}
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{
                  background: '#e6eaf0',
                  boxShadow: '6px 6px 12px #c5c8cf, -6px -6px 12px #ffffff',
                }}
              >
                <Users className="w-5 h-5 text-slate-600" />
              </button>

              {profileOpen && (
                <div
                  className="absolute right-0 mt-4 w-64 rounded-2xl p-4 z-50"
                  style={{
                    background: '#ecf0f3',
                    boxShadow: '8px 8px 16px #c5c8cf, -8px -8px 16px #ffffff',
                  }}
                >
                  {/* Header */}
                  <div className="mb-4">
                    <p className="text-sm font-semibold" style={{ color: '#1e293b' }}>
                      {isSuperAdmin ? "Super Admin Account" : "Admin Account"}
                    </p>
                    <p className="text-xs truncate" style={{ color: '#64748b' }}>
                      {localStorage.getItem("userEmail") || ""}
                    </p>
                    {!isSuperAdmin && userCompany.name && (
                      <p className="text-xs mt-1" style={{ color: '#667eea' }}>
                        {userCompany.name}
                      </p>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="my-2" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }} />

                  {/* Logout */}
                  <button
                    onClick={() => {
                      localStorage.clear();
                      window.location.href = "/login";
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl transition-all hover:scale-[1.02]"
                    style={{
                      background: '#ecf0f3',
                      boxShadow:
                        'inset 4px 4px 8px rgba(163,177,198,0.45), inset -4px -4px 8px rgba(255,255,255,0.8)',
                    }}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{
                        background: '#fee2e2',
                        boxShadow: '2px 2px 4px rgba(239,68,68,.3)',
                      }}
                    >
                      <LogOut className="w-4 h-4 text-red-600" />
                    </div>
                    <span className="text-sm font-semibold text-red-600">Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div 
            className="mb-6 p-5 rounded-2xl border-l-4"
            style={{
              background: '#fed7d7',
              borderColor: '#fc8181',
              boxShadow: '8px 8px 16px #c5c8cf, -8px -8px 16px #ffffff'
            }}
          >
            <p style={{ color: '#c53030' }} className="font-medium">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex flex-col items-center justify-center h-96">
            <div 
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{
                background: '#e6eaf0',
                boxShadow: 'inset 8px 8px 16px #c5c8cf, inset -8px -8px 16px #ffffff',
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
              }}
            >
              <TrendingUp className="w-8 h-8" style={{ color: '#667eea' }} />
            </div>
            <p className="mt-6 font-medium" style={{ color: '#718096' }}>Loading your data...</p>
          </div>
        ) : currentPage === "analytics" ? (
          <AnalyticsPage
            analyticsData={analyticsData}
            syncStatus={syncStatus}
            onRefresh={fetchData}
            onGoToClients={() => setCurrentPage("clients")}
            onGoToUsers={() => setCurrentPage("users")}
            onSelectUser={(user) => {
              setSelectedUser(user);
              setCurrentPage("users");
            }}
          />
        ) : currentPage === "clients" ? (
          <ClientsPage
            clients={clients}
            clientsPage={clientsPage}
            clientsTotalPages={clientsTotalPages}
            clientsTotal={clientsTotal}
            onRefresh={() => fetchClients(clientsPage, CLIENTS_PER_PAGE)}
            onPageChange={setClientsPage}
            onEditServices={handleEditClientServices}
          />
        ) : currentPage === "clientServices" ? (
          <ClientServicesPage
            onRefresh={fetchData}
            onEditServices={handleEditClientServices}
          />
        ) : currentPage === "users" ? (
          <UsersPage
            users={users}
            userClockIns={userClockIns}
            userExpenses={userExpenses}
            userMeetings={userMeetings}
            onRefresh={fetchUsers}
            onViewLogs={handleViewUserLogs}
            onViewMeetings={handleViewUserMeetings}
            onViewExpenses={handleViewUserExpenses}
          />
        ) : currentPage === "userManagement" ? (
          <UserManagementPage
            users={users}
            currentUserId={currentUserId}
            onRefresh={fetchUsers}
          />
        ) : currentPage === "userLogs" ? (
          <UserLogsPage
            selectedUser={selectedUser}
            locationLogs={locationLogs}
            onBack={() => setCurrentPage("users")}
            onRefresh={fetchUserLogs}
          />
        ) : currentPage === "userMeetings" ? (
          <UserMeetingsPage
            selectedUser={selectedUser}
            meetings={meetings}
            pagination={meetingsPagination}
            onBack={() => setCurrentPage("users")}
            onRefresh={() =>
              fetchUserMeetingsDetail(
                meetingsPagination.page,
                meetingsPagination.limit
              )
            }
            onPageChange={(page) =>
              fetchUserMeetingsDetail(page, meetingsPagination.limit)
            }
          />
        ) : currentPage === "userExpenses" ? (
          <UserExpensesPage
            selectedUser={selectedUser}
            expenses={expenses}
            pagination={expensesPagination}
            onBack={() => setCurrentPage("users")}
            onRefresh={() =>
              fetchUserExpensesDetail(
                expensesPagination.page,
                expensesPagination.limit
              )
            }
            onPageChange={(page) =>
              fetchUserExpensesDetail(page, expensesPagination.limit)
            }
          />
        ) : currentPage === "companyManagement" ? (
            <CompanyManagementPage onRefresh={fetchData} />
             ) : currentPage === "billingPlans" ? (     
          <BillingPlansPage />
        ) : currentPage === "billingHistory" ? (    
          <BillingHistoryPage />
        ) : null}

        {selectedClientForServices && (
          <ClientServicesModal
            client={selectedClientForServices}
            onClose={() => setSelectedClientForServices(null)}
          />
        )}
      </main>
    </div>
  );
};

export default Dashboard;