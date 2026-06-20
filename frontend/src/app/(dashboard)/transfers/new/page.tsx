"use client";

import React from "react";
import { useRouter } from "next/navigation";
import TransferForm from "@/components/warehouse/TransferForm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, ArrowRightLeft } from "lucide-react";
import Link from "next/link";

export default function NewTransferPage() {
  const router = useRouter();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header bar */}
      <div className="space-y-1">
        <Link href="/transfers" className="flex items-center gap-1 text-[11px] font-bold text-gray-400 hover:text-blue-500 uppercase tracking-wider mb-2">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Transfers
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <ArrowRightLeft className="w-4.5 h-4.5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900">Initiate Inventory Transfer</h1>
        </div>
        <p className="text-xs text-gray-500 font-medium">Create a stock dispatch plan to transfer items from a source yard to a destination warehouse.</p>
      </div>

      <Card className="border-gray-200 shadow-md bg-white">
        <CardContent className="p-6">
          <TransferForm
            onSuccess={() => router.push("/transfers")}
            onCancel={() => router.push("/transfers")}
          />
        </CardContent>
      </Card>
    </div>
  );
}
