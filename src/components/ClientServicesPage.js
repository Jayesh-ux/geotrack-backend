import React, { useState, useEffect } from "react";
import {
  RefreshCw,
  Search,
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  FileText,
  Edit2,
  Eye,
  TrendingUp,
  Package
} from "lucide-react";

const API_BASE_URL = "https://geo-track-1.onrender.com";

const NeumorphicCard = ({ children, className = "" }) => (
  <div
    className={`p-5 rounded-2xl ${className}`}
    style={{
      background: "#ecf0f3",
      boxShadow:
        "6px 6px 12px rgba(163,177,198,0.6), -6px -6px 12px rgba(255,255,255, 0.5)",
      border: "1px solid rgba(255,255,255,0.8)",
    }}
  >
    {children}
  </div>
);

const StatCard = ({ title, value, subtitle, icon: Icon, gradient }) => (
  <NeumorphicCard>
    <div className="flex items-center justify-between mb-2">
      <div className="flex-1">
        <p
          className="text-xs font-semibold uppercase tracking-wide mb-1"
          style={{ color: "#94a3b8" }}
        >
          {title}
        </p>
        <h3 className="text-3xl font-bold" style={{ color: "#1e293b" }}>
          {value}
        </h3>
      </div>
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{
          background: gradient,
          boxShadow: "3px 3px 6px rgba(0,0,0,0.15)",
        }}
      >
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
    <p className="text-xs" style={{ color: "#64748b" }}>
      {subtitle}
    </p>
  </NeumorphicCard>
);

