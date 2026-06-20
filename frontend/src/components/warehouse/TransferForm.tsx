"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ChevronRight, ChevronLeft, Loader2, Save, Send, Calendar, Truck, UserCheck, AlertTriangle } from "lucide-react";
import TransferLineItems from "./TransferLineItems";

interface Warehouse {
  _id: string;
  code: string;
  name: string;
}

interface Unit {
  _id: string;
  name: string;
  symbol: string;
}

interface LineItem {
  item: string;
  name: string;
  sku: string;
  requestedQty: number;
  availableQty: number;
  unitSymbol: string;
  costPrice: number;
  isBatchTracked: boolean;
  batch?: string;
  fromZone?: string;
  fromBin?: string;
  toZone?: string;
  toBin?: string;
}

interface TransferFormProps {
  initialData?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function TransferForm({ initialData, onSuccess, onCancel }: TransferFormProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehousesLoading, setWarehousesLoading] = useState(true);

  // Step 1: Header Form Fields
  const [fromWarehouseId, setFromWarehouseId] = useState(initialData?.fromWarehouse?._id || initialData?.fromWarehouse || "");
  const [toWarehouseId, setToWarehouseId] = useState(initialData?.toWarehouse?._id || initialData?.toWarehouse || "");
  const [expectedDate, setExpectedDate] = useState(
    initialData?.expectedDate ? new Date(initialData.expectedDate).toISOString().split("T")[0] : ""
  );
  const [vehicleNumber, setVehicleNumber] = useState(initialData?.vehicleNumber || "");
  const [driverName, setDriverName] = useState(initialData?.driverName || "");
  const [driverPhone, setDriverPhone] = useState(initialData?.driverPhone || "");
  const [notes, setNotes] = useState(initialData?.notes || "");

  // Step 2: Items Fields
  const [items, setItems] = useState<LineItem[]>([]);

  // Fetch warehouses
  useEffect(() => {
    const fetchWarehouses = async () => {
      try {
        const res = await fetch("/api/warehouses");
        const json = await res.json();
        if (json.success) {
          setWarehouses(json.data);
        }
      } catch (err) {
        console.error("Error fetching warehouses:", err);
      } finally {
        setWarehousesLoading(false);
      }
    };
    fetchWarehouses();
  }, []);

  // Set initial items if editing
  useEffect(() => {
    if (initialData?.items) {
      const mapped = (initialData.items || [])
        .filter((line: any) => line && line.item !== null && line.item !== undefined)
        .map((line: any) => ({
          item: line.item._id || line.item,
          name: line.item.name || "Item",
          sku: line.item.sku || "",
          requestedQty: line.requestedQty,
          availableQty: line.requestedQty + 100, // Safe placeholder
          unitSymbol: line.unit?.symbol || "pcs",
          costPrice: line.item.costPrice || 0,
          isBatchTracked: line.item.isBatchTracked || false,
          batch: line.batch || "",
          fromZone: line.fromZone || "",
          fromBin: line.fromBin || "",
        }));
      setItems(mapped);
    }
  }, [initialData]);

