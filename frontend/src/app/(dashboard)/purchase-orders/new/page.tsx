"use client";

import React, { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import POForm from "@/components/purchase/POForm";

function NewPOFormWrapper() {
  const searchParams = useSearchParams();
  const prefillVendor = searchParams.get("vendor") || "";

  return <POForm initialVendorId={prefillVendor} />;
}

export default function NewPOPage() {
  const router = useRouter();

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-gray-200 pb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-3">
            <ShoppingCart className="w-6 h-6 text-blue-500" /> Create Purchase Order
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Issue a new order to a supplier
          </p>
        </div>
      </div>

      <Suspense fallback={<div>Loading form parameters...</div>}>
        <NewPOFormWrapper />
      </Suspense>
    </div>
  );
}
