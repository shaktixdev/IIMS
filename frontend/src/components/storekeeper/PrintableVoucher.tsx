import React from "react";

interface VoucherItem {
  item: {
    sku: string;
    name: string;
    unit?: {
      symbol: string;
    } | string;
    isBatchTracked?: boolean;
    isSerialTracked?: boolean;
    hasExpiry?: boolean;
  };
  requestedQty: number;
  issuedQty: number;
  batches?: {
    batchId?: {
      batchNumber: string;
      expiryDate?: string;
    } | null;
    quantity: number;
  }[];
  serialNumbers?: {
    _id: string;
    serialNumber: string;
    status: string;
  }[];
}

interface PrintableVoucherProps {
  voucher: {
    ivNumber: string;
    issueDate: string;
    warehouse: {
      name: string;
      code: string;
    };
    requester: {
      name: string;
      employeeId?: string;
      departmentName?: string;
    };
    approver: {
      name: string;
      designation: string;
      slipReference?: string;
    };
    items: VoucherItem[];
    notes?: string;
    createdBy?: {
      name: string;
    };
  };
  org?: {
    name: string;
    gstin?: string;
    phone?: string;
    address?: {
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      pincode?: string;
    };
  };
}

export default function PrintableVoucher({ voucher, org }: PrintableVoucherProps) {
  const formattedDate = new Date(voucher.issueDate).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  return (
    <div className="printable-voucher bg-white text-black p-8 border border-gray-300 mx-auto max-w-[800px] shadow-sm font-sans">
      
      {/* CSS Styles for Print override */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .printable-voucher, .printable-voucher * {
            visibility: visible;
          }
          .printable-voucher {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border: none !important;
            padding: 0 !important;
            box-shadow: none !important;
            margin: 0 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Corporate Letterhead Header */}
      <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-6">
        <div>
          <h2 className="text-xl font-bold uppercase tracking-tight">{org?.name || "Industrial Solutions Inc."}</h2>
          <p className="text-xs text-gray-600 mt-1">
            {org?.address?.line1 || "100 Industrial Parkway"}, {org?.address?.line2 || "Sector 4"}<br />
            {org?.address?.city || "Jamshedpur"}, {org?.address?.state || "Jharkhand"} - {org?.address?.pincode || "831001"}<br />
            {org?.phone && `Phone: ${org.phone}`}
          </p>
        </div>
        <div className="text-right">
          <h1 className="text-lg font-black tracking-widest text-gray-800 border-2 border-black px-3 py-1 bg-gray-50">
            MATERIAL ISSUE VOUCHER
          </h1>
          {org?.gstin && <p className="text-[10px] text-gray-500 mt-1">GSTIN: {org.gstin}</p>}
        </div>
      </div>

      {/* Metadata layout */}
      <div className="grid grid-cols-2 gap-4 text-xs mb-6">
        <div className="border border-gray-300 rounded-lg p-3 space-y-1">
          <div>Voucher Number: <strong>{voucher.ivNumber}</strong></div>
          <div>Issue Date: <span>{formattedDate}</span></div>
          <div>Warehouse: <strong>{voucher.warehouse?.name} ({voucher.warehouse?.code})</strong></div>
          {voucher.createdBy?.name && <div>Issued By: <span>{voucher.createdBy.name}</span></div>}
        </div>
        <div className="border border-gray-300 rounded-lg p-3 space-y-1">
          <div className="font-bold border-b border-gray-200 pb-1 mb-1 text-gray-700">Issued To (Requester)</div>
          <div>Name: <strong>{voucher.requester?.name}</strong></div>
          {voucher.requester?.employeeId && <div>Employee ID: <span>{voucher.requester.employeeId}</span></div>}
          <div>Department: <span>{voucher.requester?.departmentName}</span></div>
        </div>
      </div>

      {/* Approver Details */}
      <div className="border border-gray-300 rounded-lg p-3 text-xs mb-6 bg-gray-50/50">
        <div className="font-bold border-b border-gray-200 pb-1 mb-1 text-gray-700">Offline Slip Verification</div>
        <div className="grid grid-cols-3 gap-2">
          <div>Authorized By: <strong>{voucher.approver?.name}</strong></div>
          <div>Designation: <span>{voucher.approver?.designation}</span></div>
          {voucher.approver?.slipReference && <div>Slip Ref: <strong>{voucher.approver.slipReference}</strong></div>}
        </div>
      </div>

      {/* Line items Table */}
      <table className="w-full text-left border-collapse text-xs mb-8 border border-gray-300">
        <thead>
          <tr className="bg-gray-100 border-b border-gray-300 text-gray-700 font-bold uppercase tracking-wider">
            <th className="px-4 py-2 border-r border-gray-300">S.No</th>
            <th className="px-4 py-2 border-r border-gray-300">SKU</th>
            <th className="px-4 py-2 border-r border-gray-300">Item Name</th>
            <th className="px-4 py-2 border-r border-gray-300 text-right">Requested Qty</th>
            <th className="px-4 py-2 text-right">Issued Qty</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-300">
          {voucher.items.map((line, index) => {
            const unitSymbol = typeof line.item?.unit === "object" ? line.item.unit.symbol : line.item?.unit || "pcs";
            return (
              <tr key={index} className="odd:bg-white even:bg-gray-50/30">
                <td className="px-4 py-2.5 border-r border-gray-300 text-center font-medium">{index + 1}</td>
                <td className="px-4 py-2.5 border-r border-gray-300 font-mono">{line.item?.sku}</td>
                <td className="px-4 py-2.5 border-r border-gray-300">
                  <div className="font-semibold text-gray-900">{line.item?.name}</div>
                  
                  {/* Batch details */}
                  {line.item?.isBatchTracked && line.batches && line.batches.length > 0 && (
                    <div className="mt-1 text-[10px] text-gray-600 bg-gray-50 p-1.5 rounded border border-gray-250">
                      <span className="font-bold uppercase tracking-wider block text-[8px] text-gray-500 mb-0.5">Issued Batches</span>
                      <div className="space-y-0.5">
                        {line.batches.map((b: any, idx: number) => (
                          <div key={idx} className="flex justify-between">
                            <span>Batch: <strong className="font-mono text-gray-900">{b.batchId?.batchNumber || "N/A"}</strong>
                            {b.batchId?.expiryDate && ` (Exp: ${new Date(b.batchId.expiryDate).toLocaleDateString("en-IN")})`}</span>
                            <span>Qty: <strong className="text-gray-900">{b.quantity}</strong></span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Serial numbers */}
                  {line.item?.isSerialTracked && line.serialNumbers && line.serialNumbers.length > 0 && (
                    <div className="mt-1 text-[10px] text-gray-600 bg-gray-50 p-1.5 rounded border border-gray-250">
                      <span className="font-bold uppercase tracking-wider block text-[8px] text-gray-500 mb-0.5">Issued Serials ({line.serialNumbers.length})</span>
                      <div className="flex flex-wrap gap-1 font-mono text-[9px] mt-0.5">
                        {line.serialNumbers.map((s: any, idx: number) => (
                          <span key={idx} className="bg-white px-1.5 py-0.5 border border-gray-250 rounded text-gray-800">
                            {s.serialNumber}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </td>
                <td className="px-4 py-2.5 border-r border-gray-300 text-right text-gray-600">
                  {line.requestedQty} {unitSymbol}
                </td>
                <td className="px-4 py-2.5 text-right font-bold">
                  {line.issuedQty} {unitSymbol}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Remarks Section */}
      {voucher.notes && (
        <div className="border border-gray-300 rounded-lg p-3 text-xs mb-8">
          <span className="font-bold block text-gray-700 mb-1">Remarks:</span>
          <p className="text-gray-600 italic">"{voucher.notes}"</p>
        </div>
      )}

      {/* Signatures placeholders */}
      <div className="grid grid-cols-2 gap-12 text-center text-xs mt-12 pt-8">
        <div>
          <div className="w-48 border-b border-black mx-auto mb-2" />
          <p className="font-bold">Storekeeper Signature</p>
          <p className="text-[10px] text-gray-400">Issued by: {voucher.createdBy?.name || "Ramesh Kumar"}</p>
        </div>
        <div>
          <div className="w-48 border-b border-black mx-auto mb-2" />
          <p className="font-bold">Receiver Signature</p>
          <p className="text-[10px] text-gray-400">Name: {voucher.requester?.name}</p>
        </div>
      </div>

    </div>
  );
}
