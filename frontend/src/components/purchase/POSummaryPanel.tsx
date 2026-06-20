"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { FileDown, Send, XCircle, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

type POStatus = "draft" | "sent" | "partial" | "received" | "cancelled" | "closed";

interface PO {
  _id: string;
  poNumber: string;
  status: POStatus;
  subTotal: number;
  totalDiscount: number;
  totalGst: number;
  grandTotal: number;
  vendor?: { name: string };
  approvedBy?: any;
}

interface POSummaryPanelProps {
  po: PO;
  onStatusChange?: () => void;
}

const fmt = (n: number) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

export default function POSummaryPanel({ po, onStatusChange }: POSummaryPanelProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const transition = async (action: "send" | "cancel" | "close", label: string) => {
    setLoading(action);
    try {
      const res = await fetch(`/api/purchase-orders/${po._id}/${action}`, { method: "POST" });
      const json = await res.json();
      if (json.success) {
        toast.success(`PO ${label} successfully.`);
        onStatusChange?.();
      } else {
        toast.error(json.error?.message || `Failed to ${label} PO.`);
      }
    } catch {
      toast.error(`Error performing action: ${label}`);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      {/* Totals */}
      <div className="p-5 space-y-3">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Order Summary</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-500">
            <span>Subtotal</span><span className="text-gray-700">{fmt(po.subTotal)}</span>
          </div>
          {po.totalDiscount > 0 && (
            <div className="flex justify-between text-sm text-red-400">
              <span>Discount</span><span>−{fmt(po.totalDiscount)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm text-amber-400">
            <span>GST</span><span>+{fmt(po.totalGst)}</span>
          </div>
          <div className="flex justify-between text-base font-extrabold text-gray-900 border-t border-gray-200 pt-3 mt-2">
            <span>Grand Total</span><span className="text-blue-300">{fmt(po.grandTotal)}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="border-t border-gray-200 p-4 space-y-2.5">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Actions</h3>

        {/* Download PDF — always shown (wired in Phase 8) */}
        <Button variant="ghost"
          className="w-full border border-gray-200 hover:border-blue-500/30 text-gray-500 hover:text-blue-300 rounded-xl h-9 text-xs flex items-center gap-2 justify-start px-3">
          <FileDown className="w-4 h-4" /> Download PDF
          <span className="ml-auto text-gray-400 text-[10px]">Phase 8</span>
        </Button>

        {/* Mark as Sent — only for draft */}
        {po.status === "draft" && (
          <Button
            disabled={loading === "send" || !po.approvedBy}
            onClick={() => transition("send", "marked as sent")}
            title={!po.approvedBy ? "Requires manager approval first" : ""}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-xl h-9 text-xs flex items-center gap-2 justify-start px-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading === "send" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Mark as Sent to Vendor
            {!po.approvedBy && <span className="ml-auto text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-bold">Needs Approval</span>}
          </Button>
        )}

        {/* Close PO — for sent or partial */}
        {(po.status === "sent" || po.status === "partial") && (
          <Button
            disabled={loading === "close"}
            onClick={() => transition("close", "closed")}
            className="w-full bg-slate-700 hover:bg-slate-600 text-gray-900 rounded-xl h-9 text-xs flex items-center gap-2 justify-start px-3"
          >
            {loading === "close" ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Close PO
          </Button>
        )}

        {/* Cancel PO — for draft or sent */}
        {(po.status === "draft" || po.status === "sent") && (
          <Button
            disabled={loading === "cancel"}
            onClick={() => transition("cancel", "cancelled")}
            variant="ghost"
            className="w-full border border-red-900/30 text-red-400 hover:text-red-300 hover:bg-red-500/5 rounded-xl h-9 text-xs flex items-center gap-2 justify-start px-3"
          >
            {loading === "cancel" ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
            Cancel PO
          </Button>
        )}

        {/* Edit — only for draft */}
        {po.status === "draft" && (
          <Button
            onClick={() => router.push(`/purchase-orders/${po._id}/edit`)}
            variant="ghost"
            className="w-full border border-gray-200 text-gray-500 hover:text-gray-900 rounded-xl h-9 text-xs flex items-center gap-2 justify-start px-3"
          >
            ✏️ Edit Draft PO
          </Button>
        )}
      </div>
    </div>
  );
}
