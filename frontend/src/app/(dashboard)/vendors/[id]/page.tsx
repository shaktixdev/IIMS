"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Building2, ArrowLeft, Star, Loader2, Edit2, ShoppingCart, TrendingUp, Package, Phone, Mail, MapPin, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import POTable from "@/components/purchase/POTable";
import { toast } from "sonner";

interface Vendor {
  _id: string;
  code: string;
  name: string;
  type: string;
  contact?: { person?: string; phone?: string; email?: string; alternatePhone?: string };
  address?: { line1?: string; line2?: string; city?: string; state?: string; pincode?: string; country?: string };
  gstin?: string;
  pan?: string;
  paymentTerms?: string;
  creditDays?: number;
  bankingDetails?: { bankName?: string; accountNumber?: string; ifscCode?: string };
  rating: number;
  notes?: string;
  isActive: boolean;
  createdAt: string;
}

interface Performance {
  totalPOs: number;
  totalValue: number;
  onTimeDeliveries: number;
  lateDeliveries: number;
  onTimeRate: number;
  avgOrderValue: number;
}

const TYPE_COLORS: Record<string, string> = {
  manufacturer: "bg-violet-500/15 text-violet-400 border-violet-500/20",
  distributor: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  trader: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  service: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className={`w-5 h-5 ${s <= Math.round(rating) ? "text-amber-400 fill-amber-400" : "text-gray-300"}`} />
      ))}
      <span className="text-sm text-gray-500 ml-1">{rating > 0 ? `${rating.toFixed(1)} / 5` : "Not rated"}</span>
    </div>
  );
}

const fmt = (n: number) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

export default function VendorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [performance, setPerformance] = useState<Performance | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"pos" | "performance" | "info">("info");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [vRes, pRes] = await Promise.all([
          fetch(`/api/vendors/${id}`),
          fetch(`/api/vendors/${id}/performance`),
        ]);
        const vJson = await vRes.json();
        const pJson = await pRes.json();
        if (vJson.success) setVendor(vJson.data);
        if (pJson.success) setPerformance(pJson.data);
      } catch (err) {
        toast.error("Failed to load vendor details.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="text-center py-16 text-gray-400">
        <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <p>Vendor not found.</p>
        <Button onClick={() => router.push("/vendors")} variant="ghost" className="mt-4 text-blue-400">← Back to Vendors</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Back + Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/vendors")}
          className="text-gray-500 hover:text-gray-900 rounded-xl h-9 px-3 flex items-center gap-2 mt-1">
          <ArrowLeft className="w-4 h-4" />
        </Button>

        <div className="flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600/30 to-blue-600/30 border border-violet-500/20 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-violet-400" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-extrabold text-gray-900">{vendor.name}</h1>
                  <span className={`text-xs px-2 py-0.5 rounded-md border capitalize font-medium ${TYPE_COLORS[vendor.type]}`}>{vendor.type}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${vendor.isActive ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}`}>
                    {vendor.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="font-mono text-sm text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md">{vendor.code}</span>
                  <StarRating rating={vendor.rating} />
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={() => router.push(`/purchase-orders/new?vendor=${vendor._id}`)}
                className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl h-9 text-sm px-4 flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" /> Create PO
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Cards */}
      {performance && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total POs", value: performance.totalPOs, unit: "", color: "text-blue-400" },
            { label: "Total Value", value: fmt(performance.totalValue), unit: "", color: "text-emerald-400" },
            { label: "On-Time Rate", value: `${performance.onTimeRate}%`, unit: "", color: performance.onTimeRate >= 80 ? "text-emerald-400" : performance.onTimeRate >= 50 ? "text-amber-400" : "text-red-400" },
            { label: "Avg Order", value: fmt(performance.avgOrderValue), unit: "", color: "text-violet-400" },
          ].map((m) => (
            <div key={m.label} className="bg-white border border-gray-200 rounded-2xl p-4">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">{m.label}</p>
              <p className={`text-xl font-extrabold mt-1 ${m.color}`}>{m.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {(["info", "pos", "performance"] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-semibold capitalize transition-all border-b-2 -mb-px ${
              activeTab === tab ? "border-blue-500 text-blue-400" : "border-transparent text-gray-400 hover:text-gray-700"
            }`}>
            {tab === "pos" ? "PO History" : tab === "performance" ? "Performance" : "Info"}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "info" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Contact */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Contact</h3>
            <div className="space-y-3">
              {vendor.contact?.person && <div className="flex items-center gap-2 text-sm"><span>👤</span><span className="text-gray-700">{vendor.contact.person}</span></div>}
              {vendor.contact?.phone && <div className="flex items-center gap-2 text-sm"><Phone className="w-4 h-4 text-gray-400" /><span className="text-gray-700">{vendor.contact.phone}</span></div>}
              {vendor.contact?.email && <div className="flex items-center gap-2 text-sm"><Mail className="w-4 h-4 text-gray-400" /><a href={`mailto:${vendor.contact.email}`} className="text-blue-400">{vendor.contact.email}</a></div>}
            </div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider pt-2">Tax IDs</h3>
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-xs text-gray-400">GSTIN</p><p className="text-sm font-mono text-gray-900">{vendor.gstin || "—"}</p></div>
              <div><p className="text-xs text-gray-400">PAN</p><p className="text-sm font-mono text-gray-900">{vendor.pan || "—"}</p></div>
            </div>
          </div>

          {/* Address + Banking */}
          <div className="space-y-4">
            {(vendor.address?.line1 || vendor.address?.city) && (
              <div className="bg-white border border-gray-200 rounded-2xl p-5">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Address</h3>
                <div className="flex items-start gap-2 text-sm text-gray-700">
                  <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                  <div>
                    {vendor.address.line1 && <p>{vendor.address.line1}</p>}
                    {vendor.address.line2 && <p>{vendor.address.line2}</p>}
                    <p>{[vendor.address.city, vendor.address.state, vendor.address.pincode].filter(Boolean).join(", ")}</p>
                  </div>
                </div>
              </div>
            )}
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Payment</h3>
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-xs text-gray-400">Terms</p><p className="text-sm text-gray-900">{vendor.paymentTerms || "—"}</p></div>
                <div><p className="text-xs text-gray-400">Credit Days</p><p className="text-sm text-gray-900">{vendor.creditDays || 0} days</p></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "pos" && <POTable vendorId={vendor._id} />}

      {activeTab === "performance" && performance && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Delivery Performance</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>On-Time Deliveries</span>
                  <span>{performance.onTimeDeliveries} of {performance.onTimeDeliveries + performance.lateDeliveries}</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${performance.onTimeRate}%` }} />
                </div>
                <p className="text-xs text-emerald-400 mt-1">{performance.onTimeRate}% on-time rate</p>
              </div>
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Late Deliveries</span>
                  <span>{performance.lateDeliveries}</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-red-500 rounded-full transition-all"
                    style={{ width: performance.onTimeDeliveries + performance.lateDeliveries > 0 ? `${(performance.lateDeliveries / (performance.onTimeDeliveries + performance.lateDeliveries)) * 100}%` : "0%" }} />
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Order Value Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between"><span className="text-sm text-gray-500">Total POs Placed</span><span className="text-sm font-bold text-gray-900">{performance.totalPOs}</span></div>
              <div className="flex justify-between"><span className="text-sm text-gray-500">Total Spend</span><span className="text-sm font-bold text-emerald-400">{fmt(performance.totalValue)}</span></div>
              <div className="flex justify-between"><span className="text-sm text-gray-500">Average Order Value</span><span className="text-sm font-bold text-violet-400">{fmt(performance.avgOrderValue)}</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
