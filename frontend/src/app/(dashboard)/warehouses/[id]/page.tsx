"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  Building, MapPin, User, Search, SlidersHorizontal, Loader2, ArrowRightLeft, 
  History, Calendar, Layers, ClipboardCheck, ArrowUpDown, ChevronRight, Edit3, ArrowLeft 
} from "lucide-react";
import { toast } from "sonner";
import ZoneManager from "@/components/warehouse/ZoneManager";
import StockCountForm from "@/components/warehouse/StockCountForm";
import Link from "next/link";
import { useSession } from "next-auth/react";

interface Warehouse {
  _id: string;
  code: string;
  name: string;
  type: string;
  address?: {
    line1?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  manager?: {
    name: string;
    email: string;
  };
  zones: Array<{
    _id: string;
    code: string;
    name: string;
    rows: number;
    columns: number;
  }>;
}

interface StockRecord {
  _id: string;
  item: {
    _id: string;
    sku: string;
    name: string;
    barcode?: string;
  };
  zone: string;
  bin: string;
  quantityOnHand: number;
  quantityReserved: number;
  quantityInTransit: number;
  quantityAvailable: number;
  averageCost: number;
  totalValue: number;
}

interface AuditCycle {
  _id: string;
  stockCountNumber: string;
  zone?: string;
  status: "draft" | "in_progress" | "completed" | "approved";
  startedAt: string;
  createdBy: {
    name: string;
  };
  items: any[];
}

interface Movement {
  _id: string;
  movementNumber: string;
  type: "IN" | "OUT" | "ADJUSTMENT" | "TRANSFER";
  quantity: number;
  referenceType: string;
  date: string;
  notes?: string;
  item: {
    name: string;
    sku: string;
  };
  performedBy?: {
    name: string;
  };
}

export default function WarehouseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const warehouseId = params.id as string;

  const [warehouse, setWarehouse] = useState<Warehouse | null>(null);
  const [stats, setStats] = useState({
    totalSKUs: 0,
    totalQuantity: 0,
    totalValue: 0,
    pendingTransfers: 0,
  });
  const [stock, setStock] = useState<StockRecord[]>([]);
  const [audits, setAudits] = useState<AuditCycle[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);

  // Loading States
  const [whLoading, setWhLoading] = useState(true);
  const [stockLoading, setStockLoading] = useState(false);
  const [auditsLoading, setAuditsLoading] = useState(false);
  const [movementsLoading, setMovementsLoading] = useState(false);

  // Filters
  const [stockSearch, setStockSearch] = useState("");
  const [selectedZoneCode, setSelectedZoneCode] = useState("all");

  // Dialog controllers
  const [auditScopeZone, setAuditScopeZone] = useState("all");
  const [auditNotes, setAuditNotes] = useState("");
  const [newAuditOpen, setNewAuditOpen] = useState(false);
  const [auditSheetId, setAuditSheetId] = useState<string | null>(null);
  const [auditSheetOpen, setAuditSheetOpen] = useState(false);
  const [auditSubmitting, setAuditSubmitting] = useState(false);

