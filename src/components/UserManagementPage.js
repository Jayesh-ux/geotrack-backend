import React, { useState } from "react";
import {
  RefreshCw,
  User,
  Plus,
  Edit2,
  Trash2,
  Shield,
  CheckCircle,
  XCircle,
  Mail,
  Clock,
  Key,
  Search,
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

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl"
        style={{
          background: "#ecf0f3",
          boxShadow: "12px 12px 24px rgba(163,177,198,0.6)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="sticky top-0 flex items-center justify-between p-6 border-b"
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

const UserManagementPage = ({ users, onRefresh, currentUserId }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form states for Add User
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    fullName: "",
    department: "",
    workHoursStart: "",
    workHoursEnd: "",
    isAdmin: false,
  });

  // Form states for Edit User
  const [editUser, setEditUser] = useState({
    email: "",
    fullName: "",
    department: "",
    workHoursStart: "",
    workHoursEnd: "",
    isAdmin: false,
  });

  // Form state for Password Reset
  const [newPassword, setNewPassword] = useState("");

  const token = localStorage.getItem("token");

  // Filter users
  const filteredUsers = users.filter(
    (user) =>
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.department?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Stats
  const adminCount = users.filter((u) => u.is_admin).length;
  const regularCount = users.length - adminCount;

  const handleAddUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`${API_BASE_URL}/admin/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newUser),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create user");
      }

      setSuccess(`User ${newUser.email} created successfully!`);
      setNewUser({
        email: "",
        password: "",
        fullName: "",
        department: "",
        workHoursStart: "",
        workHoursEnd: "",
        isAdmin: false,
      });
      setTimeout(() => {
        setIsAddModalOpen(false);
        setSuccess("");
        onRefresh();
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/admin/users/${selectedUser.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(editUser),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update user");
      }

      setSuccess(`User updated successfully!`);
      setTimeout(() => {
        setIsEditModalOpen(false);
        setSuccess("");
        setSelectedUser(null);
        onRefresh();
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/admin/users/${selectedUser.id}/reset-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ newPassword }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to reset password");
      }

      setSuccess(`Password reset successfully for ${data.email}!`);
      setNewPassword("");
      setTimeout(() => {
        setIsPasswordModalOpen(false);
        setSuccess("");
        setSelectedUser(null);
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (user) => {
    if (user.id === currentUserId) {
      alert("You cannot delete your own account!");
      return;
    }

    if (
      !window.confirm(
        `Are you sure you want to DELETE ${user.email}? This action cannot be undone and will remove all their data (logs, meetings, expenses).`
      )
    ) {
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`${API_BASE_URL}/admin/users/${user.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete user");
      }

      setSuccess(`User ${data.email} deleted successfully!`);
      setTimeout(() => {
        setSuccess("");
        onRefresh();
      }, 2000);
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(""), 3000);
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setEditUser({
      email: user.email || "",
      fullName: user.full_name || "",
      department: user.department || "",
      workHoursStart: user.work_hours_start || "",
      workHoursEnd: user.work_hours_end || "",
      isAdmin: user.is_admin || false,
    });
    setIsEditModalOpen(true);
  };

  const openPasswordModal = (user) => {
    setSelectedUser(user);
    setNewPassword("");
    setIsPasswordModalOpen(true);
  };

  return (
    <div className="space-y-5">
      {/* Global Messages */}
      {error && (
        <div
          className="p-4 rounded-2xl border-l-4"
          style={{
            background: "#fed7d7",
            borderColor: "#fc8181",
            boxShadow: "4px 4px 8px rgba(252,129,129,0.3)",
          }}
        >
          <p style={{ color: "#c53030" }} className="font-medium">
            {error}
          </p>
        </div>
      )}

      {success && (
        <div
          className="p-4 rounded-2xl border-l-4"
          style={{
            background: "#c6f6d5",
            borderColor: "#48bb78",
            boxShadow: "4px 4px 8px rgba(72,187,120,0.3)",
          }}
        >
          <p style={{ color: "#22543d" }} className="font-medium">
            {success}
          </p>
        </div>
      )}

      {/* Header with Search and Add Button */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search
            className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5"
            style={{ color: "#94a3b8" }}
          />
          <input
            type="text"
            placeholder="Search users by name, email, or department..."
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
        <button
          onClick={() => {
            setIsAddModalOpen(true);
            setError("");
            setSuccess("");
          }}
          className="px-5 py-3 rounded-xl font-semibold text-sm transition-all hover:scale-105 flex items-center gap-2"
          style={{
            background: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
            color: "white",
            boxShadow: "4px 4px 8px rgba(67, 233, 123, 0.4)",
          }}
        >
          <Plus className="w-4 h-4" />
          Add User
        </button>
        <button
          onClick={onRefresh}
          className="px-5 py-3 rounded-xl font-semibold text-sm transition-all hover:scale-105 flex items-center gap-2"
          style={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            boxShadow: "4px 4px 8px rgba(102, 126, 234, 0.4)",
          }}
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <NeumorphicCard>
          <div className="flex items-center justify-between">
            <div>
              <p
                className="text-xs font-semibold uppercase tracking-wide mb-1"
                style={{ color: "#94a3b8" }}
              >
                Total Users
              </p>
              <h3 className="text-3xl font-bold" style={{ color: "#1e293b" }}>
                {users.length}
              </h3>
            </div>
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                boxShadow: "3px 3px 6px rgba(0,0,0,0.15)",
              }}
            >
              <User className="w-6 h-6 text-white" />
            </div>
          </div>
        </NeumorphicCard>

        <NeumorphicCard>
          <div className="flex items-center justify-between">
            <div>
              <p
                className="text-xs font-semibold uppercase tracking-wide mb-1"
                style={{ color: "#94a3b8" }}
              >
                Administrators
              </p>
              <h3 className="text-3xl font-bold" style={{ color: "#1e293b" }}>
                {adminCount}
              </h3>
            </div>
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
                boxShadow: "3px 3px 6px rgba(0,0,0,0.15)",
              }}
            >
              <Shield className="w-6 h-6 text-white" />
            </div>
          </div>
        </NeumorphicCard>

        <NeumorphicCard>
          <div className="flex items-center justify-between">
            <div>
              <p
                className="text-xs font-semibold uppercase tracking-wide mb-1"
                style={{ color: "#94a3b8" }}
              >
                Regular Users
              </p>
              <h3 className="text-3xl font-bold" style={{ color: "#1e293b" }}>
                {regularCount}
              </h3>
            </div>
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
                boxShadow: "3px 3px 6px rgba(0,0,0,0.15)",
              }}
            >
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
          </div>
        </NeumorphicCard>
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredUsers.length === 0 ? (
          <div className="col-span-full">
            <NeumorphicCard>
              <div className="text-center py-12">
                <User
                  className="w-16 h-16 mx-auto mb-4"
                  style={{ color: "#cbd5e1" }}
                />
                <h3
                  className="text-xl font-semibold mb-2"
                  style={{ color: "#1e293b" }}
                >
                  No users found
                </h3>
                <p style={{ color: "#64748b" }}>
                  {searchTerm
                    ? "Try adjusting your search"
                    : "Start by adding team members"}
                </p>
              </div>
            </NeumorphicCard>
          </div>
        ) : (
          filteredUsers.map((user) => {
            const isCurrentUser = user.id === currentUserId;
            return (
              <NeumorphicCard
                key={user.id}
                className="hover:shadow-xl transition-all duration-300"
              >
                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="relative">
                    <div
                      className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                      style={{
                        background: user.is_admin
                          ? "linear-gradient(135deg, #fa709a 0%, #fee140 100%)"
                          : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        boxShadow: "3px 3px 6px rgba(0,0,0,0.15)",
                      }}
                    >
                      {(user.full_name || user.email || "")
                        .substring(0, 2)
                        .toUpperCase()}
                    </div>
                    {user.is_admin && (
                      <div
                        className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
                        style={{
                          background: "#fa709a",
                          border: "2px solid #ecf0f3",
                        }}
                      >
                        <Shield className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3
                      className="text-base font-bold mb-1 truncate"
                      style={{ color: "#1e293b" }}
                    >
                      {user.full_name || "No name"}
                      {isCurrentUser && (
                        <span
                          className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full"
                          style={{
                            background: "rgba(102, 126, 234, 0.2)",
                            color: "#667eea",
                          }}
                        >
                          You
                        </span>
                      )}
                    </h3>
                    {user.is_admin && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{
                          background: "rgba(250, 112, 154, 0.2)",
                          color: "#fa709a",
                        }}
                      >
                        Administrator
                      </span>
                    )}
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Mail
                      className="w-4 h-4 flex-shrink-0"
                      style={{ color: "#94a3b8" }}
                    />
                    <p
                      className="text-sm truncate"
                      style={{ color: "#1e293b" }}
                    >
                      {user.email}
                    </p>
                  </div>

                  {user.department && (
                    <div className="flex items-center gap-2">
                      <User
                        className="w-4 h-4 flex-shrink-0"
                        style={{ color: "#94a3b8" }}
                      />
                      <p
                        className="text-sm truncate"
                        style={{ color: "#1e293b" }}
                      >
                        {user.department}
                      </p>
                    </div>
                  )}

                  {user.work_hours_start && user.work_hours_end && (
                    <div className="flex items-center gap-2">
                      <Clock
                        className="w-4 h-4 flex-shrink-0"
                        style={{ color: "#94a3b8" }}
                      />
                      <p className="text-sm" style={{ color: "#1e293b" }}>
                        {user.work_hours_start} - {user.work_hours_end}
                      </p>
                    </div>
                  )}

                  <div className="text-xs" style={{ color: "#64748b" }}>
                    Joined:{" "}
                    {new Date(user.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => openEditModal(user)}
                    className="px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:scale-105 flex items-center justify-center gap-1"
                    style={{
                      background: "#ecf0f3",
                      boxShadow:
                        "3px 3px 6px rgba(163,177,198,0.4), -3px -3px 6px rgba(255,255,255, 0.8)",
                      color: "#667eea",
                    }}
                  >
                    <Edit2 className="w-3 h-3" />
                    Edit
                  </button>
                  <button
                    onClick={() => openPasswordModal(user)}
                    className="px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:scale-105 flex items-center justify-center gap-1"
                    style={{
                      background: "#ecf0f3",
                      boxShadow:
                        "3px 3px 6px rgba(163,177,198,0.4), -3px -3px 6px rgba(255,255,255, 0.8)",
                      color: "#43e97b",
                    }}
                  >
                    <Key className="w-3 h-3" />
                    Reset
                  </button>
                  <button
                    onClick={() => handleDeleteUser(user)}
                    disabled={isCurrentUser || loading}
                    className="px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:scale-105 flex items-center justify-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      background: "#ecf0f3",
                      boxShadow:
                        "3px 3px 6px rgba(163,177,198,0.4), -3px -3px 6px rgba(255,255,255, 0.8)",
                      color: "#ef4444",
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete
                  </button>
                </div>
              </NeumorphicCard>
            );
          })
        )}
      </div>

      {/* Add User Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New User"
      >
        <form onSubmit={handleAddUser} className="space-y-4">
          <div>
            <label
              className="block text-sm font-semibold mb-2"
              style={{ color: "#1e293b" }}
            >
              Email *
            </label>
            <input
              type="email"
              required
              value={newUser.email}
              onChange={(e) =>
                setNewUser({ ...newUser, email: e.target.value })
              }
              className="w-full px-4 py-3 rounded-xl"
              style={{
                background: "#e6eaf0",
                border: "none",
                color: "#1e293b",
                boxShadow:
                  "inset 4px 4px 8px #c5c8cf, inset -4px -4px 8px #ffffff",
              }}
              placeholder="user@example.com"
            />
          </div>

          <div>
            <label
              className="block text-sm font-semibold mb-2"
              style={{ color: "#1e293b" }}
            >
              Password * (min. 6 characters)
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={newUser.password}
              onChange={(e) =>
                setNewUser({ ...newUser, password: e.target.value })
              }
              className="w-full px-4 py-3 rounded-xl"
              style={{
                background: "#e6eaf0",
                border: "none",
                color: "#1e293b",
                boxShadow:
                  "inset 4px 4px 8px #c5c8cf, inset -4px -4px 8px #ffffff",
              }}
              placeholder="••••••••"
            />
          </div>

          <div>
            <label
              className="block text-sm font-semibold mb-2"
              style={{ color: "#1e293b" }}
            >
              Full Name
            </label>
            <input
              type="text"
              value={newUser.fullName}
              onChange={(e) =>
                setNewUser({ ...newUser, fullName: e.target.value })
              }
              className="w-full px-4 py-3 rounded-xl"
              style={{
                background: "#e6eaf0",
                border: "none",
                color: "#1e293b",
                boxShadow:
                  "inset 4px 4px 8px #c5c8cf, inset -4px -4px 8px #ffffff",
              }}
              placeholder="John Doe"
            />
          </div>

          <div>
            <label
              className="block text-sm font-semibold mb-2"
              style={{ color: "#1e293b" }}
            >
              Department
            </label>
            <input
              type="text"
              value={newUser.department}
              onChange={(e) =>
                setNewUser({ ...newUser, department: e.target.value })
              }
              className="w-full px-4 py-3 rounded-xl"
              style={{
                background: "#e6eaf0",
                border: "none",
                color: "#1e293b",
                boxShadow:
                  "inset 4px 4px 8px #c5c8cf, inset -4px -4px 8px #ffffff",
              }}
              placeholder="Sales, Marketing, etc."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                className="block text-sm font-semibold mb-2"
                style={{ color: "#1e293b" }}
              >
                Work Start Time
              </label>
              <input
                type="time"
                value={newUser.workHoursStart}
                onChange={(e) =>
                  setNewUser({ ...newUser, workHoursStart: e.target.value })
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
                Work End Time
              </label>
              <input
                type="time"
                value={newUser.workHoursEnd}
                onChange={(e) =>
                  setNewUser({ ...newUser, workHoursEnd: e.target.value })
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
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isAdmin"
              checked={newUser.isAdmin}
              onChange={(e) =>
                setNewUser({ ...newUser, isAdmin: e.target.checked })
              }
              className="w-5 h-5 rounded"
              style={{ accentColor: "#667eea" }}
            />
            <label
              htmlFor="isAdmin"
              className="text-sm font-semibold cursor-pointer"
              style={{ color: "#1e293b" }}
            >
              Grant Administrator Privileges
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
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
              type="submit"
              disabled={loading}
              className="flex-1 px-5 py-3 rounded-xl font-semibold transition-all hover:scale-105 disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
                color: "white",
                boxShadow: "4px 4px 8px rgba(67, 233, 123, 0.4)",
              }}
            >
              {loading ? "Creating..." : "Create User"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedUser(null);
        }}
        title={`Edit User - ${selectedUser?.email || ""}`}
      >
        <form onSubmit={handleEditUser} className="space-y-4">
          <div>
            <label
              className="block text-sm font-semibold mb-2"
              style={{ color: "#1e293b" }}
            >
              Email
            </label>
            <input
              type="email"
              required
              value={editUser.email}
              onChange={(e) =>
                setEditUser({ ...editUser, email: e.target.value })
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
              Full Name
            </label>
            <input
              type="text"
              value={editUser.fullName}
              onChange={(e) =>
                setEditUser({ ...editUser, fullName: e.target.value })
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
              Department
            </label>
            <input
              type="text"
              value={editUser.department}
              onChange={(e) =>
                setEditUser({ ...editUser, department: e.target.value })
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                className="block text-sm font-semibold mb-2"
                style={{ color: "#1e293b" }}
              >
                Work Start Time
              </label>
              <input
                type="time"
                value={editUser.workHoursStart}
                onChange={(e) =>
                  setEditUser({ ...editUser, workHoursStart: e.target.value })
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
                Work End Time
              </label>
              <input
                type="time"
                value={editUser.workHoursEnd}
                onChange={(e) =>
                  setEditUser({ ...editUser, workHoursEnd: e.target.value })
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
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="editIsAdmin"
              checked={editUser.isAdmin}
              onChange={(e) =>
                setEditUser({ ...editUser, isAdmin: e.target.checked })
              }
              className="w-5 h-5 rounded"
              style={{ accentColor: "#667eea" }}
            />
            <label
              htmlFor="editIsAdmin"
              className="text-sm font-semibold cursor-pointer"
              style={{ color: "#1e293b" }}
            >
              Administrator Privileges
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setIsEditModalOpen(false);
                setSelectedUser(null);
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
              type="submit"
              disabled={loading}
              className="flex-1 px-5 py-3 rounded-xl font-semibold transition-all hover:scale-105 disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
                boxShadow: "4px 4px 8px rgba(102, 126, 234, 0.4)",
              }}
            >
              {loading ? "Updating..." : "Update User"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        isOpen={isPasswordModalOpen}
        onClose={() => {
          setIsPasswordModalOpen(false);
          setSelectedUser(null);
          setNewPassword("");
        }}
        title={`Reset Password - ${selectedUser?.email || ""}`}
      >
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div
            className="p-4 rounded-xl"
            style={{
              background: "rgba(251, 191, 36, 0.1)",
              border: "1px solid rgba(251, 191, 36, 0.3)",
            }}
          >
            <p className="text-sm" style={{ color: "#92400e" }}>
              ⚠️ This will reset the password for{" "}
              <strong>{selectedUser?.email}</strong> and log them out of all
              devices.
            </p>
          </div>

          <div>
            <label
              className="block text-sm font-semibold mb-2"
              style={{ color: "#1e293b" }}
            >
              New Password (min. 6 characters)
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl"
              style={{
                background: "#e6eaf0",
                border: "none",
                color: "#1e293b",
                boxShadow:
                  "inset 4px 4px 8px #c5c8cf, inset -4px -4px 8px #ffffff",
              }}
              placeholder="••••••••"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setIsPasswordModalOpen(false);
                setSelectedUser(null);
                setNewPassword("");
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
              type="submit"
              disabled={loading}
              className="flex-1 px-5 py-3 rounded-xl font-semibold transition-all hover:scale-105 disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
                color: "white",
                boxShadow: "4px 4px 8px rgba(250, 112, 154, 0.4)",
              }}
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default UserManagementPage;