"use client";

import React, { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Save, Send, ShieldCheck, AlertCircle, RefreshCw, CheckCircle2 } from "lucide-react";
import { useSession } from "next-auth/react";

interface Item {
  _id: string;
  sku: string;
  name: string;
  barcode?: string;
}

interface StockCountLine {
  item: Item;
  systemQty: number;
  countedQty: number;
  variance: number;
  notes?: string;
}

interface StockCountData {
  _id: string;
  stockCountNumber: string;
  warehouse: {
    _id: string;
    name: string;
    code: string;
  };
  zone?: string;
  status: "draft" | "in_progress" | "completed" | "approved";
  items: StockCountLine[];
  notes?: string;
  startedAt: string;
  completedAt?: string;
  createdBy: {
    name: string;
  };
  approvedBy?: {
    name: string;
  };
}

interface StockCountFormProps {
  stockCountId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function StockCountForm({ stockCountId, onSuccess, onCancel }: StockCountFormProps) {
  const { data: session } = useSession();
  const [countData, setCountData] = useState<StockCountData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [approving, setApproving] = useState(false);

  // Buffer list for edits
  const [itemsList, setItemsList] = useState<StockCountLine[]>([]);

  // Fetch count details
  const fetchCountDetails = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/stock-counts/${stockCountId}`);
      const json = await res.json();
      if (json.success) {
        setCountData(json.data);
        const validLines = (json.data.items || []).filter((line: any) => line && line.item !== null && line.item !== undefined);
        setItemsList(validLines);
      } else {
        toast.error("Failed to load audit sheet.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error connecting to server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCountDetails();
  }, [stockCountId]);

  const handleUpdateCount = (index: number, val: string) => {
    const list = [...itemsList];
    const item = list[index];
    const qty = val === "" ? 0 : Math.max(0, parseFloat(val));
    item.countedQty = qty;
    item.variance = qty - item.systemQty;
    setItemsList(list);
  };

  const handleUpdateNotes = (index: number, val: string) => {
    const list = [...itemsList];
    list[index].notes = val;
    setItemsList(list);
  };

  const saveProgress = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/stock-counts/${stockCountId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: itemsList.map((item) => ({
            item: item.item._id,
            countedQty: item.countedQty,
            notes: item.notes || "",
          })),
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Progress saved successfully.");
        fetchCountDetails();
      } else {
        toast.error(json.error?.message || "Failed to save progress.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error saving progress.");
    } finally {
      setSaving(false);
    }
  };

  const submitCount = async () => {
    if (!confirm("Are you sure you want to freeze and submit this count sheet? No further count inputs can be made.")) {
      return;
    }

    setSubmitting(true);
    // First save the current list state
    try {
      await fetch(`/api/stock-counts/${stockCountId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: itemsList.map((item) => ({
            item: item.item._id,
            countedQty: item.countedQty,
            notes: item.notes || "",
          })),
        }),
      });

      const res = await fetch(`/api/stock-counts/${stockCountId}/complete`, { method: "POST" });
      const json = await res.json();
      if (json.success) {
        toast.success("Count sheet submitted. Awaiting supervisor approval.");
        fetchCountDetails();
        onSuccess();
      } else {
        toast.error(json.error?.message || "Failed to submit count.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error submitting count sheet.");
    } finally {
      setSubmitting(false);
    }
  };

  const approveCount = async () => {
    if (
      !confirm(
        "Authorize Adjustment? This will correct physical stock levels in the system and log immutable adjustment movements."
      )
    ) {
      return;
    }

    setApproving(true);
    try {
      const res = await fetch(`/api/stock-counts/${stockCountId}/approve`, { method: "POST" });
      const json = await res.json();
      if (json.success) {
        toast.success("Audit approved! System stock levels corrected successfully.");
        fetchCountDetails();
        onSuccess();
      } else {
        toast.error(json.error?.message || "Failed to approve audit.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error approving audit.");
    } finally {
      setApproving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <span className="text-xs text-gray-500 font-semibold animate-pulse">Loading audit counts sheet...</span>
      </div>
    );
  }

  if (!countData) {
    return (
      <div className="text-center py-10 space-y-2">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
        <p className="text-xs font-bold text-gray-700">Audit Not Found</p>
      </div>
    );
  }

  const isEditable = countData.status === "in_progress" || countData.status === "draft";
  const userRole = session?.user?.role || "";
  const isSupervisor = ["super_admin", "admin", "manager"].includes(userRole);
  const showApproval = countData.status === "completed" && isSupervisor;

  return (
    <div className="space-y-4">
      {/* Scope Header */}
      <div className="bg-gray-50 border border-gray-200 p-4 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-extrabold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded uppercase">
              {countData.stockCountNumber}
            </span>
            <Badge
              variant="outline"
              className={`capitalize text-[10px] font-bold ${
                countData.status === "approved"
                  ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                  : countData.status === "completed"
                  ? "bg-purple-50 text-purple-600 border-purple-200"
                  : "bg-amber-50 text-amber-600 border-amber-200"
              }`}
            >
              {countData.status.replace("_", " ")}
            </Badge>
          </div>
          <h3 className="font-bold text-gray-900 text-sm mt-1">
            Warehouse Audit: <strong>{countData.warehouse.name}</strong>
            {countData.zone && ` (Zone: ${countData.zone})`}
          </h3>
          <p className="text-[10px] text-gray-400 font-semibold">
            Started on {new Date(countData.startedAt).toLocaleString("en-IN")} by {countData.createdBy.name}
          </p>
          {countData.approvedBy && (
            <p className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Approved by {countData.approvedBy.name}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isEditable && (
            <>
              <Button
                variant="outline"
                onClick={saveProgress}
                disabled={saving}
                className="h-9 px-3 text-xs rounded-xl border-gray-200 text-gray-600 hover:text-gray-900 bg-white"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Save className="w-4 h-4 mr-1.5" />}
                Save Progress
              </Button>
              <Button
                onClick={submitCount}
                disabled={submitting}
                className="h-9 px-4 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Send className="w-4 h-4 mr-1.5" />}
                Submit Counts
              </Button>
            </>
          )}
          {showApproval && (
            <Button
              onClick={approveCount}
              disabled={approving}
              className="h-9 px-4 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-sm animate-pulse"
            >
              {approving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4.5 h-4.5" />}
              Approve Adjustments
            </Button>
          )}
        </div>
      </div>

      {/* Spreadsheet items grid */}
      <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white max-h-[55vh] overflow-y-auto shadow-sm">
        <Table>
          <TableHeader className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
            <TableRow>
              <TableHead className="text-gray-500 font-semibold text-xs py-3">SKU & Item Description</TableHead>
              <TableHead className="text-gray-500 font-semibold text-xs text-right py-3">System Qty</TableHead>
              <TableHead className="text-gray-500 font-semibold text-xs py-3" style={{ width: "120px" }}>Physical Count</TableHead>
              <TableHead className="text-gray-500 font-semibold text-xs text-right py-3" style={{ width: "90px" }}>Variance</TableHead>
              <TableHead className="text-gray-500 font-semibold text-xs py-3">Discrepancy Remark Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {itemsList.map((line, idx) => {
              const hasVariance = line.variance !== 0;
              const isShortage = line.variance < 0;

              return (
                <TableRow key={line.item._id} className="border-b border-gray-150 hover:bg-gray-50/10">
                  <TableCell className="py-2 px-4">
                    <span className="font-mono text-[9px] text-gray-400 font-bold block mb-0.5">{line.item.sku}</span>
                    <span className="font-bold text-gray-800 text-xs">{line.item.name}</span>
                  </TableCell>
                  <TableCell className="text-right py-2 px-4 font-mono font-bold text-xs text-gray-700">
                    {line.systemQty}
                  </TableCell>
                  <TableCell className="py-2 px-2">
                    <Input
                      type="number"
                      value={line.countedQty}
                      onChange={(e) => handleUpdateCount(idx, e.target.value)}
                      disabled={!isEditable}
                      className="h-8 border-gray-200 text-xs font-semibold px-2 rounded-lg font-mono bg-white text-gray-900"
                      min={0}
                    />
                  </TableCell>
                  <TableCell className={`text-right py-2 px-4 font-mono font-extrabold text-xs`}>
                    {!hasVariance ? (
                      <span className="text-gray-400">0</span>
                    ) : isShortage ? (
                      <span className="text-red-500">{line.variance}</span>
                    ) : (
                      <span className="text-emerald-500">+{line.variance}</span>
                    )}
                  </TableCell>
                  <TableCell className="py-2 px-2">
                    <Input
                      value={line.notes || ""}
                      onChange={(e) => handleUpdateNotes(idx, e.target.value)}
                      disabled={!isEditable}
                      placeholder={isEditable ? "e.g. Spillage, misplaced stock..." : ""}
                      className="h-8 border-gray-150 text-xs rounded-lg bg-white placeholder-gray-400 text-gray-700"
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-end pt-2">
        <Button onClick={onCancel} variant="outline" className="border-gray-200 text-gray-500 rounded-xl h-10 px-4 hover:bg-gray-50 text-xs">
          Close Sheet
        </Button>
      </div>
    </div>
  );
}
