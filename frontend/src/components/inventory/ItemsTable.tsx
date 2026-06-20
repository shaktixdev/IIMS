"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Loader2, 
  ArrowUpDown,
  FilterX, 
  ExternalLink,
  Trash2,
  Edit,
  SlidersHorizontal
} from "lucide-react";
import { toast } from "sonner";
import ItemDetailDrawer from "./ItemDetailDrawer";
import Link from "next/link";

interface Category {
  _id: string;
  name: string;
}

interface Unit {
  _id: string;
  name: string;
  symbol: string;
}

interface Warehouse {
  _id: string;
  code: string;
  name: string;
}

interface Item {
  _id: string;
  sku: string;
  name: string;
  description?: string;
  category: Category | null;
  unit: Unit | null;
  costPrice: number;
  minStockLevel: number;
  maxStockLevel: number;
  reorderQty: number;
  barcode?: string;
  hsnCode?: string;
  brand?: string;
  model?: string;
  isBatchTracked: boolean;
  isSerialTracked: boolean;
  hasExpiry: boolean;
  totalOnHand: number;
  totalReserved: number;
  totalAvailable: number;
  createdAt: string;
}

export default function ItemsTable() {
  // Filters & State
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("sku");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  
  // Pagination
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Lists for dropdown filters
  const [categories, setCategories] = useState<Category[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);

  // Drawer selected item
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedItemForDrawer, setSelectedItemForDrawer] = useState<Item | null>(null);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [bulkEditFields, setBulkEditFields] = useState({
    category: false,
    unit: false,
    costPrice: false,
    minStockLevel: false,
    maxStockLevel: false,
    reorderQty: false,
    brand: false,
    model: false,
    isActive: false,
    tracking: false,
  });

  const [bulkEditValues, setBulkEditValues] = useState({
    category: "",
    unit: "",
    costPrice: 0,
    minStockLevel: 0,
    maxStockLevel: 0,
    reorderQty: 0,
    brand: "",
    model: "",
    isActive: "true",
    isBatchTracked: false,
    isSerialTracked: false,
    hasExpiry: false,
  });

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset page to 1 when search changes
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Fetch Categories, Warehouses, & Units for filter/edit panels
  useEffect(() => {
    const loadFiltersData = async () => {
      try {
        const [catRes, whRes, unitRes] = await Promise.all([
          fetch("/api/categories"),
          fetch("/api/warehouses"),
          fetch("/api/units")
        ]);
        const catJson = await catRes.json();
        const whJson = await whRes.json();
        const unitJson = await unitRes.json();
        
        if (catJson.success) setCategories(catJson.data);
        if (whJson.success) setWarehouses(whJson.data);
        if (unitJson.success) setUnits(unitJson.data);
      } catch (err) {
        console.error("Failed to fetch filter options:", err);
      }
    };
    loadFiltersData();
  }, []);

  // Main list fetch
  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        search: debouncedSearch,
        sortBy,
        sortOrder
      });

      if (selectedCategory && selectedCategory !== "all") {
        queryParams.append("category", selectedCategory);
      }
      if (selectedWarehouse && selectedWarehouse !== "all") {
        queryParams.append("warehouse", selectedWarehouse);
      }
      if (selectedStatus && selectedStatus !== "all") {
        queryParams.append("status", selectedStatus);
      }

      const res = await fetch(`/api/items?${queryParams.toString()}`);
      const json = await res.json();
      
      if (json.success && json.data) {
        setItems(json.data);
        setTotalPages(json.pagination?.pages || 1);
        setTotalCount(json.pagination?.total || 0);
      } else {
        toast.error(json.error?.message || "Failed to load inventory items.");
      }
    } catch (err) {
      console.error("Fetch items error:", err);
      toast.error("Error connecting to inventory API.");
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, selectedCategory, selectedWarehouse, selectedStatus, sortBy, sortOrder]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleRowClick = (item: Item) => {
    setSelectedItemForDrawer(item);
    setDrawerOpen(true);
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
    setPage(1);
  };

  const clearFilters = () => {
    setSearch("");
    setSelectedCategory("all");
    setSelectedWarehouse("all");
    setSelectedStatus("all");
    setPage(1);
    toast.success("Filters cleared");
  };

  const handleSelectRow = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(items.map(item => item._id));
    } else {
      setSelectedIds([]);
    }
  };

  useEffect(() => {
    setSelectedIds([]);
  }, [items, page, selectedCategory, selectedWarehouse, selectedStatus, debouncedSearch]);

  const handleBulkEditSubmit = async () => {
    const updates: any = {};
    if (bulkEditFields.category) updates.category = bulkEditValues.category;
    if (bulkEditFields.unit) updates.unit = bulkEditValues.unit;
    if (bulkEditFields.costPrice) updates.costPrice = bulkEditValues.costPrice;
    if (bulkEditFields.minStockLevel) updates.minStockLevel = bulkEditValues.minStockLevel;
    if (bulkEditFields.maxStockLevel) updates.maxStockLevel = bulkEditValues.maxStockLevel;
    if (bulkEditFields.reorderQty) updates.reorderQty = bulkEditValues.reorderQty;
    if (bulkEditFields.brand) updates.brand = bulkEditValues.brand;
    if (bulkEditFields.model) updates.model = bulkEditValues.model;
    if (bulkEditFields.isActive) updates.isActive = bulkEditValues.isActive === "true";
    if (bulkEditFields.tracking) {
      updates.isBatchTracked = bulkEditValues.isBatchTracked;
      updates.isSerialTracked = bulkEditValues.isSerialTracked;
      updates.hasExpiry = bulkEditValues.hasExpiry;
    }

    if (Object.keys(updates).length === 0) {
      toast.error("Please select at least one field to update.");
      return;
    }

    setBulkUpdating(true);
    try {
      const res = await fetch("/api/items/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds, updates }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Successfully updated ${json.data.modifiedCount} items.`);
        setShowBulkEditModal(false);
        setSelectedIds([]);
        fetchItems();
      } else {
        toast.error(json.error?.message || "Failed to bulk update items.");
      }
    } catch (err) {
      console.error("Bulk edit error:", err);
      toast.error("Error bulk editing items.");
    } finally {
      setBulkUpdating(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete/archive these ${selectedIds.length} items?`)) {
      return;
    }
    
    try {
      const res = await fetch("/api/items/bulk", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Successfully archived ${selectedIds.length} items.`);
        setSelectedIds([]);
        fetchItems();
      } else {
        toast.error(json.error?.message || "Failed to bulk delete items.");
      }
    } catch (err) {
      console.error("Bulk delete error:", err);
      toast.error("Error bulk deleting items.");
    }
  };

  const handleDeleteItem = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation(); // Stop row click
    if (!confirm(`Are you sure you want to delete '${name}'? This will archive the product.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/items/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        toast.success(`Item '${name}' archived successfully`);
        fetchItems();
      } else {
        toast.error(json.error?.message || "Failed to delete item.");
      }
    } catch (err) {
      console.error("Delete item error:", err);
      toast.error("Error archiving item.");
    }
  };

  const getStatusBadge = (item: Item) => {
    if (item.totalOnHand === 0) {
      return (
        <Badge variant="outline" className="bg-red-600/10 text-red-400 border-red-500/20 text-[10px] font-bold">
          OUT OF STOCK
        </Badge>
      );
    }
    if (item.totalOnHand < item.minStockLevel) {
      return (
        <Badge variant="outline" className="bg-amber-600/10 text-amber-400 border-amber-500/20 text-[10px] font-bold">
          LOW STOCK
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-emerald-600/10 text-emerald-400 border-emerald-500/20 text-[10px] font-bold">
        IN STOCK
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {/* Filters & Control bar */}
      <div className="bg-white/40 border border-gray-200 p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between backdrop-blur-md">
        
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search SKU, name, or barcode..."
            className="pl-9 bg-gray-50 border-gray-200 text-gray-900 rounded-xl placeholder-slate-500 focus:border-blue-500 text-sm"
          />
        </div>

        {/* Filters Selects */}
        <div className="flex flex-wrap gap-3 w-full md:w-auto items-center justify-end">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filters:
          </div>

          {/* Category Filter */}
          <Select value={selectedCategory} onValueChange={val => { setSelectedCategory(val || "all"); setPage(1); }}>
            <SelectTrigger className="w-[140px] bg-gray-50 border-gray-200 text-gray-900 rounded-xl text-xs h-9">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent className="bg-white border-gray-200 text-gray-900 text-xs">
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat._id} value={cat._id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Warehouse Filter */}
          <Select value={selectedWarehouse} onValueChange={val => { setSelectedWarehouse(val || "all"); setPage(1); }}>
            <SelectTrigger className="w-[140px] bg-gray-50 border-gray-200 text-gray-900 rounded-xl text-xs h-9">
              <SelectValue placeholder="Warehouse" />
            </SelectTrigger>
            <SelectContent className="bg-white border-gray-200 text-gray-900 text-xs">
              <SelectItem value="all">All Warehouses</SelectItem>
              {warehouses.map(wh => (
                <SelectItem key={wh._id} value={wh._id}>{wh.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select value={selectedStatus} onValueChange={val => { setSelectedStatus(val || "all"); setPage(1); }}>
            <SelectTrigger className="w-[130px] bg-gray-50 border-gray-200 text-gray-900 rounded-xl text-xs h-9">
              <SelectValue placeholder="Stock Status" />
            </SelectTrigger>
            <SelectContent className="bg-white border-gray-200 text-gray-900 text-xs">
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="in_stock">In Stock</SelectItem>
              <SelectItem value="low_stock">Low Stock</SelectItem>
              <SelectItem value="out_of_stock">Out of Stock</SelectItem>
            </SelectContent>
          </Select>

          {(selectedCategory !== "all" || selectedWarehouse !== "all" || selectedStatus !== "all" || search) && (
            <Button
              onClick={clearFilters}
              variant="ghost"
              className="text-gray-500 hover:text-gray-900 text-xs h-9 rounded-xl border border-gray-100 hover:bg-gray-50"
            >
              <FilterX className="w-3.5 h-3.5 mr-1" />
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 animate-in slide-in-from-top-2 duration-200">
          <div className="text-sm text-blue-700 font-semibold">
            Selected {selectedIds.length} item{selectedIds.length > 1 ? "s" : ""} for bulk action
          </div>
          <div className="flex items-center gap-3">
            <Button 
              onClick={() => setShowBulkEditModal(true)} 
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs h-9 px-4 font-bold flex items-center gap-1.5 shadow-sm"
            >
              <Edit className="w-3.5 h-3.5" />
              Bulk Edit
            </Button>
            <Button 
              onClick={handleBulkDelete} 
              variant="outline" 
              className="border-red-200 bg-white text-red-600 hover:bg-red-50 rounded-xl text-xs h-9 px-4 font-bold flex items-center gap-1.5 shadow-sm"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Bulk Delete
            </Button>
          </div>
        </div>
      )}

      {/* Main Table Grid */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50 border-b border-gray-200">
              <TableRow className="hover:bg-transparent border-gray-200">
                <TableHead className="w-[50px] py-3 text-center pl-4 select-none">
                  <Checkbox 
                    checked={items.length > 0 && selectedIds.length === items.length}
                    onCheckedChange={(checked) => handleSelectAll(!!checked)}
                  />
                </TableHead>
                <TableHead onClick={() => handleSort("sku")} className="cursor-pointer text-gray-500 font-semibold text-xs py-3 select-none">
                  <div className="flex items-center gap-1.5">
                    SKU
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </div>
                </TableHead>
                <TableHead onClick={() => handleSort("name")} className="cursor-pointer text-gray-500 font-semibold text-xs py-3 select-none">
                  <div className="flex items-center gap-1.5">
                    Item Name
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </div>
                </TableHead>
                <TableHead className="text-gray-500 font-semibold text-xs py-3">Category</TableHead>
                <TableHead className="text-gray-500 font-semibold text-xs py-3">UoM</TableHead>
                <TableHead onClick={() => handleSort("totalOnHand")} className="cursor-pointer text-gray-500 font-semibold text-xs text-right py-3 select-none">
                  <div className="flex items-center justify-end gap-1.5">
                    Available Stock
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </div>
                </TableHead>
                <TableHead className="text-gray-500 font-semibold text-xs text-center py-3">Status</TableHead>
                <TableHead className="text-gray-500 font-semibold text-xs text-right py-3 pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="bg-white/15">
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-20">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                      <span className="text-gray-500 text-xs font-semibold animate-pulse">Loading Item Master list...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-gray-400 py-16 text-sm">
                    No items found matching the selected search criteria.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow 
                    key={item._id} 
                    onClick={() => handleRowClick(item)}
                    className="hover:bg-gray-50/50 border-gray-200 transition-all cursor-pointer group"
                  >
                    <TableCell className="w-[50px] py-3 text-center pl-4" onClick={(e) => e.stopPropagation()}>
                      <Checkbox 
                        checked={selectedIds.includes(item._id)}
                        onCheckedChange={() => handleSelectRow(item._id)}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-blue-400 text-xs font-semibold py-3">
                      {item.sku}
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="font-bold text-gray-900 text-sm group-hover:text-blue-400 transition-colors">
                        {item.name}
                      </div>
                      {(item.brand || item.model) && (
                        <div className="text-[10px] text-gray-400 mt-0.5">
                          {item.brand} {item.model && `• ${item.model}`}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-gray-700 text-xs py-3 font-semibold">
                      {item.category?.name || "Uncategorized"}
                    </TableCell>
                    <TableCell className="text-gray-500 font-mono text-xs py-3">
                      {item.unit?.symbol || "pcs"}
                    </TableCell>
                    <TableCell className="text-right text-xs py-3 pr-4">
                      <div className="font-extrabold text-gray-900 text-sm">
                        {item.totalAvailable}
                      </div>
                      {item.totalOnHand !== item.totalAvailable && (
                        <div className="text-[9px] text-gray-400">
                          {item.totalOnHand} Total
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-center py-3">
                      {getStatusBadge(item)}
                    </TableCell>
                    <TableCell className="text-right py-3 pr-6" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/inventory/${item._id}`}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-500 hover:text-blue-400 hover:bg-white"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleDeleteItem(e, item._id, item.name)}
                          className="h-8 w-8 text-gray-400 hover:text-red-400 hover:bg-red-950/20"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Footer / Pagination */}
        <div className="bg-gray-50/50 border-t border-gray-200/80 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-gray-500 font-medium">
            Showing <span className="text-slate-200 font-bold">{items.length}</span> of <span className="text-slate-200 font-bold">{totalCount}</span> items
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              disabled={page === 1}
              onClick={() => setPage(prev => Math.max(prev - 1, 1))}
              className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 disabled:opacity-30 rounded-xl h-8 px-3 text-xs flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Prev
            </Button>
            
            <div className="text-xs text-gray-500 px-3 font-semibold">
              Page {page} of {totalPages}
            </div>

            <Button
              disabled={page === totalPages}
              onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
              className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 disabled:opacity-30 rounded-xl h-8 px-3 text-xs flex items-center gap-1"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Detail Slideout Drawer */}
      <ItemDetailDrawer
        item={selectedItemForDrawer}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />

      {/* Bulk Edit Dialog */}
      <Dialog open={showBulkEditModal} onOpenChange={setShowBulkEditModal}>
        <DialogContent className="bg-white border border-gray-200 text-gray-900 rounded-2xl max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-gray-900 font-bold text-lg flex items-center gap-2">
              <Edit className="w-5 h-5 text-blue-500" />
              Bulk Edit {selectedIds.length} Items
            </DialogTitle>
            <DialogDescription className="text-gray-500 text-xs mt-1">
              Select which fields you want to update across all selected items. Fields not checked will remain unchanged.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            
            {/* Category Field */}
            <div className="flex items-start gap-4 p-3 border border-gray-100 rounded-xl hover:bg-gray-50/50 transition-colors">
              <Checkbox 
                id="update-category"
                checked={bulkEditFields.category} 
                onCheckedChange={checked => setBulkEditFields(prev => ({ ...prev, category: !!checked }))}
                className="mt-1"
              />
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="update-category" className="text-gray-700 text-xs font-semibold cursor-pointer">Update Category</Label>
                <Select 
                  disabled={!bulkEditFields.category}
                  value={bulkEditValues.category} 
                  onValueChange={val => setBulkEditValues(prev => ({ ...prev, category: val }))}
                >
                  <SelectTrigger className="w-full bg-white border-gray-200 text-gray-900 rounded-lg text-xs h-9">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200 text-gray-900 text-xs">
                    {categories.map(cat => (
                      <SelectItem key={cat._id} value={cat._id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Unit Field */}
            <div className="flex items-start gap-4 p-3 border border-gray-100 rounded-xl hover:bg-gray-50/50 transition-colors">
              <Checkbox 
                id="update-unit"
                checked={bulkEditFields.unit} 
                onCheckedChange={checked => setBulkEditFields(prev => ({ ...prev, unit: !!checked }))}
                className="mt-1"
              />
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="update-unit" className="text-gray-700 text-xs font-semibold cursor-pointer">Update Unit of Measure</Label>
                <Select 
                  disabled={!bulkEditFields.unit}
                  value={bulkEditValues.unit} 
                  onValueChange={val => setBulkEditValues(prev => ({ ...prev, unit: val }))}
                >
                  <SelectTrigger className="w-full bg-white border-gray-200 text-gray-900 rounded-lg text-xs h-9">
                    <SelectValue placeholder="Select Unit" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200 text-gray-900 text-xs">
                    {units.map(u => (
                      <SelectItem key={u._id} value={u._id}>{u.name} ({u.symbol})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Brand & Model (Grouped) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Brand */}
              <div className="flex items-start gap-3 p-3 border border-gray-100 rounded-xl hover:bg-gray-50/50 transition-colors">
                <Checkbox 
                  id="update-brand"
                  checked={bulkEditFields.brand} 
                  onCheckedChange={checked => setBulkEditFields(prev => ({ ...prev, brand: !!checked }))}
                  className="mt-1"
                />
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="update-brand" className="text-gray-700 text-xs font-semibold cursor-pointer">Update Brand</Label>
                  <Input 
                    disabled={!bulkEditFields.brand}
                    value={bulkEditValues.brand}
                    onChange={e => setBulkEditValues(prev => ({ ...prev, brand: e.target.value }))}
                    placeholder="Enter brand name"
                    className="bg-white border-gray-200 text-gray-900 rounded-lg text-xs h-9"
                  />
                </div>
              </div>

              {/* Model */}
              <div className="flex items-start gap-3 p-3 border border-gray-100 rounded-xl hover:bg-gray-50/50 transition-colors">
                <Checkbox 
                  id="update-model"
                  checked={bulkEditFields.model} 
                  onCheckedChange={checked => setBulkEditFields(prev => ({ ...prev, model: !!checked }))}
                  className="mt-1"
                />
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="update-model" className="text-gray-700 text-xs font-semibold cursor-pointer">Update Model</Label>
                  <Input 
                    disabled={!bulkEditFields.model}
                    value={bulkEditValues.model}
                    onChange={e => setBulkEditValues(prev => ({ ...prev, model: e.target.value }))}
                    placeholder="Enter model / type"
                    className="bg-white border-gray-200 text-gray-900 rounded-lg text-xs h-9"
                  />
                </div>
              </div>
            </div>

            {/* Price & Reorder limits */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Cost Price */}
              <div className="flex items-start gap-3 p-3 border border-gray-100 rounded-xl hover:bg-gray-50/50 transition-colors">
                <Checkbox 
                  id="update-costprice"
                  checked={bulkEditFields.costPrice} 
                  onCheckedChange={checked => setBulkEditFields(prev => ({ ...prev, costPrice: !!checked }))}
                  className="mt-1"
                />
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="update-costprice" className="text-gray-700 text-xs font-semibold cursor-pointer">Update Cost Price (₹)</Label>
                  <Input 
                    type="number"
                    disabled={!bulkEditFields.costPrice}
                    value={bulkEditValues.costPrice}
                    onChange={e => setBulkEditValues(prev => ({ ...prev, costPrice: parseFloat(e.target.value) || 0 }))}
                    className="bg-white border-gray-200 text-gray-900 rounded-lg text-xs h-9"
                  />
                </div>
              </div>

              {/* Reorder Qty */}
              <div className="flex items-start gap-3 p-3 border border-gray-100 rounded-xl hover:bg-gray-50/50 transition-colors">
                <Checkbox 
                  id="update-reorderqty"
                  checked={bulkEditFields.reorderQty} 
                  onCheckedChange={checked => setBulkEditFields(prev => ({ ...prev, reorderQty: !!checked }))}
                  className="mt-1"
                />
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="update-reorderqty" className="text-gray-700 text-xs font-semibold cursor-pointer">Update Reorder Qty</Label>
                  <Input 
                    type="number"
                    disabled={!bulkEditFields.reorderQty}
                    value={bulkEditValues.reorderQty}
                    onChange={e => setBulkEditValues(prev => ({ ...prev, reorderQty: parseFloat(e.target.value) || 0 }))}
                    className="bg-white border-gray-200 text-gray-900 rounded-lg text-xs h-9"
                  />
                </div>
              </div>
            </div>

            {/* Min & Max Stock Levels */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Min Stock */}
              <div className="flex items-start gap-3 p-3 border border-gray-100 rounded-xl hover:bg-gray-50/50 transition-colors">
                <Checkbox 
                  id="update-minstock"
                  checked={bulkEditFields.minStockLevel} 
                  onCheckedChange={checked => setBulkEditFields(prev => ({ ...prev, minStockLevel: !!checked }))}
                  className="mt-1"
                />
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="update-minstock" className="text-gray-700 text-xs font-semibold cursor-pointer">Update Min Stock Level</Label>
                  <Input 
                    type="number"
                    disabled={!bulkEditFields.minStockLevel}
                    value={bulkEditValues.minStockLevel}
                    onChange={e => setBulkEditValues(prev => ({ ...prev, minStockLevel: parseFloat(e.target.value) || 0 }))}
                    className="bg-white border-gray-200 text-gray-900 rounded-lg text-xs h-9"
                  />
                </div>
              </div>

              {/* Max Stock */}
              <div className="flex items-start gap-3 p-3 border border-gray-100 rounded-xl hover:bg-gray-50/50 transition-colors">
                <Checkbox 
                  id="update-maxstock"
                  checked={bulkEditFields.maxStockLevel} 
                  onCheckedChange={checked => setBulkEditFields(prev => ({ ...prev, maxStockLevel: !!checked }))}
                  className="mt-1"
                />
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="update-maxstock" className="text-gray-700 text-xs font-semibold cursor-pointer">Update Max Stock Level</Label>
                  <Input 
                    type="number"
                    disabled={!bulkEditFields.maxStockLevel}
                    value={bulkEditValues.maxStockLevel}
                    onChange={e => setBulkEditValues(prev => ({ ...prev, maxStockLevel: parseFloat(e.target.value) || 0 }))}
                    className="bg-white border-gray-200 text-gray-900 rounded-lg text-xs h-9"
                  />
                </div>
              </div>
            </div>

            {/* Tracking (Batch, Serial, Expiry) */}
            <div className="flex items-start gap-4 p-3 border border-gray-100 rounded-xl hover:bg-gray-50/50 transition-colors">
              <Checkbox 
                id="update-tracking"
                checked={bulkEditFields.tracking} 
                onCheckedChange={checked => setBulkEditFields(prev => ({ ...prev, tracking: !!checked }))}
                className="mt-1"
              />
              <div className="flex-1 space-y-2">
                <Label htmlFor="update-tracking" className="text-gray-700 text-xs font-semibold cursor-pointer">Update Tracking Settings</Label>
                <div className="flex flex-wrap gap-6 pt-1">
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      id="bulk-batch"
                      disabled={!bulkEditFields.tracking}
                      checked={bulkEditValues.isBatchTracked}
                      onCheckedChange={checked => setBulkEditValues(prev => ({ ...prev, isBatchTracked: !!checked }))}
                    />
                    <Label htmlFor="bulk-batch" className="text-xs font-medium cursor-pointer text-gray-600">Batch Tracked</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      id="bulk-serial"
                      disabled={!bulkEditFields.tracking}
                      checked={bulkEditValues.isSerialTracked}
                      onCheckedChange={checked => setBulkEditValues(prev => ({ ...prev, isSerialTracked: !!checked }))}
                    />
                    <Label htmlFor="bulk-serial" className="text-xs font-medium cursor-pointer text-gray-600">Serial Tracked</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      id="bulk-expiry"
                      disabled={!bulkEditFields.tracking}
                      checked={bulkEditValues.hasExpiry}
                      onCheckedChange={checked => setBulkEditValues(prev => ({ ...prev, hasExpiry: !!checked }))}
                    />
                    <Label htmlFor="bulk-expiry" className="text-xs font-medium cursor-pointer text-gray-600">Has Expiry</Label>
                  </div>
                </div>
              </div>
            </div>

            {/* Active Status */}
            <div className="flex items-start gap-4 p-3 border border-gray-100 rounded-xl hover:bg-gray-50/50 transition-colors">
              <Checkbox 
                id="update-status"
                checked={bulkEditFields.isActive} 
                onCheckedChange={checked => setBulkEditFields(prev => ({ ...prev, isActive: !!checked }))}
                className="mt-1"
              />
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="update-status" className="text-gray-700 text-xs font-semibold cursor-pointer">Update Catalog Status</Label>
                <Select 
                  disabled={!bulkEditFields.isActive}
                  value={bulkEditValues.isActive} 
                  onValueChange={val => setBulkEditValues(prev => ({ ...prev, isActive: val }))}
                >
                  <SelectTrigger className="w-full bg-white border-gray-200 text-gray-900 rounded-lg text-xs h-9">
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200 text-gray-900 text-xs">
                    <SelectItem value="true">Active (Visible)</SelectItem>
                    <SelectItem value="false">Inactive (Hidden)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

          </div>

          <DialogFooter className="border-t border-gray-100 pt-3">
            <Button variant="ghost" onClick={() => setShowBulkEditModal(false)} className="text-gray-500 hover:text-gray-900 rounded-xl text-xs h-9">
              Cancel
            </Button>
            <Button 
              disabled={bulkUpdating} 
              onClick={handleBulkEditSubmit}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs h-9 px-4 flex items-center gap-1.5 font-bold shadow-md"
            >
              {bulkUpdating ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Updating...</> : <>Save Changes</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
