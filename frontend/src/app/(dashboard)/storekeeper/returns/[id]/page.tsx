"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RotateCcw, Loader2, ClipboardList, User as UserIcon, Calendar, CheckSquare } from "lucide-react";
import { toast } from "sonner";

interface ReturnItem {
  item: {
    sku: string;
    name: string;
    unit?: {
      symbol: string;
    } | string;
  };
  returnedQty: number;
  condition: "good" | "damaged" | "partial_damage";
  notes?: string;
}

interface ReturnVoucher {
  _id: string;
  returnNumber: string;
  issueVoucher: {
    _id: string;
    ivNumber: string;
    requester: {
      name: string;
      departmentName: string;
    };
  };
  receivedBy: {
    name: string;
  };
  createdAt: string;
  items: ReturnItem[];
  remarks?: string;
}

export default function ReturnDetailPage({ params }: { params: { id: string } }) {
  const [rtn, setRtn] = useState<ReturnVoucher | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/returns/${params.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setRtn(data.data);
        } else {
          toast.error("Failed to load return details");
        }
      })
      .catch((err) => {
        console.error(err);
        toast.error("Error loading return details");
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-gray-300" /></div>;
  if (!rtn) return <div className="p-12 text-center text-red-500">Return log not found</div>;

  const formattedDate = new Date(rtn.createdAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
        <Link href="/storekeeper/returns" className="flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Logs
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
              <CheckSquare className="w-5 h-5 text-gray-400" /> Returned Materials List
            </h2>
            
            <table className="w-full text-left border-collapse text-sm border border-gray-200 rounded-xl overflow-hidden">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-700 font-bold">
                  <th className="px-4 py-2">Material</th>
                  <th className="px-4 py-2 text-right">Returned Qty</th>
                  <th className="px-4 py-2">Condition</th>
                  <th className="px-4 py-2">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rtn.items.map((line, index) => {
                  const unitSymbol = typeof line.item?.unit === "object" ? line.item.unit.symbol : line.item?.unit || "pcs";
                  return (
                    <tr key={index} className="hover:bg-gray-50/20">
                      <td className="px-4 py-3">
                        <div className="font-bold text-gray-900">{line.item?.name}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{line.item?.sku}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-gray-900">
                        {line.returnedQty} {unitSymbol}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                          line.condition === "good" 
                            ? "bg-emerald-100 text-emerald-800" 
                            : line.condition === "partial_damage" 
                            ? "bg-amber-100 text-amber-800" 
                            : "bg-red-100 text-red-800"
                        }`}>
                          {line.condition.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 italic">
                        {line.notes || "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {rtn.remarks && (
              <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/30 text-sm mt-6">
                <span className="font-bold block text-gray-700 mb-1">General Notes:</span>
                <p className="text-gray-600 italic">"{rtn.remarks}"</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Metadata summaries */}
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-5">
            <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-amber-500" /> Return Summary
            </h2>

            <div className="space-y-4 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Return Number:</span>
                <strong className="text-gray-900">{rtn.returnNumber}</strong>
              </div>
              <div className="flex justify-between">
                <span>Return Date:</span>
                <span className="text-gray-900 font-semibold">{formattedDate}</span>
              </div>
              <div className="flex justify-between">
                <span>Received By:</span>
                <span className="text-gray-900 font-semibold">{rtn.receivedBy?.name}</span>
              </div>
              <div className="border-t border-gray-100 pt-4 flex justify-between items-center">
                <span>Original MIV Slip:</span>
                {rtn.issueVoucher ? (
                  <Link href={`/storekeeper/issue/${rtn.issueVoucher._id}`} className="text-blue-600 font-bold hover:underline">
                    {rtn.issueVoucher.ivNumber}
                  </Link>
                ) : "N/A"}
              </div>
              {rtn.issueVoucher?.requester && (
                <div className="bg-gray-50 rounded-xl p-3 text-xs space-y-1">
                  <div className="font-semibold text-gray-500 uppercase tracking-wider mb-1">Returned By (Worker)</div>
                  <div>Name: <strong>{rtn.issueVoucher.requester.name}</strong></div>
                  <div>Dept: <span>{rtn.issueVoucher.requester.departmentName}</span></div>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
