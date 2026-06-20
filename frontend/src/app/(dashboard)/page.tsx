"use client";

import React, { useState, useEffect } from "react";
import { 
  Package, 
  ShoppingCart, 
  Building2, 
  Warehouse, 
  TrendingUp, 
  Loader2, 
  ArrowRight, 
  Tag, 
  IndianRupee, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Percent, 
  Users, 
  Calendar,
  Layers,
  ChevronDown
} from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import StorekeeperDashboard from "./storekeeper/page";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line
} from "recharts";

/* ───────── helpers ───────── */
const fmt = (n: number) => `₹ ${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/reports/dashboard");
        const json = await res.json();
        if (json.success) {
          setData(json.data);
        }
      } catch (err) {
        console.error("Error loading dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };
    if (session?.user?.role !== "store_keeper") {
      load();
    }
  }, [session]);

  if (status === "loading" || (loading && session?.user?.role !== "store_keeper")) {
    return (
      <div className="flex items-center justify-center h-[500px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (session?.user?.role === "store_keeper") {
    return <StorekeeperDashboard />;
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Failed to load dashboard data. Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* ─── Row 1: Sales Overview + Inventory Summary ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Overview (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex flex-col justify-between">
          <h2 className="text-base font-semibold text-gray-900 mb-5">Sales Overview</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-gray-100">
            {/* Sales */}
            <div className="flex flex-col items-center justify-center text-center px-4">
              <div className="w-12 h-12 rounded-xl bg-[#EEF2FF] flex items-center justify-center mb-3">
                <Percent className="w-6 h-6 text-[#4F46E5]" />
              </div>
              <p className="text-lg font-bold text-gray-900">{fmt(data.salesOverview.sales)}</p>
              <p className="text-xs text-gray-500 mt-1">Sales</p>
            </div>
            {/* Revenue */}
            <div className="flex flex-col items-center justify-center text-center px-4">
              <div className="w-12 h-12 rounded-xl bg-[#F5F3FF] flex items-center justify-center mb-3">
                <TrendingUp className="w-6 h-6 text-[#8B5CF6]" />
              </div>
              <p className="text-lg font-bold text-gray-900">{fmt(data.salesOverview.revenue)}</p>
              <p className="text-xs text-gray-500 mt-1">Revenue</p>
            </div>
            {/* Profit */}
            <div className="flex flex-col items-center justify-center text-center px-4">
              <div className="w-12 h-12 rounded-xl bg-[#FFF7ED] flex items-center justify-center mb-3">
                <Layers className="w-6 h-6 text-[#F97316]" />
              </div>
              <p className="text-lg font-bold text-gray-900">{fmt(data.salesOverview.profit)}</p>
              <p className="text-xs text-gray-500 mt-1">Profit</p>
            </div>
            {/* Cost */}
            <div className="flex flex-col items-center justify-center text-center px-4">
              <div className="w-12 h-12 rounded-xl bg-[#ECFDF5] flex items-center justify-center mb-3">
                <IndianRupee className="w-6 h-6 text-[#10B981]" />
              </div>
              <p className="text-lg font-bold text-gray-900">{fmt(data.salesOverview.cost)}</p>
              <p className="text-xs text-gray-500 mt-1">Cost</p>
            </div>
          </div>
        </div>

        {/* Inventory Summary (1 col) */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex flex-col justify-between">
          <h2 className="text-base font-semibold text-gray-900 mb-5">Inventory Summary</h2>
          <div className="grid grid-cols-2 divide-x divide-gray-100 h-full items-center">
            {/* Quantity in Hand */}
            <div className="flex flex-col items-center justify-center text-center px-2">
              <div className="w-12 h-12 rounded-xl bg-[#FEF3C7] flex items-center justify-center mb-3">
                <Package className="w-6 h-6 text-[#D97706]" />
              </div>
              <p className="text-lg font-bold text-gray-900">{data.inventorySummary.quantityOnHand}</p>
              <p className="text-xs text-gray-500 mt-1">Quantity in Hand</p>
            </div>
            {/* To be received */}
            <div className="flex flex-col items-center justify-center text-center px-2">
              <div className="w-12 h-12 rounded-xl bg-[#EEF2FF] flex items-center justify-center mb-3">
                <Warehouse className="w-6 h-6 text-[#4F46E5]" />
              </div>
              <p className="text-lg font-bold text-gray-900">{data.inventorySummary.toBeReceived}</p>
              <p className="text-xs text-gray-500 mt-1">To be received</p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Row 2: Purchase Overview + Product Summary ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Purchase Overview (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex flex-col justify-between">
          <h2 className="text-base font-semibold text-gray-900 mb-5">Purchase Overview</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-gray-100">
            {/* Purchase */}
            <div className="flex flex-col items-center justify-center text-center px-4">
              <div className="w-12 h-12 rounded-xl bg-[#EFF6FF] flex items-center justify-center mb-3">
                <ShoppingCart className="w-6 h-6 text-[#3B82F6]" />
              </div>
              <p className="text-lg font-bold text-gray-900">{data.purchaseOverview.purchase}</p>
              <p className="text-xs text-gray-500 mt-1">Purchase</p>
            </div>
            {/* Cost */}
            <div className="flex flex-col items-center justify-center text-center px-4">
              <div className="w-12 h-12 rounded-xl bg-[#ECFDF5] flex items-center justify-center mb-3">
                <IndianRupee className="w-6 h-6 text-[#10B981]" />
              </div>
              <p className="text-lg font-bold text-gray-900">{fmt(data.purchaseOverview.cost)}</p>
              <p className="text-xs text-gray-500 mt-1">Cost</p>
            </div>
            {/* Cancel */}
            <div className="flex flex-col items-center justify-center text-center px-4">
              <div className="w-12 h-12 rounded-xl bg-[#FAF5FF] flex items-center justify-center mb-3">
                <FileText className="w-6 h-6 text-[#A855F7]" />
              </div>
              <p className="text-lg font-bold text-gray-900">{data.purchaseOverview.cancel}</p>
              <p className="text-xs text-gray-500 mt-1">Cancel</p>
            </div>
            {/* Return */}
            <div className="flex flex-col items-center justify-center text-center px-4">
              <div className="w-12 h-12 rounded-xl bg-[#FFF7ED] flex items-center justify-center mb-3">
                <Layers className="w-6 h-6 text-[#F97316]" />
              </div>
              <p className="text-lg font-bold text-gray-900">{fmt(data.purchaseOverview.return)}</p>
              <p className="text-xs text-gray-500 mt-1">Return</p>
            </div>
          </div>
        </div>

        {/* Product Summary (1 col) */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex flex-col justify-between">
          <h2 className="text-base font-semibold text-gray-900 mb-5">Product Summary</h2>
          <div className="grid grid-cols-2 divide-x divide-gray-100 h-full items-center">
            {/* Number of Suppliers */}
            <div className="flex flex-col items-center justify-center text-center px-2">
              <div className="w-12 h-12 rounded-xl bg-[#EFF6FF] flex items-center justify-center mb-3">
                <Users className="w-6 h-6 text-[#3B82F6]" />
              </div>
              <p className="text-lg font-bold text-gray-900">{data.productSummary.numberOfSuppliers}</p>
              <p className="text-xs text-gray-500 mt-1">Number of Suppliers</p>
            </div>
            {/* Number of Categories */}
            <div className="flex flex-col items-center justify-center text-center px-2">
              <div className="w-12 h-12 rounded-xl bg-[#F5F3FF] flex items-center justify-center mb-3">
                <Tag className="w-6 h-6 text-[#8B5CF6]" />
              </div>
              <p className="text-lg font-bold text-gray-900">{data.productSummary.numberOfCategories}</p>
              <p className="text-xs text-gray-500 mt-1">Number of Categories</p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Row 3: Sales & Purchase Chart + Order Summary Chart ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales & Purchase Bar Chart (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-semibold text-gray-900">Sales & Purchase</h2>
            <button className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-50 transition-colors">
              <Calendar className="w-3.5 h-3.5" />
              <span>Weekly</span>
              <ChevronDown className="w-3 h-3 text-gray-400" />
            </button>
          </div>
          <div className="h-[300px] w-full">
            {mounted && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.charts.salesAndPurchase}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                  barGap={6}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                  <XAxis 
                    dataKey="month" 
                    tickLine={false} 
                    axisLine={false} 
                    tick={{ fill: "#9CA3AF", fontSize: 11 }} 
                  />
                  <YAxis 
                    tickLine={false} 
                    axisLine={false} 
                    tick={{ fill: "#9CA3AF", fontSize: 11 }} 
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#fff", border: "1px solid #F3F4F6", borderRadius: "8px", fontSize: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
                    labelStyle={{ fontWeight: "bold", color: "#1F2937" }}
                  />
                  <Bar dataKey="purchase" name="Purchase" fill="#818CF8" radius={[4, 4, 0, 0]} maxBarSize={14} />
                  <Bar dataKey="sales" name="Sales" fill="#34D399" radius={[4, 4, 0, 0]} maxBarSize={14} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="flex justify-center gap-6 mt-2 text-xs font-medium">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#818CF8]" />
              <span className="text-gray-500">Purchase</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#34D399]" />
              <span className="text-gray-500">Sales</span>
            </div>
          </div>
        </div>

        {/* Order Summary Line Chart (1 col) */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900 mb-6">Order Summary</h2>
            <div className="h-[240px] w-full">
              {mounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={data.charts.orderSummary}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                    <XAxis 
                      dataKey="month" 
                      tickLine={false} 
                      axisLine={false} 
                      tick={{ fill: "#9CA3AF", fontSize: 11 }} 
                    />
                    <YAxis 
                      tickLine={false} 
                      axisLine={false} 
                      tick={{ fill: "#9CA3AF", fontSize: 11 }} 
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#fff", border: "1px solid #F3F4F6", borderRadius: "8px", fontSize: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="ordered" 
                      name="Ordered" 
                      stroke="#F97316" 
                      strokeWidth={2} 
                      dot={false}
                      activeDot={{ r: 6 }} 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="delivered" 
                      name="Delivered" 
                      stroke="#3B82F6" 
                      strokeWidth={2} 
                      dot={false}
                      activeDot={{ r: 6 }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
          <div className="flex justify-center gap-6 mt-4 text-xs font-medium">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#F97316]" />
              <span className="text-gray-500">Ordered</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#3B82F6]" />
              <span className="text-gray-500">Delivered</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Row 4: Top Selling Stock + Low Quantity Stock ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Selling Stock (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-50">
              <h2 className="text-base font-semibold text-gray-900">Top Selling Stock</h2>
              <Link href="/inventory" className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors">
                See All
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-gray-50 bg-gray-50/50">
                    <th className="text-xs text-gray-500 font-semibold py-3 px-6">Name</th>
                    <th className="text-xs text-gray-500 font-semibold py-3 px-6">Sold Quantity</th>
                    <th className="text-xs text-gray-500 font-semibold py-3 px-6">Remaining Quantity</th>
                    <th className="text-xs text-gray-500 font-semibold py-3 px-6">Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.topSellingStock.map((item: any, idx: number) => (
                    <tr key={idx} className="hover:bg-gray-50/30 transition-colors">
                      <td className="py-4 px-6 font-medium text-gray-900">{item.name}</td>
                      <td className="py-4 px-6 text-gray-600">{item.soldQty}</td>
                      <td className="py-4 px-6 text-gray-600">{item.remainingQty}</td>
                      <td className="py-4 px-6 font-semibold text-gray-900">{fmt(item.price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Low Quantity Stock (1 col) */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-50">
              <h2 className="text-base font-semibold text-gray-900">Low Quantity Stock</h2>
              <Link href="/inventory?status=low_stock" className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors">
                See All
              </Link>
            </div>
            <div className="divide-y divide-gray-50 px-6">
              {data.lowQuantityStock.map((item: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center border border-orange-100 shrink-0">
                      <Package className="w-5 h-5 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">Remaining Quantity : {item.remainingQty} {item.unit}</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-red-50 text-red-600 text-[10px] font-bold rounded-lg uppercase tracking-wide">
                    Low
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
