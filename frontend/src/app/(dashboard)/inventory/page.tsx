"use client";

import React, { useState, useEffect } from "react";
import ItemsTable from "@/components/inventory/ItemsTable";
import { Button } from "@/components/ui/button";
import { Plus, Upload, FileSpreadsheet, Loader2, Info } from "lucide-react";
import Link from "next/link";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function InventoryPage() {
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [importing, setImporting] = useState(false);

  const [stats, setStats] = useState({ totalItems: 0, lowStock: 0, outOfStock: 0 });
  const [loadingStats, setLoadingStats] = useState(true);

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const [totalRes, lowRes, outRes] = await Promise.all([
        fetch("/api/items?limit=1"),
        fetch("/api/items?status=low_stock&limit=1"),
        fetch("/api/items?status=out_of_stock&limit=1"),
      ]);
      const totalJson = await totalRes.json();
      const lowJson = await lowRes.json();
      const outJson = await outRes.json();
      setStats({
        totalItems: totalJson.pagination?.total || 0,
        lowStock: lowJson.pagination?.total || 0,
        outOfStock: outJson.pagination?.total || 0,
      });
    } catch (err) {
      console.error("Error fetching inventory stats:", err);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  const handleCsvImportSubmit = async () => {
    if (!csvText.trim()) { toast.error("Please paste CSV text or select a valid file."); return; }
    setImporting(true);
    try {
      const res = await fetch("/api/items/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ csvText }) });
      const json = await res.json();
      if (json.success) {
        const { successCount, failedCount, errors } = json.data;
        toast.success(`Import finished: ${successCount} successful, ${failedCount} failed.`);
        if (errors?.length > 0) toast.warning(`First error: Row ${errors[0].row} - ${errors[0].error}`);
        setCsvText(""); setShowImportModal(false); fetchStats(); window.location.reload();
      } else {
        toast.error(json.error?.message || "Failed to process CSV import.");
      }
    } catch (err) { toast.error("Error submitting CSV for processing."); }
    finally { setImporting(false); }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => { setCsvText(event.target?.result as string); toast.success(`File '${file.name}' loaded.`); };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Overall Inventory</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={() => setShowImportModal(true)} className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-lg flex items-center gap-2 h-9 px-4 text-sm font-medium">
              <Upload className="w-4 h-4 text-gray-500" /> Bulk Import
            </Button>
            <Link href="/inventory/new">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 h-9 px-4 text-sm font-medium shadow-sm">
                <Plus className="w-4 h-4" /> Add Product
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-gray-100 mt-6 pt-5 border-t border-gray-100">
          {[
            { label: "Categories", color: "text-blue-600" },
            { label: "Total Products", value: stats.totalItems, sub: "Unique SKUs", color: "text-amber-500" },
            { label: "Low Stock", value: stats.lowStock, sub: "Below threshold", color: "text-amber-500" },
            { label: "Out of Stock", value: stats.outOfStock, sub: "Zero balance", color: "text-red-500" },
          ].map((item, i) => (
            <div key={item.label} className={i === 0 ? "pr-4" : i === 3 ? "pl-4" : "px-4"}>
              <p className={`text-xs font-semibold uppercase tracking-wide ${item.color}`}>{item.label}</p>
              {loadingStats ? (
                <Loader2 className="w-4 h-4 animate-spin text-gray-400 mt-2" />
              ) : (
                <p className="text-2xl font-extrabold text-gray-900 mt-1">{item.value ?? "—"}</p>
              )}
              <p className="text-[11px] text-gray-400 mt-0.5">{item.sub || ""}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Items Table */}
      <ItemsTable />

      {/* CSV Import Modal */}
      <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
        <DialogContent className="bg-white border border-gray-200 text-gray-900 rounded-xl sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-gray-900 font-bold text-lg">Bulk Import Catalog Items</DialogTitle>
            <DialogDescription className="text-gray-500 text-xs mt-1">
              Select a CSV file or paste formatted CSV raw text below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-gray-700 text-xs font-semibold">Load CSV File</Label>
              <Input type="file" accept=".csv" onChange={handleFileUpload}
                className="bg-white border-gray-300 text-gray-900 rounded-lg file:bg-blue-50 file:text-blue-600 file:border-none file:px-2 file:py-1 file:rounded-md file:text-xs text-xs h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-gray-700 text-xs font-semibold">Paste CSV Contents</Label>
              <Textarea value={csvText} onChange={e => setCsvText(e.target.value)}
                placeholder="name,category,unit,costPrice,minStockLevel,availableStock,warehouseCode..."
                className="bg-white border-gray-300 text-gray-900 rounded-lg h-36 font-mono text-xs placeholder-gray-400 focus:border-blue-500" />
            </div>
            <div className="p-3 bg-blue-50 border border-blue-100 text-blue-700 text-xs rounded-lg flex items-start gap-2">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>CSV headers: <code className="font-mono text-blue-600">name, category, unit, costPrice, minStockLevel, barcode, hsnCode, brand, model, availableStock, warehouseCode</code></span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowImportModal(false)} className="text-gray-500 hover:text-gray-900 rounded-lg text-xs h-9">Cancel</Button>
            <Button disabled={importing || !csvText.trim()} onClick={handleCsvImportSubmit}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs h-9 px-4 flex items-center gap-1.5">
              {importing ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Importing...</> : <><Upload className="w-3.5 h-3.5" /> Process Import</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
