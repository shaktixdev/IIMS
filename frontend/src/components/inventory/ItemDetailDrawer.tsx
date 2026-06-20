"use client";

import React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, Barcode, Scale, Tags, Box, ShieldAlert } from "lucide-react";
import Link from "next/link";
import StockByWarehouse from "./StockByWarehouse";

interface Item {
  _id: string;
  sku: string;
  name: string;
  description?: string;
  category: {
    _id: string;
    name: string;
  } | null;
  unit: {
    _id: string;
    name: string;
    symbol: string;
  } | null;
  costPrice: number;
  minStockLevel: number;
  maxStockLevel: number;
  reorderQty: number;
  barcode?: string;
  hsnCode?: string;
  partNumber?: string;
  brand?: string;
  model?: string;
  isBatchTracked: boolean;
  isSerialTracked: boolean;
  hasExpiry: boolean;
  totalOnHand: number;
  totalReserved: number;
  totalAvailable: number;
}

interface ItemDetailDrawerProps {
  item: Item | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ItemDetailDrawer({ item, open, onOpenChange }: ItemDetailDrawerProps) {
  if (!item) return null;

  const getStatusBadge = () => {
    if (item.totalOnHand === 0) {
      return (
        <Badge variant="outline" className="bg-red-600/10 text-red-400 border-red-500/20 px-2 py-0.5 text-xs font-semibold">
          OUT OF STOCK
        </Badge>
      );
    }
    if (item.totalOnHand < item.minStockLevel) {
      return (
        <Badge variant="outline" className="bg-amber-600/10 text-amber-400 border-amber-500/20 px-2 py-0.5 text-xs font-semibold">
          LOW STOCK
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-emerald-600/10 text-emerald-400 border-emerald-500/20 px-2 py-0.5 text-xs font-semibold">
        IN STOCK
      </Badge>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl bg-gray-50 border-l border-gray-200 text-gray-900 p-6 overflow-y-auto scrollbar-thin">
        <SheetHeader className="border-b border-gray-200 pb-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-blue-400 font-bold bg-blue-600/10 px-2 py-0.5 rounded-md border border-blue-500/10">
                  {item.sku}
                </span>
                {getStatusBadge()}
              </div>
              <SheetTitle className="text-gray-900 text-xl font-extrabold mt-2 tracking-tight">
                {item.name}
              </SheetTitle>
              {item.description && (
                <SheetDescription className="text-gray-500 text-xs mt-1 leading-relaxed">
                  {item.description}
                </SheetDescription>
              )}
            </div>
            
            <Link href={`/inventory/${item._id}`} onClick={() => onOpenChange(false)}>
              <Button className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs flex items-center gap-1.5 py-1.5 active:scale-[0.98]">
                View Profile
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </SheetHeader>

        <div className="py-6 space-y-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-3 bg-white/40 border border-gray-200 rounded-xl text-center">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Total Available</span>
              <span className="text-xl font-extrabold text-emerald-400 block mt-1">{item.totalAvailable}</span>
              <span className="text-[9px] text-gray-400 block mt-0.5">{item.unit?.symbol || "units"}</span>
            </div>
            <div className="p-3 bg-white/40 border border-gray-200 rounded-xl text-center">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Total On Hand</span>
              <span className="text-xl font-extrabold text-gray-900 block mt-1">{item.totalOnHand}</span>
              <span className="text-[9px] text-gray-400 block mt-0.5">{item.unit?.symbol || "units"}</span>
            </div>
            <div className="p-3 bg-white/40 border border-gray-200 rounded-xl text-center">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Min Stock Level</span>
              <span className="text-xl font-extrabold text-gray-500 block mt-1">{item.minStockLevel}</span>
              <span className="text-[9px] text-gray-400 block mt-0.5">Reorder Point</span>
            </div>
          </div>

          {/* Product Specifications Grid */}
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 space-y-4">
            <h3 className="text-gray-900 font-bold text-sm border-b border-gray-200 pb-2 flex items-center gap-2">
              <Box className="w-4 h-4 text-blue-400" />
              Product Specifications
            </h3>
            
            <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-xs">
              <div className="space-y-1">
                <span className="text-gray-400 font-medium flex items-center gap-1.5"><Tags className="w-3.5 h-3.5 text-gray-400" /> Category</span>
                <span className="text-slate-200 font-bold block">{item.category?.name || "Uncategorized"}</span>
              </div>
              <div className="space-y-1">
                <span className="text-gray-400 font-medium flex items-center gap-1.5"><Scale className="w-3.5 h-3.5 text-gray-400" /> Unit of Measure</span>
                <span className="text-slate-200 font-bold block">{item.unit?.name} ({item.unit?.symbol})</span>
              </div>
              <div className="space-y-1">
                <span className="text-gray-400 font-medium flex items-center gap-1.5"><Barcode className="w-3.5 h-3.5 text-gray-400" /> Barcode / UPC</span>
                <span className="text-slate-200 font-mono block">{item.barcode || "—"}</span>
              </div>
              <div className="space-y-1">
                <span className="text-gray-400 font-medium">HSN Code</span>
                <span className="text-slate-200 font-mono block">{item.hsnCode || "—"}</span>
              </div>
              <div className="space-y-1">
                <span className="text-gray-400 font-medium">Brand</span>
                <span className="text-slate-200 block font-semibold">{item.brand || "—"}</span>
              </div>
              <div className="space-y-1">
                <span className="text-gray-400 font-medium">Model / Part No.</span>
                <span className="text-slate-200 block font-semibold">{item.model || item.partNumber || "—"}</span>
              </div>
            </div>
            
            <div className="border-t border-gray-200 pt-3 flex flex-wrap gap-2">
              {item.isBatchTracked && (
                <Badge variant="outline" className="bg-white text-blue-400 border-blue-500/20 text-[10px]">
                  Batch Tracked
                </Badge>
              )}
              {item.isSerialTracked && (
                <Badge variant="outline" className="bg-white text-indigo-400 border-indigo-500/20 text-[10px]">
                  Serial Tracked
                </Badge>
              )}
              {item.hasExpiry && (
                <Badge variant="outline" className="bg-white text-rose-400 border-rose-500/20 text-[10px]">
                  Expiry Enabled
                </Badge>
              )}
            </div>
          </div>

          {/* Stock by Warehouse Breakdown */}
          <div className="space-y-2">
            <StockByWarehouse itemId={item._id} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
