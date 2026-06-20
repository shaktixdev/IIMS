"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ShoppingCart,
  ChevronRight,
  ChevronLeft,
  Save,
  Loader2,
  Building2,
  Package,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import POLineItems, { POLineItem } from "./POLineItems";

const STEPS = [
  { id: 1, label: "Header", icon: Building2 },
  { id: 2, label: "Line Items", icon: Package },
  { id: 3, label: "Summary", icon: FileText },
];

interface Vendor {
  _id: string;
  code: string;
  name: string;
}

interface Warehouse {
  _id: string;
  code: string;
  name: string;
}

interface POFormProps {
  initialVendorId?: string;
  onSuccess?: (poData: any) => void;
}

export default function POForm({ initialVendorId = "", onSuccess }: POFormProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  const [header, setHeader] = useState({
    vendor: initialVendorId,
    warehouse: "",
    deliveryDate: "",
    referenceNumber: "",
    paymentTerms: "",
    notes: "",
    terms: "",
    internalNotes: "",
  });

  const [lineItems, setLineItems] = useState<POLineItem[]>([
    {
      item: "",
      itemName: "",
      itemSku: "",
      quantity: 1,
      unitCost: 0,
      gstRate: 18,
      discountPct: 0,
      subtotal: 0,
      discountAmount: 0,
      gstAmount: 0,
      netAmount: 0,
    },
  ]);

  useEffect(() => {
    const load = async () => {
      setLoadingOptions(true);
      try {
        const [vRes, wRes] = await Promise.all([
          fetch("/api/vendors?limit=100"),
          fetch("/api/warehouses"),
        ]);
        const vJson = await vRes.json();
        const wJson = await wRes.json();
        if (vJson.success) setVendors(vJson.data);
        if (wJson.success) setWarehouses(wJson.data);
      } catch (err) {
        toast.error("Failed to load vendors and warehouses.");
      } finally {
        setLoadingOptions(false);
      }
    };
    load();
  }, []);

  const validateStep = (): boolean => {
    if (step === 1) {
      if (!header.vendor) {
        toast.error("Please select a vendor.");
        return false;
      }
      if (!header.warehouse) {
        toast.error("Please select a receiving warehouse.");
        return false;
      }
      if (!header.deliveryDate) {
        toast.error("Delivery date is required.");
        return false;
      }
    }
    if (step === 2) {
      const validItems = lineItems.filter((i) => i.item);
      if (validItems.length === 0) {
        toast.error("Add at least one line item.");
        return false;
      }
      for (const li of validItems) {
        if (li.quantity <= 0) {
          toast.error("All line items must have quantity > 0.");
          return false;
        }
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;
    setSaving(true);
    try {
      const validItems = lineItems
        .filter((i) => i.item)
        .map((li) => ({
          item: li.item,
          quantity: li.quantity,
          unitCost: li.unitCost,
          gstRate: li.gstRate,
          discountPct: li.discountPct,
        }));

      const res = await fetch("/api/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...header, items: validItems }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Purchase Order ${json.data.poNumber} created successfully!`);
        if (onSuccess) {
          onSuccess(json.data);
        } else {
          router.push(`/purchase-orders/${json.data._id}`);
        }
      } else {
        toast.error(json.error?.message || "Failed to create purchase order.");
      }
    } catch (err) {
      toast.error("An error occurred while creating the PO.");
    } finally {
      setSaving(false);
    }
  };

  const totals = {
    subTotal: lineItems.reduce((s, i) => s + i.subtotal, 0),
    totalDiscount: lineItems.reduce((s, i) => s + i.discountAmount, 0),
    totalGst: lineItems.reduce((s, i) => s + i.gstAmount, 0),
    grandTotal: lineItems.reduce((s, i) => s + i.netAmount, 0),
  };

  const fmt = (n: number) =>
    `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
  const selectedVendor = vendors.find((v) => v._id === header.vendor);
  const selectedWarehouse = warehouses.find((w) => w._id === header.warehouse);

  return (
    <div className="space-y-6">
      {/* Step Indicator */}
      <div className="flex items-center gap-0">
        {STEPS.map((s, i) => (
          <React.Fragment key={s.id}>
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                step === s.id
                  ? "bg-blue-600 text-white"
                  : step > s.id
                  ? "text-emerald-400"
                  : "text-gray-400"
              }`}
            >
              <s.icon className="w-4 h-4" />
              <span className="text-sm font-semibold hidden sm:block">
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <ChevronRight className="w-4 h-4 text-gray-400 mx-1" />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step 1: Header */}
      {step === 1 && (
        <Card className="bg-white border-gray-200 text-gray-900 rounded-2xl shadow-xl">
          <CardHeader>
            <CardTitle className="text-gray-900 font-bold flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-400" /> Order Header
            </CardTitle>
            <CardDescription className="text-gray-500">
              Select vendor, receiving warehouse, and key order details.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-gray-700 text-xs font-semibold">
                  Vendor <span className="text-red-400">*</span>
                </Label>
                <Select
                  value={header.vendor}
                  onValueChange={(v) =>
                    setHeader((h) => ({ ...h, vendor: v ?? "" }))
                  }
                  disabled={loadingOptions}
                >
                  <SelectTrigger className="w-full bg-gray-50 border-gray-200 text-gray-900 rounded-xl h-10 text-sm">
                    <SelectValue
                      placeholder={loadingOptions ? "Loading…" : "Select vendor…"}
                    />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200 text-gray-900 max-h-56">
                    {vendors.map((v) => (
                      <SelectItem key={v._id} value={v._id}>
                        <span className="font-mono text-blue-400 text-xs mr-2">
                          {v.code}
                        </span>
                        {v.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-gray-700 text-xs font-semibold">
                  Receiving Warehouse <span className="text-red-400">*</span>
                </Label>
                <Select
                  value={header.warehouse}
                  onValueChange={(v) =>
                    setHeader((h) => ({ ...h, warehouse: v ?? "" }))
                  }
                  disabled={loadingOptions}
                >
                  <SelectTrigger className="w-full bg-gray-50 border-gray-200 text-gray-900 rounded-xl h-10 text-sm">
                    <SelectValue
                      placeholder={loadingOptions ? "Loading…" : "Select warehouse…"}
                    />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200 text-gray-900">
                    {warehouses.map((w) => (
                      <SelectItem key={w._id} value={w._id}>
                        <span className="font-mono text-blue-400 text-xs mr-2">
                          {w.code}
                        </span>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-gray-700 text-xs font-semibold">
                  Expected Delivery Date <span className="text-red-400">*</span>
                </Label>
                <Input
                  type="date"
                  value={header.deliveryDate}
                  onChange={(e) =>
                    setHeader((h) => ({ ...h, deliveryDate: e.target.value }))
                  }
                  min={new Date().toISOString().split("T")[0]}
                  className="bg-gray-50 border-gray-200 text-gray-900 rounded-xl h-10 text-sm focus:border-blue-500/50 "
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-gray-700 text-xs font-semibold">
                  Reference / Quote No.
                </Label>
                <Input
                  value={header.referenceNumber}
                  onChange={(e) =>
                    setHeader((h) => ({ ...h, referenceNumber: e.target.value }))
                  }
                  placeholder="e.g. QUOTE-2024-001"
                  className="bg-gray-50 border-gray-200 text-gray-900 rounded-xl h-10 text-sm focus:border-blue-500/50"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-gray-700 text-xs font-semibold">
                Payment Terms
              </Label>
              <Select
                value={header.paymentTerms}
                onValueChange={(v) =>
                  setHeader((h) => ({ ...h, paymentTerms: v ?? "" }))
                }
              >
                <SelectTrigger className="w-full bg-gray-50 border-gray-200 text-gray-900 rounded-xl h-10 text-sm">
                  <SelectValue placeholder="Select terms…" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200 text-gray-900">
                  {["Advance", "Net 7", "Net 15", "Net 30", "Net 45", "Net 60", "COD"].map(
                    (t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Line Items */}
      {step === 2 && (
        <Card className="bg-white border-gray-200 text-gray-900 rounded-2xl shadow-xl">
          <CardHeader>
            <CardTitle className="text-gray-900 font-bold flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-400" /> Line Items
            </CardTitle>
            <CardDescription className="text-gray-500">
              Search and add items. Quantities and pricing are calculated automatically.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <POLineItems value={lineItems} onChange={setLineItems} />
          </CardContent>
        </Card>
      )}

      {/* Step 3: Summary */}
      {step === 3 && (
        <div className="space-y-4">
          <Card className="bg-white border-gray-200 text-gray-900 rounded-2xl shadow-xl">
            <CardHeader>
              <CardTitle className="text-gray-900 font-bold flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" /> Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Header Summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                  <p className="text-xs text-gray-400">Vendor</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {selectedVendor?.name || "—"}
                  </p>
                  <p className="text-xs font-mono text-blue-400">
                    {selectedVendor?.code}
                  </p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                  <p className="text-xs text-gray-400">Warehouse</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {selectedWarehouse?.name || "—"}
                  </p>
                  <p className="text-xs font-mono text-blue-400">
                    {selectedWarehouse?.code}
                  </p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                  <p className="text-xs text-gray-400">Delivery Date</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {header.deliveryDate
                      ? new Date(header.deliveryDate).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "—"}
                  </p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                  <p className="text-xs text-gray-400">Items</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {lineItems.filter((i) => i.item).length} line items
                  </p>
                </div>
              </div>

              {/* Totals */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Subtotal</span>
                  <span>{fmt(totals.subTotal)}</span>
                </div>
                {totals.totalDiscount > 0 && (
                  <div className="flex justify-between text-sm text-red-400">
                    <span>Discount</span>
                    <span>−{fmt(totals.totalDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm text-amber-400">
                  <span>GST</span>
                  <span>+{fmt(totals.totalGst)}</span>
                </div>
                <div className="flex justify-between text-base font-extrabold text-gray-900 border-t border-gray-200 pt-2 mt-1">
                  <span>Grand Total</span>
                  <span className="text-blue-600 font-extrabold">
                    {fmt(totals.grandTotal)}
                  </span>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-gray-700 text-xs font-semibold">
                    Vendor Notes
                  </Label>
                  <Textarea
                    value={header.notes}
                    onChange={(e) =>
                      setHeader((h) => ({ ...h, notes: e.target.value }))
                    }
                    placeholder="Notes for vendor…"
                    className="bg-gray-50 border-gray-200 text-gray-900 rounded-xl text-sm h-20 focus:border-blue-500/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-gray-700 text-xs font-semibold">
                    Terms & Conditions
                  </Label>
                  <Textarea
                    value={header.terms}
                    onChange={(e) =>
                      setHeader((h) => ({ ...h, terms: e.target.value }))
                    }
                    placeholder="Terms and conditions…"
                    className="bg-gray-50 border-gray-200 text-gray-900 rounded-xl text-sm h-20 focus:border-blue-500/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-gray-700 text-xs font-semibold">
                    Internal Notes
                  </Label>
                  <Textarea
                    value={header.internalNotes}
                    onChange={(e) =>
                      setHeader((h) => ({ ...h, internalNotes: e.target.value }))
                    }
                    placeholder="Internal notes (not shown to vendor)…"
                    className="bg-gray-50 border-gray-200 text-gray-900 rounded-xl text-sm h-20 focus:border-blue-500/50"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() =>
            step > 1 ? setStep((s) => s - 1) : router.push("/purchase-orders")
          }
          className="text-gray-500 hover:text-gray-900 rounded-xl h-10 px-4 flex items-center gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          {step > 1 ? "Previous" : "Cancel"}
        </Button>

        {step < STEPS.length ? (
          <Button
            onClick={() => {
              if (validateStep()) setStep((s) => s + 1);
            }}
            className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl h-10 px-5 flex items-center gap-2"
          >
            Next <ChevronRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            disabled={saving}
            onClick={handleSubmit}
            className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl h-10 px-5 flex items-center gap-2"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? "Creating…" : "Create Draft PO"}
          </Button>
        )}
      </div>
    </div>
  );
}
