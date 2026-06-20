"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  ArrowLeftRight,
  RefreshCw,
  PackageCheck,
  AlertCircle,
  ClipboardList,
} from "lucide-react";
import { toast } from "sonner";

interface Warehouse {
  _id: string;
  code: string;
  name: string;
}

interface PerformedBy {
  _id: string;
  name: string;
  email: string;
}

interface StockMovement {
  _id: string;
  item: string;
  warehouse: Warehouse | null;
  type: "IN" | "OUT" | "ADJUSTMENT" | "TRANSFER";
  quantity: number;
  referenceType: "GRN" | "ISSUE" | "TRANSFER" | "ADJUSTMENT" | "INITIAL" | "RETURN";
  referenceId?: string;
  date: string;
  performedBy: PerformedBy | null;
  notes?: string;
  createdAt: string;
}

interface StockHistoryTableProps {
  itemId: string;
}

const MOVEMENT_TYPE_CONFIG: Record<
  string,
  { label: string; bgClass: string; textClass: string; borderClass: string; icon: React.ReactNode }
> = {
  IN: {
    label: "Stock In",
    bgClass: "bg-emerald-600/10",
    textClass: "text-emerald-500",
    borderClass: "border-emerald-500/20",
    icon: <TrendingUp className="w-3.5 h-3.5" />,
  },
  OUT: {
    label: "Stock Out",
    bgClass: "bg-red-600/10",
    textClass: "text-red-400",
    borderClass: "border-red-500/20",
    icon: <TrendingDown className="w-3.5 h-3.5" />,
  },
  ADJUSTMENT: {
    label: "Adjustment",
    bgClass: "bg-amber-600/10",
    textClass: "text-amber-400",
    borderClass: "border-amber-500/20",
    icon: <RefreshCw className="w-3.5 h-3.5" />,
  },
  TRANSFER: {
    label: "Transfer",
    bgClass: "bg-blue-600/10",
    textClass: "text-blue-400",
    borderClass: "border-blue-500/20",
    icon: <ArrowLeftRight className="w-3.5 h-3.5" />,
  },
};

const REFERENCE_TYPE_CONFIG: Record<
  string,
  { label: string; icon: React.ReactNode }
> = {
  GRN: { label: "Goods Receipt", icon: <PackageCheck className="w-3 h-3" /> },
  ISSUE: {
    label: "Issue Voucher",
    icon: <ClipboardList className="w-3 h-3" />,
  },
  TRANSFER: {
    label: "Stock Transfer",
    icon: <ArrowLeftRight className="w-3 h-3" />,
  },
  ADJUSTMENT: {
    label: "Manual Adjustment",
    icon: <RefreshCw className="w-3 h-3" />,
  },
  INITIAL: {
    label: "Opening Stock",
    icon: <PackageCheck className="w-3 h-3" />,
  },
  RETURN: {
    label: "Material Return",
    icon: <TrendingUp className="w-3 h-3" />,
  },
};

