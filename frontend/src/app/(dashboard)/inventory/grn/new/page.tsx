"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  PackageCheck, 
  FileText, 
  Warehouse as WarehouseIcon, 
  User as UserIcon, 
  Calendar,
  AlertTriangle,
  Loader2,
  Check
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface POLineItem {
  item: {
    _id: string;
    name: string;
    sku: string;
  };
  quantity: number;
  receivedQty: number;
  unitCost: number;
  gstRate: number;
}

interface PurchaseOrder {
  _id: string;
  poNumber: string;
  status: string;
  vendor: {
    _id: string;
    name: string;
  };
  warehouse: {
    _id: string;
    name: string;
  };
  items: POLineItem[];
}

export default function NewGRNPage() {
  const router = useRouter();
  
  // State variables
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loadingPOs, setLoadingPOs] = useState(true);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  
  // Wizard steps
  // Step 1: Select PO
  // Step 2: Enter quantities & details
  const [step, setStep] = useState(1);
  
  // Form fields
  const [referenceDocument, setReferenceDocument] = useState("");
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch sent/partial POs on mount
  useEffect(() => {
    fetch("/api/purchase-orders")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          // Filter to sent or partial status
          const activePOs = data.data.filter((po: any) => po.status === "sent" || po.status === "partial");
          setPurchaseOrders(activePOs);
        } else {
          toast.error("Failed to load Purchase Orders");
        }
      })
      .catch((err) => {
        console.error(err);
        toast.error("Error loading Purchase Orders");
      })
      .finally(() => setLoadingPOs(false));
  }, []);

  // Handle PO selection
  const handleSelectPO = (po: PurchaseOrder) => {
    setSelectedPO(po);
    // Initialize line items
    const items = po.items.map((pi) => {
      const expected = Math.max(0, pi.quantity - (pi.receivedQty || 0));
      return {
        item: pi.item._id,
        name: pi.item.name,
        sku: pi.item.sku,
        isBatchTracked: (pi.item as any).isBatchTracked,
        isSerialTracked: (pi.item as any).isSerialTracked,
        hasExpiry: (pi.item as any).hasExpiry,
        expectedQty: expected,
        receivedQty: expected,
        acceptedQty: expected,
        rejectedQty: 0,
        rejectionReason: "",
        unitCost: pi.unitCost,
        batchNumber: "",
        expiryDate: "",
        serialNumbersText: "",
        zone: "",
        bin: ""
      };
    });
    setLineItems(items);
    setStep(2);
  };

  // Handle quantity changes
  const handleQtyChange = (index: number, field: string, value: string) => {
    const val = parseFloat(value) || 0;
    const newItems = [...lineItems];
    const item = newItems[index];

    if (field === "receivedQty") {
      item.receivedQty = val;
      // Auto-set accepted to match received if not modified, keep rejected at 0
      item.acceptedQty = val;
      item.rejectedQty = 0;
    } else if (field === "acceptedQty") {
      item.acceptedQty = val;
      // Re-calculate rejected
      item.rejectedQty = Math.max(0, item.receivedQty - val);
    } else if (field === "rejectedQty") {
      item.rejectedQty = val;
      // Re-calculate accepted
      item.acceptedQty = Math.max(0, item.receivedQty - val);
    } else {
      item[field] = value;
    }

    setLineItems(newItems);
  };

  // Submit Draft GRN
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPO) return;

    // Validation: check that accepted + rejected = received for all items
    for (const item of lineItems) {
      if (item.acceptedQty + item.rejectedQty !== item.receivedQty) {
        toast.error(`Verification mismatch: Accepted + Rejected Qty must equal Received Qty for item ${item.sku}.`);
        return;
      }
      if (item.rejectedQty > 0 && !item.rejectionReason) {
        toast.error(`Rejection reason is required for item ${item.sku} because rejected quantity is greater than 0.`);
        return;
      }
      if (item.acceptedQty > 0) {
        if (item.isBatchTracked && !item.batchNumber) {
          toast.error(`Batch Number is required for item ${item.sku}.`);
          return;
        }
        if (item.isBatchTracked && item.hasExpiry && !item.expiryDate) {
          toast.error(`Expiry Date is required for item ${item.sku}.`);
          return;
        }
        if (item.isSerialTracked) {
          if (!item.serialNumbersText) {
            toast.error(`Serial Numbers are required for item ${item.sku}.`);
            return;
          }
          const serials = item.serialNumbersText.split(/[\n,]+/).map((s: string) => s.trim()).filter(Boolean);
          if (serials.length !== item.acceptedQty) {
            toast.error(`Item ${item.sku} is serial tracked. Entered ${serials.length} serials, but accepted quantity is ${item.acceptedQty}.`);
            return;
          }
        }
      }
    }

    setIsSubmitting(true);
    try {
      const payload = {
        po: selectedPO._id,
        vendor: selectedPO.vendor._id,
        warehouse: selectedPO.warehouse._id,
        referenceDocument,
        receivedDate,
        notes,
        items: lineItems.map(item => ({
          item: item.item,
          expectedQty: item.expectedQty,
          receivedQty: item.receivedQty,
          acceptedQty: item.acceptedQty,
          rejectedQty: item.rejectedQty,
          rejectionReason: item.rejectionReason,
          unitCost: item.unitCost,
          batchNumber: item.batchNumber || undefined,
          expiryDate: item.expiryDate || undefined,
          serialNumbers: item.isSerialTracked 
            ? item.serialNumbersText.split(/[\n,]+/).map((s: string) => s.trim()).filter(Boolean)
            : undefined,
          zone: item.zone || undefined,
          bin: item.bin || undefined
        }))
      };

      const res = await fetch("/api/grn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Draft GRN created successfully!");
        router.push(`/inventory/grn/${data.data._id}`);
      } else {
        toast.error(data.error?.message || "Failed to create GRN draft.");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred during submission.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link href="/inventory/grn" className="flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to GRNs
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <PackageCheck className="w-7 h-7 text-emerald-600" /> New Goods Receipt Note
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {step === 1 ? "Select an active Purchase Order to receive stock." : `Processing delivery receipt for PO: ${selectedPO?.poNumber}`}
          </p>
        </div>
        {step === 2 && (
          <Button variant="outline" onClick={() => setStep(1)} className="rounded-xl border-gray-200">
            Change Purchase Order
          </Button>
        )}
      </div>

      {/* Step 1: Select Purchase Order */}
      {step === 1 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-400" /> Sent & Pending Purchase Orders
          </h2>
          
          {loadingPOs ? (
            <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-gray-300" /></div>
          ) : purchaseOrders.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
              <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
              <p className="text-gray-800 font-semibold text-sm">No Active Purchase Orders</p>
              <p className="text-gray-500 text-xs mt-1">There are no POs currently in "Sent" or "Partial" state.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {purchaseOrders.map((po) => (
                <div 
                  key={po._id} 
                  onClick={() => handleSelectPO(po)}
                  className="group relative border border-gray-200 hover:border-emerald-500 rounded-xl p-5 hover:bg-emerald-50/10 cursor-pointer transition-all duration-300 shadow-sm hover:shadow-md"
                >
                  <div className="flex justify-between items-start">
                    <span className="text-base font-bold text-gray-900 tracking-tight group-hover:text-emerald-700 transition-colors">
                      {po.poNumber}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                      po.status === "partial" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
                    }`}>
                      {po.status}
                    </span>
                  </div>
                  
                  <div className="mt-4 space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <UserIcon className="w-4 h-4 text-gray-400 shrink-0" />
                      <span className="truncate">Vendor: <strong>{po.vendor?.name}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <WarehouseIcon className="w-4 h-4 text-gray-400 shrink-0" />
                      <span>Warehouse: <strong>{po.warehouse?.name}</strong></span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                    <span>{po.items.length} Items</span>
                    <span className="text-emerald-600 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                      Process Delivery &rarr;
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Line Items & Inspection details */}
      {step === 2 && selectedPO && (
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Header Summary Metadata cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <Label className="text-xs text-gray-400 uppercase tracking-wider block">Vendor Details</Label>
              <div className="flex items-center gap-3 mt-2">
                <div className="p-2 rounded-lg bg-gray-50 text-gray-600"><UserIcon className="w-5 h-5" /></div>
                <div className="text-sm font-bold text-gray-900">{selectedPO.vendor?.name}</div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <Label className="text-xs text-gray-400 uppercase tracking-wider block">Receiving Destination</Label>
              <div className="flex items-center gap-3 mt-2">
                <div className="p-2 rounded-lg bg-gray-50 text-gray-600"><WarehouseIcon className="w-5 h-5" /></div>
                <div className="text-sm font-bold text-gray-900">{selectedPO.warehouse?.name}</div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <Label className="text-xs text-gray-400 uppercase tracking-wider block">Linked PO Code</Label>
              <div className="flex items-center gap-3 mt-2">
                <div className="p-2 rounded-lg bg-gray-50 text-gray-600"><FileText className="w-5 h-5" /></div>
                <div className="text-sm font-bold text-gray-900">{selectedPO.poNumber}</div>
              </div>
            </div>
          </div>

          {/* Form details & metadata */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <Label htmlFor="reference" className="text-sm font-semibold text-gray-700">Invoice / Challan Reference *</Label>
              <Input
                id="reference"
                type="text"
                placeholder="e.g. INV-10293 or Challan-882"
                value={referenceDocument}
                onChange={(e) => setReferenceDocument(e.target.value)}
                className="bg-white text-gray-900 border-gray-300 focus:border-emerald-500 rounded-xl"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="receivedDate" className="text-sm font-semibold text-gray-700">Receipt Date *</Label>
              <div className="relative">
                <Input
                  id="receivedDate"
                  type="date"
                  value={receivedDate}
                  onChange={(e) => setReceivedDate(e.target.value)}
                  className="bg-white text-gray-900 border-gray-300 focus:border-emerald-500 rounded-xl pr-10"
                  required
                />
                <Calendar className="w-5 h-5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <Label htmlFor="notes" className="text-sm font-semibold text-gray-700">General Notes / Remarks</Label>
              <Input
                id="notes"
                type="text"
                placeholder="Describe condition of packing, vehicle number, or other observations..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="bg-white text-gray-900 border-gray-300 focus:border-emerald-500 rounded-xl"
              />
            </div>
          </div>

          {/* Items checklist */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">Line Items Inspection</h2>
              <span className="text-xs text-gray-500 font-medium">Verify quantities received against PO specifications</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/20">
                    <th className="px-6 py-3">Item Details</th>
                    <th className="px-6 py-3 text-right">Expected Qty</th>
                    <th className="px-6 py-3 text-right">Received Qty</th>
                    <th className="px-6 py-3 text-right">Accepted Qty</th>
                    <th className="px-6 py-3 text-right">Rejected Qty</th>
                    <th className="px-6 py-3">Rejection Reason (If any)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {lineItems.map((item, index) => (
                    <React.Fragment key={index}>
                      <tr className="hover:bg-gray-50/30">
                        <td className="px-6 py-4">
                          <div className="font-bold text-gray-900">{item.name}</div>
                          <div className="text-xs text-gray-400 mt-0.5">{item.sku}</div>
                          {item.isBatchTracked && <span className="inline-block mt-1 mr-2 px-1.5 py-0.5 rounded text-[10px] bg-blue-100 text-blue-800 font-semibold uppercase tracking-wider">Batch Tracked</span>}
                          {item.isSerialTracked && <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] bg-purple-100 text-purple-800 font-semibold uppercase tracking-wider">Serial Tracked</span>}
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-gray-600">
                          {item.expectedQty}
                        </td>
                        <td className="px-6 py-4 text-right w-32">
                          <Input
                            type="number"
                            min="0"
                            step="any"
                            value={item.receivedQty}
                            onChange={(e) => handleQtyChange(index, "receivedQty", e.target.value)}
                            className="text-right font-semibold text-gray-900 rounded-lg border-gray-300 focus:border-emerald-500 h-9"
                          />
                        </td>
                        <td className="px-6 py-4 text-right w-32">
                          <Input
                            type="number"
                            min="0"
                            max={item.receivedQty}
                            step="any"
                            value={item.acceptedQty}
                            onChange={(e) => handleQtyChange(index, "acceptedQty", e.target.value)}
                            className="text-right font-bold text-emerald-600 rounded-lg border-gray-300 focus:border-emerald-500 h-9"
                          />
                        </td>
                        <td className="px-6 py-4 text-right w-32">
                          <Input
                            type="number"
                            min="0"
                            max={item.receivedQty}
                            step="any"
                            value={item.rejectedQty}
                            onChange={(e) => handleQtyChange(index, "rejectedQty", e.target.value)}
                            className="text-right font-bold text-red-500 rounded-lg border-gray-300 focus:border-emerald-500 h-9"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <Input
                            type="text"
                            placeholder="e.g. damaged coating, bent"
                            value={item.rejectionReason}
                            onChange={(e) => handleQtyChange(index, "rejectionReason", e.target.value)}
                            disabled={item.rejectedQty <= 0}
                            className="rounded-lg border-gray-300 focus:border-emerald-500 h-9 placeholder-gray-400 bg-white"
                          />
                        </td>
                      </tr>
                      {item.acceptedQty > 0 && (
                        <tr className="bg-gray-50/40">
                          <td colSpan={6} className="px-6 py-3 border-b border-gray-100">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-3 bg-white border border-gray-200 rounded-xl">
                              {item.isBatchTracked && (
                                <>
                                  <div className="space-y-1">
                                    <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Batch Number *</Label>
                                    <Input
                                      type="text"
                                      placeholder="e.g. B-01A"
                                      value={item.batchNumber}
                                      onChange={(e) => handleQtyChange(index, "batchNumber", e.target.value)}
                                      className="h-8 text-xs bg-white text-gray-900 border-gray-300 rounded-lg"
                                      required
                                    />
                                  </div>
                                  {item.hasExpiry && (
                                    <div className="space-y-1">
                                      <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Expiry Date *</Label>
                                      <Input
                                        type="date"
                                        value={item.expiryDate}
                                        onChange={(e) => handleQtyChange(index, "expiryDate", e.target.value)}
                                        className="h-8 text-xs bg-white text-gray-900 border-gray-300 rounded-lg"
                                        required
                                      />
                                    </div>
                                  )}
                                </>
                              )}
                              {item.isSerialTracked && (
                                <div className="space-y-1 md:col-span-2">
                                  <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                    Serial Numbers * (Enter {item.acceptedQty} serials, comma-separated)
                                  </Label>
                                  <Input
                                    type="text"
                                    placeholder="e.g. SN-001, SN-002"
                                    value={item.serialNumbersText}
                                    onChange={(e) => handleQtyChange(index, "serialNumbersText", e.target.value)}
                                    className="h-8 text-xs bg-white text-gray-900 border-gray-300 rounded-lg"
                                    required
                                  />
                                </div>
                              )}
                              <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Zone</Label>
                                <Input
                                  type="text"
                                  placeholder="e.g. A-Zone"
                                  value={item.zone}
                                  onChange={(e) => handleQtyChange(index, "zone", e.target.value)}
                                  className="h-8 text-xs bg-white text-gray-900 border-gray-300 rounded-lg"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Bin / Rack</Label>
                                <Input
                                  type="text"
                                  placeholder="e.g. Bin-09"
                                  value={item.bin}
                                  onChange={(e) => handleQtyChange(index, "bin", e.target.value)}
                                  className="h-8 text-xs bg-white text-gray-900 border-gray-300 rounded-lg"
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(1)}
              className="rounded-xl border-gray-200"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm h-11 px-6 font-semibold transition-all flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating Draft...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Create Draft GRN
                </>
              )}
            </Button>
          </div>
        </form>
      )}

    </div>
  );
}
