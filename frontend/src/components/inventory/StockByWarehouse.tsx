"use client";

import React, { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Warehouse as WhIcon, Info, Edit3 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

interface StockRecord {
  _id: string;
  warehouse: {
    _id: string;
    code: string;
    name: string;
    type: string;
  };
  quantityOnHand: number;
  quantityReserved: number;
  quantityOnOrder: number;
  quantityInTransit: number;
  quantityAvailable: number;
  averageCost: number;
  totalValue: number;
  updatedAt: string;
}

interface StockByWarehouseProps {
  itemId: string;
}

export default function StockByWarehouse({ itemId }: StockByWarehouseProps) {
  const [loading, setLoading] = useState(true);
  const [stockRecords, setStockRecords] = useState<StockRecord[]>([]);

  // Adjustment Modal state
  const [showAdjustDialog, setShowAdjustDialog] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<StockRecord | null>(null);
  const [newQuantity, setNewQuantity] = useState<number>(0);
  const [adjustmentNotes, setAdjustmentNotes] = useState<string>("");
  const [adjusting, setAdjusting] = useState(false);

  const fetchStock = async () => {
    try {
      const res = await fetch(`/api/items/${itemId}/stock`);
      const json = await res.json();
      if (json.success && json.data) {
        setStockRecords(json.data);
      } else {
        toast.error(json.error?.message || "Failed to load stock levels.");
      }
    } catch (err) {
      console.error("Fetch stock error:", err);
      toast.error("Error connecting to server to fetch stock levels.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (itemId) {
      fetchStock();
    }
  }, [itemId]);

  const handleAdjustClick = (record: StockRecord) => {
    setSelectedRecord(record);
    setNewQuantity(record.quantityOnHand);
    setAdjustmentNotes("");
    setShowAdjustDialog(true);
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;
    setAdjusting(true);

    try {
      const res = await fetch(`/api/items/${itemId}/stock/adjust`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          warehouseId: selectedRecord.warehouse._id,
          newQuantity: newQuantity,
          notes: adjustmentNotes.trim() || "Manual adjustment from item details page"
        })
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Stock level updated successfully!");
        setShowAdjustDialog(false);
        fetchStock();
      } else {
        toast.error(json.error?.message || "Failed to adjust stock level.");
      }
    } catch (err) {
      console.error("Adjust stock error:", err);
      toast.error("Error adjusting stock level.");
    } finally {
      setAdjusting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 min-h-[150px]">
        <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
        <span className="text-gray-500 text-xs ml-2">Loading stock levels...</span>
      </div>
    );
  }

  // Calculate totals
  const totalOnHand = stockRecords.reduce((acc, curr) => acc + (curr.quantityOnHand || 0), 0);
  const totalReserved = stockRecords.reduce((acc, curr) => acc + (curr.quantityReserved || 0), 0);
  const totalAvailable = stockRecords.reduce((acc, curr) => acc + (curr.quantityAvailable || 0), 0);
  const totalInTransit = stockRecords.reduce((acc, curr) => acc + (curr.quantityInTransit || 0), 0);
  const totalOnOrder = stockRecords.reduce((acc, curr) => acc + (curr.quantityOnOrder || 0), 0);
  const totalValue = stockRecords.reduce((acc, curr) => acc + (curr.totalValue || 0), 0);

  return (
    <Card className="bg-white border-gray-200 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md">
      <CardHeader className="pb-3 border-b border-gray-100">
        <CardTitle className="text-gray-900 text-md font-bold flex items-center gap-2">
          <WhIcon className="w-5 h-5 text-blue-400" />
          Stock Breakdown by Warehouse
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {stockRecords.length === 0 ? (
          <div className="text-center py-6 text-gray-400 text-xs flex items-center justify-center gap-2 bg-gray-50/50 border border-gray-200 rounded-xl">
            <Info className="w-4 h-4 text-gray-400" />
            No warehouses associated or stock records seeded for this item.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <Table>
                <TableHeader className="bg-gray-50 border-b border-gray-200">
                  <TableRow className="hover:bg-transparent border-gray-200">
                    <TableHead className="text-gray-500 font-semibold text-xs py-2">Warehouse</TableHead>
                    <TableHead className="text-gray-500 font-semibold text-xs text-right py-2">Available</TableHead>
                    <TableHead className="text-gray-500 font-semibold text-xs text-right py-2">Reserved</TableHead>
                    <TableHead className="text-gray-500 font-semibold text-xs text-right py-2">On Hand</TableHead>
                    <TableHead className="text-gray-500 font-semibold text-xs text-right py-2">In Transit</TableHead>
                    <TableHead className="text-gray-500 font-semibold text-xs text-right py-2">On Order</TableHead>
                    <TableHead className="text-gray-500 font-semibold text-xs text-right py-2">Avg Cost</TableHead>
                    <TableHead className="text-gray-500 font-semibold text-xs text-right py-2">Total Value</TableHead>
                    <TableHead className="text-gray-500 font-semibold text-xs text-right py-2 pr-4">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="bg-white/20">
                  {stockRecords.map((record) => (
                    <TableRow key={record._id} className="hover:bg-gray-50/50 border-gray-200 transition-colors">
                      <TableCell className="py-2.5">
                        <div className="font-semibold text-gray-900 text-xs">{record.warehouse.name}</div>
                        <div className="text-[10px] text-gray-400 uppercase font-mono mt-0.5">{record.warehouse.code} ({record.warehouse.type})</div>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-emerald-400 text-xs py-2.5">
                        {record.quantityAvailable}
                      </TableCell>
                      <TableCell className="text-right text-gray-700 text-xs py-2.5">
                        {record.quantityReserved}
                      </TableCell>
                      <TableCell className="text-right text-gray-900 font-bold text-xs py-2.5">
                        {record.quantityOnHand}
                      </TableCell>
                      <TableCell className="text-right text-gray-700 text-xs py-2.5">
                        {record.quantityInTransit}
                      </TableCell>
                      <TableCell className="text-right text-gray-700 text-xs py-2.5">
                        {record.quantityOnOrder}
                      </TableCell>
                      <TableCell className="text-right text-gray-700 font-mono text-xs py-2.5">
                        ₹{(record.averageCost || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right text-blue-400 font-bold font-mono text-xs py-2.5">
                        ₹{(record.totalValue || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right py-2.5 pr-4">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleAdjustClick(record)}
                          title="Direct Adjust Stock"
                          className="h-7 w-7 text-gray-500 hover:text-blue-500 hover:bg-blue-50"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}

                  {/* Summary Totals Row */}
                  <TableRow className="bg-white border-t-2 border-gray-200 hover:bg-gray-50/90 font-bold">
                    <TableCell className="text-gray-900 text-xs py-3 font-extrabold uppercase">Total Summary</TableCell>
                    <TableCell className="text-right text-emerald-400 text-xs py-3">{totalAvailable}</TableCell>
                    <TableCell className="text-right text-gray-700 text-xs py-3">{totalReserved}</TableCell>
                    <TableCell className="text-right text-gray-900 text-xs py-3">{totalOnHand}</TableCell>
                    <TableCell className="text-right text-gray-700 text-xs py-3">{totalInTransit}</TableCell>
                    <TableCell className="text-right text-gray-700 text-xs py-3">{totalOnOrder}</TableCell>
                    <TableCell className="text-right text-gray-500 text-[10px] py-3">—</TableCell>
                    <TableCell className="text-right text-blue-400 font-mono text-xs py-3 font-extrabold">
                      ₹{totalValue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right text-gray-500 py-3 pr-4">—</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
                <div className="text-[10px] text-gray-400 font-semibold uppercase">Total On Hand</div>
                <div className="text-lg font-extrabold text-gray-900 mt-1">{totalOnHand}</div>
              </div>
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
                <div className="text-[10px] text-gray-400 font-semibold uppercase">Available</div>
                <div className="text-lg font-extrabold text-emerald-400 mt-1">{totalAvailable}</div>
              </div>
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
                <div className="text-[10px] text-gray-400 font-semibold uppercase">In Transit</div>
                <div className="text-lg font-extrabold text-amber-500 mt-1">{totalInTransit}</div>
              </div>
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
                <div className="text-[10px] text-gray-400 font-semibold uppercase">Stock Valuation</div>
                <div className="text-md font-extrabold text-blue-400 mt-1.5 font-mono">
                  ₹{totalValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>

      {/* Adjust Stock Level Dialog */}
      <Dialog open={showAdjustDialog} onOpenChange={setShowAdjustDialog}>
        <DialogContent className="bg-white border border-gray-200 text-gray-900 rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-gray-900 font-bold text-lg flex items-center gap-1.5">
              <WhIcon className="w-5 h-5 text-blue-500" />
              Adjust Stock Level
            </DialogTitle>
            <DialogDescription className="text-gray-500 text-xs">
              Directly adjust the physical stock balance for this item in <strong>{selectedRecord?.warehouse.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAdjustSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="current-qty" className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">Current Stock</Label>
              <div id="current-qty" className="font-mono text-sm text-gray-900 font-bold bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg">
                {selectedRecord?.quantityOnHand} units
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new-qty" className="text-gray-700 text-xs font-semibold">New Stock Balance (Physical Count)</Label>
              <Input 
                id="new-qty"
                type="number"
                min="0"
                required
                value={newQuantity}
                onChange={e => setNewQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                className="bg-white border-gray-200 text-gray-900 rounded-lg text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="adjust-notes" className="text-gray-700 text-xs font-semibold">Reason for Adjustment / Remarks</Label>
              <Input 
                id="adjust-notes"
                value={adjustmentNotes}
                onChange={e => setAdjustmentNotes(e.target.value)}
                placeholder="e.g., Damaged item swap, manual initial count"
                className="bg-white border-gray-200 text-gray-900 rounded-lg text-xs h-9"
              />
            </div>

            <DialogFooter className="border-t border-gray-100 pt-3">
              <Button type="button" variant="ghost" onClick={() => setShowAdjustDialog(false)} className="text-gray-500 hover:text-gray-900 rounded-xl text-xs h-9">
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={adjusting}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs h-9 px-4 flex items-center gap-1.5 font-bold shadow-md"
              >
                {adjusting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Updating...</> : <>Apply adjustment</>}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
