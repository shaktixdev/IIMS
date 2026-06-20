"use client";

import React, { useEffect, useState } from "react";
import { AlertCircle, ArrowRight, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { AlertData } from "./AlertCard";

export function AlertPanel() {
  const [criticalAlerts, setCriticalAlerts] = useState<AlertData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = async () => {
    try {
      const res = await fetch("/api/alerts?severity=critical&status=unread");
      const json = await res.json();
      if (json.success) {
        setCriticalAlerts(json.data.slice(0, 3));
      }
    } catch (err) {
      console.error("Error fetching critical alerts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  if (loading) {
    return (
      <div className="bg-white border border-red-100 rounded-xl p-4 animate-pulse">
        <div className="h-5 w-40 bg-gray-200 rounded mb-4" />
        <div className="space-y-3">
          <div className="h-12 bg-gray-100 rounded" />
          <div className="h-12 bg-gray-100 rounded" />
        </div>
      </div>
    );
  }

  if (criticalAlerts.length === 0) {
    return null; // Don't show anything if there are no critical tasks pending
  }

  return (
    <div className="bg-gradient-to-br from-red-50 to-orange-50 border border-red-100 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center gap-2.5 mb-4 text-red-700">
        <ShieldAlert className="w-5 h-5 shrink-0" />
        <h3 className="font-bold text-sm">Critical Attention Required</h3>
        <span className="ml-auto text-xs bg-red-600 text-white font-semibold px-2 py-0.5 rounded-full">
          {criticalAlerts.length}
        </span>
      </div>

      <div className="space-y-3 mb-4">
        {criticalAlerts.map((alert) => (
          <div
            key={alert._id}
            className="bg-white/80 backdrop-blur-xs border border-red-100 rounded-xl p-3 flex gap-3 text-xs shadow-xs"
          >
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 truncate">{alert.title}</p>
              <p className="text-gray-600 mt-1 line-clamp-2 leading-relaxed">{alert.message}</p>
            </div>
          </div>
        ))}
      </div>

      <Link
        href="/alerts"
        className="inline-flex items-center gap-1 text-xs font-bold text-red-700 hover:text-red-900 transition-colors"
      >
        <span>Go to Alert Center</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