  // Load basic warehouse profile and stats
  const fetchWarehouseInfo = useCallback(async () => {
    setWhLoading(true);
    try {
      const [whRes, statsRes] = await Promise.all([
        fetch(`/api/warehouses/${warehouseId}`),
        fetch(`/api/warehouses/${warehouseId}/stats`),
      ]);
      const whJson = await whRes.json();
      const statsJson = await statsRes.json();

      if (whJson.success) setWarehouse(whJson.data);
      if (statsJson.success) setStats(statsJson.data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load warehouse information.");
    } finally {
      setWhLoading(false);
    }
  }, [warehouseId]);

  // Load stock levels
  const fetchStock = useCallback(async () => {
    setStockLoading(true);
    try {
      const res = await fetch(`/api/warehouses/${warehouseId}/stock`);
      const json = await res.json();
      if (json.success) {
        const validStock = (json.data || []).filter((record: any) => record && record.item !== null && record.item !== undefined);
        setStock(validStock);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setStockLoading(false);
    }
  }, [warehouseId]);

  // Load audits
  const fetchAudits = useCallback(async () => {
    setAuditsLoading(true);
    try {
      const res = await fetch(`/api/stock-counts?warehouse=${warehouseId}`);
      const json = await res.json();
      if (json.success) setAudits(json.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setAuditsLoading(false);
    }
  }, [warehouseId]);

  // Load movements
  const fetchMovements = useCallback(async () => {
    setMovementsLoading(true);
    try {
      const res = await fetch(`/api/warehouses/${warehouseId}/movements`);
      const json = await res.json();
      if (json.success) {
        const validMovements = (json.data || []).filter((move: any) => move && move.item !== null && move.item !== undefined);
        setMovements(validMovements);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setMovementsLoading(false);
    }
  }, [warehouseId]);

  useEffect(() => {
    fetchWarehouseInfo();
  }, [fetchWarehouseInfo]);

  // Handle initiate cycle count
  const handleCreateAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuditSubmitting(true);

    try {
      const res = await fetch("/api/stock-counts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          warehouse: warehouseId,
          zone: auditScopeZone === "all" ? undefined : auditScopeZone,
          notes: auditNotes.trim(),
        }),
      });
      const json = await res.json();

      if (json.success) {
        toast.success(`Cycle count audit started: ${json.data.stockCountNumber}`);
        setNewAuditOpen(false);
        setAuditNotes("");
        setAuditScopeZone("all");
        fetchAudits();
        // Immediately open count sheet for data entry
        setAuditSheetId(json.data._id);
        setAuditSheetOpen(true);
      } else {
        toast.error(json.error?.message || "Failed to start audit cycle.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error initiating audit cycle.");
    } finally {
      setAuditSubmitting(false);
    }
  };

  const openAuditSheet = (id: string) => {
    setAuditSheetId(id);
    setAuditSheetOpen(true);
  };

  const handleTabChange = (value: string) => {
    if (value === "stock") fetchStock();
    else if (value === "audits") fetchAudits();
    else if (value === "movements") fetchMovements();
  };

  // Trigger initial stock list fetch on mount
  useEffect(() => {
    fetchStock();
  }, [fetchStock]);

  if (whLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-3">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <span className="text-xs text-gray-500 font-semibold animate-pulse">Loading warehouse records...</span>
      </div>
    );
  }

  if (!warehouse) {
    return (
      <div className="text-center py-20 space-y-4">
        <Building className="w-16 h-16 text-gray-300 mx-auto" />
        <h3 className="text-lg font-bold text-gray-700">Warehouse Not Found</h3>
        <Button onClick={() => router.push("/warehouses")} className="bg-blue-600 text-white rounded-xl text-xs h-9">
          Back to Directory
        </Button>
      </div>
    );
  }

  // Filter stock items
  const filteredStock = stock.filter((record) => {
    if (!record || !record.item) return false;
    const matchesSearch =
      (record.item.name || "").toLowerCase().includes(stockSearch.toLowerCase()) ||
      (record.item.sku || "").toLowerCase().includes(stockSearch.toLowerCase()) ||
      (record.item.barcode && record.item.barcode.includes(stockSearch));

    const matchesZone = selectedZoneCode === "all" || record.zone === selectedZoneCode;

    return matchesSearch && matchesZone;
  });

  const isSupervisor = ["super_admin", "admin", "manager"].includes(session?.user?.role || "");

  return (
    <div className="space-y-6">
      {/* Header Profile Panel */}
      <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-2">
          <Link href="/warehouses" className="flex items-center gap-1 text-[11px] font-bold text-gray-400 hover:text-blue-500 uppercase tracking-wider">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Directory
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-sm">
              <Building className="w-5.5 h-5.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-extrabold text-gray-900 leading-none">{warehouse.name}</h1>
                <Badge className="capitalize text-[9px] font-bold bg-blue-50 text-blue-600 border border-blue-200">
                  {warehouse.type}
                </Badge>
              </div>
              <span className="font-mono text-xs text-gray-400 font-bold block mt-1">{warehouse.code}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-gray-500 pt-1">
            {warehouse.address && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-gray-400" />
                {warehouse.address.line1}, {warehouse.address.city}
              </span>
            )}
            {warehouse.manager && (
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-gray-400" />
                Manager: <strong>{warehouse.manager.name}</strong>
              </span>
            )}
          </div>
        </div>

