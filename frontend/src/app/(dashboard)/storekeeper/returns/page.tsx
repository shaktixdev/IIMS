"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  ArrowLeft, 
  RotateCcw, 
  Search, 
  Loader2,
  Calendar,
  ClipboardList
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ReturnVoucher {
  _id: string;
  returnNumber: string;
  issueVoucher: {
    _id: string;
    ivNumber: string;
  };
  receivedBy: {
    name: string;
  };
  createdAt: string;
  items: {
    returnedQty: number;
    condition: string;
  }[];
}

export default function ReturnsListPage() {
  const [returns, setReturns] = useState<ReturnVoucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchReturns = () => {
    setLoading(true);
    const query = new URLSearchParams();
    if (search) query.append("search", search);

    fetch(`/api/returns?${query.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setReturns(data.data);
        } else {
          toast.error("Failed to load return slips");
        }
      })
      .catch((err) => {
        console.error(err);
        toast.error("Error loading return slips");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchReturns();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [search]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors mb-2">
            <Link href="/storekeeper" className="flex items-center"><ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard</Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <RotateCcw className="w-7 h-7 text-amber-500" /> Material Return Logs
          </h1>
          <p className="text-gray-500 text-sm mt-1">Audit log of all unused materials returned by helpers to the store.</p>
        </div>
      </div>

      {/* Filter panel */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <div className="space-y-1.5 max-w-md">
          <Label htmlFor="search" className="text-xs font-bold text-gray-400 uppercase tracking-wider">Search Returns</Label>
          <div className="relative">
            <Input
              id="search"
              type="text"
              placeholder="Search by Return Number (RTN)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-white border-gray-300 text-gray-900 rounded-xl pl-9"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>
      </div>

      {/* Returns Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-24 flex justify-center"><Loader2 className="w-10 h-10 animate-spin text-gray-300" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-3.5">Return #</th>
                  <th className="px-6 py-3.5">Date</th>
                  <th className="px-6 py-3.5">Linked MIV Slip</th>
                  <th className="px-6 py-3.5">Received By</th>
                  <th className="px-6 py-3.5 text-right">Items Count</th>
                  <th className="px-6 py-3.5 text-right">Total Returned Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {returns.map((rtn) => {
                  const totalQty = rtn.items.reduce((sum, item) => sum + item.returnedQty, 0);
                  return (
                    <tr key={rtn._id} className="hover:bg-gray-50/30 transition-colors">
                      <td className="px-6 py-4 font-bold text-gray-900">
                        <Link href={`/storekeeper/returns/${rtn._id}`} className="text-blue-600 hover:underline">
                          {rtn.returnNumber || "RTN-xxxx"}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {new Date(rtn.createdAt).toLocaleDateString("en-IN")}
                      </td>
                      <td className="px-6 py-4 font-bold text-gray-600">
                        {rtn.issueVoucher ? (
                          <Link href={`/storekeeper/issue/${rtn.issueVoucher._id}`} className="text-blue-600 hover:underline">
                            {rtn.issueVoucher.ivNumber}
                          </Link>
                        ) : "N/A"}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {rtn.receivedBy?.name}
                      </td>
                      <td className="px-6 py-4 text-right text-gray-600 font-mono">
                        {rtn.items.length}
                      </td>
                      <td className="px-6 py-4 text-right text-gray-900 font-bold font-mono">
                        {totalQty}
                      </td>
                    </tr>
                  );
                })}
                {returns.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                      <RotateCcw className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                      No return transactions found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
