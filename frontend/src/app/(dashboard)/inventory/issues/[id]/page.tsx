"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Loader2, ClipboardList } from "lucide-react";
import { useRouter } from "next/navigation";

export default function IssueDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [issue, setIssue] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    fetch(`/api/issues/${params.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setIssue(data.data);
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  const approveIssue = async () => {
    if (!confirm("Approve this Issue Voucher? This will deduct stock immutably.")) return;
    setApproving(true);
    try {
      const res = await fetch(`/api/issues/${params.id}/approve`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        alert("Issue Voucher Approved");
        router.push("/inventory/issues");
      } else {
        alert(`Error: ${data.error?.message}`);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to approve");
    } finally {
      setApproving(false);
    }
  };

  if (loading) return <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>;
  if (!issue) return <div className="p-12 text-center text-red-500">Issue Voucher not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/inventory/issues" className="flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Issue Vouchers
        </Link>
        {issue.status === "draft" && (
          <button 
            onClick={approveIssue} 
            disabled={approving}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg flex items-center gap-2 h-9 px-4 text-sm font-medium"
          >
            {approving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Approve & Deduct Stock
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-4">
          <ClipboardList className="w-6 h-6 text-gray-400" />
          <div>
            <h2 className="text-xl font-bold text-gray-900">{issue.ivNumber || "Draft IV"}</h2>
            <p className="text-sm text-gray-500">Dept: {issue.department || "N/A"} • Warehouse: {issue.warehouse?.name}</p>
          </div>
        </div>
        
        <h3 className="font-semibold text-gray-900 mb-3">Issued Items</h3>
        <table className="w-full text-left border border-gray-100 rounded-lg overflow-hidden text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 font-medium text-gray-500">Item</th>
              <th className="px-4 py-2 font-medium text-gray-500 text-right">Requested</th>
              <th className="px-4 py-2 font-medium text-indigo-600 text-right">Issued</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {issue.items.map((i: any, idx: number) => (
              <tr key={idx}>
                <td className="px-4 py-3 text-gray-900 font-medium">{i.item?.name || "Unknown"} <span className="text-xs text-gray-400 block">{i.item?.sku}</span></td>
                <td className="px-4 py-3 text-right text-gray-600">{i.requestedQty}</td>
                <td className="px-4 py-3 text-right font-bold text-indigo-600">{i.issuedQty}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