const ClientServicesPage = ({ onRefresh, onEditServices }) => {
  const [allServices, setAllServices] = useState([]);
  const [filteredServices, setFilteredServices] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expiryFilter, setExpiryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("expiry-asc");

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, statusFilter, expiryFilter, sortBy, allServices]);

  // ✅ FIXED: Removed duplicate token declaration
  const fetchAllData = async () => {
    setLoading(true);
    setError("");
    
    try {
      // Get token from localStorage
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No token found - please login again");
      }

      // Decode token to see user info
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        console.log("🔐 Current user:", payload);
        console.log("👤 User ID:", payload.id);
        console.log("🛡️ Is Admin:", payload.isAdmin);
        console.log("📝 Role:", payload.role || "no role");
      } catch (e) {
        console.error("❌ Token decode failed:", e);
      }

      console.log("🔄 Fetching all services from /services/all");
      
      // Make the request
      const response = await fetch(
        `${API_BASE_URL}/services/all?limit=10000`,
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        }
      );
      
      console.log("📡 Response status:", response.status);
      console.log("📡 Response headers:", Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        // Get error details
        const errorText = await response.text();
        console.error("❌ Error response:", errorText);
        throw new Error(`Failed to fetch services: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      const servicesList = data.services || [];
      
      console.log(`✅ Loaded ${servicesList.length} services`);
      
      setAllServices(servicesList);
      setFilteredServices(servicesList);
      
      // Also fetch clients for the "Manage" button
      const clientsRes = await fetch(
        `${API_BASE_URL}/admin/clients?limit=10000`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const clientsData = await clientsRes.json();
      setClients(clientsData.clients || []);
      
    } catch (err) {
      console.error("❌ Error loading data:", err);
      setError(`Failed to load services: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...allServices];

    // Search filter
    if (searchTerm.trim()) {
      filtered = filtered.filter(
        (service) =>
          service.service_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          service.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          service.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((service) => service.status === statusFilter);
    }

    // Expiry filter
    if (expiryFilter !== "all") {
      const now = new Date();
      filtered = filtered.filter((service) => {
        if (!service.expiry_date) return expiryFilter === "no-expiry";
        const expiry = new Date(service.expiry_date);
        const daysUntilExpiry = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));

        if (expiryFilter === "expired") return daysUntilExpiry < 0;
        if (expiryFilter === "expiring-soon") return daysUntilExpiry >= 0 && daysUntilExpiry <= 30;
        if (expiryFilter === "active") return daysUntilExpiry > 30;
        return false;
      });
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "expiry-asc":
          if (!a.expiry_date) return 1;
          if (!b.expiry_date) return -1;
          return new Date(a.expiry_date) - new Date(b.expiry_date);
        case "expiry-desc":
          if (!a.expiry_date) return 1;
          if (!b.expiry_date) return -1;
          return new Date(b.expiry_date) - new Date(a.expiry_date);
        case "client-asc":
          return (a.clientName || "").localeCompare(b.clientName || "");
        case "client-desc":
          return (b.clientName || "").localeCompare(a.clientName || "");
        case "price-asc":
          return (a.price || 0) - (b.price || 0);
        case "price-desc":
          return (b.price || 0) - (a.price || 0);
        case "name-asc":
          return (a.service_name || "").localeCompare(b.service_name || "");
        case "name-desc":
          return (b.service_name || "").localeCompare(a.service_name || "");
        default:
          return 0;
      }
    });

    setFilteredServices(filtered);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return { bg: "rgba(67, 233, 123, 0.2)", color: "#43e97b" };
      case "expired":
        return { bg: "rgba(239, 68, 68, 0.2)", color: "#ef4444" };
      case "cancelled":
        return { bg: "rgba(148, 163, 184, 0.2)", color: "#64748b" };
      default:
        return { bg: "rgba(102, 126, 234, 0.2)", color: "#667eea" };
    }
  };

  const getExpiryStatus = (expiryDate) => {
    if (!expiryDate) return { status: "no-expiry", color: "#94a3b8" };
    const now = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) return { status: "expired", color: "#ef4444", days: daysUntilExpiry };
    if (daysUntilExpiry <= 30) return { status: "expiring-soon", color: "#f59e0b", days: daysUntilExpiry };
    return { status: "active", color: "#43e97b", days: daysUntilExpiry };
  };

  const handleEditClient = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    if (client && onEditServices) {
      onEditServices(client);
    }
  };

  // Calculate stats
  const totalServices = allServices.length;
  const activeServices = allServices.filter((s) => s.status === "active").length;
  const expiredServices = allServices.filter((s) => s.status === "expired").length;
  const expiringSoon = allServices.filter((s) => {
    if (!s.expiry_date) return false;
    const days = Math.ceil((new Date(s.expiry_date) - new Date()) / (1000 * 60 * 60 * 24));
    return days >= 0 && days <= 30;
  }).length;
  const totalRevenue = allServices.reduce((sum, s) => sum + (parseFloat(s.price) || 0), 0);

  return (
    <div className="space-y-5">
      {error && (
        <div
          className="p-4 rounded-2xl border-l-4"
          style={{
            background: "#fed7d7",
            borderColor: "#fc8181",
          }}
        >
          <div className="flex items-center justify-between">
            <p style={{ color: "#c53030" }} className="font-medium">
              {error}
            </p>
            <button
              onClick={fetchAllData}
              className="px-4 py-2 rounded-xl text-sm font-semibold"
              style={{
                background: "#ef4444",
                color: "white",
              }}
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-5 gap-4">
        <StatCard
          title="Total Services"
          value={totalServices}
          subtitle="All service subscriptions"
          icon={Package}
          gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
        />
        <StatCard
          title="Active"
          value={activeServices}
          subtitle="Currently active"
          icon={CheckCircle}
          gradient="linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
        />
        <StatCard
          title="Expiring Soon"
          value={expiringSoon}
          subtitle="Within 30 days"
          icon={AlertCircle}
          gradient="linear-gradient(135deg, #fa709a 0%, #fee140 100%)"
        />
        <StatCard
          title="Expired"
          value={expiredServices}
          subtitle="Need renewal"
          icon={XCircle}
          gradient="linear-gradient(135deg, #ef4444 0%, #f87171 100%)"
        />
        <StatCard
          title="Total Revenue"
          value={`₹${(totalRevenue / 1000).toFixed(1)}K`}
          subtitle="Service value"
          icon={DollarSign}
          gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
        />
      </div>

      {/* Filters */}
      <NeumorphicCard>
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-4 relative">
            <Search
              className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5"
              style={{ color: "#94a3b8" }}
            />
            <input
              type="text"
              placeholder="Search services, clients, descriptions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 text-sm font-medium transition-all"
              style={{
                background: "#e6eaf0",
                border: "none",
                borderRadius: "12px",
                color: "#1e293b",
                boxShadow:
                  "inset 4px 4px 8px #c5c8cf, inset -4px -4px 8px #ffffff",
              }}
            />
          </div>

          <div className="col-span-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-3 text-sm font-medium transition-all"
              style={{
                background: "#e6eaf0",
                border: "none",
                borderRadius: "12px",
                color: "#1e293b",
                boxShadow:
                  "inset 4px 4px 8px #c5c8cf, inset -4px -4px 8px #ffffff",
              }}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="col-span-2">
            <select
              value={expiryFilter}
              onChange={(e) => setExpiryFilter(e.target.value)}
              className="w-full px-4 py-3 text-sm font-medium transition-all"
              style={{
                background: "#e6eaf0",
                border: "none",
                borderRadius: "12px",
                color: "#1e293b",
                boxShadow:
                  "inset 4px 4px 8px #c5c8cf, inset -4px -4px 8px #ffffff",
              }}
            >
              <option value="all">All Expiry</option>
              <option value="expired">Expired</option>
              <option value="expiring-soon">Expiring Soon</option>
              <option value="active">Active (30+ days)</option>
              <option value="no-expiry">No Expiry</option>
            </select>
          </div>

          <div className="col-span-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-4 py-3 text-sm font-medium transition-all"
              style={{
                background: "#e6eaf0",
                border: "none",
                borderRadius: "12px",
                color: "#1e293b",
                boxShadow:
                  "inset 4px 4px 8px #c5c8cf, inset -4px -4px 8px #ffffff",
              }}
            >
              <option value="expiry-asc">Expiry (Soonest)</option>
              <option value="expiry-desc">Expiry (Latest)</option>
              <option value="client-asc">Client (A-Z)</option>
              <option value="client-desc">Client (Z-A)</option>
              <option value="name-asc">Service (A-Z)</option>
              <option value="name-desc">Service (Z-A)</option>
              <option value="price-asc">Price (Low)</option>
              <option value="price-desc">Price (High)</option>
            </select>
          </div>

          <div className="col-span-2">
            <button
              onClick={() => {
                fetchAllData();
                if (onRefresh) onRefresh();
              }}
              disabled={loading}
              className="w-full px-4 py-3 rounded-xl font-semibold text-sm transition-all hover:scale-105 flex items-center justify-center gap-2 disabled:opacity-50"
              style={{
                background:
                  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
                boxShadow: "4px 4px 8px rgba(102, 126, 234, 0.4)",
              }}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>

        {(searchTerm || statusFilter !== "all" || expiryFilter !== "all") && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className="text-xs font-semibold" style={{ color: "#94a3b8" }}>
              Active Filters:
            </span>
            {searchTerm && (
              <span
                className="px-3 py-1 rounded-full text-xs font-semibold"
                style={{ background: "rgba(102, 126, 234, 0.2)", color: "#667eea" }}
              >
                Search: {searchTerm}
              </span>
            )}
            {statusFilter !== "all" && (
              <span
                className="px-3 py-1 rounded-full text-xs font-semibold"
                style={{ background: "rgba(67, 233, 123, 0.2)", color: "#43e97b" }}
              >
                Status: {statusFilter}
              </span>
            )}
            {expiryFilter !== "all" && (
              <span
                className="px-3 py-1 rounded-full text-xs font-semibold"
                style={{ background: "rgba(240, 147, 251, 0.2)", color: "#f093fb" }}
              >
                Expiry: {expiryFilter.replace("-", " ")}
              </span>
            )}
            <button
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("all");
                setExpiryFilter("all");
              }}
              className="px-3 py-1 rounded-full text-xs font-semibold transition-all hover:scale-105"
              style={{ background: "rgba(239, 68, 68, 0.2)", color: "#ef4444" }}
            >
              Clear All
            </button>
          </div>
        )}

        <p className="text-sm mt-3" style={{ color: "#64748b" }}>
          Showing <span className="font-semibold" style={{ color: "#1e293b" }}>{filteredServices.length}</span> of{" "}
          <span className="font-semibold" style={{ color: "#1e293b" }}>{totalServices}</span> services
        </p>
      </NeumorphicCard>

      {/* Services Table */}
      <NeumorphicCard>
        {loading ? (
          <div className="text-center py-12">
            <div
              className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4"
              style={{
                background: "#e6eaf0",
                boxShadow: "inset 8px 8px 16px #c5c8cf, inset -8px -8px 16px #ffffff",
              }}
            >
              <Clock className="w-8 h-8 animate-spin" style={{ color: "#667eea" }} />
            </div>
            <p style={{ color: "#64748b" }}>Loading services...</p>
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 mx-auto mb-4" style={{ color: "#cbd5e1" }} />
            <h3 className="text-xl font-semibold mb-2" style={{ color: "#1e293b" }}>
              No services found
            </h3>
            <p style={{ color: "#64748b" }}>
              {searchTerm || statusFilter !== "all" || expiryFilter !== "all"
                ? "Try adjusting your filters"
                : "No services have been added yet"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "2px solid rgba(148, 163, 184, 0.2)" }}>
                  <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide" style={{ color: "#94a3b8" }}>Service</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide" style={{ color: "#94a3b8" }}>Client</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide" style={{ color: "#94a3b8" }}>Status</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide" style={{ color: "#94a3b8" }}>Price</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide" style={{ color: "#94a3b8" }}>Start Date</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide" style={{ color: "#94a3b8" }}>Expiry</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide" style={{ color: "#94a3b8" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredServices.map((service, idx) => {
                  const statusColors = getStatusColor(service.status);
                  const expiryStatus = getExpiryStatus(service.expiry_date);

                  return (
                    <tr
                      key={service.id}
                      className="hover:bg-gray-50 transition-colors"
                      style={{
                        borderBottom: idx !== filteredServices.length - 1 ? "1px solid rgba(148, 163, 184, 0.1)" : "none",
                      }}
                    >
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-semibold text-sm" style={{ color: "#1e293b" }}>
                            {service.service_name}
                          </p>
                          {service.description && (
                            <p className="text-xs truncate max-w-xs" style={{ color: "#64748b" }}>
                              {service.description}
                            </p>
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <div>
                          <p className="font-medium text-sm" style={{ color: "#1e293b" }}>
                            {service.clientName}
                          </p>
                          {service.clientEmail && (
                            <p className="text-xs" style={{ color: "#64748b" }}>
                              {service.clientEmail}
                            </p>
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <span
                          className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
                          style={{
                            background: statusColors.bg,
                            color: statusColors.color,
                          }}
                        >
                          {service.status}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <span className="text-sm font-semibold" style={{ color: "#1e293b" }}>
                          {service.price ? `₹${parseFloat(service.price).toLocaleString()}` : "-"}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <span className="text-sm" style={{ color: "#64748b" }}>
                          {service.start_date
                            ? new Date(service.start_date).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "-"}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        {service.expiry_date ? (
                          <div>
                            <p className="text-sm font-medium" style={{ color: expiryStatus.color }}>
                              {new Date(service.expiry_date).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </p>
                            {expiryStatus.days !== undefined && (
                              <p className="text-xs" style={{ color: "#64748b" }}>
                                {expiryStatus.days < 0
                                  ? `${Math.abs(expiryStatus.days)} days ago`
                                  : `${expiryStatus.days} days left`}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm" style={{ color: "#94a3b8" }}>
                            No expiry
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4">
                        <button
                          onClick={() => handleEditClient(service.client_id)}
                          className="px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:scale-105 flex items-center gap-1"
                          style={{
                            background: "#ecf0f3",
                            boxShadow: "3px 3px 6px rgba(163,177,198,0.4), -3px -3px 6px rgba(255,255,255, 0.8)",
                            color: "#667eea",
                          }}
                        >
                          <Edit2 className="w-3 h-3" />
                          Manage
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </NeumorphicCard>
    </div>
  );
};

export default ClientServicesPage;