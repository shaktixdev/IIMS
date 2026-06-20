"use client";

import React, { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Search, BellRing, CheckSquare, Filter } from "lucide-react";
import { AlertCard, AlertData } from "./AlertCard";
import { useSocket } from "@/lib/socket/client";

export function AlertCenter() {
  const { socket } = useSocket();
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "unread" | "read">("all");
  const [severityFilter, setSeverityFilter] = useState<"all" | "critical" | "warning" | "info">("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (severityFilter !== "all") params.append("severity", severityFilter);
      if (typeFilter !== "all") params.append("type", typeFilter);

      const res = await fetch(`/api/alerts?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setAlerts(json.data);
      }
    } catch (err) {
      console.error("Error loading alerts:", err);
      toast.error("Failed to load alerts");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, severityFilter, typeFilter]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // Live Socket listeners for real-time state synchronization
  useEffect(() => {
    if (!socket) return;

    // Listen to new alerts
    socket.on("new-alert", (newAlert: AlertData) => {
      const matchesStatus = statusFilter === "all" || statusFilter === "unread";
      const matchesSeverity = severityFilter === "all" || severityFilter === newAlert.severity;
      const matchesType = typeFilter === "all" || typeFilter === newAlert.type;

      if (matchesStatus && matchesSeverity && matchesType) {
        setAlerts((prev) => {
          if (prev.some((a) => a._id === newAlert._id)) return prev;
          return [newAlert, ...prev];
        });
      }
    });

    // Listen to single alert marked as read
    socket.on("alert-read", (id: string) => {
      setAlerts((prev) =>
        prev.map((alert) =>
          alert._id === id ? { ...alert, status: "read" } : alert
        )
      );
    });

    // Listen to all alerts marked as read
    socket.on("alerts-all-read", () => {
      setAlerts((prev) =>
        prev.map((alert) => ({ ...alert, status: "read" }))
      );
    });

    // Listen to alert deleted
    socket.on("alert-deleted", (payload: { id: string; wasUnread: boolean }) => {
      setAlerts((prev) => prev.filter((alert) => alert._id !== payload.id));
    });

    return () => {
      socket.off("new-alert");
      socket.off("alert-read");
      socket.off("alerts-all-read");
      socket.off("alert-deleted");
    };
  }, [socket, statusFilter, severityFilter, typeFilter]);

  const handleMarkAsRead = async (id: string) => {
    try {
      const res = await fetch(`/api/alerts/${id}/read`, { method: "PATCH" });
      const json = await res.json();
      if (json.success) {
        setAlerts((prev) =>
          prev.map((alert) =>
            alert._id === id ? { ...alert, status: "read" } : alert
          )
        );
        toast.success("Alert marked as read");
      }
    } catch (err) {
      console.error("Failed to mark alert as read:", err);
      toast.error("Error updating alert");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/alerts/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        setAlerts((prev) => prev.filter((alert) => alert._id !== id));
        toast.success("Alert deleted");
      }
    } catch (err) {
      console.error("Failed to delete alert:", err);
      toast.error("Error deleting alert");
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const res = await fetch("/api/alerts/mark-all-read", { method: "POST" });
      const json = await res.json();
      if (json.success) {
        setAlerts((prev) =>
          prev.map((alert) => ({ ...alert, status: "read" }))
        );
        toast.success("All alerts marked as read");
      }
    } catch (err) {
      console.error("Failed to mark all as read:", err);
      toast.error("Error updating alerts");
    }
  };

  const filteredAlerts = alerts.filter((alert) => {
    const query = searchQuery.toLowerCase();
    return (
      alert.title.toLowerCase().includes(query) ||
      alert.message.toLowerCase().includes(query) ||
      (alert.item?.name && alert.item.name.toLowerCase().includes(query)) ||
      (alert.item?.sku && alert.item.sku.toLowerCase().includes(query))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-white p-4 rounded-xl border border-gray-100 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center animate-pulse">
            <BellRing className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900">Alert Center</h2>
            <p className="text-xs text-gray-400">Manage real-time notifications and system warnings.</p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleMarkAllAsRead}
            disabled={alerts.filter(a => a.status === "unread").length === 0}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 transition-colors"
          >
            <CheckSquare className="w-4 h-4" />
            <span>Mark All as Read</span>
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search alerts by title, description, or item SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 focus:bg-white focus:ring-1 focus:ring-blue-400/30 transition-all placeholder:text-gray-400"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-1 text-xs font-bold text-gray-400 uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5" />
            <span>Filters</span>
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | "unread" | "read")}
              className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-semibold rounded-lg border border-gray-200 outline-none transition-colors"
            >
              <option value="all">All Statuses</option>
              <option value="unread">Unread Only</option>
              <option value="read">Read Only</option>
            </select>

            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value as "all" | "critical" | "warning" | "info")}
              className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-semibold rounded-lg border border-gray-200 outline-none transition-colors"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-semibold rounded-lg border border-gray-200 outline-none transition-colors"
            >
              <option value="all">All Categories</option>
              <option value="low_stock">Low Stock</option>
              <option value="expiry_warning">Expiry Warnings</option>
              <option value="po_overdue">PO Overdue</option>
              <option value="delayed_delivery">Delayed Delivery</option>
              <option value="info">System Info</option>
            </select>
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-white border border-gray-100 rounded-xl p-4 animate-pulse space-y-2">
                <div className="h-4 w-1/4 bg-gray-200 rounded" />
                <div className="h-4 w-3/4 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-2xl py-12 px-4 text-center shadow-xs flex flex-col items-center justify-center gap-2">
            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-400">
              <BellRing className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-gray-900 text-sm">No Alerts Found</h3>
            <p className="text-xs text-gray-400 max-w-xs">There are no alerts matching your current selection criteria.</p>
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <AlertCard
              key={alert._id}
              alert={alert}
              onMarkAsRead={handleMarkAsRead}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>
    </div>
  );
}
