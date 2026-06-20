"use client";

import React, { useState, useEffect } from "react";
import VendorsTable from "@/components/purchase/VendorsTable";
import VendorDetailDrawer from "@/components/purchase/VendorDetailDrawer";
import { Button } from "@/components/ui/button";
import { Plus, Building2, Loader2 } from "lucide-react";
import Link from "next/link";

export default function VendorsPage() {
  const [selectedVendor, setSelectedVendor] = useState<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [stats, setStats] = useState({ total: 0, active: 0, thisMonthPOs: 0 });
  const [loadingStats, setLoadingStats] = useState(true);

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const [allRes, activeRes, poRes] = await Promise.all([
        fetch("/api/vendors?limit=1&isActive=false"),
        fetch("/api/vendors?limit=1&isActive=true"),
        fetch(`/api/purchase-orders?limit=1&dateFrom=${new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()}`),
      ]);
      const allJson = await allRes.json();
      const activeJson = await activeRes.json();
      const poJson = await poRes.json();
      setStats({
        total: allJson.pagination?.total || 0,
        active: activeJson.pagination?.total || 0,
        thisMonthPOs: poJson.pagination?.total || 0,
      });
    } catch (err) { console.error("Error fetching vendor stats:", err); }
    finally { setLoadingStats(false); }
  };

  useEffect(() => { fetchStats(); }, []);

  const handleVendorClick = (vendor: any) => { setSelectedVendor(vendor); setDrawerOpen(true); };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <h1 className="text-xl font-bold text-gray-900">Suppliers</h1>
          <div className="flex items-center gap-3">
            <Link href="/vendors/new">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 h-9 px-4 text-sm font-medium shadow-sm">
                <Plus className="w-4 h-4" /> Add Supplier
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 divide-x divide-gray-100 mt-6 pt-5 border-t border-gray-100">
          {[
            { label: "Total Vendors", value: stats.total, color: "text-blue-600" },
            { label: "Active", value: stats.active, color: "text-emerald-600" },
            { label: "POs This Month", value: stats.thisMonthPOs, color: "text-amber-500" },
          ].map((item, i) => (
            <div key={item.label} className={i === 0 ? "pr-4" : i === 2 ? "pl-4" : "px-4"}>
              <p className={`text-xs font-semibold uppercase tracking-wide ${item.color}`}>{item.label}</p>
              {loadingStats ? <Loader2 className="w-4 h-4 animate-spin text-gray-400 mt-2" /> : (
                <p className="text-2xl font-extrabold text-gray-900 mt-1">{item.value}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      <VendorsTable onVendorClick={handleVendorClick} />
      <VendorDetailDrawer vendor={selectedVendor} open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
