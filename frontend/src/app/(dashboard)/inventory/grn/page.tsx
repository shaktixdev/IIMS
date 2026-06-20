"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, PackageCheck, Loader2 } from "lucide-react";

export default function GRNPage() {
  const [grns, setGrns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/grn")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setGrns(data.data);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <PackageCheck className="w-5 h-5 text-emerald-600" /> Goods Receipt Notes (GRN)
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage incoming stock from Purchase Orders</p>
        </div>
        <Link href="/inventory/grn/new">
          <button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-2 h-9 px-4 text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> Create GRN
          </button>
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-3">GRN #</th>
                <th className="px-6 py-3">PO Reference</th>
                <th className="px-6 py-3">Vendor</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {grns.map((g) => (
                <tr key={g._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">
                    <Link href={`/inventory/grn/${g._id}`} className="text-blue-600 hover:underline">{g.grnNumber || "Draft"}</Link>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{g.po?.poNumber || "N/A"}</td>
                  <td className="px-6 py-4 text-gray-600">{g.vendor?.name || "N/A"}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${g.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {g.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500">{new Date(g.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {grns.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No GRNs found.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
