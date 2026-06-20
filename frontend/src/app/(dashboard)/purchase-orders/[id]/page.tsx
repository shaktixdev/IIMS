"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, ShoppingCart, Building2, Warehouse, Calendar, Hash, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import POStatusTimeline from "@/components/purchase/POStatusTimeline";
import POSummaryPanel from "@/components/purchase/POSummaryPanel";
import POApprovalBar from "@/components/purchase/POApprovalBar";
import { toast } from "sonner";

interface POLineItem {
  item: { _id: string; name: string; sku: string; hsnCode?: string };
  itemName: string;
  itemSku: string;
  quantity: number;
  receivedQty: number;
  unit?: { name: string; symbol: string };
  unitCost: number;
  gstRate: number;
  discountPct: number;
  subtotal: number;
  discountAmount: number;
  gstAmount: number;
  netAmount: number;
}

interface PO {
  _id: string;
  poNumber: string;
  vendor: { _id: string; code: string; name: string; type: string; contact?: { phone?: string; email?: string }; gstin?: string; paymentTerms?: string; rating: number };
  warehouse: { _id: string; code: string; name: string };
  status: "draft" | "sent" | "partial" | "received" | "cancelled" | "closed";
  deliveryDate?: string;
  referenceNumber?: string;
  paymentTerms?: string;
  items: POLineItem[];
  subTotal: number;
  totalDiscount: number;
  totalGst: number;
  grandTotal: number;
  notes?: string;
  terms?: string;
  internalNotes?: string;
  sentAt?: string;
  receivedAt?: string;
  cancelledAt?: string;
  closedAt?: string;
  createdBy?: { name: string; email: string };
  approvedBy?: { name: string; email: string } | null;
  createdAt: string;
  updatedAt: string;
}

const fmt = (n: number) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

const formatDate = (dateStr?: string) => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

