"use client";

import React, { useState, useEffect } from "react";
import POTable from "@/components/purchase/POTable";
import { Button } from "@/components/ui/button";
import { Plus, ShoppingCart, Loader2, Zap } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function PurchaseOrdersPage() {
  const [stats, setStats] = useState({ total: 0, draft: 0, sent: 0, overdue: 0 });
  const [loadingStats, setLoadingStats] = useState(true);
  const [autoLoading, setAutoLoading] = useState(false);

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const [totalRes, draftRes, sentRes] = await Promise.all([
        fetch("/api/purchase-orders?limit=1"),
        fetch("/api/purchase-orders?limit=1&status=draft"),
        fetch("/api/purchase-orders?limit=1&status=sent"),
      ]);
      const totalJson = await totalRes.json();
      const draftJson = await draftRes.json();
      const sentJson = await sentRes.json();
      setStats({
        total: totalJson.pagination?.total || 0,
        draft: draftJson.pagination?.total || 0,
        sent: sentJson.pagination?.total || 0,
        overdue: 0,
      });
    } catch (err) { console.error("Error fetching PO stats:", err); }
    finally { setLoadingStats(false); }
  };

  useEffect(() => { fetchStats(); }, []);

  const handleAutoPO = async () => {
    setAutoLoading(true);
    try {
      const res = await fetch("/api/purchase-orders/auto", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      const json = await res.json();
      if (json.success) {
        const { createdPOs } = json.data;
        if (createdPOs === 0) toast.info("No items currently require reorder.");
        else { toast.success(`Created ${createdPOs} draft PO(s).`); fetchStats(); window.location.reload(); }
      } else toast.error(json.error?.message || "Failed to run auto-PO generator.");
    } catch { toast.error("Error running auto-PO generator."); }
    finally { setAutoLoading(false); }
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <h1 className="text-xl font-bold text-gray-900">Orders</h1>
          <div className="flex gap-3">
            <Button onClick={handleAutoPO} disabled={autoLoading}
              className="bg-white hover:bg-amber-50 border border-gray-200 hover:border-amber-300 text-gray-700 rounded-lg h-9 px-4 flex items-center gap-2 text-sm font-medium">
              {autoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 text-amber-500" />} Auto-PO
            </Button>
            <Link href="/purchase-orders/new">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-9 px-4 flex items-center gap-2 text-sm font-medium shadow-sm">
                <Plus className="w-4 h-4" /> Create PO
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-gray-100 mt-6 pt-5 border-t border-gray-100">
          {[
            { label: "Total POs", value: stats.total, color: "text-blue-600" },
            { label: "Drafts", value: stats.draft, color: "text-gray-600" },
            { label: "Awaiting Delivery", value: stats.sent, color: "text-amber-500" },
            { label: "Overdue", value: stats.overdue, color: "text-red-500" },
          ].map((m, i) => (
            <div key={m.label} className={i === 0 ? "pr-4" : i === 3 ? "pl-4" : "px-4"}>
              <p className={`text-xs font-semibold uppercase tracking-wide ${m.color}`}>{m.label}</p>
              {loadingStats ? <Loader2 className="w-4 h-4 animate-spin text-gray-400 mt-2" /> : (
                <p className="text-2xl font-extrabold text-gray-900 mt-1">{m.value}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      <POTable />
    </div>
  );
}
