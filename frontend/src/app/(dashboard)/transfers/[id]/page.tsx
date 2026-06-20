"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import TransferStatusBar from "@/components/warehouse/TransferStatusBar";
import TransferForm from "@/components/warehouse/TransferForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { 
  ArrowLeft, ArrowRightLeft, Loader2, Send, CheckCircle2, XCircle, 
  Edit, Truck, Calendar, User, FileText, AlertTriangle 
} from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";

interface WarehouseZone {
  _id: string;
  code: string;
  name: string;
}

interface Warehouse {
  _id: string;
  code: string;
  name: string;
  zones: WarehouseZone[];
}

interface Item {
  _id: string;
  sku: string;
  name: string;
  isBatchTracked: boolean;
}

interface TransferLineItem {
  _id: string;
  item: Item;
  requestedQty: number;
  dispatchedQty: number;
  receivedQty: number;
  unit?: {
    symbol: string;
  };
  fromZone?: string;
  fromBin?: string;
  toZone?: string;
  toBin?: string;
  batch?: any;
  notes?: string;
}

interface TransferData {
  _id: string;
  transferNumber: string;
  status: "draft" | "in_transit" | "received" | "cancelled" | "partial";
  fromWarehouse: Warehouse;
  toWarehouse: Warehouse;
  expectedDate?: string;
  dispatchDate?: string;
  receivedDate?: string;
  vehicleNumber?: string;
  driverName?: string;
  driverPhone?: string;
  items: TransferLineItem[];
  notes?: string;
  createdBy?: { name: string; email: string };
  dispatchedBy?: { name: string; email: string };
  receivedBy?: { name: string; email: string };
  createdAt: string;
}

