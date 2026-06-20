"use client";

import React, { useState, useEffect } from "react";
import WarehouseCard from "@/components/warehouse/WarehouseCard";
import WarehouseForm from "@/components/warehouse/WarehouseForm";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Warehouse as WhIcon, Loader2, Building, SlidersHorizontal } from "lucide-react";
import { useSession } from "next-auth/react";

interface Address {
  line1?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

interface Warehouse {
  _id: string;
  code: string;
  name: string;
  type: "main" | "sub" | "transit" | "production" | "dispatch";
  address?: Address;
  manager?: any;
  isActive: boolean;
}

export default function WarehousesPage() {
  const { data: session } = useSession();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchWarehouses = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/warehouses");
      const json = await res.json();
      if (json.success) {
        setWarehouses(json.data || []);
      }
    } catch (err) {
      console.error("Error fetching warehouses:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const isAdmin = ["super_admin", "admin"].includes(session?.user?.role || "");

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Building className="w-4.5 h-4.5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900">Warehouses Directory</h1>
          </div>
          <p className="text-xs text-gray-500 font-medium">Manage storage yards, stock valuation, and zones layouts</p>
        </div>

        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger render={<Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-10 px-4 text-xs font-semibold flex items-center gap-1.5 shadow-sm" />}>
              <Plus className="w-4 h-4" /> Add Warehouse
            </DialogTrigger>
            <DialogContent className="bg-white text-gray-950 max-w-lg rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-base font-bold">Register Warehouse Node</DialogTitle>
              </DialogHeader>
              <WarehouseForm
                onSuccess={() => {
                  setDialogOpen(false);
                  fetchWarehouses();
                }}
                onCancel={() => setDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Main Grid View */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <span className="text-xs text-gray-500 font-semibold animate-pulse">Loading warehouses directory...</span>
        </div>
      ) : warehouses.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-16 text-center max-w-md mx-auto space-y-4">
          <WhIcon className="w-16 h-16 text-gray-300 mx-auto stroke-1 animate-bounce" />
          <div className="space-y-1.5">
            <h3 className="font-bold text-gray-900 text-base">No Warehouses Registered</h3>
            <p className="text-xs text-gray-400">Get started by onboarding your primary storage yard or main warehouse node.</p>
          </div>
          {isAdmin && (
            <Button onClick={() => setDialogOpen(true)} className="bg-blue-600 text-white rounded-xl text-xs h-9 font-semibold">
              Add First Warehouse
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {warehouses.map((wh) => (
            <WarehouseCard key={wh._id} warehouse={wh} />
          ))}
        </div>
      )}
    </div>
  );
}
