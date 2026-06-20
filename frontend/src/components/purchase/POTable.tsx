"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ShoppingCart, Search, ChevronLeft, ChevronRight, Loader2, Filter, ExternalLink, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter } from "next/navigation";

interface PO {
  _id: string;
  poNumber: string;
  vendor: { _id: string; code: string; name: string; type: string };
  warehouse: { _id: string; code: string; name: string };
  status: "draft" | "sent" | "partial" | "received" | "cancelled" | "closed";
  deliveryDate?: string;
  itemCount: number;
  grandTotal: number;
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  draft:     { label: "Draft",     cls: "bg-slate-500/15 text-gray-500 border-slate-500/20" },
  sent:      { label: "Sent",      cls: "bg-blue-500/15 text-blue-400 border-blue-500/20" },
  partial:   { label: "Partial",   cls: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
  received:  { label: "Received",  cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
  cancelled: { label: "Cancelled", cls: "bg-red-500/15 text-red-400 border-red-500/20" },
  closed:    { label: "Closed",    cls: "bg-slate-700/30 text-gray-400 border-slate-700/30" },
};

interface POTableProps {
  vendorId?: string;
}

export default function POTable({ vendorId }: POTableProps) {
  const router = useRouter();
  const [pos, setPos] = useState<PO[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 20;

  const fetchPOs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(LIMIT),
        ...(search && { search }),
        ...(statusFilter !== "all" && { status: statusFilter }),
        ...(vendorId && { vendor: vendorId }),
      });
      const res = await fetch(`/api/purchase-orders?${params}`);
      const json = await res.json();
      if (json.success) {
        setPos(json.data);
        setTotal(json.pagination.total);
        setTotalPages(json.pagination.pages || 1);
      }
    } catch (err) {
      console.error("Failed to fetch POs:", err);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, vendorId]);

  useEffect(() => { fetchPOs(); }, [fetchPOs]);

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

  const isOverdue = (po: PO) => {
    if (!po.deliveryDate || ["received", "cancelled", "closed"].includes(po.status)) return false;
    return new Date(po.deliveryDate) < new Date();
  };

  return (
    <div className="space-y-4">
      {/* Status Pills */}
      <div className="flex flex-wrap gap-2">
        {["all", "draft", "sent", "partial", "received", "cancelled"].map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all capitalize ${
              statusFilter === s
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white border-gray-200 text-gray-500 hover:text-gray-900 hover:border-slate-600"
            }`}
          >
            {s === "all" ? "All POs" : STATUS_CONFIG[s]?.label || s}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by PO number…"
            className="pl-9 bg-gray-50 border-gray-200 text-gray-900 rounded-xl h-10 text-sm placeholder-gray-400 focus:border-blue-500/50"
          />
        </div>
      </div>

      {/* Table */}
      <div className="border border-gray-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left text-xs text-gray-400 font-semibold uppercase tracking-wider py-3 px-4">PO Number</th>
                {!vendorId && <th className="text-left text-xs text-gray-400 font-semibold uppercase tracking-wider py-3 px-4">Vendor</th>}
                <th className="text-left text-xs text-gray-400 font-semibold uppercase tracking-wider py-3 px-4">Warehouse</th>
                <th className="text-left text-xs text-gray-400 font-semibold uppercase tracking-wider py-3 px-4">Date</th>
                <th className="text-left text-xs text-gray-400 font-semibold uppercase tracking-wider py-3 px-4">Delivery</th>
                <th className="text-left text-xs text-gray-400 font-semibold uppercase tracking-wider py-3 px-4">Items</th>
                <th className="text-right text-xs text-gray-400 font-semibold uppercase tracking-wider py-3 px-4">Total</th>
                <th className="text-left text-xs text-gray-400 font-semibold uppercase tracking-wider py-3 px-4">Status</th>
                <th className="py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={vendorId ? 8 : 9} className="py-16 text-center">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500 mx-auto" />
                </td></tr>
              ) : pos.length === 0 ? (
                <tr><td colSpan={vendorId ? 8 : 9} className="py-16 text-center text-gray-400">
                  <ShoppingCart className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">No purchase orders found</p>
                </td></tr>
              ) : (
                pos.map((po) => (
                  <tr
                    key={po._id}
                    onClick={() => router.push(`/purchase-orders/${po._id}`)}
                    className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors group"
                  >
                    <td className="py-3 px-4">
                      <span className="font-mono text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md">
                        {po.poNumber}
                      </span>
                    </td>
                    {!vendorId && (
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-semibold text-gray-900 text-xs">{po.vendor?.name}</p>
                          <p className="text-gray-400 text-xs font-mono">{po.vendor?.code}</p>
                        </div>
                      </td>
                    )}
                    <td className="py-3 px-4">
                      <span className="text-xs text-gray-500">{po.warehouse?.name || po.warehouse?.code}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-xs text-gray-500">{formatDate(po.createdAt)}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        {isOverdue(po) && <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />}
                        <span className={`text-xs ${isOverdue(po) ? "text-red-400" : "text-gray-500"}`}>
                          {formatDate(po.deliveryDate)}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-xs text-gray-500">{po.itemCount} item{po.itemCount !== 1 ? "s" : ""}</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-sm font-bold text-gray-900">
                        ₹{po.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_CONFIG[po.status]?.cls}`}>
                        {STATUS_CONFIG[po.status]?.label}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <Button variant="ghost" size="sm"
                        onClick={(e) => { e.stopPropagation(); router.push(`/purchase-orders/${po._id}`); }}
                        className="h-7 px-2 text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-lg">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50/50">
            <span className="text-xs text-gray-400">
              {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total} POs
            </span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-7 px-2 text-gray-500 hover:text-gray-900 disabled:opacity-30 rounded-lg">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-xs text-gray-500 self-center px-2">{page} / {totalPages}</span>
              <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="h-7 px-2 text-gray-500 hover:text-gray-900 disabled:opacity-30 rounded-lg">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
