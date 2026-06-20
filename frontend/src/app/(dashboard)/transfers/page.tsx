"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, ArrowRightLeft, SlidersHorizontal, Loader2, ChevronLeft, ChevronRight, FilterX, Eye } from "lucide-react";
import { toast } from "sonner";

interface Warehouse {
  code: string;
  name: string;
}

interface Transfer {
  _id: string;
  transferNumber: string;
  status: "draft" | "in_transit" | "received" | "cancelled" | "partial";
  fromWarehouse: Warehouse;
  toWarehouse: Warehouse;
  expectedDate?: string;
  dispatchDate?: string;
  items: any[];
}

export default function TransfersPage() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");

  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  const fetchTransfers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        search: debouncedSearch,
      });

      if (selectedStatus && selectedStatus !== "all") {
        params.append("status", selectedStatus);
      }

      const res = await fetch(`/api/transfers?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setTransfers(json.data || []);
        setTotalPages(json.pagination?.pages || 1);
        setTotalCount(json.pagination?.total || 0);
      } else {
        toast.error("Failed to load stock transfers list.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error communicating with servers.");
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, selectedStatus]);

  useEffect(() => {
    fetchTransfers();
  }, [fetchTransfers]);

  const clearFilters = () => {
    setSearch("");
    setSelectedStatus("all");
    setPage(1);
    toast.success("Filters cleared");
  };

  const getStatusBadge = (status: Transfer["status"]) => {
    const maps = {
      draft: "bg-gray-50 text-gray-600 border-gray-200",
      in_transit: "bg-blue-50 text-blue-600 border-blue-200",
      received: "bg-emerald-50 text-emerald-600 border-emerald-200",
      partial: "bg-amber-50 text-amber-600 border-amber-200",
      cancelled: "bg-red-50 text-red-600 border-red-200",
    };
    return (
      <Badge variant="outline" className={`capitalize font-bold text-[9px] ${maps[status] || ""}`}>
        {status.replace("_", " ")}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <ArrowRightLeft className="w-4.5 h-4.5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900">Stock Transfers</h1>
          </div>
          <p className="text-xs text-gray-500 font-medium">Route and monitor inter-warehouse inventory dispatches</p>
        </div>

        <Link href="/transfers/new">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-10 px-4 text-xs font-semibold flex items-center gap-1.5 shadow-sm">
            <Plus className="w-4 h-4" /> Transfer Stock
          </Button>
        </Link>
      </div>

      {/* Filter panel */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/40 border border-gray-200 p-4 rounded-2xl backdrop-blur-md">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search transfer #..."
            className="pl-9 bg-gray-50 border-gray-200 text-gray-900 rounded-xl text-sm placeholder-slate-500 h-9"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <SlidersHorizontal className="w-3.5 h-3.5 text-gray-400" />
          <Select value={selectedStatus} onValueChange={(val) => { setSelectedStatus(val || "all"); setPage(1); }}>
            <SelectTrigger className="w-[140px] bg-gray-50 border-gray-200 text-gray-900 rounded-xl text-xs h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-white border-gray-200 text-gray-900 text-xs">
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="in_transit">In Transit</SelectItem>
              <SelectItem value="received">Received</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          {(search || selectedStatus !== "all") && (
            <Button
              onClick={clearFilters}
              variant="ghost"
              className="text-gray-500 hover:text-gray-900 text-xs h-9 rounded-xl border border-gray-100 bg-white"
            >
              <FilterX className="w-3.5 h-3.5 mr-1" /> Reset
            </Button>
          )}
        </div>
      </div>

      {/* Grid Table */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-gray-50/75 border-b border-gray-200">
            <TableRow>
              <TableHead className="text-gray-500 font-semibold text-xs py-3">Transfer Number</TableHead>
              <TableHead className="text-gray-500 font-semibold text-xs py-3">From (Source)</TableHead>
              <TableHead className="text-gray-500 font-semibold text-xs py-3">To (Destination)</TableHead>
              <TableHead className="text-gray-500 font-semibold text-xs text-center py-3">Items Count</TableHead>
              <TableHead className="text-gray-500 font-semibold text-xs py-3">Expected Date</TableHead>
              <TableHead className="text-gray-500 font-semibold text-xs text-center py-3">Status</TableHead>
              <TableHead className="text-gray-500 font-semibold text-xs text-right py-3 pr-6">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-16">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                    <span className="text-xs text-gray-400 font-semibold">Loading stock transfers list...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : transfers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-gray-400 text-xs">
                  No stock transfers found matching the criteria.
                </TableCell>
              </TableRow>
            ) : (
              transfers.map((trf) => (
                <TableRow key={trf._id} className="border-b border-gray-100 hover:bg-gray-50/20 text-xs">
                  <TableCell className="font-mono font-bold text-gray-800 py-2.5">
                    {trf.transferNumber}
                  </TableCell>
                  <TableCell className="py-2.5 font-bold text-gray-800">
                    {trf.fromWarehouse?.name}
                    <span className="text-[10px] text-gray-400 block font-mono font-bold uppercase">{trf.fromWarehouse?.code}</span>
                  </TableCell>
                  <TableCell className="py-2.5 font-bold text-gray-800">
                    {trf.toWarehouse?.name}
                    <span className="text-[10px] text-gray-400 block font-mono font-bold uppercase">{trf.toWarehouse?.code}</span>
                  </TableCell>
                  <TableCell className="text-center font-mono font-bold text-gray-600 py-2.5">
                    {trf.items?.length || 0} Lines
                  </TableCell>
                  <TableCell className="py-2.5 font-mono text-gray-500">
                    {trf.expectedDate ? new Date(trf.expectedDate).toLocaleDateString("en-IN") : "-"}
                  </TableCell>
                  <TableCell className="text-center py-2.5">
                    {getStatusBadge(trf.status)}
                  </TableCell>
                  <TableCell className="text-right py-2.5 pr-6">
                    <Link href={`/transfers/${trf._id}`}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs font-semibold rounded-lg text-blue-600 hover:text-blue-700 hover:bg-blue-50/50 flex items-center gap-1 ml-auto"
                      >
                        <Eye className="w-3.5 h-3.5" /> Details
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        <div className="bg-gray-50/50 border-t border-gray-100 px-6 py-3 flex items-center justify-between">
          <div className="text-xs text-gray-500 font-semibold">
            Showing <span className="text-slate-800 font-bold">{transfers.length}</span> of <span className="text-slate-800 font-bold">{totalCount}</span> transfers
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              disabled={page === 1}
              onClick={() => setPage(prev => Math.max(prev - 1, 1))}
              className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 disabled:opacity-30 rounded-xl h-8 px-3 text-xs flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Prev
            </Button>
            
            <div className="text-xs text-gray-500 px-3 font-bold">
              Page {page} of {totalPages}
            </div>

            <Button
              disabled={page === totalPages}
              onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
              className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 disabled:opacity-30 rounded-xl h-8 px-3 text-xs flex items-center gap-1"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
