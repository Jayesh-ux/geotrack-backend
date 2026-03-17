import React, { useState, useEffect } from "react";
import { Package,RefreshCw, MapPin, Download, Search, CheckCircle, XCircle, User, ExternalLink } from "lucide-react";

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

const ClientsPage = ({ 
  clients, 
  clientsPage, 
  clientsTotalPages, 
  clientsTotal,
  onRefresh,
  onPageChange ,
  onEditServices
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [allClients, setAllClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState(clients);
  const [isSearching, setIsSearching] = useState(false);
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState("all");
  const [gpsFilter, setGpsFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name-asc");

  // Fetch all clients for stats
  useEffect(() => {
    const fetchAllClients = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch('https://geo-track-1.onrender.com/admin/clients?limit=10000', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        setAllClients(data.clients || []);
      } catch (err) {
        console.error("Failed to fetch all clients:", err);
      }
    };
    fetchAllClients();
  }, [clients]);

  // Handle search and filters
  useEffect(() => {
    let filtered = allClients;

    // Apply search
    if (searchTerm.trim() !== "") {
      setIsSearching(true);
      filtered = filtered.filter(client =>
        client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.pincode?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    } else {
      setIsSearching(false);
      filtered = clients;
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(client => client.status === statusFilter);
    }

    // Apply GPS filter
    if (gpsFilter === "with-gps") {
      filtered = filtered.filter(client => client.latitude && client.longitude);
    } else if (gpsFilter === "without-gps") {
      filtered = filtered.filter(client => !client.latitude || !client.longitude);
    }

    // Apply sorting
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "name-asc":
          return (a.name || "").localeCompare(b.name || "");
        case "name-desc":
          return (b.name || "").localeCompare(a.name || "");
        case "date-asc":
          return new Date(a.created_at) - new Date(b.created_at);
        case "date-desc":
          return new Date(b.created_at) - new Date(a.created_at);
        case "pincode-asc":
          return (a.pincode || "").localeCompare(b.pincode || "");
        case "pincode-desc":
          return (b.pincode || "").localeCompare(a.pincode || "");
        default:
          return 0;
      }
    });

    setFilteredClients(filtered);
  }, [searchTerm, clients, allClients, statusFilter, gpsFilter, sortBy]);

  const goToPage = (p) => {
    if (p < 1 || p > clientsTotalPages) return;
    setSearchTerm(""); // Clear search when changing pages
    onPageChange(p);
  };

  // Calculate stats from ALL clients
  const totalActive = allClients.filter(c => c.status === "active").length;
  const totalWithGPS = allClients.filter(c => c.latitude && c.longitude).length;
  const uniqueAreas = new Set(allClients.filter(c => c.pincode).map(c => c.pincode)).size;

  // Pagination with first and last
  const pages = [];
  const startPage = Math.max(1, clientsPage - 1);
  const endPage = Math.min(clientsTotalPages, clientsPage + 1);
  
  if (startPage > 1) pages.push(1);
  if (startPage > 2) pages.push('...');
  
  for (let i = startPage; i <= endPage; i++) pages.push(i);
  
  if (endPage < clientsTotalPages - 1) pages.push('...');
  if (endPage < clientsTotalPages) pages.push(clientsTotalPages);

  // Export to CSV function
  const handleExportCSV = () => {
    const headers = ["Name", "Email", "Phone", "Status", "Pincode", "Latitude", "Longitude", "Created At"];
    const csvData = allClients.map(client => [
      client.name || "",
      client.email || "",
      client.phone || "",
      client.status || "",
      client.pincode || "",
      client.latitude || "",
      client.longitude || "",
      new Date(client.created_at).toLocaleString()
    ]);

    const csvContent = [
      headers.join(","),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `clients_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5">
      {/* Search and Filter Bar */}
      <NeumorphicCard>
        <div className="grid grid-cols-12 gap-4">
          {/* Search */}
          <div className="col-span-6 relative">
            <Search 
              className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5" 
              style={{ color: '#94a3b8' }}
            />
            <input
              type="text"
              placeholder="Search across all clients by name, email, phone, or pincode..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 text-sm font-medium transition-all"
              style={{
                background: '#e6eaf0',
                border: 'none',
                borderRadius: '12px',
                color: '#1e293b',
                boxShadow: 'inset 4px 4px 8px #c5c8cf, inset -4px -4px 8px #ffffff',
              }}
            />
          </div>

          {/* Status Filter */}
          <div className="col-span-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-3 text-sm font-medium transition-all"
              style={{
                background: '#e6eaf0',
                border: 'none',
                borderRadius: '12px',
                color: '#1e293b',
                boxShadow: 'inset 4px 4px 8px #c5c8cf, inset -4px -4px 8px #ffffff',
              }}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* GPS Filter */}
          <div className="col-span-2">
            <select
              value={gpsFilter}
              onChange={(e) => setGpsFilter(e.target.value)}
              className="w-full px-4 py-3 text-sm font-medium transition-all"
              style={{
                background: '#e6eaf0',
                border: 'none',
                borderRadius: '12px',
                color: '#1e293b',
                boxShadow: 'inset 4px 4px 8px #c5c8cf, inset -4px -4px 8px #ffffff',
              }}
            >
              <option value="all">All GPS</option>
              <option value="with-gps">With GPS</option>
              <option value="without-gps">Without GPS</option>
            </select>
          </div>

          {/* Sort */}
          <div className="col-span-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-4 py-3 text-sm font-medium transition-all"
              style={{
                background: '#e6eaf0',
                border: 'none',
                borderRadius: '12px',
                color: '#1e293b',
                boxShadow: 'inset 4px 4px 8px #c5c8cf, inset -4px -4px 8px #ffffff',
              }}
            >
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
              <option value="date-asc">Oldest First</option>
              <option value="date-desc">Newest First</option>
              <option value="pincode-asc">Pincode (Asc)</option>
              <option value="pincode-desc">Pincode (Desc)</option>
            </select>
          </div>
        </div>

        {isSearching && (
          <p className="text-xs mt-3" style={{ color: '#667eea' }}>
            Searching across all {clientsTotal} clients... Found {filteredClients.length} results
          </p>
        )}

        {/* Active Filters Display */}
        {(statusFilter !== 'all' || gpsFilter !== 'all' || sortBy !== 'name-asc') && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className="text-xs font-semibold" style={{ color: '#94a3b8' }}>Active Filters:</span>
            {statusFilter !== 'all' && (
              <span
                className="px-3 py-1 rounded-full text-xs font-semibold"
                style={{ background: 'rgba(102, 126, 234, 0.2)', color: '#667eea' }}
              >
                Status: {statusFilter}
              </span>
            )}
            {gpsFilter !== 'all' && (
              <span
                className="px-3 py-1 rounded-full text-xs font-semibold"
                style={{ background: 'rgba(67, 233, 123, 0.2)', color: '#43e97b' }}
              >
                {gpsFilter === 'with-gps' ? 'With GPS' : 'Without GPS'}
              </span>
            )}
            {sortBy !== 'name-asc' && (
              <span
                className="px-3 py-1 rounded-full text-xs font-semibold"
                style={{ background: 'rgba(240, 147, 251, 0.2)', color: '#f093fb' }}
              >
                Sort: {sortBy.replace('-', ' ')}
              </span>
            )}
            <button
              onClick={() => {
                setStatusFilter('all');
                setGpsFilter('all');
                setSortBy('name-asc');
              }}
              className="px-3 py-1 rounded-full text-xs font-semibold transition-all hover:scale-105"
              style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }}
            >
              Clear All
            </button>
          </div>
        )}
      </NeumorphicCard>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          title="Total Clients"
          value={clientsTotal}
          subtitle="All registered clients"
          icon={User}
          gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
        />
        <StatCard
          title="Active"
          value={totalActive}
          subtitle="Currently active"
          icon={CheckCircle}
          gradient="linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
        />
        <StatCard
          title="With GPS"
          value={totalWithGPS}
          subtitle="Have location data"
          icon={MapPin}
          gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
        />
        <StatCard
          title="Areas"
          value={uniqueAreas}
          subtitle="Unique pincodes"
          icon={MapPin}
          gradient="linear-gradient(135deg, #fa709a 0%, #fee140 100%)"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end">
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
        <button 
          onClick={handleExportCSV}
          className="px-5 py-3 rounded-xl font-semibold text-sm transition-all hover:scale-105 flex items-center gap-2"
          style={{
            background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
            color: 'white',
            boxShadow: '4px 4px 8px rgba(67, 233, 123, 0.4)',
          }}
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Clients Table */}
      <NeumorphicCard>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '2px solid rgba(148, 163, 184, 0.2)' }}>
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide" style={{ color: '#94a3b8' }}>Client</th>
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide" style={{ color: '#94a3b8' }}>Contact</th>
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide" style={{ color: '#94a3b8' }}>Status</th>
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide" style={{ color: '#94a3b8' }}>Location</th>
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide" style={{ color: '#94a3b8' }}>GPS</th>
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide" style={{ color: '#94a3b8' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-12">
                    <User className="w-12 h-12 mx-auto mb-3" style={{ color: '#cbd5e1' }} />
                    <h3 className="text-lg font-semibold mb-1" style={{ color: '#1e293b' }}>No clients found</h3>
                    <p className="text-sm" style={{ color: '#64748b' }}>
                      {isSearching ? "Try adjusting your search" : "No clients available"}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredClients.map((client, idx) => (
                  <tr 
                    key={client.id}
                    className="hover:bg-gray-50 transition-colors"
                    style={{ 
                      borderBottom: idx !== filteredClients.length - 1 ? '1px solid rgba(148, 163, 184, 0.1)' : 'none'
                    }}
                  >
                    {/* Client Name */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                          style={{
                            background: client.status === "active"
                              ? 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
                              : 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)',
                            boxShadow: '2px 2px 4px rgba(0,0,0,0.1)',
                          }}
                        >
                          {(client.name || "").substring(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate" style={{ color: '#1e293b' }}>
                            {client.name}
                          </p>
                          {client.tally_guid && (
                            <span
                              className="text-xs px-2 py-0.5 rounded-full font-medium inline-block mt-1"
                              style={{ background: 'rgba(102, 126, 234, 0.2)', color: '#667eea' }}
                            >
                              Tally
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="py-4 px-4">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: '#1e293b' }}>
                          {client.email || "No email"}
                        </p>
                        <p className="text-xs truncate" style={{ color: '#64748b' }}>
                          {client.phone || "No phone"}
                        </p>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4">
                      <span
                        className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap"
                        style={{
                          background: client.status === "active" ? 'rgba(67, 233, 123, 0.2)' : 'rgba(148, 163, 184, 0.2)',
                          color: client.status === "active" ? '#43e97b' : '#64748b',
                        }}
                      >
                        {client.status === "active" ? <CheckCircle className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                        {client.status}
                      </span>
                    </td>

                    {/* Location */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        {client.pincode ? (
                          <>
                            <MapPin className="w-4 h-4 text-green-500 flex-shrink-0" />
                            <span className="text-sm font-medium" style={{ color: '#1e293b' }}>
                              {client.pincode}
                            </span>
                          </>
                        ) : (
                          <span className="text-sm" style={{ color: '#94a3b8' }}>No pincode</span>
                        )}
                      </div>
                    </td>

                    {/* GPS */}
                    <td className="py-4 px-4">
                      {client.latitude && client.longitude ? (
                        <a
                          href={`https://www.google.com/maps?q=${client.latitude},${client.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium hover:underline"
                          style={{ color: '#667eea' }}
                        >
                          <ExternalLink className="w-3 h-3" />
                          View Map
                        </a>
                      ) : (
                        <span className="text-sm" style={{ color: '#94a3b8' }}>No GPS</span>
                      )}
                    </td>

                    {/* Created */}
                    {/* Actions */}
<td className="py-4 px-4">
  <div className="flex items-center gap-2">
    <button
      onClick={() => onEditServices && onEditServices(client)}
      className="px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:scale-105 flex items-center gap-1"
      style={{
        background: '#ecf0f3',
        boxShadow: '3px 3px 6px rgba(163,177,198,0.4), -3px -3px 6px rgba(255,255,255, 0.8)',
        color: '#667eea',
      }}
      title="Manage Services"
    >
      <Package className="w-3 h-3" />
      Services
    </button>
    <span className="text-xs" style={{ color: '#94a3b8' }}>
      {new Date(client.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })}
    </span>
  </div>
