"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Search, Loader2, PackageSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface POLineItem {
  item: string;
  itemName: string;
  itemSku: string;
  quantity: number;
  unitCost: number;
  gstRate: number;
  discountPct: number;
  subtotal: number;
  discountAmount: number;
  gstAmount: number;
  netAmount: number;
}

interface ItemSearchResult {
  _id: string;
  name: string;
  sku: string;
  costPrice: number;
  lastPurchasePrice?: number;
  hsnCode?: string;
  unit?: { name: string; symbol: string };
}

function computeLineItem(qty: number, unitCost: number, gstRate: number, discountPct: number) {
  const subtotal = qty * unitCost;
  const discountAmount = parseFloat(((subtotal * discountPct) / 100).toFixed(2));
  const afterDiscount = subtotal - discountAmount;
  const gstAmount = parseFloat(((afterDiscount * gstRate) / 100).toFixed(2));
  const netAmount = parseFloat((afterDiscount + gstAmount).toFixed(2));
  return { subtotal: parseFloat(subtotal.toFixed(2)), discountAmount, gstAmount, netAmount };
}

const GST_RATES = [0, 5, 12, 18, 28];

function createEmptyLine(): POLineItem {
  return {
    item: "", itemName: "", itemSku: "",
    quantity: 1, unitCost: 0, gstRate: 18, discountPct: 0,
    subtotal: 0, discountAmount: 0, gstAmount: 0, netAmount: 0,
  };
}

interface POLineItemsProps {
  value: POLineItem[];
  onChange: (items: POLineItem[]) => void;
}

