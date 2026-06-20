"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Warehouse, MapPin, User, ArrowRight, LayoutGrid } from "lucide-react";
import { toast } from "sonner";

interface Address {
  line1?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

interface Manager {
  _id: string;
  name: string;
}

interface WarehouseData {
  _id: string;
  code: string;
  name: string;
  type: "main" | "sub" | "transit" | "production" | "dispatch";
  address?: Address;
  manager?: Manager | string;
  isActive: boolean;
}

interface WarehouseCardProps {
  warehouse: WarehouseData;
}

export default function WarehouseCard({ warehouse }: WarehouseCardProps) {
  const [stats, setStats] = useState({
    totalSKUs: 0,
    totalQuantity: 0,
    totalValue: 0,
    pendingTransfers: 0,
  });
  const [loading, setLoading] = useState(true);

  const managerName =
    typeof warehouse.manager === "object" && warehouse.manager !== null
      ? (warehouse.manager as Manager).name
      : "No Manager Assigned";

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`/api/warehouses/${warehouse._id}/stats`);
        const json = await res.json();
        if (json.success) {
          setStats(json.data);
        }
      } catch (err) {
        console.error("Error fetching stats:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [warehouse._id]);

  const typeColorMap = {
    main: "bg-blue-50 text-blue-600 border-blue-200",
    sub: "bg-purple-50 text-purple-600 border-purple-200",
    transit: "bg-amber-50 text-amber-600 border-amber-200",
    production: "bg-rose-50 text-rose-600 border-rose-200",
    dispatch: "bg-emerald-50 text-emerald-600 border-emerald-200",
  };

  return (
    <Card className="hover:shadow-lg transition-all duration-200 border-gray-200 overflow-hidden bg-white flex flex-col h-full group">
      
      <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
        <div className="space-y-1">
          <Badge variant="outline" className={`capitalize font-bold text-[10px] ${typeColorMap[warehouse.type] || "bg-gray-50 text-gray-600"}`}>
            {warehouse.type}
          </Badge>
          <CardTitle className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors mt-2">
            {warehouse.name}
          </CardTitle>
          <span className="font-mono text-xs text-gray-400 font-bold block">{warehouse.code}</span>
        </div>
        <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
          <Warehouse className="w-5 h-5" />
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col justify-between space-y-4 pt-0">
        {/* Info */}
        <div className="space-y-2 text-xs text-gray-500">
          {warehouse.address && (
            <div className="flex items-start gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
              <span className="line-clamp-2">
                {warehouse.address.line1 && `${warehouse.address.line1}, `}
                {warehouse.address.city && `${warehouse.address.city}, `}
                {warehouse.address.state && `${warehouse.address.state} `}
                {warehouse.address.pincode && `- ${warehouse.address.pincode}`}
              </span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span>Manager: <strong className="text-gray-700">{managerName}</strong></span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
          <div className="text-center">
            <p className="text-[10px] text-gray-400 font-semibold uppercase">SKUs</p>
            <p className="font-extrabold text-sm text-gray-800 mt-0.5">
              {loading ? "..." : stats.totalSKUs}
            </p>
          </div>
          <div className="text-center border-x border-gray-200">
            <p className="text-[10px] text-gray-400 font-semibold uppercase">Total Qty</p>
            <p className="font-extrabold text-sm text-gray-800 mt-0.5">
              {loading ? "..." : stats.totalQuantity}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-gray-400 font-semibold uppercase">Value</p>
            <p className="font-extrabold text-sm text-blue-600 mt-0.5">
              {loading ? "..." : `₹${stats.totalValue.toLocaleString("en-IN")}`}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2">
          <Link href={`/warehouses/${warehouse._id}`} className="flex-1">
            <Button className="w-full text-xs font-semibold h-9 rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-1">
              Dashboard
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
          <Link href={`/warehouses/${warehouse._id}/zones`}>
            <Button variant="outline" className="h-9 px-3 border-gray-200 text-gray-600 hover:text-gray-900 rounded-xl hover:bg-gray-50 flex items-center justify-center" title="Manage Zones & Bins">
              <LayoutGrid className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