export default function StockHistoryTable({ itemId }: StockHistoryTableProps) {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchMovements = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (typeFilter && typeFilter !== "all") {
        params.append("type", typeFilter);
      }

      const res = await fetch(
        `/api/items/${itemId}/movements?${params.toString()}`
      );
      const json = await res.json();

      if (json.success) {
        setMovements(json.data || []);
        setTotalPages(json.pagination?.pages || 1);
        setTotalCount(json.pagination?.total || 0);
      } else {
        toast.error(json.error?.message || "Failed to load movement history.");
      }
    } catch (err) {
      console.error("Fetch movements error:", err);
      toast.error("Error connecting to the server for movement history.");
    } finally {
      setLoading(false);
    }
  }, [itemId, page, limit, typeFilter]);

  useEffect(() => {
    fetchMovements();
  }, [fetchMovements]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getQtyDisplay = (movement: StockMovement) => {
    const isPositive = movement.type === "IN" || movement.quantity > 0;
    const sign = isPositive ? "+" : "";
    return (
      <span
        className={`font-extrabold font-mono text-sm ${
          isPositive ? "text-emerald-500" : "text-red-400"
        }`}
      >
        {sign}
        {movement.quantity}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 font-semibold">
            Filter by type:
          </span>
          <Select
            value={typeFilter}
            onValueChange={(val) => {
              setTypeFilter(val || "all");
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[160px] bg-gray-50 border-gray-200 text-gray-900 rounded-xl text-xs h-9">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent className="bg-white border-gray-200 text-gray-900 text-xs">
              <SelectItem value="all">All Movement Types</SelectItem>
              <SelectItem value="IN">Stock In</SelectItem>
              <SelectItem value="OUT">Stock Out</SelectItem>
              <SelectItem value="ADJUSTMENT">Adjustment</SelectItem>
              <SelectItem value="TRANSFER">Transfer</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="text-xs text-gray-400 font-medium">
          {totalCount} total movements
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50 border-b border-gray-200">
              <TableRow className="hover:bg-transparent border-gray-200">
                <TableHead className="text-gray-500 font-semibold text-xs py-3 w-40">
                  Date & Time
                </TableHead>
                <TableHead className="text-gray-500 font-semibold text-xs py-3">
                  Type
                </TableHead>
                <TableHead className="text-gray-500 font-semibold text-xs py-3">
                  Reference
                </TableHead>
                <TableHead className="text-gray-500 font-semibold text-xs py-3">
                  Warehouse
                </TableHead>
                <TableHead className="text-gray-500 font-semibold text-xs py-3 text-right">
                  Quantity
                </TableHead>
                <TableHead className="text-gray-500 font-semibold text-xs py-3">
                  Performed By
                </TableHead>
                <TableHead className="text-gray-500 font-semibold text-xs py-3">
                  Notes
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                      <span className="text-gray-400 text-xs font-semibold animate-pulse">
                        Loading movement history...
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : movements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <AlertCircle className="w-10 h-10 text-gray-300" />
                      <div>
                        <p className="text-gray-500 text-sm font-semibold">
                          No movements recorded yet
                        </p>
                        <p className="text-gray-400 text-xs mt-1">
                          Stock movements will appear here after GRNs, issues,
                          transfers, or adjustments.
                        </p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                movements.map((movement) => {
                  const typeConfig =
                    MOVEMENT_TYPE_CONFIG[movement.type] ||
                    MOVEMENT_TYPE_CONFIG.IN;
                  const refConfig =
                    REFERENCE_TYPE_CONFIG[movement.referenceType] ||
                    REFERENCE_TYPE_CONFIG.ADJUSTMENT;
                  return (
                    <TableRow
                      key={movement._id}
                      className="border-gray-100 hover:bg-gray-50/40 transition-colors"
                    >
                      {/* Date */}
                      <TableCell className="py-3">
                        <span className="text-gray-700 text-xs font-mono">
                          {formatDate(movement.date)}
                        </span>
                      </TableCell>

                      {/* Movement Type Badge */}
                      <TableCell className="py-3">
                        <Badge
                          variant="outline"
                          className={`${typeConfig.bgClass} ${typeConfig.textClass} ${typeConfig.borderClass} text-[10px] font-bold flex items-center gap-1 w-fit`}
                        >
                          {typeConfig.icon}
                          {typeConfig.label}
                        </Badge>
                      </TableCell>

                      {/* Reference Type */}
                      <TableCell className="py-3">
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <span className="text-gray-400">
                            {refConfig.icon}
                          </span>
                          <span className="font-semibold">
                            {refConfig.label}
                          </span>
                        </div>
                      </TableCell>

                      {/* Warehouse */}
                      <TableCell className="py-3">
                        {movement.warehouse ? (
                          <div>
                            <span className="text-xs text-gray-700 font-semibold">
                              {movement.warehouse.name}
                            </span>
                            <span className="text-[10px] text-gray-400 ml-1 font-mono">
                              ({movement.warehouse.code})
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </TableCell>

                      {/* Quantity */}
                      <TableCell className="py-3 text-right pr-6">
                        {getQtyDisplay(movement)}
                      </TableCell>

                      {/* Performed By */}
                      <TableCell className="py-3">
                        {movement.performedBy ? (
                          <div>
                            <p className="text-xs text-gray-700 font-semibold">
                              {movement.performedBy.name}
                            </p>
                            <p className="text-[10px] text-gray-400">
                              {movement.performedBy.email}
                            </p>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">System</span>
                        )}
                      </TableCell>

                      {/* Notes */}
                      <TableCell className="py-3 max-w-[160px]">
                        {movement.notes ? (
                          <span
                            className="text-gray-500 text-[11px] truncate block"
                            title={movement.notes}
                          >
                            {movement.notes}
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Footer */}
        {!loading && movements.length > 0 && (
          <div className="bg-gray-50/50 border-t border-gray-200/80 px-6 py-4 flex items-center justify-between">
            <div className="text-xs text-gray-500 font-medium">
              Showing{" "}
              <span className="text-gray-700 font-bold">{movements.length}</span>{" "}
              of{" "}
              <span className="text-gray-700 font-bold">{totalCount}</span>{" "}
              movements
            </div>
            <div className="flex items-center gap-2">
              <Button
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 disabled:opacity-30 rounded-xl h-8 px-3 text-xs flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Prev
              </Button>
              <div className="text-xs text-gray-500 px-3 font-semibold">
                {page} / {totalPages}
              </div>
              <Button
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 disabled:opacity-30 rounded-xl h-8 px-3 text-xs flex items-center gap-1"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
