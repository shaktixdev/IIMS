"use client";

import React, { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Users,
  UserPlus,
  Search,
  MoreHorizontal,
  Shield,
  ShieldCheck,
  ShieldAlert,
  UserCog,
  User,
  Eye,
  Package,
  ShoppingCart,
  Loader2,
  CheckCircle2,
  XCircle,
  ChevronDown,
  X,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────
type Role = "super_admin" | "admin" | "manager" | "store_keeper" | "procurement" | "viewer";

interface UserRecord {
  _id: string;
  name: string;
  email: string;
  role: Role;
  phone?: string;
  department?: string;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
}

// ── Role Config ────────────────────────────────────────────────────────────────
const ROLE_CONFIG: Record<Role, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  super_admin: {
    label: "Super Admin",
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/30",
    icon: <ShieldAlert className="w-3.5 h-3.5" />,
  },
  admin: {
    label: "Admin",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    icon: <ShieldCheck className="w-3.5 h-3.5" />,
  },
  manager: {
    label: "Manager",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    icon: <UserCog className="w-3.5 h-3.5" />,
  },
  store_keeper: {
    label: "Store Keeper",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    icon: <Package className="w-3.5 h-3.5" />,
  },
  procurement: {
    label: "Procurement",
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/30",
    icon: <ShoppingCart className="w-3.5 h-3.5" />,
  },
  viewer: {
    label: "Viewer",
    color: "text-gray-400",
    bg: "bg-gray-500/10",
    border: "border-gray-500/30",
    icon: <Eye className="w-3.5 h-3.5" />,
  },
};

const ALL_ROLES: Role[] = ["super_admin", "admin", "manager", "store_keeper", "procurement", "viewer"];

// ── Sub-components ─────────────────────────────────────────────────────────────
function RoleBadge({ role }: { role: Role }) {
  const cfg = ROLE_CONFIG[role] || ROLE_CONFIG.viewer;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const sizeClass = size === "sm" ? "w-8 h-8 text-xs" : size === "lg" ? "w-12 h-12 text-lg" : "w-10 h-10 text-sm";
  const colors = ["from-blue-500 to-blue-600", "from-purple-500 to-purple-600", "from-emerald-500 to-emerald-600", "from-amber-500 to-amber-600", "from-cyan-500 to-cyan-600", "from-rose-500 to-rose-600"];
  const colorIdx = name.charCodeAt(0) % colors.length;
  return (
    <div className={`${sizeClass} rounded-full bg-gradient-to-br ${colors[colorIdx]} flex items-center justify-center text-white font-bold shrink-0 shadow-sm`}>
      {initials}
    </div>
  );
}

// ── User Form Modal ────────────────────────────────────────────────────────────
interface UserFormData {
  name: string; email: string; password: string; role: Role; phone: string; department: string;
}
const emptyForm: UserFormData = { name: "", email: "", password: "", role: "viewer", phone: "", department: "" };

interface UserModalProps {
  mode: "add" | "edit";
  user?: UserRecord;
  onClose: () => void;
  onSave: () => void;
}