</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </NeumorphicCard>

      {/* Pagination */}
      {!isSearching && clientsTotalPages > 1 && (
        <NeumorphicCard>
          <div className="flex items-center justify-between">
            <p className="text-sm" style={{ color: '#64748b' }}>
              Page <span className="font-semibold" style={{ color: '#1e293b' }}>{clientsPage}</span> of{" "}
              <span className="font-semibold" style={{ color: '#1e293b' }}>{clientsTotalPages}</span>
              {" "}• Showing <span className="font-semibold" style={{ color: '#1e293b' }}>{((clientsPage - 1) * 50) + 1}</span> to{" "}
              <span className="font-semibold" style={{ color: '#1e293b' }}>{Math.min(clientsPage * 50, clientsTotal)}</span> of{" "}
              <span className="font-semibold" style={{ color: '#1e293b' }}>{clientsTotal}</span> clients
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => goToPage(clientsPage - 1)}
                disabled={clientsPage <= 1}
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
                    onClick={() => goToPage(p)}
                    className="px-4 py-2 rounded-xl font-semibold text-sm transition-all hover:scale-105"
                    style={
                      p === clientsPage
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
                onClick={() => goToPage(clientsPage + 1)}
                disabled={clientsPage >= clientsTotalPages}
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

export default ClientsPage;