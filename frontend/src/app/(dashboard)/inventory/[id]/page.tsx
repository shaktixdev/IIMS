"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  ChevronLeft, 
  Loader2, 
  Package, 
  Barcode, 
  Scale, 
  Tags, 
  Info,
  Calendar,
  History,
  Save,
  CheckCircle,
  FileSpreadsheet,
  AlertTriangle
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import StockByWarehouse from "@/components/inventory/StockByWarehouse";
import StockHistoryTable from "@/components/inventory/StockHistoryTable";

interface CategoryAttribute {
  name: string;
  type: "text" | "number" | "boolean" | "date" | "select";
  options?: string[];
  required: boolean;
  unit?: string;
}

interface Category {
  _id: string;
  name: string;
  attributes?: CategoryAttribute[];
}

interface Unit {
  _id: string;
  name: string;
  symbol: string;
}

interface Item {
  _id: string;
  sku: string;
  name: string;
  description?: string;
  category: Category | null;
  unit: Unit | null;
  costPrice: number;
  minStockLevel: number;
  maxStockLevel: number;
  reorderQty: number;
  leadTimeDays: number;
  weight: number;
  weightUnit?: string;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    unit?: string;
  };
  barcode?: string;
  hsnCode?: string;
  partNumber?: string;
  brand?: string;
  model?: string;
  isBatchTracked: boolean;
  isSerialTracked: boolean;
  hasExpiry: boolean;
  expiryAlertDays: number;
  attributes: Record<string, any>;
}

