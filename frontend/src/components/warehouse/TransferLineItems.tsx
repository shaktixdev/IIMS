"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SlidersHorizontal, Loader2, Info, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";

interface Item {
  _id: string;
  sku: string;
  name: string;
  isBatchTracked: boolean;
  unit?: {
    symbol: string;
  };
}

interface StockRecord {
  item: Item;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
  zone: string;
  bin: string;
  averageCost: number;
}

interface Batch {
  _id: string;
  batchNumber: string;
  currentQuantity: number;
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
}

interface TransferLineItemsProps {
  fromWarehouseId: string;
  items: LineItem[];
  onChange: (items: LineItem[]) => void;
}

export default function TransferLineItems({ fromWarehouseId, items, onChange }: TransferLineItemsProps) {
  const [stockRecords, setStockRecords] = useState<StockRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [batchesMap, setBatchesMap] = useState<Record<string, Batch[]>>({});

  // Fetch available stock in From Warehouse
  useEffect(() => {
    if (!fromWarehouseId) {
      setStockRecords([]);
      return;
    }

    const fetchStock = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/warehouses/${fromWarehouseId}/stock`);
        const json = await res.json();
        if (json.success) {
          // Filter records that have positive available quantity
          const filtered = json.data.filter((record: StockRecord) => {
            const avail = record.quantityOnHand - record.quantityReserved;
            return avail > 0 && record.item !== null && record.item !== undefined;
          });
          setStockRecords(filtered);
        } else {
          toast.error("Failed to load source warehouse stock.");
        }
      } catch (err) {
        console.error(err);
        toast.error("Error loading stock records.");
      } finally {
        setLoading(false);
      }
    };

    fetchStock();
  }, [fromWarehouseId]);

  // Load batches for an item
  const loadBatches = useCallback(async (itemId: string) => {
    if (batchesMap[itemId]) return;
    try {
      const res = await fetch(`/api/items/${itemId}/batches?warehouse=${fromWarehouseId}`);
      const json = await res.json();
      if (json.success) {
        setBatchesMap((prev) => ({ ...prev, [itemId]: json.data }));
      }
    } catch (err) {
      console.error(`Failed to load batches for item ${itemId}:`, err);
    }
  }, [fromWarehouseId, batchesMap]);

  // Load batches for already selected items
  useEffect(() => {
    items.forEach((item) => {
      if (item.isBatchTracked && !batchesMap[item.item]) {
        loadBatches(item.item);
      }
    });
  }, [items, batchesMap, loadBatches]);

  const handleAddItem = (stockRecordId: string) => {
    const record = stockRecords.find((r) => r.item._id === stockRecordId);
    if (!record) return;

    // Check if already added
    if (items.some((line) => line.item === record.item._id)) {
      toast.warning("Item already added to transfer list.");
      return;
    }

    const available = record.quantityOnHand - record.quantityReserved;

    const newLine: LineItem = {
      item: record.item._id,
      name: record.item.name,
      sku: record.item.sku,
      requestedQty: 1,
      availableQty: available,
      unitSymbol: record.item.unit?.symbol || "pcs",
      costPrice: record.averageCost || 0,
      isBatchTracked: record.item.isBatchTracked,
      fromZone: record.zone || "",
      fromBin: record.bin || "",
    };

    onChange([...items, newLine]);

    if (record.item.isBatchTracked) {
      loadBatches(record.item._id);
    }
  };

  const handleRemoveLine = (index: number) => {
    const copy = [...items];
    copy.splice(index, 1);
    onChange(copy);
  };

  const handleUpdateQty = (index: number, val: number) => {
    const copy = [...items];
    const line = copy[index];
    const qty = Math.max(0.001, val);
    
    if (qty > line.availableQty) {
      toast.error(`Cannot transfer more than available stock (${line.availableQty} ${line.unitSymbol})`);
      line.requestedQty = line.availableQty;
    } else {
      line.requestedQty = qty;
    }
    onChange(copy);
  };

  const handleUpdateBatch = (index: number, batchId: string) => {
    const copy = [...items];
    copy[index].batch = batchId;
    onChange(copy);
  };

  const unselectedStock = stockRecords.filter(
    (record) => !items.some((line) => line.item === record.item._id)
  );

  return (
    <div className="space-y-4">
      {/* Selector input */}
      <div className="flex flex-col sm:flex-row items-end gap-3 p-4 bg-gray-50 border border-gray-200 rounded-2xl">
        <div className="flex-1 space-y-1.5 w-full">
          <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Search available stock at source</Label>
          <Select onValueChange={(val) => handleAddItem(val || "")} value="">
            <SelectTrigger className="bg-white border-gray-200 text-gray-900 rounded-xl h-10 w-full text-xs">
              <SelectValue placeholder={loading ? "Loading stock..." : "Select item to transfer..."} />
            </SelectTrigger>
            <SelectContent className="bg-white border-gray-200 text-gray-900 text-xs max-h-60">
              {loading && (
                <div className="flex items-center justify-center p-3 text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> Loading stock items...
                </div>
              )}
              {!loading && unselectedStock.length === 0 && (
                <div className="p-3 text-center text-gray-400">No available stock found at this warehouse.</div>
              )}
              {unselectedStock.map((record) => {
                const avail = record.quantityOnHand - record.quantityReserved;
                return (
                  <SelectItem key={record.item._id} value={record.item._id}>
                    {record.item.name} ({record.item.sku}) — Available: {avail} {record.item.unit?.symbol || "pcs"} {record.zone && `[Zone: ${record.zone}]`}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table grid */}
      <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm bg-white">
        <Table>
          <TableHeader className="bg-gray-50/75 border-b border-gray-200">
            <TableRow>
              <TableHead className="text-gray-500 font-semibold text-xs py-3">SKU & Item Name</TableHead>
              <TableHead className="text-gray-500 font-semibold text-xs text-center py-3">Source Zone/Bin</TableHead>
              <TableHead className="text-gray-500 font-semibold text-xs text-right py-3">Available</TableHead>
              <TableHead className="text-gray-500 font-semibold text-xs py-3" style={{ width: "120px" }}>Transfer Qty</TableHead>
              <TableHead className="text-gray-500 font-semibold text-xs py-3">Batch Info</TableHead>
              <TableHead className="text-gray-500 font-semibold text-xs text-right py-3 pr-4" style={{ width: "60px" }}>Delete</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-gray-400 py-10 text-xs">
                  No items added yet. Search and select items above to populate the transfer lines list.
                </TableCell>
              </TableRow>
            ) : (
              items.map((line, idx) => (
                <TableRow key={line.item} className="border-b border-gray-100 hover:bg-gray-50/20">
                  <TableCell className="py-2.5">
                    <span className="font-mono text-[10px] text-blue-500 font-bold bg-blue-50/50 px-1 rounded block w-fit mb-0.5">
                      {line.sku}
                    </span>
                    <span className="font-bold text-gray-900 text-xs">{line.name}</span>
                  </TableCell>
                  <TableCell className="text-center font-mono text-[10px] text-gray-500 py-2.5">
                    {line.fromZone || "-"}{line.fromBin && ` / ${line.fromBin}`}
                  </TableCell>
                  <TableCell className="text-right text-xs py-2.5 font-bold text-gray-800">
                    {line.availableQty} <span className="font-normal text-gray-400 font-mono text-[10px]">{line.unitSymbol}</span>
                  </TableCell>
                  <TableCell className="py-2.5">
                    <Input
                      type="number"
                      value={line.requestedQty}
                      onChange={(e) => handleUpdateQty(idx, parseFloat(e.target.value))}
                      className="h-8 border-gray-200 text-xs font-semibold px-2 rounded-lg font-mono"
                      min={0.001}
                      max={line.availableQty}
                      step={1}
                    />
                  </TableCell>
                  <TableCell className="py-2.5">
                    {line.isBatchTracked ? (
                      <Select value={line.batch || ""} onValueChange={(val) => handleUpdateBatch(idx, val || "")}>
                        <SelectTrigger className="h-8 border-gray-200 text-xs rounded-lg bg-white">
                          <SelectValue placeholder="Select Batch" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-gray-200 text-gray-900 text-xs">
                          {(batchesMap[line.item] || []).map((b) => (
                            <SelectItem key={b._id} value={b._id}>
                              {b.batchNumber} (Qty: {b.currentQuantity})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-[10px] text-gray-400 font-semibold uppercase flex items-center gap-1">
                        <Info className="w-3.5 h-3.5 text-gray-400" /> Untracked
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right py-2.5 pr-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                      onClick={() => handleRemoveLine(idx)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
