"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Send, ClipboardList, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function IssueVouchersPage() {
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/issues")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setIssues(data.data);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-indigo-600" /> Issue Vouchers (Outbound)
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage materials issued from warehouse</p>
        </div>
        <Link href="/inventory/issues/new">
          <button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2 h-9 px-4 text-sm font-medium transition-colors">
            <Send className="w-4 h-4" /> Create Issue Voucher
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
                <th className="px-6 py-3">IV #</th>
                <th className="px-6 py-3">Department</th>
                <th className="px-6 py-3">Warehouse</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {issues.map((i) => (
                <tr key={i._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">
                    <Link href={`/inventory/issues/${i._id}`} className="text-blue-600 hover:underline">{i.ivNumber || "Draft"}</Link>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{i.department || "N/A"}</td>
                  <td className="px-6 py-4 text-gray-600">{i.warehouse?.name || "N/A"}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${i.status === 'approved' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}>
                      {i.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500">{new Date(i.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {issues.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No Issue Vouchers found.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
