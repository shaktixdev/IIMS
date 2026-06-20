"use client";

import React, { useState } from "react";
import VendorForm from "@/components/purchase/VendorForm";
import { Building2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function NewVendorPage() {
  const router = useRouter();

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-gray-200 pb-6">
        <Button variant="ghost" size="sm" onClick={() => router.push("/vendors")}
          className="text-gray-500 hover:text-gray-900 rounded-xl h-9 px-3 flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-3">
            <Building2 className="w-6 h-6 text-violet-500" />
            Add New Vendor
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">Register a new supplier, manufacturer, or service provider</p>
        </div>
      </div>

      <VendorForm />
    </div>
  );
}
