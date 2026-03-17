import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  DollarSign,
  AlertCircle,
  Clock,
  FileText
} from 'lucide-react';

const API_BASE_URL = "https://geo-track-1.onrender.com";

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl"
        style={{
          background: "#ecf0f3",
          boxShadow: "12px 12px 24px rgba(163,177,198,0.6)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="sticky top-0 flex items-center justify-between p-6 border-b z-10"
          style={{
            background: "#ecf0f3",
            borderColor: "rgba(148, 163, 184, 0.2)",
          }}
        >
          <h2 className="text-2xl font-bold" style={{ color: "#1e293b" }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:scale-105"
            style={{
              background: "#ecf0f3",
              boxShadow:
                "3px 3px 6px rgba(163,177,198,0.4), -3px -3px 6px rgba(255,255,255, 0.8)",
            }}
          >
            <X className="w-5 h-5" style={{ color: "#64748b" }} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

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

const ClientServicesModal = ({ client, onClose }) => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingService, setEditingService] = useState(null);

  const [formData, setFormData] = useState({
    serviceName: "",
    description: "",
    status: "active",
    startDate: new Date().toISOString().split('T')[0],
    expiryDate: "",
    price: "",
    notes: ""
  });

  const token = localStorage.getItem("token");

  useEffect(() => {
    if (client) {
      fetchServices();
    }
  }, [client]);

  const fetchServices = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `${API_BASE_URL}/services/client/${client.id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          console.log(`No services yet for ${client.name}`);
          setServices([]);
          setLoading(false);
          return;
        }
        throw new Error("Failed to load services");
      }

      const data = await response.json();
      setServices(data.services || []);
    } catch (err) {
      console.error("Error fetching services:", err);
      setError("Could not load services. You can still add new ones.");
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const url = editingService
        ? `${API_BASE_URL}/services/${editingService.id}`
        : `${API_BASE_URL}/services/client/${client.id}`;

      const response = await fetch(url, {
        method: editingService ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save service");
      }

      setSuccess(
        editingService
          ? "Service updated successfully!"
          : "Service created successfully!"
      );
      
      // Reset
      setFormData({
        serviceName: "",
        description: "",
        status: "active",
        startDate: new Date().toISOString().split('T')[0],
        expiryDate: "",
        price: "",
        notes: ""
      });
      setShowAddForm(false);
      setEditingService(null);
      
      await fetchServices();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (service) => {
    setEditingService(service);
    setFormData({
      serviceName: service.service_name || "",
      description: service.description || "",
      status: service.status || "active",
      startDate: service.start_date ? new Date(service.start_date).toISOString().split('T')[0] : "",
      expiryDate: service.expiry_date ? new Date(service.expiry_date).toISOString().split('T')[0] : "",
      price: service.price || "",
      notes: service.notes || ""
    });
    setShowAddForm(true);
  };

  const handleDelete = async (serviceId) => {
    if (!window.confirm("Are you sure you want to delete this service?")) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/services/${serviceId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to delete service");
      }

      setSuccess("Service deleted successfully!");
      await fetchServices();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return { bg: 'rgba(67, 233, 123, 0.2)', color: '#43e97b' };
      case 'expired':
        return { bg: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' };
      case 'cancelled':
        return { bg: 'rgba(148, 163, 184, 0.2)', color: '#64748b' };
      default:
        return { bg: 'rgba(102, 126, 234, 0.2)', color: '#667eea' };
    }
  };

  const isExpiringSoon = (expiryDate) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  };

  return (
    <Modal
      isOpen={!!client}
      onClose={onClose}
      title={`Services - ${client?.name || 'Client'}`}
    >
      {error && (
        <div
          className="mb-4 p-4 rounded-2xl border-l-4"
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

      {success && (
        <div
          className="mb-4 p-4 rounded-2xl border-l-4"
          style={{
            background: "#c6f6d5",
            borderColor: "#48bb78",
          }}
        >
          <p style={{ color: "#22543d" }} className="font-medium">
            {success}
          </p>
        </div>
      )}

      {!showAddForm && (
        <button
          onClick={() => {
            setShowAddForm(true);
            setEditingService(null);
            setFormData({
              serviceName: "",
              description: "",
              status: "active",
              startDate: new Date().toISOString().split('T')[0],
              expiryDate: "",
              price: "",
              notes: ""
            });
          }}
          className="w-full mb-6 p-4 rounded-xl font-semibold transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
          style={{
            background: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
            color: "white",
            boxShadow: "4px 4px 8px rgba(67, 233, 123, 0.4)",
          }}
        >
          <Plus className="w-5 h-5" />
          Add New Service
        </button>
      )}

      {showAddForm && (
        <NeumorphicCard className="mb-6">
          <h3 className="text-lg font-bold mb-4" style={{ color: "#1e293b" }}>
            {editingService ? "Edit Service" : "Add New Service"}
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  className="block text-sm font-semibold mb-2"
                  style={{ color: "#1e293b" }}
                >
                  Service Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.serviceName}
                  onChange={(e) =>
                    setFormData({ ...formData, serviceName: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-xl"
                  style={{
                    background: "#e6eaf0",
                    border: "none",
                    color: "#1e293b",
                    boxShadow:
                      "inset 4px 4px 8px #c5c8cf, inset -4px -4px 8px #ffffff",
                  }}
                  placeholder="e.g., Accounting Software"
                />
              </div>

              <div>
                <label
                  className="block text-sm font-semibold mb-2"
                  style={{ color: "#1e293b" }}
                >
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-xl"
                  style={{
                    background: "#e6eaf0",
                    border: "none",
                    color: "#1e293b",
                    boxShadow:
                      "inset 4px 4px 8px #c5c8cf, inset -4px -4px 8px #ffffff",
                  }}
                >
                  <option value="active">Active</option>
                  <option value="expired">Expired</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <div>
              <label
                className="block text-sm font-semibold mb-2"
                style={{ color: "#1e293b" }}
              >
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
                className="w-full px-4 py-3 rounded-xl"
                style={{
                  background: "#e6eaf0",
                  border: "none",
                  color: "#1e293b",
                  boxShadow:
                    "inset 4px 4px 8px #c5c8cf, inset -4px -4px 8px #ffffff",
                }}
                placeholder="Service description..."
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label
                  className="block text-sm font-semibold mb-2"
                  style={{ color: "#1e293b" }}
                >
                  Start Date
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) =>
                    setFormData({ ...formData, startDate: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-xl"
                  style={{
                    background: "#e6eaf0",
                    border: "none",
                    color: "#1e293b",
                    boxShadow:
                      "inset 4px 4px 8px #c5c8cf, inset -4px -4px 8px #ffffff",
                  }}
                />
              </div>

              <div>
                <label
                  className="block text-sm font-semibold mb-2"
                  style={{ color: "#1e293b" }}
                >
                  Expiry Date
                </label>
                <input
                  type="date"
                  value={formData.expiryDate}
                  onChange={(e) =>
                    setFormData({ ...formData, expiryDate: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-xl"
                  style={{
                    background: "#e6eaf0",
                    border: "none",
                    color: "#1e293b",
                    boxShadow:
                      "inset 4px 4px 8px #c5c8cf, inset -4px -4px 8px #ffffff",
                  }}
                />
              </div>

              <div>
                <label
                  className="block text-sm font-semibold mb-2"
                  style={{ color: "#1e293b" }}
                >
                  Price (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-xl"
                  style={{
                    background: "#e6eaf0",
                    border: "none",
                    color: "#1e293b",
                    boxShadow:
                      "inset 4px 4px 8px #c5c8cf, inset -4px -4px 8px #ffffff",
                  }}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label
                className="block text-sm font-semibold mb-2"
                style={{ color: "#1e293b" }}
              >
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                rows={2}
                className="w-full px-4 py-3 rounded-xl"
                style={{
                  background: "#e6eaf0",
                  border: "none",
                  color: "#1e293b",
                  boxShadow:
                    "inset 4px 4px 8px #c5c8cf, inset -4px -4px 8px #ffffff",
                }}
                placeholder="Additional notes..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setEditingService(null);
                }}
                className="flex-1 px-5 py-3 rounded-xl font-semibold transition-all hover:scale-105"
                style={{
                  background: "#ecf0f3",
                  boxShadow:
                    "3px 3px 6px rgba(163,177,198,0.4), -3px -3px 6px rgba(255,255,255, 0.8)",
                  color: "#64748b",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 px-5 py-3 rounded-xl font-semibold transition-all hover:scale-105 disabled:opacity-50"
                style={{
                  background:
                    "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
                  color: "white",
                  boxShadow: "4px 4px 8px rgba(67, 233, 123, 0.4)",
                }}
              >
                {loading ? "Saving..." : editingService ? "Update Service" : "Create Service"}
              </button>
            </div>
          </div>
        </NeumorphicCard>
      )}

      {loading && !showAddForm ? (
        <div className="text-center py-12">
          <div
            className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4"
            style={{
              background: "#e6eaf0",
              boxShadow:
                "inset 8px 8px 16px #c5c8cf, inset -8px -8px 16px #ffffff",
            }}
          >
            <Clock className="w-8 h-8" style={{ color: "#667eea" }} />
          </div>
          <p style={{ color: "#64748b" }}>Loading services...</p>
        </div>
      ) : services.length === 0 ? (
        <NeumorphicCard>
          <div className="text-center py-12">
            <FileText
              className="w-16 h-16 mx-auto mb-4"
              style={{ color: "#cbd5e1" }}
            />
            <h3
              className="text-xl font-semibold mb-2"
              style={{ color: "#1e293b" }}
            >
              No services found
            </h3>
            <p style={{ color: "#64748b" }}>
              Add services to track what this client is using
            </p>
          </div>
        </NeumorphicCard>
      ) : (
        <div className="space-y-4">
          {services.map((service) => {
            const statusColors = getStatusColor(service.status);
            const expiringSoon = isExpiringSoon(service.expiry_date);

            return (
              <NeumorphicCard
                key={service.id}
                className="hover:shadow-xl transition-all duration-300"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3
                        className="text-lg font-bold"
                        style={{ color: "#1e293b" }}
                      >
                        {service.service_name}
                      </h3>
                      <span
                        className="px-3 py-1 rounded-full text-xs font-semibold"
                        style={{
                          background: statusColors.bg,
                          color: statusColors.color,
                        }}
                      >
                        {service.status}
                      </span>
                      {expiringSoon && (
                        <span
                          className="px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1"
                          style={{
                            background: "rgba(251, 191, 36, 0.2)",
                            color: "#f59e0b",
                          }}
                        >
                          <AlertCircle className="w-3 h-3" />
                          Expiring Soon
                        </span>
                      )}
                    </div>
                    {service.description && (
                      <p className="text-sm mb-3" style={{ color: "#64748b" }}>
                        {service.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(service)}
                      className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:scale-105"
                      style={{
                        background: "#ecf0f3",
                        boxShadow:
                          "3px 3px 6px rgba(163,177,198,0.4), -3px -3px 6px rgba(255,255,255, 0.8)",
                        color: "#667eea",
                      }}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(service.id)}
                      className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:scale-105"
                      style={{
                        background: "#ecf0f3",
                        boxShadow:
                          "3px 3px 6px rgba(163,177,198,0.4), -3px -3px 6px rgba(255,255,255, 0.8)",
                        color: "#ef4444",
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div
                    className="p-3 rounded-xl"
                    style={{ background: "rgba(102, 126, 234, 0.1)" }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar
                        className="w-4 h-4"
                        style={{ color: "#667eea" }}
                      />
                      <p
                        className="text-xs font-medium"
                        style={{ color: "#667eea" }}
                      >
                        Start Date
                      </p>
                    </div>
                    <p className="text-sm font-semibold" style={{ color: "#1e293b" }}>
                      {service.start_date
                        ? new Date(service.start_date).toLocaleDateString()
                        : "N/A"}
                    </p>
                  </div>

                  <div
                    className="p-3 rounded-xl"
                    style={{ background: expiringSoon ? "rgba(251, 191, 36, 0.1)" : "rgba(240, 147, 251, 0.1)" }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar
                        className="w-4 h-4"
                        style={{ color: expiringSoon ? "#f59e0b" : "#f093fb" }}
                      />
                      <p
                        className="text-xs font-medium"
                        style={{ color: expiringSoon ? "#f59e0b" : "#f093fb" }}
                      >
                        Expiry Date
                      </p>
                    </div>
                    <p className="text-sm font-semibold" style={{ color: "#1e293b" }}>
                      {service.expiry_date
                        ? new Date(service.expiry_date).toLocaleDateString()
                        : "No expiry"}
                    </p>
                  </div>
                </div>

                {service.price && (
                  <div
                    className="flex items-center gap-2 p-3 rounded-xl mb-3"
                    style={{ background: "rgba(67, 233, 123, 0.1)" }}
                  >
                    <DollarSign
                      className="w-4 h-4"
                      style={{ color: "#43e97b" }}
                    />
                    <div>
                      <p
                        className="text-xs font-medium"
                        style={{ color: "#43e97b" }}
                      >
                        Price
                      </p>
                      <p
                        className="text-sm font-semibold"
                        style={{ color: "#1e293b" }}
                      >
                        ₹{parseFloat(service.price).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}

                {service.notes && (
                  <div
                    className="p-3 rounded-xl mb-3"
                    style={{ background: "rgba(148, 163, 184, 0.1)" }}
                  >
                    <p
                      className="text-xs font-medium mb-1"
                      style={{ color: "#94a3b8" }}
                    >
                      Notes
                    </p>
                    <p className="text-sm" style={{ color: "#1e293b" }}>
                      {service.notes}
                    </p>
                  </div>
                )}

                <div
                  className="pt-3 flex items-center justify-between text-xs"
                  style={{ borderTop: "1px solid rgba(148, 163, 184, 0.2)" }}
                >
                  <span style={{ color: "#64748b" }}>
                    Created: {new Date(service.created_at).toLocaleDateString()}
                  </span>
                  {service.createdByName && (
                    <span style={{ color: "#64748b" }}>
                      By: {service.createdByName}
                    </span>
                  )}
                </div>
              </NeumorphicCard>
            );
          })}
        </div>
      )}
    </Modal>
  );
};

export default ClientServicesModal;