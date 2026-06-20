"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { 
  ClipboardList, 
  Plus, 
  RotateCcw, 
  TrendingUp, 
  Package, 
  AlertCircle, 
  Loader2,
  Calendar,
  Layers,
  ArrowRight
} from "lucide-react";
import { toast } from "sonner";

interface IssueVoucher {
  _id: string;
  ivNumber: string;
  requester: {
    name: string;
    departmentName: string;
  };
  status: "issued" | "partial_return" | "fully_returned" | "draft" | "cancelled";
  createdAt: string;
  items: {
    issuedQty: number;
  }[];
}

interface LowStockItem {
  _id: string;
  name: string;
  sku: string;
  minStockLevel: number;
  totalOnHand: number;
}

export default function StorekeeperDashboard() {
  const { data: session } = useSession();
  const [issues, setIssues] = useState<IssueVoucher[]>([]);
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch issues and low stock items in parallel
    Promise.all([
      fetch("/api/issues").then((res) => res.json()),
      fetch("/api/items?status=low_stock").then((res) => res.json())
    ])
      .then(([issuesData, itemsData]) => {
        if (issuesData.success) setIssues(issuesData.data);
        if (itemsData.success) setLowStockItems(itemsData.data);
      })
      .catch((err) => {
        console.error(err);
        toast.error("Error loading dashboard data");
      })
      .finally(() => setLoading(false));
  }, []);

  // Compute stats
  const today = new Date().toDateString();
  const todayIssues = issues.filter(
    (issue) => new Date(issue.createdAt).toDateString() === today
  );
  
  const issuesCount = todayIssues.length;
  const itemsIssuedCount = todayIssues.reduce(
    (acc, issue) => acc + issue.items.reduce((sum, item) => sum + item.issuedQty, 0),
    0
  );
  const pendingReturnsCount = issues.filter(
    (issue) => issue.status === "issued" || issue.status === "partial_return"
  ).length;

  const stats = [
    {
      name: "Today's Issue Slips",
      value: issuesCount,
      icon: ClipboardList,
      color: "text-blue-600 bg-blue-50 border-blue-100",
      description: "slips processed today"
    },
    {
      name: "Materials Issued Today",
      value: itemsIssuedCount,
      icon: TrendingUp,
      color: "text-emerald-600 bg-emerald-50 border-emerald-100",
      description: "individual items checked out"
    },
    {
      name: "Vouchers with Pending Returns",
      value: pendingReturnsCount,
      icon: RotateCcw,
      color: "text-amber-600 bg-amber-50 border-amber-100",
      description: "awaiting material returns"
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Welcome Banner */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            Storekeeper Workspace
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Welcome back, <strong>{session?.user?.name || "Storekeeper"}</strong>. Manage slips and materials checkouts.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/storekeeper/issue/new">
            <button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center gap-2 h-10 px-4 text-sm font-semibold transition-all shadow-sm">
              <Plus className="w-4 h-4" /> New Material Issue
            </button>
          </Link>
          <Link href="/storekeeper/returns">
            <button className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-xl flex items-center gap-2 h-10 px-4 text-sm font-semibold transition-all shadow-sm">
              <RotateCcw className="w-4 h-4" /> Returns Desk
            </button>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="py-24 flex justify-center"><Loader2 className="w-10 h-10 animate-spin text-gray-300" /></div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {stats.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div key={i} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex items-center gap-4">
                  <div className={`p-3 rounded-xl border ${stat.color} shrink-0`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">{stat.name}</span>
                    <span className="text-2xl font-black text-gray-900 mt-0.5 block">{stat.value}</span>
                    <span className="text-[10px] text-gray-500 mt-1 block">{stat.description}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Core Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left 2 Columns: Recent Issues */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                <h2 className="text-lg font-bold text-gray-900">Today's Issue Vouchers</h2>
                <Link href="/storekeeper/issue" className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1">
                  View all slips <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse min-w-[500px]">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/20">
                      <th className="px-6 py-3">Voucher #</th>
                      <th className="px-6 py-3">Worker / Dept</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {todayIssues.map((issue) => (
                      <tr key={issue._id} className="hover:bg-gray-50/30">
                        <td className="px-6 py-4 font-bold text-gray-900">
                          <Link href={`/storekeeper/issue/${issue._id}`} className="text-blue-600 hover:underline">
                            {issue.ivNumber}
                          </Link>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-gray-900 font-semibold">{issue.requester.name}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{issue.requester.departmentName}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                            issue.status === "fully_returned" 
                              ? "bg-emerald-100 text-emerald-800" 
                              : issue.status === "partial_return" 
                              ? "bg-amber-100 text-amber-800" 
                              : "bg-blue-100 text-blue-800"
                          }`}>
                            {issue.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-500">
                          {new Date(issue.createdAt).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </td>
                      </tr>
                    ))}
                    {todayIssues.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                          <Calendar className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                          No materials checked out today yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right Column: Low Stock Alerts */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500" /> Low Stock Warning
                </h2>
                <span className="text-xs font-semibold px-2 py-0.5 bg-red-50 text-red-600 rounded-full border border-red-100">
                  {lowStockItems.length} items
                </span>
              </div>

              <div className="p-4 divide-y divide-gray-100 max-h-[350px] overflow-y-auto flex-1">
                {lowStockItems.map((item) => (
                  <div key={item._id} className="py-3 flex justify-between items-center gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-gray-900 truncate">{item.name}</div>
                      <div className="text-[10px] text-gray-400 font-mono mt-0.5">{item.sku}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-black text-red-600">{item.totalOnHand} left</div>
                      <div className="text-[9px] text-gray-400 mt-0.5">Min: {item.minStockLevel}</div>
                    </div>
                  </div>
                ))}
                {lowStockItems.length === 0 && (
                  <div className="text-center py-12 text-gray-400">
                    <Package className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                    All stock levels are optimal.
                  </div>
                )}
              </div>
            </div>

          </div>
        </>
      )}

    </div>
  );
}