export default function TransferDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const transferId = params.id as string;

  const [transfer, setTransfer] = useState<TransferData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  // Buffer state to record receipt input
  const [receiptLines, setReceiptLines] = useState<
    Array<{ item: string; receivedQty: number; toZone: string; toBin: string }>
  >([]);

  const fetchTransferDetails = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/transfers/${transferId}`);
      const json = await res.json();
      if (json.success) {
        const validItems = (json.data.items || []).filter((line: any) => line && line.item !== null && line.item !== undefined);
        const cleanedData = { ...json.data, items: validItems };
        setTransfer(cleanedData);
        
        // Initialize receipt lines buffer if status is in_transit
        if (cleanedData.status === "in_transit") {
          const lines = validItems.map((line: TransferLineItem) => ({
            item: line.item._id,
            receivedQty: line.dispatchedQty || line.requestedQty, // default to match dispatched
            toZone: line.toZone || (cleanedData.toWarehouse?.zones?.[0]?.code || ""),
            toBin: line.toBin || "01-01",
          }));
          setReceiptLines(lines);
        }
      } else {
        toast.error("Failed to load stock transfer details.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error connecting to server.");
    } finally {
      setLoading(false);
    }
  }, [transferId]);

  useEffect(() => {
    fetchTransferDetails();
  }, [fetchTransferDetails]);

  const handleDispatch = async () => {
    if (!confirm("Are you sure you want to dispatch this transfer? Stock will be deducted from the source warehouse.")) {
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`/api/transfers/${transferId}/dispatch`, { method: "POST" });
      const json = await res.json();
      if (json.success) {
        toast.success("Transfer confirmed and dispatched!");
        fetchTransferDetails();
      } else {
        toast.error(json.error?.message || "Dispatch failed.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error during dispatch request.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReceive = async () => {
    // Check validation bounds
    for (const rLine of receiptLines) {
      const originalLine = transfer?.items.find((line) => line.item?._id === rLine.item);
      const dispatched = originalLine?.dispatchedQty || 0;
      if (rLine.receivedQty > dispatched) {
        toast.error(`Received quantity for item ${originalLine?.item?.name || "Unknown"} cannot exceed dispatched qty (${dispatched}).`);
        return;
      }
    }

    if (!confirm("Confirm Receipt? This will add quantities to the destination warehouse and clear the transit values.")) {
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch(`/api/transfers/${transferId}/receive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: receiptLines }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(
          json.data.status === "partial"
            ? "Transfer partially received with shortages logged."
            : "Transfer fully received successfully!"
        );
        fetchTransferDetails();
      } else {
        toast.error(json.error?.message || "Failed to receive transfer.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error receiving transfer.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (
      !confirm(
        "Are you sure you want to cancel this transfer? If in-transit, stock will be returned back to the source warehouse."
      )
    ) {
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`/api/transfers/${transferId}/cancel`, { method: "POST" });
      const json = await res.json();
      if (json.success) {
        toast.success("Transfer cancelled successfully.");
        fetchTransferDetails();
      } else {
        toast.error(json.error?.message || "Cancellation failed.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error cancelling transfer.");
    } finally {
      setActionLoading(false);
    }
  };

  const updateReceiptQty = (itemId: string, val: string) => {
    const list = [...receiptLines];
    const item = list.find((line) => line.item === itemId);
    if (item) {
      item.receivedQty = val === "" ? 0 : Math.max(0, parseFloat(val));
      setReceiptLines(list);
    }
  };

  const updateReceiptZone = (itemId: string, zone: string) => {
    const list = [...receiptLines];
    const item = list.find((line) => line.item === itemId);
    if (item) {
      item.toZone = zone;
      setReceiptLines(list);
    }
  };

  const updateReceiptBin = (itemId: string, bin: string) => {
    const list = [...receiptLines];
    const item = list.find((line) => line.item === itemId);
    if (item) {
      item.toBin = bin;
      setReceiptLines(list);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-3">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <span className="text-xs text-gray-500 font-semibold animate-pulse">Loading transfer record details...</span>
      </div>
    );
  }

  if (!transfer) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400 text-sm font-semibold">Transfer Record Not Found</p>
      </div>
    );
  }

  const userRole = session?.user?.role || "";
  const isStorekeeper = ["super_admin", "admin", "manager", "store_keeper"].includes(userRole);
  const isSupervisor = ["super_admin", "admin", "manager"].includes(userRole);

  const canEdit = transfer.status === "draft" && isStorekeeper;
  const canDispatch = transfer.status === "draft" && isStorekeeper;
  const canReceive = transfer.status === "in_transit" && isStorekeeper;
  const canCancel = (transfer.status === "draft" || transfer.status === "in_transit") && isSupervisor;

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div className="space-y-1">
          <Link href="/transfers" className="flex items-center gap-1 text-[11px] font-bold text-gray-400 hover:text-blue-500 uppercase tracking-wider mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Transfers
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shadow-sm">
              <ArrowRightLeft className="w-4.5 h-4.5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900">Transfer: {transfer.transferNumber}</h1>
          </div>
          <p className="text-xs text-gray-500 font-medium">Inter-warehouse transfer checklist & confirmation workbench</p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
          {canCancel && (
            <Button
              onClick={handleCancel}
              disabled={actionLoading}
              variant="outline"
              className="border-red-200 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl h-10 px-4 text-xs font-semibold flex items-center gap-1.5 shadow-sm"
            >
              <XCircle className="w-4.5 h-4.5" /> Cancel Transfer
            </Button>
          )}

          {canEdit && (
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <DialogTrigger render={<Button variant="outline" className="border-gray-200 text-gray-600 hover:text-gray-900 rounded-xl h-10 px-4 text-xs font-semibold flex items-center gap-1.5 shadow-sm" />}>
                <Edit className="w-4.5 h-4.5" /> Edit Draft
              </DialogTrigger>
              <DialogContent className="bg-white text-gray-950 max-w-4xl rounded-2xl">
                <DialogHeader>
                  <DialogTitle className="text-base font-bold">Modify Transfer Draft</DialogTitle>
                </DialogHeader>
                <TransferForm
                  initialData={transfer}
                  onSuccess={() => {
                    setEditOpen(false);
                    fetchTransferDetails();
                  }}
                  onCancel={() => setEditOpen(false)}
                />
              </DialogContent>
            </Dialog>
          )}

          {canDispatch && (
            <Button
              onClick={handleDispatch}
              disabled={actionLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-10 px-4 text-xs font-semibold flex items-center gap-1.5 shadow-sm"
            >
              <Send className="w-4 h-4" /> Dispatch Shipment
            </Button>
          )}

          {canReceive && (
            <Button
              onClick={handleReceive}
              disabled={actionLoading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-10 px-4 text-xs font-semibold flex items-center gap-1.5 shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4" /> Confirm Receipt
            </Button>
          )}
        </div>
      </div>

      {/* Stepper Timeline */}
      <TransferStatusBar transfer={transfer} />

      {/* Detail grids */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left main info */}
        <Card className="lg:col-span-2 border-gray-200 shadow-sm bg-white">
          <CardHeader className="pb-3 border-b border-gray-100">
            <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-gray-400" /> Transferred Itemized Lines
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-gray-50 border-b border-gray-250">
                <TableRow>
                  <TableHead className="text-gray-500 font-semibold text-xs py-3 pl-4">Product Details</TableHead>
                  <TableHead className="text-gray-500 font-semibold text-xs py-3 text-center">Batch</TableHead>
                  <TableHead className="text-gray-500 font-semibold text-xs py-3 text-right">Req. Qty</TableHead>
                  {transfer.status !== "draft" && (
                    <TableHead className="text-gray-500 font-semibold text-xs py-3 text-right">Dispatched Qty</TableHead>
                  )}
                  {transfer.status === "in_transit" ? (
                    <>
                      <TableHead className="text-gray-500 font-semibold text-xs py-3" style={{ width: "110px" }}>Rec. Qty</TableHead>
                      <TableHead className="text-gray-500 font-semibold text-xs py-3" style={{ width: "120px" }}>Dest Zone/Bin</TableHead>
                    </>
                  ) : transfer.status === "received" || transfer.status === "partial" ? (
                    <>
                      <TableHead className="text-gray-500 font-semibold text-xs py-3 text-right">Received Qty</TableHead>
                      <TableHead className="text-gray-500 font-semibold text-xs py-3 text-center">Receipt Zone</TableHead>
                    </>
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfer.items.map((line) => {
                  const receiptLine = receiptLines.find((r) => r.item === line.item?._id);

                  return (
                    <TableRow key={line._id} className="border-b border-gray-100 hover:bg-gray-50/10 text-xs">
                      <TableCell className="py-2.5 pl-4 font-bold text-gray-800">
                        {line.item?.name || "Unknown Item"}
                        <span className="font-mono text-[9px] text-gray-400 block font-bold mt-0.5">{line.item?.sku || "N/A"}</span>
                      </TableCell>
                      <TableCell className="py-2.5 text-center font-mono text-[10px] text-gray-500">
                        {line.batch ? "Tracked Batch" : "N/A"}
                      </TableCell>
                      <TableCell className="text-right py-2.5 font-mono font-semibold text-gray-700">
                        {line.requestedQty} <span className="font-normal text-gray-400 text-[10px]">{line.unit?.symbol || "pcs"}</span>
                      </TableCell>
                      {transfer.status !== "draft" && (
                        <TableCell className="text-right py-2.5 font-mono font-extrabold text-gray-800">
                          {line.dispatchedQty}
                        </TableCell>
                      )}
                      
                      {/* Receive mode inputs */}
                      {transfer.status === "in_transit" ? (
                        <>
                          <TableCell className="py-2">
                            <Input
                              type="number"
                              value={receiptLine?.receivedQty ?? ""}
                              onChange={(e) => updateReceiptQty(line.item?._id || "", e.target.value)}
                              className="h-8 border-gray-200 text-xs font-semibold px-2 rounded-lg font-mono w-full"
                              min={0}
                              max={line.dispatchedQty}
                            />
                          </TableCell>
                          <TableCell className="py-2 space-y-1">
                            <Select
                              value={receiptLine?.toZone || ""}
                              onValueChange={(val) => updateReceiptZone(line.item?._id || "", val || "")}
                            >
                              <SelectTrigger className="h-8 border-gray-200 text-[10px] rounded-lg bg-white w-full">
                                <SelectValue placeholder="Zone" />
                              </SelectTrigger>
                              <SelectContent className="bg-white border-gray-200 text-gray-900 text-[10px]">
                                {(transfer.toWarehouse?.zones || []).map((z) => (
                                  <SelectItem key={z._id} value={z.code}>
                                    Zone {z.code}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Input
                              value={receiptLine?.toBin || ""}
                              onChange={(e) => updateReceiptBin(line.item?._id || "", e.target.value)}
                              className="h-8 border-gray-250 text-[10px] px-2 rounded-lg font-mono w-full"
                              placeholder="Row-Bin (01-05)"
                            />
                          </TableCell>
                        </>
                      ) : transfer.status === "received" || transfer.status === "partial" ? (
                        <>
                          <TableCell className={`text-right py-2.5 font-mono font-bold ${line.receivedQty < line.dispatchedQty ? "text-amber-500" : "text-gray-900"}`}>
                            {line.receivedQty}
                          </TableCell>
                          <TableCell className="text-center font-mono text-[10px] text-gray-600 py-2.5 uppercase">
                            {line.toZone ? `${line.toZone}-${line.toBin || "00-00"}` : "-"}
                          </TableCell>
                        </>
                      ) : null}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Right side logistics/performer summary */}
        <div className="space-y-4">
          {/* Dispatch/Logistics */}
          <Card className="border-gray-200 shadow-sm bg-white">
            <CardHeader className="pb-2 border-b border-gray-100">
              <CardTitle className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <Truck className="w-4.5 h-4.5 text-gray-400" /> Dispatch & Transporter Details
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 border-b border-gray-50 pb-2">
                <span className="text-gray-400 font-semibold">From Warehouse</span>
                <span className="font-bold text-gray-800 text-right">{transfer.fromWarehouse?.name}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 border-b border-gray-50 pb-2">
                <span className="text-gray-400 font-semibold">To Warehouse</span>
                <span className="font-bold text-gray-800 text-right">{transfer.toWarehouse?.name}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 border-b border-gray-50 pb-2">
                <span className="text-gray-400 font-semibold">Expected Date</span>
                <span className="font-bold text-gray-800 text-right font-mono">
                  {transfer.expectedDate ? new Date(transfer.expectedDate).toLocaleDateString("en-IN") : "N/A"}
                </span>
              </div>

              {transfer.vehicleNumber && (
                <div className="grid grid-cols-2 gap-2 border-b border-gray-50 pb-2">
                  <span className="text-gray-400 font-semibold">Vehicle Number</span>
                  <span className="font-bold text-gray-800 text-right font-mono uppercase">{transfer.vehicleNumber}</span>
                </div>
              )}
              {transfer.driverName && (
                <div className="grid grid-cols-2 gap-2 border-b border-gray-50 pb-2">
                  <span className="text-gray-400 font-semibold">Driver Details</span>
                  <span className="font-bold text-gray-800 text-right">
                    {transfer.driverName} {transfer.driverPhone && `(${transfer.driverPhone})`}
                  </span>
                </div>
              )}
              {transfer.notes && (
                <div className="space-y-1 pt-1">
                  <span className="text-gray-400 font-semibold block">Notes:</span>
                  <p className="text-gray-700 bg-gray-50 p-2 rounded-lg border border-gray-100 leading-normal">{transfer.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Audit trail */}
          <Card className="border-gray-200 shadow-sm bg-white">
            <CardHeader className="pb-2 border-b border-gray-100">
              <CardTitle className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-4.5 h-4.5 text-gray-400" /> Performer Sign-offs
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3 text-xs">
              <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                <div>
                  <span className="text-[10px] text-gray-400 block font-semibold uppercase">Created By</span>
                  <span className="font-bold text-gray-800">{transfer.createdBy?.name || "System"}</span>
                </div>
                <span className="text-[10px] text-gray-400 font-mono font-semibold">
                  {new Date(transfer.createdAt).toLocaleDateString("en-IN")}
                </span>
              </div>

              {transfer.dispatchedBy && (
                <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                  <div>
                    <span className="text-[10px] text-gray-400 block font-semibold uppercase">Dispatched By</span>
                    <span className="font-bold text-gray-800">{transfer.dispatchedBy.name}</span>
                  </div>
                  <span className="text-[10px] text-gray-400 font-mono font-semibold">
                    {transfer.dispatchDate ? new Date(transfer.dispatchDate).toLocaleDateString("en-IN") : "-"}
                  </span>
                </div>
              )}

              {transfer.receivedBy && (
                <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                  <div>
                    <span className="text-[10px] text-gray-400 block font-semibold uppercase">Received By</span>
                    <span className="font-bold text-gray-800">{transfer.receivedBy.name}</span>
                  </div>
                  <span className="text-[10px] text-gray-400 font-mono font-semibold">
                    {transfer.receivedDate ? new Date(transfer.receivedDate).toLocaleDateString("en-IN") : "-"}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