export default function PODetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [po, setPo] = useState<PO | null>(null);
  const [loading, setLoading] = useState(true);

  const loadPO = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/purchase-orders/${id}`);
      const json = await res.json();
      if (json.success) setPo(json.data);
      else toast.error(json.error?.message || "Failed to load PO.");
    } catch (err) {
      toast.error("Error loading purchase order.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadPO(); }, [loadPO]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!po) {
    return (
      <div className="text-center py-16 text-gray-400">
        <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <p>Purchase order not found.</p>
        <Button onClick={() => router.push("/purchase-orders")} variant="ghost" className="mt-4 text-blue-400">
          ← Back to POs
        </Button>
      </div>
    );
  }

  const isOverdue =
    po.deliveryDate &&
    !["received", "cancelled", "closed"].includes(po.status) &&
    new Date(po.deliveryDate) < new Date();

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Back + PO Number */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/purchase-orders")}
          className="text-gray-500 hover:text-gray-900 rounded-xl h-9 px-3 flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center gap-3 flex-1">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-extrabold text-gray-900">
                <span className="text-gray-400 font-normal text-base mr-2">PO</span>
                {po.poNumber}
              </h1>
              {isOverdue && (
                <span className="text-xs bg-red-500/15 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full font-semibold">
                  Overdue
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">Created {formatDate(po.createdAt)}</p>
          </div>
        </div>
      </div>

      {/* Status Timeline */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Order Status</p>
        <POStatusTimeline
          status={po.status}
          sentAt={po.sentAt}
          receivedAt={po.receivedAt}
          cancelledAt={po.cancelledAt}
          closedAt={po.closedAt}
          createdAt={po.createdAt}
        />
      </div>

      {/* Approval Bar */}
      <POApprovalBar po={po} onApprove={loadPO} />

      {/* Main Content: Info + Summary Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Info + Line Items */}
        <div className="lg:col-span-2 space-y-5">
          {/* Header Info Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white border border-gray-200 rounded-xl p-3">
              <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1"><Building2 className="w-3.5 h-3.5" /> Vendor</div>
              <p className="text-sm font-semibold text-gray-900">{po.vendor?.name}</p>
              <p className="text-xs font-mono text-blue-400">{po.vendor?.code}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-3">
              <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1"><Warehouse className="w-3.5 h-3.5" /> Warehouse</div>
              <p className="text-sm font-semibold text-gray-900">{po.warehouse?.name}</p>
              <p className="text-xs font-mono text-blue-400">{po.warehouse?.code}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-3">
              <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1"><Calendar className="w-3.5 h-3.5" /> Delivery</div>
              <p className={`text-sm font-semibold ${isOverdue ? "text-red-400" : "text-gray-900"}`}>{formatDate(po.deliveryDate)}</p>
            </div>
            {po.referenceNumber && (
              <div className="bg-white border border-gray-200 rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1"><Hash className="w-3.5 h-3.5" /> Reference</div>
                <p className="text-sm font-semibold text-gray-900 font-mono">{po.referenceNumber}</p>
              </div>
            )}
          </div>

          {/* Line Items Table */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-bold text-gray-900">Line Items</h3>
              <span className="text-xs text-gray-400 ml-auto">{po.items.length} item{po.items.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    {["Item", "SKU", "Qty", "Received", "Unit Cost", "GST%", "Disc%", "Subtotal", "Net"].map((h) => (
                      <th key={h} className="text-left text-xs text-gray-400 font-semibold uppercase tracking-wider py-2.5 px-4 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {po.items.map((li, idx) => (
                    <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <p className="font-medium text-gray-900 text-xs">{li.itemName || li.item?.name || "—"}</p>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-xs text-blue-400">{li.itemSku || li.item?.sku || "—"}</span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900">{li.quantity}</td>
                      <td className="py-3 px-4">
                        <span className={`text-sm ${li.receivedQty >= li.quantity ? "text-emerald-400" : li.receivedQty > 0 ? "text-amber-400" : "text-gray-400"}`}>
                          {li.receivedQty}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-700">{fmt(li.unitCost)}</td>
                      <td className="py-3 px-4 text-sm text-amber-400">{li.gstRate}%</td>
                      <td className="py-3 px-4 text-sm text-red-400">{li.discountPct > 0 ? `${li.discountPct}%` : "—"}</td>
                      <td className="py-3 px-4 text-sm text-gray-700">{fmt(li.subtotal)}</td>
                      <td className="py-3 px-4 text-sm font-bold text-gray-900">{fmt(li.netAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Notes */}
          {(po.notes || po.terms || po.internalNotes) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {po.notes && (
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Vendor Notes</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{po.notes}</p>
                </div>
              )}
              {po.terms && (
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Terms & Conditions</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{po.terms}</p>
                </div>
              )}
              {po.internalNotes && (
                <div className="bg-white border border-gray-200 rounded-xl p-4 col-span-full">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Internal Notes</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{po.internalNotes}</p>
                </div>
              )}
            </div>
          )}

          {/* GRN Placeholder */}
          <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-6 text-center">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Goods Receipt Notes (GRNs)</p>
            <p className="text-sm text-gray-400 mt-2">GRN linkage will be available in Phase 5</p>
          </div>
        </div>

        {/* Right: Summary + Actions */}
        <div className="space-y-4">
          <POSummaryPanel po={po} onStatusChange={loadPO} />

          {/* Vendor Card */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Vendor Info</h3>
            <div>
              <p className="text-sm font-semibold text-gray-900">{po.vendor?.name}</p>
              <p className="text-xs font-mono text-blue-400">{po.vendor?.code}</p>
            </div>
            {po.vendor?.contact?.phone && (
              <p className="text-xs text-gray-500">📞 {po.vendor.contact.phone}</p>
            )}
            {po.vendor?.contact?.email && (
              <p className="text-xs text-blue-400">{po.vendor.contact.email}</p>
            )}
            {po.vendor?.gstin && (
              <p className="text-xs font-mono text-gray-400">GSTIN: {po.vendor.gstin}</p>
            )}
            {po.paymentTerms && (
              <p className="text-xs text-gray-400">Terms: {po.paymentTerms}</p>
            )}
            <Button
              onClick={() => router.push(`/vendors/${po.vendor._id}`)}
              variant="ghost"
              className="w-full text-xs text-blue-400 hover:text-blue-300 border border-blue-900/20 hover:bg-blue-500/5 rounded-xl h-8"
            >
              View Vendor Profile →
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