function UserModal({ mode, user, onClose, onSave }: UserModalProps) {
  const [form, setForm] = useState<UserFormData>(
    mode === "edit" && user
      ? { name: user.name, email: user.email, password: "", role: user.role, phone: user.phone || "", department: user.department || "" }
      : emptyForm
  );
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<UserFormData>>({});

  const set = (k: keyof UserFormData, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  };

  const validate = () => {
    const err: Partial<UserFormData> = {};
    if (!form.name.trim()) err.name = "Name is required";
    if (!form.email.trim()) err.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) err.email = "Invalid email";
    if (mode === "add" && !form.password) err.password = "Password is required";
    if (form.password && form.password.length < 6) err.password = "Min 6 characters";
    return err;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (Object.keys(err).length) { setErrors(err); return; }
    setSaving(true);
    try {
      const body: Record<string, string> = { name: form.name, email: form.email, role: form.role, phone: form.phone, department: form.department };
      if (form.password) body.password = form.password;
      const url = mode === "add" ? "/api/users" : `/api/users/${user!._id}`;
      const method = mode === "add" ? "POST" : "PATCH";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message || "Failed");
      toast.success(mode === "add" ? "User created successfully!" : "User updated successfully!");
      onSave();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              {mode === "add" ? <UserPlus className="w-5 h-5 text-blue-500" /> : <UserCog className="w-5 h-5 text-blue-500" />}
            </div>
            <div>
              <h2 className="font-bold text-gray-900">{mode === "add" ? "Add New User" : "Edit User"}</h2>
              <p className="text-xs text-gray-500">{mode === "add" ? "Create a new system user" : `Editing ${user?.name}`}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Full Name *</label>
              <input type="text" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Rahul Sharma"
                className={`w-full border rounded-xl px-3 py-2.5 text-sm bg-gray-50 text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 ${errors.name ? "border-red-400" : "border-gray-300"}`}
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Email *</label>
              <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="user@company.com"
                disabled={mode === "edit"}
                className={`w-full border rounded-xl px-3 py-2.5 text-sm bg-gray-50 text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed ${errors.email ? "border-red-400" : "border-gray-300"}`}
              />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              {mode === "add" ? "Password *" : "New Password (leave blank to keep)"}
            </label>
            <input type="password" value={form.password} onChange={(e) => set("password", e.target.value)} placeholder="••••••••"
              className={`w-full border rounded-xl px-3 py-2.5 text-sm bg-gray-50 text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 ${errors.password ? "border-red-400" : "border-gray-300"}`}
            />
            {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Role *</label>
            <div className="relative">
              <select value={form.role} onChange={(e) => set("role", e.target.value as Role)}
                className="w-full appearance-none border border-gray-300 rounded-xl px-3 py-2.5 pr-10 text-sm bg-gray-50 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">
                {ALL_ROLES.map((r) => <option key={r} value={r}>{ROLE_CONFIG[r].label}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Phone</label>
              <input type="text" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+91 98765 43210"
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm bg-gray-50 text-gray-900 placeholder-gray-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Department</label>
              <input type="text" value={form.department} onChange={(e) => set("department", e.target.value)} placeholder="e.g. Operations"
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm bg-gray-50 text-gray-900 placeholder-gray-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2 border-t border-gray-100 mt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2 transition-colors shadow-sm">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <>{mode === "add" ? "Create User" : "Save Changes"}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Actions Dropdown ───────────────────────────────────────────────────────────
interface ActionMenuProps {
  user: UserRecord;
  currentUserRole: Role;
  currentUserId: string;
  onEdit: () => void;
  onToggleActive: () => void;
}

function ActionMenu({ user, currentUserRole, currentUserId, onEdit, onToggleActive }: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const isSelf = user._id === currentUserId;
  const canDeactivate = currentUserRole === "super_admin" && !isSelf;

  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 z-20 bg-white border border-gray-200 rounded-xl shadow-xl py-1.5 w-44 text-sm">
            <button onClick={() => { setOpen(false); onEdit(); }} className="w-full flex items-center gap-2.5 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors">
              <UserCog className="w-4 h-4 text-gray-400" /> Edit User
            </button>
            {canDeactivate && (
              <button onClick={() => { setOpen(false); onToggleActive(); }}
                className={`w-full flex items-center gap-2.5 px-4 py-2 transition-colors ${user.isActive ? "text-red-600 hover:bg-red-50" : "text-emerald-600 hover:bg-emerald-50"}`}>
                {user.isActive ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                {user.isActive ? "Deactivate" : "Reactivate"}
              </button>
            )}
            {isSelf && <p className="px-4 py-2 text-xs text-gray-400 italic">Cannot modify yourself</p>}
          </div>
        </>
      )}
    </div>
  );
}

// ── Main Client Component ──────────────────────────────────────────────────────
interface UsersClientProps {
  currentRole: string;
  currentUserId: string;
}

export default function UsersClient({ currentRole, currentUserId }: UsersClientProps) {
  const role = currentRole as Role;
  const canManage = role === "super_admin" || role === "admin";

  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<UserRecord | undefined>();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users", { cache: "no-store" });
      const data = await res.json();
      if (data.success) setUsers(data.data);
      else toast.error(data.error?.message || "Failed to load users");
    } catch {
      toast.error("Could not reach server");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (canManage) fetchUsers(); }, [canManage, fetchUsers]);

  const handleToggleActive = async (u: UserRecord) => {
    if (u.isActive) {
      if (!confirm(`Deactivate ${u.name}? They will lose access immediately.`)) return;
      try {
        const res = await fetch(`/api/users/${u._id}`, { method: "DELETE" });
        const data = await res.json();
        if (!data.success) throw new Error(data.error?.message);
        toast.success(`${u.name} deactivated.`);
        fetchUsers();
      } catch (e) { toast.error((e as Error).message); }
    } else {
      try {
        const res = await fetch(`/api/users/${u._id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: true }) });
        const data = await res.json();
        if (!data.success) throw new Error(data.error?.message);
        toast.success(`${u.name} reactivated.`);
        fetchUsers();
      } catch (e) { toast.error((e as Error).message); }
    }
  };

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchQ = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    const matchStatus = statusFilter === "all" || (statusFilter === "active" ? u.isActive : !u.isActive);
    return matchQ && matchRole && matchStatus;
  });

  const stats = {
    total: users.length,
    active: users.filter((u) => u.isActive).length,
    admins: users.filter((u) => u.role === "super_admin" || u.role === "admin").length,
    recent: users.filter((u) => u.lastLogin && new Date(u.lastLogin) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length,
  };

  if (!canManage) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Shield className="w-16 h-16 text-red-400 mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-500">You need Admin or Super Admin privileges to manage users.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Users", value: stats.total, icon: <Users className="w-5 h-5" />, color: "text-blue-500", bg: "bg-blue-500/10" },
          { label: "Active", value: stats.active, icon: <CheckCircle2 className="w-5 h-5" />, color: "text-emerald-500", bg: "bg-emerald-500/10" },
          { label: "Admins", value: stats.admins, icon: <Shield className="w-5 h-5" />, color: "text-purple-500", bg: "bg-purple-500/10" },
          { label: "Active This Week", value: stats.recent, icon: <RefreshCw className="w-5 h-5" />, color: "text-amber-500", bg: "bg-amber-500/10" },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl ${s.bg} ${s.color} flex items-center justify-center shrink-0`}>{s.icon}</div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Header + Controls */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">User Management</h2>
              <p className="text-xs text-gray-500">{filtered.length} of {users.length} users shown</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchUsers} className="w-9 h-9 flex items-center justify-center border border-gray-200 rounded-xl text-gray-400 hover:text-gray-700 hover:border-gray-300 transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={() => { setEditUser(undefined); setShowModal(true); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm">
              <UserPlus className="w-4 h-4" /> Add User
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="px-6 py-3 border-b border-gray-100 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or email..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/20 bg-gray-50 text-gray-900 placeholder-gray-400 transition-colors"
            />
          </div>
          <div className="relative">
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as Role | "all")}
              className="appearance-none pl-3 pr-8 py-2 border border-gray-200 rounded-xl text-sm text-gray-700 bg-gray-50 focus:outline-none focus:border-blue-400 cursor-pointer">
              <option value="all">All Roles</option>
              {ALL_ROLES.map((r) => <option key={r} value={r}>{ROLE_CONFIG[r].label}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
              className="appearance-none pl-3 pr-8 py-2 border border-gray-200 rounded-xl text-sm text-gray-700 bg-gray-50 focus:outline-none focus:border-blue-400 cursor-pointer">
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <User className="w-12 h-12 text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No users found</p>
            <p className="text-gray-400 text-sm mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {["User", "Role", "Department", "Last Login", "Status", ""].map((h) => (
                    <th key={h} className="px-6 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((u) => (
                  <tr key={u._id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={u.name} size="md" />
                        <div>
                          <p className="font-semibold text-gray-900 leading-tight">{u.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4"><RoleBadge role={u.role} /></td>
                    <td className="px-6 py-4 text-gray-600 text-sm">{u.department || <span className="text-gray-300">—</span>}</td>
                    <td className="px-6 py-4 text-gray-500 text-sm whitespace-nowrap">
                      {u.lastLogin
                        ? new Date(u.lastLogin).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                        : <span className="text-gray-300">Never</span>}
                    </td>
                    <td className="px-6 py-4">
                      {u.isActive ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 bg-gray-100 border border-gray-200 px-2.5 py-1 rounded-full">
                          <div className="w-1.5 h-1.5 rounded-full bg-gray-400" /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <ActionMenu
                        user={u}
                        currentUserRole={role}
                        currentUserId={currentUserId}
                        onEdit={() => { setEditUser(u); setShowModal(true); }}
                        onToggleActive={() => handleToggleActive(u)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Security Note */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-semibold text-amber-700">Security Notice</p>
          <p className="text-amber-600 mt-0.5">
            User deactivation is permanent until reactivated. Deactivated users cannot log in. Only Super Admins can deactivate accounts. Passwords are hashed with bcrypt (12 rounds).
          </p>
        </div>
      </div>

      {showModal && (
        <UserModal
          mode={editUser ? "edit" : "add"}
          user={editUser}
          onClose={() => { setShowModal(false); setEditUser(undefined); }}
          onSave={() => { setShowModal(false); setEditUser(undefined); fetchUsers(); }}
        />
      )}
    </div>
  );
}
