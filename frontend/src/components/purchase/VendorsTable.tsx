"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Building2, Search, Star, ChevronLeft, ChevronRight, Loader2, Filter, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter } from "next/navigation";

interface Vendor {
  _id: string;
  code: string;
  name: string;
  type: "manufacturer" | "distributor" | "trader" | "service";
  contact: { person?: string; phone?: string; email?: string };
  gstin?: string;
  rating: number;
  activePOsCount: number;
  isActive: boolean;
}

const TYPE_COLORS: Record<string, string> = {
  manufacturer: "bg-violet-500/15 text-violet-400 border-violet-500/20",
  distributor: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  trader: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  service: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`w-3 h-3 ${s <= Math.round(rating) ? "text-amber-400 fill-amber-400" : "text-gray-400"}`}
        />
      ))}
    </div>
  );
}

interface VendorsTableProps {
  onVendorClick?: (vendor: Vendor) => void;
}

export default function VendorsTable({ onVendorClick }: VendorsTableProps) {
  const router = useRouter();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 20;

  const fetchVendors = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(LIMIT),
        ...(search && { search }),
        ...(typeFilter !== "all" && { type: typeFilter }),
      });
      const res = await fetch(`/api/vendors?${params}`);
      const json = await res.json();
      if (json.success) {
        setVendors(json.data);
        setTotal(json.pagination.total);
        setTotalPages(json.pagination.pages || 1);
      }
    } catch (err) {
      console.error("Failed to fetch vendors:", err);
    } finally {
      setLoading(false);
    }
  }, [page, search, typeFilter]);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  return (
    <div className="space-y-4">
      {/* Filters Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name, code, GSTIN, email…"
            className="pl-9 bg-gray-50 border-gray-200 text-gray-900 rounded-xl h-10 text-sm placeholder-gray-400 focus:border-blue-500/50"
          />
        </div>
        <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v ?? "all"); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-44 bg-gray-50 border-gray-200 text-gray-700 rounded-xl h-10 text-sm">
            <Filter className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent className="bg-white border-gray-200 text-gray-900">
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="manufacturer">Manufacturer</SelectItem>
            <SelectItem value="distributor">Distributor</SelectItem>
            <SelectItem value="trader">Trader</SelectItem>
            <SelectItem value="service">Service</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border border-gray-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left text-xs text-gray-400 font-semibold uppercase tracking-wider py-3 px-4">Code</th>
                <th className="text-left text-xs text-gray-400 font-semibold uppercase tracking-wider py-3 px-4">Name</th>
                <th className="text-left text-xs text-gray-400 font-semibold uppercase tracking-wider py-3 px-4">Type</th>
                <th className="text-left text-xs text-gray-400 font-semibold uppercase tracking-wider py-3 px-4">Contact</th>
                <th className="text-left text-xs text-gray-400 font-semibold uppercase tracking-wider py-3 px-4">GSTIN</th>
                <th className="text-left text-xs text-gray-400 font-semibold uppercase tracking-wider py-3 px-4">Rating</th>
                <th className="text-left text-xs text-gray-400 font-semibold uppercase tracking-wider py-3 px-4">Active POs</th>
                <th className="text-left text-xs text-gray-400 font-semibold uppercase tracking-wider py-3 px-4">Status</th>
                <th className="text-left text-xs text-gray-400 font-semibold uppercase tracking-wider py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-500 mx-auto" />
                  </td>
                </tr>
              ) : vendors.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-gray-400">
                    <Building2 className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm">No vendors found</p>
                    {search && <p className="text-xs mt-1">Try adjusting your search filters</p>}
                  </td>
                </tr>
              ) : (
                vendors.map((vendor) => (
                  <tr
                    key={vendor._id}
                    onClick={() => onVendorClick ? onVendorClick(vendor) : router.push(`/vendors/${vendor._id}`)}
                    className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors group"
                  >
                    <td className="py-3 px-4">
                      <span className="font-mono text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md">
                        {vendor.code}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-gray-900 group-hover:text-blue-300 transition-colors">
                        {vendor.name}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2 py-0.5 rounded-md border capitalize font-medium ${TYPE_COLORS[vendor.type] || "bg-slate-500/15 text-gray-500"}`}>
                        {vendor.type}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-xs text-gray-500">
                        {vendor.contact?.person && <p className="text-gray-700">{vendor.contact.person}</p>}
                        {vendor.contact?.phone && <p>{vendor.contact.phone}</p>}
                        {vendor.contact?.email && <p className="truncate max-w-[140px]">{vendor.contact.email}</p>}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-xs font-mono text-gray-500">{vendor.gstin || "—"}</span>
                    </td>
                    <td className="py-3 px-4">
                      <StarRating rating={vendor.rating} />
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-sm font-bold ${vendor.activePOsCount > 0 ? "text-amber-400" : "text-gray-400"}`}>
                        {vendor.activePOsCount}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${vendor.isActive ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}`}>
                        {vendor.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); router.push(`/vendors/${vendor._id}`); }}
                        className="h-7 px-2 text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-lg"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50/50">
            <span className="text-xs text-gray-400">
              Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total} vendors
            </span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-7 px-2 text-gray-500 hover:text-gray-900 disabled:opacity-30 rounded-lg"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-xs text-gray-500 self-center px-2">{page} / {totalPages}</span>
              <Button
                variant="ghost"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="h-7 px-2 text-gray-500 hover:text-gray-900 disabled:opacity-30 rounded-lg"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