  const handleNextStep = () => {
    if (step === 1) {
      if (!fromWarehouseId || !toWarehouseId || !expectedDate) {
        toast.error("Source, Destination, and Expected Date are required.");
        return;
      }
      if (fromWarehouseId === toWarehouseId) {
        toast.error("Source and Destination warehouses must be different.");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (items.length === 0) {
        toast.error("At least one item must be added to transfer.");
        return;
      }
      // Check batch validation
      const missingBatch = items.find((line) => line.isBatchTracked && !line.batch);
      if (missingBatch) {
        toast.error(`Item '${missingBatch.name}' is batch-tracked but no batch was selected.`);
        return;
      }
      setStep(3);
    }
  };

  const handlePrevStep = () => {
    setStep((prev) => Math.max(1, prev - 1));
  };

  const submitTransfer = async (dispatchImmediately: boolean) => {
    setLoading(true);
    const payload = {
      fromWarehouse: fromWarehouseId,
      toWarehouse: toWarehouseId,
      expectedDate,
      vehicleNumber: vehicleNumber.trim(),
      driverName: driverName.trim(),
      driverPhone: driverPhone.trim(),
      notes: notes.trim(),
      items: items.map((line) => ({
        item: line.item,
        requestedQty: line.requestedQty,
        unit: line.unitSymbol === "pcs" ? undefined : undefined, // backend will lookup unit
        batch: line.batch || undefined,
        fromZone: line.fromZone || undefined,
        fromBin: line.fromBin || undefined,
      })),
    };

    try {
      const url = initialData?._id ? `/api/transfers/${initialData._id}` : "/api/transfers";
      const method = initialData?._id ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (!json.success) {
        toast.error(json.error?.message || "Failed to save transfer.");
        setLoading(false);
        return;
      }

      const savedTransfer = json.data;

      if (dispatchImmediately) {
        // Trigger dispatch endpoint
        const dispatchRes = await fetch(`/api/transfers/${savedTransfer._id}/dispatch`, {
          method: "POST",
        });
        const dispatchJson = await dispatchRes.json();
        if (dispatchJson.success) {
          toast.success("Transfer confirmed & dispatched successfully!");
          onSuccess();
        } else {
          toast.warning(`Draft saved, but confirmation failed: ${dispatchJson.error?.message}`);
          onSuccess();
        }
      } else {
        toast.success(initialData?._id ? "Transfer draft updated." : "Transfer draft saved successfully.");
        onSuccess();
      }
    } catch (err) {
      console.error(err);
      toast.error("Error saving stock transfer.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch unit references from stock record when creating lines
  useEffect(() => {
    // In our backend, unit will be fetched from item during creation.
  }, [items]);

  const totalQty = items.reduce((sum, item) => sum + item.requestedQty, 0);
  const totalValue = items.reduce((sum, item) => sum + item.requestedQty * item.costPrice, 0);

  return (
    <div className="space-y-6">
      {/* Step Stepper Header */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step >= 1 ? "bg-blue-600 text-white" : "bg-gray-150 text-gray-500"}`}>1</div>
          <span className={`text-xs font-semibold ${step === 1 ? "text-gray-900" : "text-gray-400"}`}>Header Details</span>
        </div>
        <div className="w-12 h-px bg-gray-200" />
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step >= 2 ? "bg-blue-600 text-white" : "bg-gray-150 text-gray-500"}`}>2</div>
          <span className={`text-xs font-semibold ${step === 2 ? "text-gray-900" : "text-gray-400"}`}>Items List</span>
        </div>
        <div className="w-12 h-px bg-gray-200" />
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step >= 3 ? "bg-blue-600 text-white" : "bg-gray-150 text-gray-500"}`}>3</div>
          <span className={`text-xs font-semibold ${step === 3 ? "text-gray-900" : "text-gray-400"}`}>Review & Send</span>
        </div>
      </div>

      {/* STEP 1: Header */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-gray-700 text-xs font-semibold">From Warehouse (Source) *</Label>
              <Select value={fromWarehouseId} onValueChange={setFromWarehouseId} disabled={!!initialData?._id}>
                <SelectTrigger className="bg-gray-50 border-gray-200 text-gray-900 rounded-xl h-10">
                  <SelectValue placeholder={warehousesLoading ? "Loading..." : "Select source..."} />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200 text-gray-900 text-sm">
                  {warehouses.map((wh) => (
                    <SelectItem key={wh._id} value={wh._id}>
                      {wh.name} ({wh.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-gray-700 text-xs font-semibold">To Warehouse (Destination) *</Label>
              <Select value={toWarehouseId} onValueChange={setToWarehouseId} disabled={!!initialData?._id}>
                <SelectTrigger className="bg-gray-50 border-gray-200 text-gray-900 rounded-xl h-10">
                  <SelectValue placeholder={warehousesLoading ? "Loading..." : "Select destination..."} />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200 text-gray-900 text-sm">
                  {warehouses.map((wh) => (
                    <SelectItem key={wh._id} value={wh._id}>
                      {wh.name} ({wh.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="expectedDate" className="text-gray-700 text-xs font-semibold">Expected Delivery Date *</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  id="expectedDate"
                  type="date"
                  value={expectedDate}
                  onChange={(e) => setExpectedDate(e.target.value)}
                  className="bg-gray-50 border-gray-200 text-gray-900 rounded-xl pl-9 h-10 font-mono"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="vehicleNumber" className="text-gray-700 text-xs font-semibold">Vehicle Number</Label>
              <div className="relative">
                <Truck className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  id="vehicleNumber"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  placeholder="e.g. JH-05-AB-1234"
                  className="bg-gray-50 border-gray-200 text-gray-900 rounded-xl pl-9 h-10 uppercase font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="driverName" className="text-gray-700 text-xs font-semibold">Driver Name</Label>
              <div className="relative">
                <UserCheck className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  id="driverName"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="Driver Full Name"
                  className="bg-gray-50 border-gray-200 text-gray-900 rounded-xl pl-9 h-10"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="driverPhone" className="text-gray-700 text-xs font-semibold">Driver Phone Number</Label>
              <Input
                id="driverPhone"
                value={driverPhone}
                onChange={(e) => setDriverPhone(e.target.value)}
                placeholder="10-digit number"
                className="bg-gray-50 border-gray-200 text-gray-900 rounded-xl h-10 font-mono"
              />
            </div>

            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="notes" className="text-gray-700 text-xs font-semibold">Reference Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add loading or transit guidelines..."
                className="bg-gray-50 border-gray-200 text-gray-900 rounded-xl"
                rows={3}
              />
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: Items List */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-blue-50 border border-blue-100 p-3 rounded-xl">
            <span className="text-xs text-blue-800 font-semibold flex items-center gap-1.5">
              <Truck className="w-4 h-4" /> Transferring from:{" "}
              <strong>{warehouses.find((w) => w._id === fromWarehouseId)?.name}</strong>
            </span>
            <span className="text-[10px] text-gray-400 font-mono uppercase">
              Items Added: {items.length}
            </span>
          </div>

          <TransferLineItems
            fromWarehouseId={fromWarehouseId}
            items={items}
            onChange={setItems}
          />
        </div>
      )}

      {/* STEP 3: Review */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-4">
            <h3 className="font-bold text-gray-900 text-sm border-b border-gray-200 pb-2">Transfer Summary</h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-gray-400 block font-semibold uppercase text-[9px]">Source</span>
                <span className="font-bold text-gray-800">{warehouses.find((w) => w._id === fromWarehouseId)?.name}</span>
              </div>
              <div>
                <span className="text-gray-400 block font-semibold uppercase text-[9px]">Destination</span>
                <span className="font-bold text-gray-800">{warehouses.find((w) => w._id === toWarehouseId)?.name}</span>
              </div>
              <div>
                <span className="text-gray-400 block font-semibold uppercase text-[9px]">Expected Delivery</span>
                <span className="font-bold text-gray-800 font-mono">{expectedDate}</span>
              </div>
              <div>
                <span className="text-gray-400 block font-semibold uppercase text-[9px]">Total Items Valuation</span>
                <span className="font-extrabold text-blue-600">₹{totalValue.toLocaleString("en-IN")}</span>
              </div>
            </div>

            {vehicleNumber && (
              <div className="grid grid-cols-2 gap-4 text-xs pt-2 border-t border-gray-150">
                <div>
                  <span className="text-gray-400 block font-semibold uppercase text-[9px]">Vehicle</span>
                  <span className="font-mono font-bold text-gray-800">{vehicleNumber}</span>
                </div>
                <div>
                  <span className="text-gray-400 block font-semibold uppercase text-[9px]">Driver</span>
                  <span className="font-bold text-gray-800">{driverName} {driverPhone && `(${driverPhone})`}</span>
                </div>
              </div>
            )}
          </div>

          {/* Items Preview Table */}
          <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="py-2.5 px-4 text-gray-500 font-semibold">SKU & Item Name</th>
                  <th className="py-2.5 px-4 text-gray-500 font-semibold text-center">Batch</th>
                  <th className="py-2.5 px-4 text-gray-500 font-semibold text-right">Transfer Quantity</th>
                  <th className="py-2.5 px-4 text-gray-500 font-semibold text-right">Cost Value</th>
                </tr>
              </thead>
              <tbody>
                {items.map((line) => (
                  <tr key={line.item} className="border-b border-gray-100">
                    <td className="py-2.5 px-4">
                      <div className="font-bold text-gray-900">{line.name}</div>
                      <span className="font-mono text-[9px] text-gray-400 font-bold">{line.sku}</span>
                    </td>
                    <td className="py-2.5 px-4 text-center font-mono text-[10px]">
                      {line.batch ? "Batch ID" : "N/A"}
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold font-mono">
                      {line.requestedQty} <span className="font-normal text-gray-400 text-[10px]">{line.unitSymbol}</span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-semibold text-gray-700">
                      ₹{(line.requestedQty * line.costPrice).toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Control Buttons */}
      <div className="flex items-center justify-between border-t border-gray-100 pt-4">
        <div>
          {step > 1 ? (
            <Button
              type="button"
              onClick={handlePrevStep}
              variant="outline"
              className="border-gray-200 text-gray-500 rounded-xl h-10 px-4 hover:bg-gray-50 text-xs flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </Button>
          ) : (
            <Button
              type="button"
              onClick={onCancel}
              variant="outline"
              className="border-gray-200 text-gray-500 rounded-xl h-10 px-4 hover:bg-gray-50 text-xs"
            >
              Cancel
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {step < 3 ? (
            <Button
              type="button"
              onClick={handleNextStep}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-10 px-5 text-xs font-semibold flex items-center gap-1"
            >
              Continue <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <>
              <Button
                type="button"
                disabled={loading}
                variant="outline"
                onClick={() => submitTransfer(false)}
                className="border-gray-200 text-gray-600 hover:text-gray-900 rounded-xl h-10 px-4 hover:bg-gray-50 text-xs flex items-center gap-1.5"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Draft
              </Button>
              <Button
                type="button"
                disabled={loading}
                onClick={() => submitTransfer(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-10 px-5 text-xs font-semibold flex items-center gap-1.5"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Confirm & Dispatch
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