        <Link href={`/warehouses/${warehouseId}/zones`}>
          <Button variant="outline" className="border-gray-200 hover:bg-gray-50 text-gray-600 hover:text-gray-900 rounded-xl h-10 px-4 text-xs font-semibold flex items-center gap-1.5 shadow-sm">
            <Edit3 className="w-4 h-4" /> Layout Manager
          </Button>
        </Link>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-gray-200 shadow-sm bg-white">
          <CardContent className="p-4 flex flex-row items-center justify-between">
            <div>
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Active SKUs</p>
              <h3 className="font-extrabold text-xl text-gray-900 mt-1">{stats.totalSKUs}</h3>
            </div>
            <div className="w-8 h-8 rounded-lg bg-gray-50 text-gray-400 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm bg-white">
          <CardContent className="p-4 flex flex-row items-center justify-between">
            <div>
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Stock QtyOnHand</p>
              <h3 className="font-extrabold text-xl text-gray-900 mt-1">{stats.totalQuantity}</h3>
            </div>
            <div className="w-8 h-8 rounded-lg bg-gray-50 text-gray-400 flex items-center justify-center">
              <ClipboardCheck className="w-4 h-4" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm bg-white">
          <CardContent className="p-4 flex flex-row items-center justify-between">
            <div>
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Total Value</p>
              <h3 className="font-extrabold text-xl text-blue-600 mt-1">₹{stats.totalValue.toLocaleString("en-IN")}</h3>
            </div>
            <div className="w-8 h-8 rounded-lg bg-blue-50/50 text-blue-600 flex items-center justify-center">
              ₹
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm bg-white">
          <CardContent className="p-4 flex flex-row items-center justify-between">
            <div>
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Transit Inbound</p>
              <h3 className="font-extrabold text-xl text-gray-900 mt-1">{stats.pendingTransfers}</h3>
            </div>
            <div className="w-8 h-8 rounded-lg bg-gray-50 text-gray-400 flex items-center justify-center">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Layout */}
      <Tabs defaultValue="stock" className="space-y-4" onValueChange={handleTabChange}>
        <TabsList className="bg-gray-100/80 p-1 rounded-xl h-11 border border-gray-200/50">
          <TabsTrigger value="stock" className="rounded-lg text-xs h-9 font-semibold">Stock List</TabsTrigger>
          <TabsTrigger value="zones" className="rounded-lg text-xs h-9 font-semibold">Zones layout</TabsTrigger>
          <TabsTrigger value="audits" className="rounded-lg text-xs h-9 font-semibold">Cycle counts</TabsTrigger>
          <TabsTrigger value="movements" className="rounded-lg text-xs h-9 font-semibold">Audit Ledger</TabsTrigger>
        </TabsList>

        {/* Tab 1: Stock List */}
        <TabsContent value="stock" className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/40 border border-gray-200 p-4 rounded-2xl backdrop-blur-md">
            {/* Search Input */}
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                value={stockSearch}
                onChange={(e) => setStockSearch(e.target.value)}
                placeholder="Search sku, item name..."
                className="pl-9 bg-gray-50 border-gray-200 text-gray-900 rounded-xl text-sm"
              />
            </div>
            {/* Zone Filter */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <span className="text-xs text-gray-500 font-semibold flex items-center gap-1"><SlidersHorizontal className="w-3.5 h-3.5" /> Zone:</span>
              <Select value={selectedZoneCode} onValueChange={(val) => setSelectedZoneCode(val || "all")}>
                <SelectTrigger className="w-[140px] bg-gray-50 border-gray-200 text-gray-900 rounded-xl text-xs h-9">
                  <SelectValue placeholder="All Zones" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200 text-gray-900 text-xs">
                  <SelectItem value="all">All Zones</SelectItem>
                  {warehouse.zones.map((zone) => (
                    <SelectItem key={zone._id} value={zone.code}>
                      Zone {zone.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <Table>
              <TableHeader className="bg-gray-50/75 border-b border-gray-200">
                <TableRow>
                  <TableHead className="text-gray-500 font-semibold text-xs py-3">SKU & Item Name</TableHead>
                  <TableHead className="text-gray-500 font-semibold text-xs text-center py-3">Bin Location</TableHead>
                  <TableHead className="text-gray-500 font-semibold text-xs text-right py-3">On Hand</TableHead>
                  <TableHead className="text-gray-500 font-semibold text-xs text-right py-3">Reserved</TableHead>
                  <TableHead className="text-gray-500 font-semibold text-xs text-right py-3">Available</TableHead>
                  <TableHead className="text-gray-500 font-semibold text-xs text-right py-3">Average Cost</TableHead>
                  <TableHead className="text-gray-500 font-semibold text-xs text-right py-3 pr-6">Total Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-16">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                        <span className="text-xs text-gray-400">Loading stock records...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredStock.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-gray-400 text-xs">
                      No stock records found matching the filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStock.map((record) => {
                    const available = record.quantityOnHand - record.quantityReserved;
                    return (
                      <TableRow key={record._id} className="border-b border-gray-100 hover:bg-gray-50/20">
                        <TableCell className="py-2.5">
                          <span className="font-mono text-[9px] text-gray-400 font-bold block mb-0.5">{record.item?.sku || "N/A"}</span>
                          <span className="font-bold text-gray-900 text-xs">{record.item?.name || "Unknown Item"}</span>
                        </TableCell>
                        <TableCell className="text-center font-mono text-[10px] text-gray-600 py-2.5">
                          {record.zone ? `${record.zone}-${record.bin || "00-00"}` : "-"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs py-2.5 text-gray-800 font-semibold">{record.quantityOnHand}</TableCell>
                        <TableCell className="text-right font-mono text-xs py-2.5 text-gray-400">{record.quantityReserved}</TableCell>
                        <TableCell className="text-right font-mono text-xs py-2.5 text-blue-600 font-bold">{available}</TableCell>
                        <TableCell className="text-right font-mono text-xs py-2.5 text-gray-600">₹{(record.averageCost || 0).toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono text-xs py-2.5 pr-6 font-bold text-gray-900">
                          ₹{((record.quantityOnHand * record.averageCost) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Tab 2: Zone Map */}
        <TabsContent value="zones" className="space-y-4">
          <ZoneManager
            warehouseId={warehouseId}
            initialZones={warehouse.zones}
            onRefresh={fetchWarehouseInfo}
          />
        </TabsContent>

        {/* Tab 3: Stock Audits */}
        <TabsContent value="audits" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Cycle Count & Reconciliations</h3>
              <p className="text-[11px] text-gray-400 font-semibold">Initiate periodic inventory audits to resolve variances</p>
            </div>

            {isSupervisor && (
              <Dialog open={newAuditOpen} onOpenChange={setNewAuditOpen}>
                <DialogTrigger render={<Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-9 px-3.5 text-xs font-semibold flex items-center gap-1.5 shadow-sm" />}>
                  <ClipboardCheck className="w-4 h-4" /> Start Cycle Audit
                </DialogTrigger>
                <DialogContent className="bg-white text-gray-950 max-w-sm rounded-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-base font-bold">Start Inventory Audit</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateAudit} className="space-y-4 pt-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-gray-700">Audit Scope (Full WH or Zone)</Label>
                      <Select value={auditScopeZone} onValueChange={(val) => setAuditScopeZone(val || "all")}>
                        <SelectTrigger className="bg-gray-50 border-gray-200">
                          <SelectValue placeholder="Full Warehouse" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-gray-200 text-gray-900 text-xs">
                          <SelectItem value="all">Full Warehouse</SelectItem>
                          {warehouse.zones.map((zone) => (
                            <SelectItem key={zone._id} value={zone.code}>
                              Zone {zone.code} ({zone.name})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="auditNotes" className="text-xs font-semibold text-gray-700">Audit Guidelines / Remarks</Label>
                      <Input
                        id="auditNotes"
                        value={auditNotes}
                        onChange={(e) => setAuditNotes(e.target.value)}
                        placeholder="e.g. Monthly cycle count, Q2 reconciliation..."
                        className="bg-gray-50 border-gray-200 text-xs rounded-xl"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                      <Button type="button" variant="outline" onClick={() => setNewAuditOpen(false)} className="rounded-xl text-xs h-9">
                        Cancel
                      </Button>
                      <Button type="submit" disabled={auditSubmitting} className="bg-blue-600 text-white rounded-xl text-xs h-9">
                        {auditSubmitting ? "Taking Snapshot..." : "Generate Audit sheet"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <Table>
              <TableHeader className="bg-gray-50/75 border-b border-gray-200">
                <TableRow>
                  <TableHead className="text-gray-500 font-semibold text-xs py-3">Audit Number</TableHead>
                  <TableHead className="text-gray-500 font-semibold text-xs py-3">Scope</TableHead>
                  <TableHead className="text-gray-500 font-semibold text-xs py-3">Started Date</TableHead>
                  <TableHead className="text-gray-500 font-semibold text-xs py-3">Auditor Name</TableHead>
                  <TableHead className="text-gray-500 font-semibold text-xs text-center py-3">Status</TableHead>
                  <TableHead className="text-gray-500 font-semibold text-xs text-right py-3 pr-6">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditsLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-16">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-500 mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : audits.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-gray-400 text-xs">
                      No stock count audits recorded for this warehouse.
                    </TableCell>
                  </TableRow>
                ) : (
                  audits.map((audit) => (
                    <TableRow key={audit._id} className="border-b border-gray-100 hover:bg-gray-50/20">
                      <TableCell className="font-mono text-xs font-bold text-gray-800 py-2.5">
                        {audit.stockCountNumber}
                      </TableCell>
                      <TableCell className="text-xs py-2.5 font-semibold text-gray-600">
                        {audit.zone ? `Zone ${audit.zone}` : "Full Warehouse"}
                      </TableCell>
                      <TableCell className="text-xs py-2.5 text-gray-500 font-mono">
                        {new Date(audit.startedAt).toLocaleDateString("en-IN")}
                      </TableCell>
                      <TableCell className="text-xs py-2.5 text-gray-700 font-medium">
                        {audit.createdBy?.name || "Staff"}
                      </TableCell>
                      <TableCell className="text-center py-2.5">
                        <Badge
                          variant="outline"
                          className={`capitalize text-[9px] font-extrabold ${
                            audit.status === "approved"
                              ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                              : audit.status === "completed"
                              ? "bg-purple-50 text-purple-600 border-purple-200"
                              : "bg-amber-50 text-amber-600 border-amber-200"
                          }`}
                        >
                          {audit.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right py-2.5 pr-6">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openAuditSheet(audit._id)}
                          className="h-8 px-2.5 text-xs font-semibold rounded-lg text-blue-600 hover:text-blue-700 hover:bg-blue-50/50 flex items-center gap-1.5 ml-auto"
                        >
                          Open Sheet
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Tab 4: Audit Ledger / Movements */}
        <TabsContent value="movements" className="space-y-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Recent Movements Ledger</h3>
            <p className="text-[11px] text-gray-400 font-semibold">Audit trail of the last 20 stock adjustments and inbound/outbound transactions</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <Table>
              <TableHeader className="bg-gray-50/75 border-b border-gray-200">
                <TableRow>
                  <TableHead className="text-gray-500 font-semibold text-xs py-3">Date</TableHead>
                  <TableHead className="text-gray-500 font-semibold text-xs py-3">Item / SKU</TableHead>
                  <TableHead className="text-gray-500 font-semibold text-xs text-center py-3">Type</TableHead>
                  <TableHead className="text-gray-500 font-semibold text-xs text-right py-3">Quantity</TableHead>
                  <TableHead className="text-gray-500 font-semibold text-xs py-3 pr-6">Remarks & Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movementsLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-16">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-500 mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : movements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-gray-400 text-xs">
                      No stock movements recorded for this warehouse.
                    </TableCell>
                  </TableRow>
                ) : (
                  movements.map((move) => {
                    const isPositive = move.quantity > 0;
                    return (
                      <TableRow key={move._id} className="border-b border-gray-100 hover:bg-gray-50/20 text-xs">
                        <TableCell className="py-2.5 font-mono text-gray-400">
                          {new Date(move.date).toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </TableCell>
                        <TableCell className="py-2.5">
                          <div className="font-bold text-gray-900">{move.item?.name || "Unknown Item"}</div>
                          <span className="font-mono text-[9px] text-gray-400 font-semibold">{move.item?.sku || "N/A"}</span>
                        </TableCell>
                        <TableCell className="text-center py-2.5 font-bold">
                          <Badge
                            variant="outline"
                            className={`text-[8px] font-extrabold ${
                              move.type === "IN"
                                ? "bg-emerald-50 text-emerald-600 border-emerald-250"
                                : move.type === "OUT"
                                ? "bg-rose-50 text-rose-600 border-rose-200"
                                : move.type === "TRANSFER"
                                ? "bg-blue-50 text-blue-600 border-blue-200"
                                : "bg-purple-50 text-purple-600 border-purple-200"
                            }`}
                          >
                            {move.type}
                          </Badge>
                        </TableCell>
                        <TableCell className={`text-right font-mono font-extrabold text-sm py-2.5 ${isPositive ? "text-emerald-500" : "text-rose-500"}`}>
                          {isPositive ? `+${move.quantity}` : move.quantity}
                        </TableCell>
                        <TableCell className="py-2.5 text-gray-500 font-medium pr-6">
                          {move.notes || `Reference: ${move.referenceType}`}
                          {move.performedBy && (
                            <span className="text-[10px] text-gray-400 font-semibold block mt-0.5">by {move.performedBy.name}</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Stock Count Sheet Form Dialog */}
      {auditSheetId && (
        <Dialog open={auditSheetOpen} onOpenChange={setAuditSheetOpen}>
          <DialogContent className="bg-white text-gray-950 sm:max-w-[90vw] md:max-w-[85vw] lg:max-w-5xl xl:max-w-6xl w-full rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">Physical Audit count sheet</DialogTitle>
            </DialogHeader>
            <StockCountForm
              stockCountId={auditSheetId}
              onSuccess={() => {
                fetchAudits();
                fetchStock();
                fetchWarehouseInfo();
              }}
              onCancel={() => {
                setAuditSheetOpen(false);
                setAuditSheetId(null);
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