export default function POLineItems({ value, onChange }: POLineItemsProps) {
  const [itemSearches, setItemSearches] = useState<string[]>(value.map(() => ""));
  const [searchResults, setSearchResults] = useState<ItemSearchResult[][]>(value.map(() => []));
  const [loadingSearches, setLoadingSearches] = useState<boolean[]>(value.map(() => false));
  const [activeSearch, setActiveSearch] = useState<number | null>(null);

  // Sync search state when items are added/removed
  useEffect(() => {
    setItemSearches((prev) => {
      if (prev.length === value.length) return prev;
      if (value.length > prev.length) return [...prev, ...value.slice(prev.length).map(() => "")];
      return prev.slice(0, value.length);
    });
    setSearchResults((prev) => {
      if (prev.length === value.length) return prev;
      if (value.length > prev.length) return [...prev, ...value.slice(prev.length).map(() => [])];
      return prev.slice(0, value.length);
    });
    setLoadingSearches((prev) => {
      if (prev.length === value.length) return prev;
      if (value.length > prev.length) return [...prev, ...value.slice(prev.length).map(() => false)];
      return prev.slice(0, value.length);
    });
  }, [value.length]);

  const searchItems = useCallback(async (query: string, idx: number) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults((prev) => { const n = [...prev]; n[idx] = []; return n; });
      return;
    }
    setLoadingSearches((prev) => { const n = [...prev]; n[idx] = true; return n; });
    try {
      const res = await fetch(`/api/items/search?q=${encodeURIComponent(query)}`);
      const json = await res.json();
      setSearchResults((prev) => { const n = [...prev]; n[idx] = json.success ? json.data : []; return n; });
    } catch {
      setSearchResults((prev) => { const n = [...prev]; n[idx] = []; return n; });
    } finally {
      setLoadingSearches((prev) => { const n = [...prev]; n[idx] = false; return n; });
    }
  }, []);

  const updateLine = (idx: number, field: keyof POLineItem, val: any) => {
    const newItems = value.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [field]: val };
      const calcs = computeLineItem(
        field === "quantity" ? Number(val) : updated.quantity,
        field === "unitCost" ? Number(val) : updated.unitCost,
        field === "gstRate" ? Number(val) : updated.gstRate,
        field === "discountPct" ? Number(val) : updated.discountPct,
      );
      return { ...updated, ...calcs };
    });
    onChange(newItems);
  };

  const selectItem = (idx: number, result: ItemSearchResult) => {
    updateLine(idx, "item", result._id);
    const newItems = value.map((item, i) => {
      if (i !== idx) return item;
      const unitCost = result.lastPurchasePrice || result.costPrice || 0;
      const calcs = computeLineItem(item.quantity, unitCost, item.gstRate, item.discountPct);
      return { ...item, item: result._id, itemName: result.name, itemSku: result.sku, unitCost, ...calcs };
    });
    onChange(newItems);
    setItemSearches((prev) => { const n = [...prev]; n[idx] = result.name; return n; });
    setSearchResults((prev) => { const n = [...prev]; n[idx] = []; return n; });
    setActiveSearch(null);
  };

  const addLine = () => {
    onChange([...value, createEmptyLine()]);
  };

  const removeLine = (idx: number) => {
    if (value.length <= 1) return;
    onChange(value.filter((_, i) => i !== idx));
  };

  const totals = {
    subTotal: value.reduce((s, i) => s + i.subtotal, 0),
    totalDiscount: value.reduce((s, i) => s + i.discountAmount, 0),
    totalGst: value.reduce((s, i) => s + i.gstAmount, 0),
    grandTotal: value.reduce((s, i) => s + i.netAmount, 0),
  };

  const fmt = (n: number) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-4">
      {/* Line Items */}
      <div className="space-y-3">
        {value.map((line, idx) => (
          <div key={idx} className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400 font-semibold">Line {idx + 1}</span>
              <Button variant="ghost" size="sm" onClick={() => removeLine(idx)} disabled={value.length <= 1}
                className="h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg disabled:opacity-30">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>

            {/* Item Search */}
            <div className="relative">
              <Label className="text-gray-500 text-xs mb-1 block">Item <span className="text-red-400">*</span></Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <Input
                  value={itemSearches[idx] || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setItemSearches((prev) => { const n = [...prev]; n[idx] = val; return n; });
                    setActiveSearch(idx);
                    const t = setTimeout(() => searchItems(val, idx), 300);
                    return () => clearTimeout(t);
                  }}
                  onFocus={() => setActiveSearch(idx)}
                  onBlur={() => setTimeout(() => setActiveSearch(null), 200)}
                  placeholder="Search item by SKU or name…"
                  className={`pl-8 bg-white border-gray-200 text-gray-900 rounded-xl h-9 text-sm focus:border-blue-500/50 ${line.item ? "border-blue-500/30" : ""}`}
                />
                {loadingSearches[idx] && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-gray-400" />}
              </div>
              {activeSearch === idx && searchResults[idx]?.length > 0 && (
                <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xl">
                  {searchResults[idx].map((result) => (
                    <button key={result._id} onMouseDown={() => selectItem(idx, result)}
                      className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors flex items-start gap-3 border-b border-gray-100 last:border-0">
                      <PackageSearch className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-900 font-medium">{result.name}</p>
                        <p className="text-xs text-gray-400 font-mono">{result.sku}</p>
                      </div>
                      <span className="ml-auto text-xs text-gray-500">₹{result.lastPurchasePrice || result.costPrice || 0}</span>
                    </button>
                  ))}
                </div>
              )}
              {line.itemSku && (
                <p className="text-xs text-blue-400 font-mono mt-1">SKU: {line.itemSku}</p>
              )}
            </div>

            {/* Qty / Cost / GST / Discount */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <Label className="text-gray-500 text-xs mb-1 block">Qty <span className="text-red-400">*</span></Label>
                <Input type="number" value={line.quantity} min={0.001} step={0.001}
                  onChange={(e) => updateLine(idx, "quantity", parseFloat(e.target.value) || 0)}
                  className="bg-white border-gray-200 text-gray-900 rounded-xl h-9 text-sm focus:border-blue-500/50" />
              </div>
              <div>
                <Label className="text-gray-500 text-xs mb-1 block">Unit Cost (₹) <span className="text-red-400">*</span></Label>
                <Input type="number" value={line.unitCost} min={0} step={0.01}
                  onChange={(e) => updateLine(idx, "unitCost", parseFloat(e.target.value) || 0)}
                  className="bg-white border-gray-200 text-gray-900 rounded-xl h-9 text-sm focus:border-blue-500/50" />
              </div>
              <div>
                <Label className="text-gray-500 text-xs mb-1 block">GST %</Label>
                <Select value={String(line.gstRate)} onValueChange={(v) => updateLine(idx, "gstRate", Number(v))}>
                  <SelectTrigger className="w-full bg-white border-gray-200 text-gray-900 rounded-xl h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200 text-gray-900">
                    {GST_RATES.map((r) => <SelectItem key={r} value={String(r)}>{r}%</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-500 text-xs mb-1 block">Discount %</Label>
                <Input type="number" value={line.discountPct} min={0} max={100} step={0.01}
                  onChange={(e) => updateLine(idx, "discountPct", parseFloat(e.target.value) || 0)}
                  className="bg-white border-gray-200 text-gray-900 rounded-xl h-9 text-sm focus:border-blue-500/50" />
              </div>
            </div>

            {/* Computed row */}
            <div className="flex items-center justify-between pt-1 border-t border-gray-100">
              <div className="flex gap-4 text-xs text-gray-400">
                <span>Subtotal: <span className="text-gray-700">{fmt(line.subtotal)}</span></span>
                {line.discountAmount > 0 && <span>Disc: <span className="text-red-400">−{fmt(line.discountAmount)}</span></span>}
                <span>GST: <span className="text-amber-400">+{fmt(line.gstAmount)}</span></span>
              </div>
              <span className="text-sm font-bold text-gray-900">{fmt(line.netAmount)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Add Line Button */}
      <Button onClick={addLine} variant="ghost"
        className="w-full border border-dashed border-gray-200 hover:border-blue-500/30 text-gray-400 hover:text-blue-400 rounded-2xl h-10 text-sm flex items-center gap-2 transition-colors">
        <Plus className="w-4 h-4" /> Add Line Item
      </Button>

      {/* Totals Summary */}
      {value.some((i) => i.item) && (
        <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-2">
          <div className="flex justify-between text-sm text-gray-500">
            <span>Subtotal</span><span>{fmt(totals.subTotal)}</span>
          </div>
          {totals.totalDiscount > 0 && (
            <div className="flex justify-between text-sm text-red-400">
              <span>Total Discount</span><span>−{fmt(totals.totalDiscount)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm text-amber-400">
            <span>Total GST</span><span>+{fmt(totals.totalGst)}</span>
          </div>
          <div className="flex justify-between text-base font-bold text-gray-900 border-t border-gray-200 pt-2 mt-2">
            <span>Grand Total</span><span>{fmt(totals.grandTotal)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