export default function ItemDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { id } = params;

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [item, setItem] = useState<Item | null>(null);

  // Editable Form fields
  const [formData, setFormData] = useState<Partial<Item>>({});

  useEffect(() => {
    const fetchItem = async () => {
      try {
        const res = await fetch(`/api/items/${id}`);
        const json = await res.json();
        if (json.success && json.data) {
          setItem(json.data);
          setFormData(json.data);
        } else {
          toast.error(json.error?.message || "Item details not found");
          router.push("/inventory");
        }
      } catch (err) {
        console.error("Fetch item error:", err);
        toast.error("Error connecting to server to fetch item detail");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchItem();
    }
  }, [id, router]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: parseFloat(value) || 0 }));
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    try {
      const res = await fetch(`/api/items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Item profile updated successfully");
        setItem(json.data);
      } else {
        toast.error(json.error?.message || "Failed to update item");
      }
    } catch (err) {
      console.error("Update item error:", err);
      toast.error("Error updating item profile");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] gap-3">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
        <p className="text-gray-500 text-sm font-medium animate-pulse">Loading item specifications...</p>
      </div>
    );
  }

  if (!item) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header breadcrumbs and buttons */}
      <div className="flex flex-col border-b border-gray-200 pb-6">
        <div className="mb-2">
          <Link href="/inventory">
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-500 hover:text-gray-900 px-0 hover:bg-transparent text-xs gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to Catalog list
            </Button>
          </Link>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-blue-400 font-bold bg-blue-600/10 px-2.5 py-0.5 rounded-md border border-blue-500/15">
                {item.sku}
              </span>
              <Badge variant="outline" className="bg-emerald-600/10 text-emerald-400 border-emerald-500/20 text-[10px] font-bold">
                CATALOG ACTIVE
              </Badge>
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900 mt-2 tracking-tight">
              {item.name}
            </h1>
            <p className="text-gray-500 text-xs mt-1">
              Part of {item.category?.name || "Uncategorized"} • Measured in {item.unit?.name} ({item.unit?.symbol})
            </p>
          </div>
        </div>
      </div>

      {/* Main detail columns grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Specification Column (Tabs Panel) */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="bg-white border border-gray-200 p-1 rounded-xl w-full justify-start gap-2 h-11">
              <TabsTrigger 
                value="overview" 
                className="rounded-lg text-xs font-bold text-gray-500 data-[state=active]:bg-blue-600 data-[state=active]:text-white h-9 px-4 transition-all"
              >
                Specifications & Fields
              </TabsTrigger>
              <TabsTrigger 
                value="history" 
                className="rounded-lg text-xs font-bold text-gray-500 data-[state=active]:bg-blue-600 data-[state=active]:text-white h-9 px-4 transition-all"
              >
                Stock Movements History
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab Content */}
            <TabsContent value="overview" className="mt-4 animate-in fade-in duration-300">
              <form onSubmit={handleUpdate}>
                <Card className="bg-white border-gray-200 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md">
                  <CardHeader className="pb-3 border-b border-gray-100">
                    <CardTitle className="text-gray-900 text-md font-bold flex items-center gap-2">
                      <FileSpreadsheet className="w-5 h-5 text-blue-400" />
                      Detailed Specifications Profile
                    </CardTitle>
                    <CardDescription className="text-gray-500 text-xs">
                      Update metadata, catalog details and threshold configuration parameters
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-6">
                    {/* Basic specs form fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="name" className="text-gray-700 text-xs font-semibold">Product Name</Label>
                        <Input
                          id="name"
                          value={formData.name || ""}
                          onChange={handleTextChange}
                          className="bg-gray-50 border-gray-200 text-gray-900 rounded-lg focus:border-blue-500"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="barcode" className="text-gray-700 text-xs font-semibold">Barcode / UPC</Label>
                        <Input
                          id="barcode"
                          value={formData.barcode || ""}
                          onChange={handleTextChange}
                          className="bg-gray-50 border-gray-200 text-gray-900 rounded-lg focus:border-blue-500 font-mono"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="description" className="text-gray-700 text-xs font-semibold">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description || ""}
                        onChange={handleTextChange}
                        className="bg-gray-50 border-gray-200 text-gray-900 rounded-lg focus:border-blue-500 h-20"
                      />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="brand" className="text-gray-700 text-xs font-semibold">Brand</Label>
                        <Input
                          id="brand"
                          value={formData.brand || ""}
                          onChange={handleTextChange}
                          className="bg-gray-50 border-gray-200 text-gray-900 rounded-lg"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="model" className="text-gray-700 text-xs font-semibold">Model / Type</Label>
                        <Input
                          id="model"
                          value={formData.model || ""}
                          onChange={handleTextChange}
                          className="bg-gray-50 border-gray-200 text-gray-900 rounded-lg"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="partNumber" className="text-gray-700 text-xs font-semibold">Part Number</Label>
                        <Input
                          id="partNumber"
                          value={formData.partNumber || ""}
                          onChange={handleTextChange}
                          className="bg-gray-50 border-gray-200 text-gray-900 rounded-lg font-mono"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="hsnCode" className="text-gray-700 text-xs font-semibold">HSN Code</Label>
                        <Input
                          id="hsnCode"
                          value={formData.hsnCode || ""}
                          onChange={handleTextChange}
                          className="bg-gray-50 border-gray-200 text-gray-900 rounded-lg font-mono"
                        />
                      </div>
                    </div>

                    {/* Stock limits & pricing */}
                    <div className="border-t border-gray-200/60 pt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="costPrice" className="text-gray-700 text-xs font-semibold">Cost Price (₹)</Label>
                        <Input
                          id="costPrice"
                          type="number"
                          value={formData.costPrice ?? 0}
                          onChange={handleNumberChange}
                          className="bg-gray-50 border-gray-200 text-gray-900 rounded-lg font-mono"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="minStockLevel" className="text-gray-700 text-xs font-semibold">Min Stock Level</Label>
                        <Input
                          id="minStockLevel"
                          type="number"
                          value={formData.minStockLevel ?? 0}
                          onChange={handleNumberChange}
                          className="bg-gray-50 border-gray-200 text-gray-900 rounded-lg"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="maxStockLevel" className="text-gray-700 text-xs font-semibold">Max Stock Level</Label>
                        <Input
                          id="maxStockLevel"
                          type="number"
                          value={formData.maxStockLevel ?? 0}
                          onChange={handleNumberChange}
                          className="bg-gray-50 border-gray-200 text-gray-900 rounded-lg"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="reorderQty" className="text-gray-700 text-xs font-semibold">Reorder Qty</Label>
                        <Input
                          id="reorderQty"
                          type="number"
                          value={formData.reorderQty ?? 0}
                          onChange={handleNumberChange}
                          className="bg-gray-50 border-gray-200 text-gray-900 rounded-lg"
                        />
                      </div>
                    </div>

                    {/* Category Attributes Specifications */}
                    {item.category?.attributes && item.category.attributes.length > 0 && (
                      <div className="border-t border-gray-200/60 pt-4 space-y-4">
                        <h4 className="text-gray-900 font-bold text-xs flex items-center gap-1.5 uppercase tracking-wider text-gray-500">
                          <Tags className="w-3.5 h-3.5" />
                          Category Custom Attributes Specifications
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50/50 border border-gray-200 rounded-xl p-4">
                          {item.category.attributes.map((attr) => {
                            const val = formData.attributes?.[attr.name] ?? "";
                            return (
                              <div key={attr.name} className="flex justify-between items-center text-xs py-1 border-b border-gray-100 last:border-0">
                                <span className="text-gray-400 font-semibold">{attr.name}</span>
                                <span className="text-slate-200 font-bold">
                                  {typeof val === "boolean" ? (val ? "Yes / True" : "No / False") : val} {attr.unit && ` ${attr.unit}`}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="bg-gray-50/30 border-t border-gray-100 px-6 py-4 flex justify-end">
                    <Button
                      type="submit"
                      disabled={updating}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs flex items-center gap-1.5 py-1.5 active:scale-[0.98] transition-transform"
                    >
                      {updating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Updating profile...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Save Specifications Changes
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              </form>
            </TabsContent>

            {/* Stock History Tab Content */}
            <TabsContent value="history" className="mt-4 animate-in fade-in duration-300">
              <StockHistoryTable itemId={item._id} />
            </TabsContent>

          </Tabs>
        </div>

        {/* Right Stock breakdown Column */}
        <div className="space-y-6">
          <StockByWarehouse itemId={item._id} />
        </div>

      </div>
    </div>
  );
}
