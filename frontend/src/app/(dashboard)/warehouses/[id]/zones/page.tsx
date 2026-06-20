"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import ZoneManager from "@/components/warehouse/ZoneManager";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, LayoutGrid, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface Warehouse {
  _id: string;
  code: string;
  name: string;
  zones: any[];
}

export default function WarehouseZonesPage() {
  const params = useParams();
  const router = useRouter();
  const warehouseId = params.id as string;
  const [warehouse, setWarehouse] = useState<Warehouse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchWarehouse = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/warehouses/${warehouseId}`);
      const json = await res.json();
      if (json.success) {
        setWarehouse(json.data);
      } else {
        toast.error("Failed to load warehouse zones details.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error loading warehouse details.");
    } finally {
      setLoading(false);
    }
  }, [warehouseId]);

  useEffect(() => {
    fetchWarehouse();
  }, [fetchWarehouse]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-3">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <span className="text-xs text-gray-500 font-semibold animate-pulse">Loading layout settings...</span>
      </div>
    );
  }

  if (!warehouse) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400 text-sm font-semibold">Warehouse Not Found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div className="space-y-1">
          <Link href={`/warehouses/${warehouseId}`} className="flex items-center gap-1 text-[11px] font-bold text-gray-400 hover:text-blue-500 uppercase tracking-wider mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <LayoutGrid className="w-4.5 h-4.5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900">Layout Grid Configuration</h1>
          </div>
          <p className="text-xs text-gray-500 font-medium">
            Define storage zones and bin slot counts for warehouse <strong>{warehouse.name} ({warehouse.code})</strong>
          </p>
        </div>
      </div>

      {/* Main Grid Content */}
      <ZoneManager
        warehouseId={warehouseId}
        initialZones={warehouse.zones || []}
        onRefresh={fetchWarehouse}
      />
    </div>
  );
}
