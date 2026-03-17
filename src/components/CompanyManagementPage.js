import React, { useState, useEffect } from "react";
import {
  RefreshCw,
  Search,
  Building2,
  Users,
  FileText,
  ChevronDown,
  ChevronRight,
  Calendar,
  Mail,
  Phone,
  MapPin,
  Activity,
  AlertCircle,
  CheckCircle,
  XCircle,
  Globe,
  Package,
  TrendingUp,
  Filter,
  X,
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

const StatCard = ({ title, value, subtitle, icon: Icon, gradient, onClick }) => (
  <NeumorphicCard className={onClick ? "cursor-pointer hover:shadow-xl transition-all" : ""}>
    <div onClick={onClick} className="flex items-center justify-between mb-2">
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

const CompanyManagementPage = ({ onRefresh }) => {
  const [companies, setCompanies] = useState([]);
  const [expandedCompany, setExpandedCompany] = useState(null);
  const [companyDetails, setCompanyDetails] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState("companies"); // "companies" | "users" | "clients"
  const [selectedCompany, setSelectedCompany] = useState(null);

  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/super-admin/companies`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch companies");
      }

      const data = await response.json();
      setCompanies(data.companies || []);
    } catch (err) {
      console.error("Error fetching companies:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanyDetails = async (companyId) => {
    if (companyDetails[companyId]) {
      return; // Already fetched
    }

    try {
      const [usersRes, clientsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/super-admin/companies/${companyId}/users`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/super-admin/companies/${companyId}/clients`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const usersData = await usersRes.json();
      const clientsData = await clientsRes.json();

      setCompanyDetails((prev) => ({
        ...prev,
        [companyId]: {
          users: usersData.users || [],
          clients: clientsData.clients || [],
        },
      }));
    } catch (err) {
      console.error(`Error fetching details for company ${companyId}:`, err);
    }
  };

  const toggleCompanyExpansion = async (company) => {
    if (expandedCompany === company.id) {
      setExpandedCompany(null);
    } else {
      setExpandedCompany(company.id);
      await fetchCompanyDetails(company.id);
    }
  };

  const showCompanyUsers = async (company) => {
    setSelectedCompany(company);
    setViewMode("users");
    await fetchCompanyDetails(company.id);
  };

  const showCompanyClients = async (company) => {
    setSelectedCompany(company);
    setViewMode("clients");
    await fetchCompanyDetails(company.id);
  };

  // Filter companies
  const filteredCompanies = companies.filter((company) => {
    const matchesSearch =
  company.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
  company.subdomain?.toLowerCase().includes(searchTerm.toLowerCase());


    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && company.is_active) ||
      (statusFilter === "inactive" && !company.is_active);

    return matchesSearch && matchesStatus;
  });

  // Calculate stats
  // Calculate stats
  const totalCompanies = companies.length;
  const activeCompanies = companies.filter((c) => c.is_active).length;
  const inactiveCompanies = totalCompanies - activeCompanies;
  const totalUsers = companies.reduce((sum, c) => sum + (parseInt(c.user_count) || 0), 0);
  const totalClients = companies.reduce((sum, c) => sum + (parseInt(c.client_count) || 0), 0);

  if (viewMode === "users" && selectedCompany) {
    const details = companyDetails[selectedCompany.id];
    const users = details?.users || [];

    return (
      <div className="space-y-5">
        {/* Back Button */}
        <button
          onClick={() => {
            setViewMode("companies");
            setSelectedCompany(null);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all hover:scale-105"
          style={{
            background: "#ecf0f3",
            boxShadow:
              "3px 3px 6px rgba(163,177,198,0.4), -3px -3px 6px rgba(255,255,255, 0.8)",
            color: "#667eea",
          }}
        >
          <ChevronRight className="w-4 h-4 rotate-180" />
          Back to Companies
        </button>

        {/* Header */}
        <NeumorphicCard>
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-xl flex items-center justify-center"
              style={{
                background: selectedCompany.is_active
                  ? "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
                  : "linear-gradient(135deg, #94a3b8 0%, #64748b 100%)",
                boxShadow: "3px 3px 6px rgba(0,0,0,0.15)",
              }}
            >
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-1" style={{ color: "#1e293b" }}>
                {selectedCompany.name}
              </h2>
              <p className="text-sm" style={{ color: "#64748b" }}>
                Users in this company
              </p>
            </div>
          </div>
        </NeumorphicCard>

        {/* Users Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {users.length === 0 ? (
            <div className="col-span-full">
              <NeumorphicCard>
                <div className="text-center py-12">
                  <Users className="w-16 h-16 mx-auto mb-4" style={{ color: "#cbd5e1" }} />
                  <h3 className="text-xl font-semibold mb-2" style={{ color: "#1e293b" }}>
                    No users found
                  </h3>
                  <p style={{ color: "#64748b" }}>This company has no users yet</p>
                </div>
              </NeumorphicCard>
            </div>
          ) : (
            users.map((user) => (
              <NeumorphicCard key={user.id} className="hover:shadow-xl transition-all">
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold"
                    style={{
                      background: user.is_admin
                        ? "linear-gradient(135deg, #fa709a 0%, #fee140 100%)"
                        : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                      boxShadow: "3px 3px 6px rgba(0,0,0,0.15)",
                    }}
                  >
                    {(user.full_name || user.email || "").substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold truncate" style={{ color: "#1e293b" }}>
                      {user.full_name || "No name"}
                    </h3>
                    {user.is_admin && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{
                          background: "rgba(250, 112, 154, 0.2)",
                          color: "#fa709a",
                        }}
                      >
                        Admin
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" style={{ color: "#94a3b8" }} />
                    <p className="text-sm truncate" style={{ color: "#1e293b" }}>
                      {user.email}
                    </p>
                  </div>

                  {user.department && (
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4" style={{ color: "#94a3b8" }} />
                      <p className="text-sm" style={{ color: "#1e293b" }}>
                        {user.department}
                      </p>
                    </div>
                  )}

                  <div className="text-xs" style={{ color: "#64748b" }}>
                    Joined: {new Date(user.created_at).toLocaleDateString()}
                  </div>
                </div>
              </NeumorphicCard>
            ))
          )}
        </div>
      </div>
    );
  }

  if (viewMode === "clients" && selectedCompany) {
    const details = companyDetails[selectedCompany.id];
    const clients = details?.clients || [];

    return (
      <div className="space-y-5">
        {/* Back Button */}
        <button
          onClick={() => {
            setViewMode("companies");
            setSelectedCompany(null);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all hover:scale-105"
          style={{
            background: "#ecf0f3",
            boxShadow:
              "3px 3px 6px rgba(163,177,198,0.4), -3px -3px 6px rgba(255,255,255, 0.8)",
            color: "#667eea",
          }}
        >
          <ChevronRight className="w-4 h-4 rotate-180" />
          Back to Companies
        </button>

        {/* Header */}
        <NeumorphicCard>
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-xl flex items-center justify-center"
              style={{
                background: selectedCompany.is_active
                  ? "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
                  : "linear-gradient(135deg, #94a3b8 0%, #64748b 100%)",
                boxShadow: "3px 3px 6px rgba(0,0,0,0.15)",
              }}
            >
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-1" style={{ color: "#1e293b" }}>
                {selectedCompany.name}
              </h2>
              <p className="text-sm" style={{ color: "#64748b" }}>
                Clients in this company
              </p>
            </div>
          </div>
        </NeumorphicCard>

        {/* Clients Table */}
        <NeumorphicCard>
          {clients.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 mx-auto mb-4" style={{ color: "#cbd5e1" }} />
              <h3 className="text-xl font-semibold mb-2" style={{ color: "#1e293b" }}>
                No clients found
              </h3>
              <p style={{ color: "#64748b" }}>This company has no clients yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: "2px solid rgba(148, 163, 184, 0.2)" }}>
                    <th
                      className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide"
                      style={{ color: "#94a3b8" }}
                    >
                      Client
                    </th>
                    <th
                      className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide"
                      style={{ color: "#94a3b8" }}
                    >
                      Contact
                    </th>
                    <th
                      className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide"
                      style={{ color: "#94a3b8" }}
                    >
                      Status
                    </th>
                    <th
                      className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide"
                      style={{ color: "#94a3b8" }}
                    >
                      Location
                    </th>
                    <th
                      className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide"
                      style={{ color: "#94a3b8" }}
                    >
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((client, idx) => (
                    <tr
                      key={client.id}
                      className="hover:bg-gray-50 transition-colors"
                      style={{
                        borderBottom:
                          idx !== clients.length - 1
                            ? "1px solid rgba(148, 163, 184, 0.1)"
                            : "none",
                      }}
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                            style={{
                              background:
                                client.status === "active"
                                  ? "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
                                  : "linear-gradient(135deg, #94a3b8 0%, #64748b 100%)",
                              boxShadow: "2px 2px 4px rgba(0,0,0,0.1)",
                            }}
                          >
                            {(client.name || "").substring(0, 2).toUpperCase()}
                          </div>
                          <p className="font-semibold text-sm" style={{ color: "#1e293b" }}>
                            {client.name}
                          </p>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="text-sm">
                          <p style={{ color: "#1e293b" }}>{client.email || "-"}</p>
                          <p style={{ color: "#64748b" }}>{client.phone || "-"}</p>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <span
                          className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
                          style={{
                            background:
                              client.status === "active"
                                ? "rgba(67, 233, 123, 0.2)"
                                : "rgba(148, 163, 184, 0.2)",
                            color: client.status === "active" ? "#43e97b" : "#64748b",
                          }}
                        >
                          {client.status === "active" ? (
                            <CheckCircle className="w-3 h-3 mr-1" />
                          ) : (
                            <XCircle className="w-3 h-3 mr-1" />
                          )}
                          {client.status}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        {client.pincode ? (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-green-500" />
                            <span className="text-sm" style={{ color: "#1e293b" }}>
                              {client.pincode}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm" style={{ color: "#94a3b8" }}>
                            No location
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4">
                        <span className="text-sm" style={{ color: "#64748b" }}>
                          {new Date(client.created_at).toLocaleDateString()}
                        </span>
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
  }

  return (
    <div className="space-y-5">
      {/* Error Display */}
      {error && (
        <div
          className="p-4 rounded-2xl border-l-4"
          style={{
            background: "#fed7d7",
            borderColor: "#fc8181",
          }}
        >
          <p style={{ color: "#c53030" }} className="font-medium">
            {error}
          </p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-5 gap-4">
        <StatCard
          title="Total Companies"
          value={totalCompanies}
          subtitle="All registered companies"
          icon={Building2}
          gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
        />
        <StatCard
          title="Active"
          value={activeCompanies}
          subtitle="Currently active"
          icon={CheckCircle}
          gradient="linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
        />
        <StatCard
          title="Inactive"
          value={inactiveCompanies}
          subtitle="Disabled companies"
          icon={XCircle}
          gradient="linear-gradient(135deg, #ef4444 0%, #f87171 100%)"
        />
        <StatCard
          title="Total Users"
          value={totalUsers}
          subtitle="Across all companies"
          icon={Users}
          gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
        />
        <StatCard
          title="Total Clients"
          value={totalClients}
          subtitle="Across all companies"
          icon={FileText}
          gradient="linear-gradient(135deg, #fa709a 0%, #fee140 100%)"
        />
      </div>

      {/* Search and Filters */}
      <NeumorphicCard>
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-8 relative">
            <Search
              className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5"
              style={{ color: "#94a3b8" }}
            />
            <input
              type="text"
              placeholder="Search companies by name, subdomain, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 text-sm font-medium transition-all"
              style={{
                background: "#e6eaf0",
                border: "none",
                borderRadius: "12px",
                color: "#1e293b",
                boxShadow: "inset 4px 4px 8px #c5c8cf, inset -4px -4px 8px #ffffff",
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
                boxShadow: "inset 4px 4px 8px #c5c8cf, inset -4px -4px 8px #ffffff",
              }}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="col-span-2">
            <button
              onClick={() => {
                fetchCompanies();
                if (onRefresh) onRefresh();
              }}
              disabled={loading}
              className="w-full px-4 py-3 rounded-xl font-semibold text-sm transition-all hover:scale-105 flex items-center justify-center gap-2 disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
                boxShadow: "4px 4px 8px rgba(102, 126, 234, 0.4)",
              }}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>
        </div>

        {(searchTerm || statusFilter !== "all") && (
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
            <button
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("all");
              }}
              className="px-3 py-1 rounded-full text-xs font-semibold transition-all hover:scale-105"
              style={{ background: "rgba(239, 68, 68, 0.2)", color: "#ef4444" }}
            >
              Clear All
            </button>
          </div>
        )}

        <p className="text-sm mt-3" style={{ color: "#64748b" }}>
          Showing{" "}
          <span className="font-semibold" style={{ color: "#1e293b" }}>
            {filteredCompanies.length}
          </span>{" "}
          of{" "}
          <span className="font-semibold" style={{ color: "#1e293b" }}>
            {totalCompanies}
          </span>{" "}
          companies
        </p>
      </NeumorphicCard>

      {/* Companies List */}
      {loading ? (
        <NeumorphicCard>
          <div className="text-center py-12">
            <div
              className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4"
              style={{
                background: "#e6eaf0",
                boxShadow: "inset 8px 8px 16px #c5c8cf, inset -8px -8px 16px #ffffff",
              }}
            >
              <RefreshCw className="w-8 h-8 animate-spin" style={{ color: "#667eea" }} />
            </div>
            <p style={{ color: "#64748b" }}>Loading companies...</p>
          </div>
        </NeumorphicCard>
      ) : filteredCompanies.length === 0 ? (
        <NeumorphicCard>
          <div className="text-center py-12">
            <Building2 className="w-16 h-16 mx-auto mb-4" style={{ color: "#cbd5e1" }} />
            <h3 className="text-xl font-semibold mb-2" style={{ color: "#1e293b" }}>
              No companies found
            </h3>
            <p style={{ color: "#64748b" }}>
              {searchTerm || statusFilter !== "all"
                ? "Try adjusting your filters"
                : "No companies have been created yet"}
            </p>
          </div>
        </NeumorphicCard>
      ) : (
        <div className="space-y-4">
          {filteredCompanies.map((company) => {
            const isExpanded = expandedCompany === company.id;
            const details = companyDetails[company.id];

            return (
              <NeumorphicCard key={company.id} className="hover:shadow-xl transition-all">
                {/* Company Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div
                      className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{
                        background: company.is_active
                          ? "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
                          : "linear-gradient(135deg, #94a3b8 0%, #64748b 100%)",
                        boxShadow: "3px 3px 6px rgba(0,0,0,0.15)",
                      }}
                    >
                      <Building2 className="w-8 h-8 text-white" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold" style={{ color: "#1e293b" }}>
                          {company.name}
                        </h3>
                        <span
                          className="px-3 py-1 rounded-full text-xs font-semibold"
                          style={{
                            background: company.is_active
                              ? "rgba(67, 233, 123, 0.2)"
                              : "rgba(148, 163, 184, 0.2)",
                            color: company.is_active ? "#43e97b" : "#64748b",
                          }}
                        >
                          {company.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4" style={{ color: "#667eea" }} />
                          <span style={{ color: "#64748b" }}>@{company.subdomain}</span>
                        </div>
                      
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" style={{ color: "#94a3b8" }} />
                          <span style={{ color: "#64748b" }}>
                            Created: {new Date(company.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => toggleCompanyExpansion(company)}
                    className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:scale-105"
                    style={{
                      background: "#ecf0f3",
                      boxShadow:
                        "3px 3px 6px rgba(163,177,198,0.4), -3px -3px 6px rgba(255,255,255, 0.8)",
                    }}
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5" style={{ color: "#667eea" }} />
                    ) : (
                      <ChevronRight className="w-5 h-5" style={{ color: "#667eea" }} />
                    )}
                  </button>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-4 gap-3 mt-4">
                  <div
                    className="p-3 rounded-xl cursor-pointer hover:shadow-lg transition-all"
                    style={{ background: "rgba(102, 126, 234, 0.1)" }}
                    onClick={() => showCompanyUsers(company)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="w-4 h-4" style={{ color: "#667eea" }} />
                      <p className="text-xs font-medium" style={{ color: "#667eea" }}>
                        Users
                      </p>
                    </div>
                    <p className="text-xl font-bold" style={{ color: "#1e293b" }}>
                      {company.user_count || 0}
                    </p>
                  </div>

                  <div
                    className="p-3 rounded-xl cursor-pointer hover:shadow-lg transition-all"
                    style={{ background: "rgba(67, 233, 123, 0.1)" }}
                    onClick={() => showCompanyClients(company)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="w-4 h-4" style={{ color: "#43e97b" }} />
                      <p className="text-xs font-medium" style={{ color: "#43e97b" }}>
                        Clients
                      </p>
                    </div>
                    <p className="text-xl font-bold" style={{ color: "#1e293b" }}>
                      {company.client_count || 0}
                    </p>
                  </div>

                  <div
                    className="p-3 rounded-xl"
                    style={{ background: "rgba(240, 147, 251, 0.1)" }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Package className="w-4 h-4" style={{ color: "#f093fb" }} />
                      <p className="text-xs font-medium" style={{ color: "#f093fb" }}>
                        Services
                      </p>
                    </div>
                    <p className="text-xl font-bold" style={{ color: "#1e293b" }}>
                      {company.service_count || 0}
                    </p>
                  </div>

                  <div
                    className="p-3 rounded-xl"
                    style={{ background: "rgba(79, 172, 254, 0.1)" }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="w-4 h-4" style={{ color: "#4facfe" }} />
                      <p className="text-xs font-medium" style={{ color: "#4facfe" }}>
                        Activity
                      </p>
                    </div>
                    <p className="text-xl font-bold" style={{ color: "#1e293b" }}>
                      {company.log_count || 0}
                    </p>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="mt-4 pt-4" style={{ borderTop: "1px solid rgba(148, 163, 184, 0.2)" }}>
                    {!details ? (
                      <div className="text-center py-6">
                        <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin" style={{ color: "#667eea" }} />
                        <p className="text-sm" style={{ color: "#64748b" }}>Loading details...</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Quick Actions */}
                        <div className="flex gap-3">
                          <button
                            onClick={() => showCompanyUsers(company)}
                            className="flex-1 px-4 py-3 rounded-xl font-semibold text-sm transition-all hover:scale-105 flex items-center justify-center gap-2"
                            style={{
                              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                              color: "white",
                              boxShadow: "4px 4px 8px rgba(102, 126, 234, 0.4)",
                            }}
                          >
                            <Users className="w-4 h-4" />
                            View All Users
                          </button>
                          <button
                            onClick={() => showCompanyClients(company)}
                            className="flex-1 px-4 py-3 rounded-xl font-semibold text-sm transition-all hover:scale-105 flex items-center justify-center gap-2"
                            style={{
                              background: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
                              color: "white",
                              boxShadow: "4px 4px 8px rgba(67, 233, 123, 0.4)",
                            }}
                          >
                            <FileText className="w-4 h-4" />
                            View All Clients
                          </button>
                        </div>

                        {/* Recent Users Preview */}
                        {details.users && details.users.length > 0 && (
                          <div>
                            <h4 className="text-sm font-bold mb-3" style={{ color: "#1e293b" }}>
                              Recent Users ({details.users.length})
                            </h4>
                            <div className="grid grid-cols-2 gap-2">
                              {details.users.slice(0, 4).map((user) => (
                                <div
                                  key={user.id}
                                  className="flex items-center gap-2 p-2 rounded-lg"
                                  style={{ background: "rgba(102, 126, 234, 0.05)" }}
                                >
                                  <div
                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                                    style={{
                                      background: user.is_admin
                                        ? "linear-gradient(135deg, #fa709a 0%, #fee140 100%)"
                                        : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                    }}
                                  >
                                    {(user.full_name || user.email || "").substring(0, 2).toUpperCase()}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold truncate" style={{ color: "#1e293b" }}>
                                      {user.full_name || "No name"}
                                    </p>
                                    <p className="text-xs truncate" style={{ color: "#64748b" }}>
                                      {user.email}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Recent Clients Preview */}
                        {details.clients && details.clients.length > 0 && (
                          <div>
                            <h4 className="text-sm font-bold mb-3" style={{ color: "#1e293b" }}>
                              Recent Clients ({details.clients.length})
                            </h4>
                            <div className="grid grid-cols-2 gap-2">
                              {details.clients.slice(0, 4).map((client) => (
                                <div
                                  key={client.id}
                                  className="flex items-center gap-2 p-2 rounded-lg"
                                  style={{ background: "rgba(67, 233, 123, 0.05)" }}
                                >
                                  <div
                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                                    style={{
                                      background: client.status === "active"
                                        ? "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
                                        : "linear-gradient(135deg, #94a3b8 0%, #64748b 100%)",
                                    }}
                                  >
                                    {(client.name || "").substring(0, 2).toUpperCase()}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold truncate" style={{ color: "#1e293b" }}>
                                      {client.name}
                                    </p>
                                    <p className="text-xs truncate" style={{ color: "#64748b" }}>
                                      {client.email || client.phone || "No contact"}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </NeumorphicCard>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CompanyManagementPage