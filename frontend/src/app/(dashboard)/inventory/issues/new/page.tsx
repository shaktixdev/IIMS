"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Construction } from "lucide-react";

export default function NewIssuePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/inventory/issues" className="flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Issue Vouchers
        </Link>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-12 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-4">
          <Construction className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">New Issue Voucher Form</h2>
        <p className="text-gray-500 mt-2 max-w-md">
          This form allows selecting warehouse items to dispatch.
          The full form component is currently under construction.
        </p>
      </div>
    </div>
  );
}
