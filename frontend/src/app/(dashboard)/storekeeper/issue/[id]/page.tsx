"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer, RotateCcw, Loader2, ClipboardList, Check, AlertTriangle, AlertCircle } from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PrintableVoucher from "@/components/storekeeper/PrintableVoucher";

interface IssueItem {
  _id: string; // Line ID
  item: {
    _id: string;
    name: string;
    sku: string;
    unit?: {
      symbol: string;
    } | string;
    isBatchTracked?: boolean;
    isSerialTracked?: boolean;
    hasExpiry?: boolean;
  };
  requestedQty: number;
  issuedQty: number;
  returnedQty: number;
  remarks?: string;
  batches?: {
    batchId?: {
      _id: string;
      batchNumber: string;
      expiryDate?: string;
    } | null;
    quantity: number;
  }[];
  serialNumbers?: {
    _id: string;
    serialNumber: string;
    status: string;
  }[];
}

interface IssueVoucher {
  _id: string;
  ivNumber: string;
  warehouse: {
    _id: string;
    name: string;
    code: string;
  };
  requester: {
    name: string;
    employeeId?: string;
    department: {
      name: string;
    };
    departmentName: string;
  };
  approver: {
    name: string;
    designation: string;
    slipReference?: string;
  };
  status: "issued" | "partial_return" | "fully_returned" | "draft" | "cancelled";
  issueDate: string;
  items: IssueItem[];
  notes?: string;
  createdBy?: {
    name: string;
  };
  returns: any[];
}

