"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Loader2, PackageCheck } from "lucide-react";
import { useRouter } from "next/navigation";

export default function GRNDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [grn, setGrn] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    fetch(`/api/grn/${params.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setGrn(data.data);
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  const confirmGRN = async () => {
    if (!confirm("Are you sure you want to confirm this GRN? This will update stock levels immutably.")) return;
    setConfirming(true);
    try {
      const res = await fetch(`/api/grn/${params.id}/confirm`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        alert("GRN Confirmed Successfully");
        router.push("/inventory/grn");
      } else {
        alert(`Error: ${data.error?.message}`);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to confirm GRN");
    } finally {
      setConfirming(false);
    }
  };

  if (loading) return <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>;
  if (!grn) return <div className="p-12 text-center text-red-500">GRN not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/inventory/grn" className="flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to GRNs
        </Link>
        {grn.status === "draft" && (
          <button 
            onClick={confirmGRN} 
            disabled={confirming}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg flex items-center gap-2 h-9 px-4 text-sm font-medium"
          >
            {confirming ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Confirm & Update Stock
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-4">
          <PackageCheck className="w-6 h-6 text-gray-400" />
          <div>
            <h2 className="text-xl font-bold text-gray-900">{grn.grnNumber || "Draft GRN"}</h2>
            <p className="text-sm text-gray-500">PO: {grn.po?.poNumber} • Vendor: {grn.vendor?.name}</p>
          </div>
        </div>
        
        <h3 className="font-semibold text-gray-900 mb-3">Line Items</h3>
        <table className="w-full text-left border border-gray-100 rounded-lg overflow-hidden text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 font-medium text-gray-500">Item</th>
              <th className="px-4 py-2 font-medium text-gray-500 text-right">Expected</th>
              <th className="px-4 py-2 font-medium text-gray-500 text-right">Received</th>
              <th className="px-4 py-2 font-medium text-emerald-600 text-right">Accepted</th>
              <th className="px-4 py-2 font-medium text-red-600 text-right">Rejected</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {grn.items.map((i: any, idx: number) => (
              <tr key={idx}>
                <td className="px-4 py-3 text-gray-900 font-medium">
                  {i.item?.name || "Unknown"} 
                  <span className="text-xs text-gray-400 block">{i.item?.sku}</span>
                  {(i.batchNumber || (i.serialNumbers && i.serialNumbers.length > 0) || i.zone || i.bin) && (
                    <div className="mt-1 text-xs text-gray-500 space-y-0.5 bg-gray-50 p-2 rounded-md border border-gray-100 max-w-md">
                      {i.batchNumber && (
                        <div>
                          <strong>Batch:</strong> {i.batchNumber} 
                          {i.expiryDate && ` • Expiry: ${new Date(i.expiryDate).toLocaleDateString("en-IN")}`}
                        </div>
                      )}
                      {i.serialNumbers && i.serialNumbers.length > 0 && (
                        <div className="break-all">
                          <strong>Serials:</strong> {i.serialNumbers.join(", ")}
                        </div>
                      )}
                      {(i.zone || i.bin) && (
                        <div>
                          <strong>Location:</strong> {i.zone ? `Zone ${i.zone}` : ""} {i.bin ? `, Bin ${i.bin}` : ""}
                        </div>
                      )}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-gray-600">{i.expectedQty}</td>
                <td className="px-4 py-3 text-right font-medium">{i.receivedQty}</td>
                <td className="px-4 py-3 text-right font-bold text-emerald-600">{i.acceptedQty}</td>
                <td className="px-4 py-3 text-right text-red-500">{i.rejectedQty > 0 ? i.rejectedQty : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