export default function IssueVoucherDetailPage({ params }: { params: { id: string } }) {
  const { data: session } = useSession();
  const [voucher, setVoucher] = useState<IssueVoucher | null>(null);
  const [org, setOrg] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Return Desk modal/drawer states
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnQtys, setReturnQtys] = useState<{ [lineId: string]: number }>({});
  const [returnConditions, setReturnConditions] = useState<{ [lineId: string]: "good" | "damaged" | "partial_damage" }>({});
  const [returnRemarks, setReturnRemarks] = useState<{ [lineId: string]: string }>({});
  const [selectedReturnSerials, setSelectedReturnSerials] = useState<{ [lineId: string]: string[] }>({});
  const [generalReturnNotes, setGeneralReturnNotes] = useState("");
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);

  const fetchVoucherDetails = () => {
    setLoading(true);
    Promise.all([
      fetch(`/api/issues/${params.id}`).then((res) => res.json()),
      fetch("/api/settings/organization").then((res) => res.json())
    ])
      .then(([voucherData, orgData]) => {
        if (voucherData.success) {
          setVoucher(voucherData.data);
          // Initialize return quantities and serials
          const qtys: any = {};
          const conditions: any = {};
          const remarks: any = {};
          const returnSerials: any = {};
          
          voucherData.data.items.forEach((line: IssueItem) => {
            const pending = line.issuedQty - line.returnedQty;
            conditions[line._id] = "good";
            remarks[line._id] = "";
            
            if (line.item?.isSerialTracked && line.serialNumbers) {
              // Get serial numbers that are currently issued and not returned
              const pendingSerials = line.serialNumbers
                .filter((s: any) => s.status === "ISSUED")
                .map((s: any) => s._id);
              returnSerials[line._id] = pendingSerials;
              qtys[line._id] = pendingSerials.length;
            } else {
              returnSerials[line._id] = [];
              qtys[line._id] = pending;
            }
          });
          
          setReturnQtys(qtys);
          setReturnConditions(conditions);
          setReturnRemarks(remarks);
          setSelectedReturnSerials(returnSerials);
        } else {
          toast.error("Failed to load voucher details");
        }
        if (orgData.success) {
          setOrg(orgData.data);
        }
      })
      .catch((err) => {
        console.error(err);
        toast.error("Error loading voucher");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchVoucherDetails();
  }, [params.id]);

  const handlePrint = () => {
    window.print();
  };

  const handleReturnQtyChange = (lineId: string, value: string, max: number) => {
    const val = parseFloat(value) || 0;
    setReturnQtys((prev) => ({
      ...prev,
      [lineId]: Math.min(max, Math.max(0, val)),
    }));
  };

  const handleSerialToggle = (lineId: string, serialId: string) => {
    setSelectedReturnSerials((prev) => {
      const current = prev[lineId] || [];
      const updated = current.includes(serialId)
        ? current.filter((id) => id !== serialId)
        : [...current, serialId];
      
      // Sync return quantity automatically
      setReturnQtys((q) => ({
        ...q,
        [lineId]: updated.length,
      }));

      return {
        ...prev,
        [lineId]: updated,
      };
    });
  };

  const handleReturnConditionChange = (lineId: string, condition: "good" | "damaged" | "partial_damage") => {
    setReturnConditions((prev) => ({
      ...prev,
      [lineId]: condition,
    }));
  };

  const handleReturnRemarksChange = (lineId: string, value: string) => {
    setReturnRemarks((prev) => ({
      ...prev,
      [lineId]: value,
    }));
  };

  const handleSubmitReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voucher) return;

    // Filter out rows with 0 return quantity
    const itemsToReturn = voucher.items
      .filter((line) => returnQtys[line._id] > 0)
      .map((line) => ({
        issueLineId: line._id,
        item: line.item._id,
        returnedQty: returnQtys[line._id],
        condition: returnConditions[line._id],
        notes: returnRemarks[line._id],
        serialNumbers: line.item?.isSerialTracked ? (selectedReturnSerials[line._id] || []) : undefined,
      }));

    if (itemsToReturn.length === 0) {
      toast.warning("Please specify return quantities greater than 0.");
      return;
    }

    setIsSubmittingReturn(true);
    try {
      const payload = {
        issueVoucherId: voucher._id,
        items: itemsToReturn,
        remarks: generalReturnNotes,
        receivedBy: session?.user?.id || undefined,
      };

      const res = await fetch("/api/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Materials successfully returned to warehouse!");
        setShowReturnModal(false);
        setGeneralReturnNotes("");
        fetchVoucherDetails(); // reload data
      } else {
        toast.error(data.error?.message || "Failed to process return.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error occurred while processing returns.");
    } finally {
      setIsSubmittingReturn(false);
    }
  };

  if (loading) return <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-gray-300" /></div>;
  if (!voucher) return <div className="p-12 text-center text-red-500">Voucher not found</div>;

  return (
    <div className="space-y-6">
      
      {/* Action header bar (hidden on print) */}
      <div className="flex items-center justify-between no-print bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
        <Link href="/storekeeper/issue" className="flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to List
        </Link>
        <div className="flex gap-2">
          {voucher.status !== "fully_returned" && (
            <button 
              onClick={() => setShowReturnModal(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl flex items-center gap-2 h-9 px-4 text-sm font-semibold transition-all shadow-sm"
            >
              <RotateCcw className="w-4 h-4" /> Returns Intake
            </button>
          )}
          <button 
            onClick={handlePrint}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center gap-2 h-9 px-4 text-sm font-semibold transition-all shadow-sm"
          >
            <Printer className="w-4 h-4" /> Print Slip
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 no-print">
        
        {/* Left 2 Cols: Material Voucher Preview */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
              <ClipboardList className="w-5 h-5 text-gray-400" /> MIV Document Review
            </h2>
            <PrintableVoucher voucher={voucher} org={org} />
          </div>
        </div>

        {/* Right Col: Returns logs list */}
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col h-full">
            <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3 mb-4 flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-amber-500" /> Return Logs ({voucher.returns?.length || 0})
            </h2>
            <div className="flex-1 space-y-4 overflow-y-auto max-h-[500px] pr-2">
              {voucher.returns?.map((rtn: any, idx: number) => {
                const dateStr = new Date(rtn.createdAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit"
                });
                return (
                  <div key={rtn._id || idx} className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 space-y-3">
                    <div className="flex justify-between items-start border-b border-gray-100 pb-2">
                      <span className="font-bold text-sm text-gray-900">{rtn.returnNumber || "RTN-xxxx"}</span>
                      <span className="text-[10px] text-gray-400">{dateStr}</span>
                    </div>
                    
                    <div className="space-y-2">
                      {rtn.items?.map((item: any, i: number) => (
                        <div key={i} className="space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-semibold text-gray-700 truncate max-w-[150px]">{item.item?.name}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              item.condition === "good" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                            }`}>
                              {item.returnedQty} returned ({item.condition})
                            </span>
                          </div>
                          {item.serialNumbers && item.serialNumbers.length > 0 && (
                            <div className="text-[9px] text-gray-500 font-mono bg-white p-1 rounded border border-gray-150 flex flex-wrap gap-1 mt-0.5">
                              <span className="text-gray-400">Serials:</span>
                              {item.serialNumbers.map((s: any, sIdx: number) => (
                                <span key={sIdx} className="bg-gray-50 px-1 border border-gray-250 rounded">
                                  {s.serialNumber}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {rtn.remarks && (
                      <div className="text-[10px] text-gray-500 bg-white p-2 border border-gray-150 rounded-lg italic">
                        "{rtn.remarks}"
                      </div>
                    )}
                  </div>
                );
              })}
              {(!voucher.returns || voucher.returns.length === 0) && (
                <div className="text-center py-12 text-gray-400 border border-dashed border-gray-200 rounded-xl">
                  <AlertCircle className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  No returns processed for this slip yet.
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Printable Sheet (hidden on screen by CSS, visible on print) */}
      <div className="hidden print:block">
        <PrintableVoucher voucher={voucher} org={org} />
      </div>

      {/* Return Intake Modal Panel */}
      {showReturnModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto no-print">
          <div className="bg-white rounded-2xl max-w-3xl w-full border border-gray-200 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-amber-500" /> Return Materials Intake desk
              </h2>
              <button onClick={() => setShowReturnModal(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>

            <form onSubmit={handleSubmitReturn} className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col">
              
              {/* Slip Metadata Summary */}
              <div className="p-4 border border-amber-100 bg-amber-50/20 rounded-xl flex gap-3 text-xs text-amber-800">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Intake Desk for MIV: {voucher.ivNumber}</strong>
                  <p className="mt-1">Select returned quantities and check materials condition. Returned items (except damaged ones) are automatically added back to inventory stock.</p>
                </div>
              </div>

              {/* Items returning input layout */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-900">Line Items</h3>
                <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
                  {voucher.items.map((line) => {
                    const pending = line.issuedQty - line.returnedQty;
                    const unit = typeof line.item?.unit === "object" ? line.item.unit.symbol : line.item?.unit || "pcs";
                    
                    if (pending <= 0) return null;

                    const isSerialTracked = line.item?.isSerialTracked;
                    const issuedSerials = line.serialNumbers || [];
                    const pendingSerials = issuedSerials.filter((s: any) => s.status === "ISSUED");

                    return (
                      <div key={line._id} className="p-4 space-y-4 bg-white hover:bg-gray-50/20">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-bold text-sm text-gray-900">{line.item?.name}</div>
                            <div className="text-[10px] text-gray-400 font-mono mt-0.5">{line.item?.sku}</div>
                          </div>
                          <div className="text-right text-xs">
                            <span className="text-gray-500">Pending:</span> <strong>{pending} {unit}</strong>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          
                          {/* Qty returning input */}
                          <div className="space-y-1">
                            <Label className="text-[11px] text-gray-500 font-semibold">Qty Returning {isSerialTracked && "(Auto)"}</Label>
                            {isSerialTracked ? (
                              <div className="h-8 flex items-center px-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 text-xs font-bold font-mono">
                                {returnQtys[line._id] || 0}
                              </div>
                            ) : (
                              <Input
                                type="number"
                                min="0"
                                max={pending}
                                step="any"
                                value={returnQtys[line._id] || 0}
                                onChange={(e) => handleReturnQtyChange(line._id, e.target.value, pending)}
                                className="h-8 border-gray-300 text-gray-900 text-xs font-bold rounded-lg bg-white"
                              />
                            )}
                          </div>

                          {/* Condition Select */}
                          <div className="space-y-1">
                            <Label className="text-[11px] text-gray-500 font-semibold">Condition</Label>
                            <select
                              value={returnConditions[line._id] || "good"}
                              onChange={(e) => handleReturnConditionChange(line._id, e.target.value as any)}
                              className="flex h-8 w-full rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900 focus-visible:outline-none"
                            >
                              <option value="good">Good / Reusable</option>
                              <option value="partial_damage">Partial Damage (Add back)</option>
                              <option value="damaged">Scrapped / Damaged (Write-off)</option>
                            </select>
                          </div>

                          {/* Row remarks */}
                          <div className="space-y-1">
                            <Label className="text-[11px] text-gray-500 font-semibold">Row Remarks</Label>
                            <Input
                              type="text"
                              placeholder="e.g. wrapper torn"
                              value={returnRemarks[line._id] || ""}
                              onChange={(e) => handleReturnRemarksChange(line._id, e.target.value)}
                              className="h-8 border-gray-300 text-gray-900 text-xs rounded-lg bg-white"
                            />
                          </div>

                          {/* Serial checklist if serial tracked */}
                          {isSerialTracked && pendingSerials.length > 0 && (
                            <div className="col-span-full bg-gray-50 border border-gray-250 rounded-xl p-3 space-y-2 mt-1">
                              <div className="flex justify-between items-center">
                                <span className="text-[11px] font-bold text-gray-700">Select Returned Serials ({selectedReturnSerials[line._id]?.length || 0} selected)</span>
                                <span className="text-[9px] text-gray-400">Checkbox selection overrides quantity</span>
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {pendingSerials.map((s: any) => {
                                  const isChecked = (selectedReturnSerials[line._id] || []).includes(s._id);
                                  return (
                                    <label key={s._id} className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg cursor-pointer transition-all ${
                                      isChecked 
                                        ? "bg-amber-50 border-amber-300 text-amber-900 font-semibold" 
                                        : "bg-white border-gray-250 hover:bg-gray-50 text-gray-700"
                                    }`}>
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => handleSerialToggle(line._id, s._id)}
                                        className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                                      />
                                      <span className="font-mono text-[10px]">{s.serialNumber}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* General remarks */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-gray-700">General Return Slip Notes</Label>
                <Input
                  type="text"
                  placeholder="General notes on worker feedback, delivery condition..."
                  value={generalReturnNotes}
                  onChange={(e) => setGeneralReturnNotes(e.target.value)}
                  className="bg-white border-gray-300 text-gray-900 rounded-xl"
                />
              </div>

              {/* Action buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowReturnModal(false)}
                  className="rounded-xl border-gray-200 h-10 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingReturn}
                  className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-sm px-4 font-semibold text-xs h-10 flex items-center gap-2"
                >
                  {isSubmittingReturn ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving return...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Save Return &amp; Adjust Stock
                    </>
                  )}
                </Button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
