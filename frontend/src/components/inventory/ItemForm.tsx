"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { 
  Loader2, 
  ChevronRight, 
  ChevronLeft, 
  Save, 
  Info, 
  Sliders, 
  Scale, 
  Package, 
  FileText, 
  ListOrdered
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { CreateItemSchema } from "@/lib/validations/item.schema";

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
  parent?: string | null;
}

interface Unit {
  _id: string;
  name: string;
  symbol: string;
  type: string;
}

export default function ItemForm() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loadingFilters, setLoadingFilters] = useState(true);
  const [saving, setSaving] = useState(false);

  // Lists loaded from backend
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);

  // Current category dynamic attributes
  const [categoryAttributes, setCategoryAttributes] = useState<CategoryAttribute[]>([]);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    subcategory: "",
    unit: "",
    purchaseUnit: "",
    conversionFactor: 1,
    costPrice: 0,
    minStockLevel: 0,
    maxStockLevel: 0,
    reorderQty: 0,
    leadTimeDays: 0,
    weight: 0,
    weightUnit: "",
    dimensions: {
      length: 0,
      width: 0,
      height: 0,
      unit: "cm",
    },
    barcode: "",
    hsnCode: "",
    partNumber: "",
    brand: "",
    model: "",
    isBatchTracked: false,
    isSerialTracked: false,
    hasExpiry: false,
    expiryAlertDays: 30,
    attributes: {} as Record<string, any>,
    preferredVendors: [] as string[],
  });

  // Load categories and units on mount
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const [catRes, unitRes] = await Promise.all([
          fetch("/api/categories"),
          fetch("/api/units")
        ]);
        const catJson = await catRes.json();
        const unitJson = await unitRes.json();

        if (catJson.success) setCategories(catJson.data);
        if (unitJson.success) setUnits(unitJson.data);
      } catch (err) {
        console.error("Error loading filters:", err);
        toast.error("Failed to load category/unit lists");
      } finally {
        setLoadingFilters(false);
      }
    };
    loadFilters();
  }, []);

  // Update dynamic attributes form when category changes
  const handleCategoryChange = (catId: string | null) => {
    if (!catId) {
      setFormData(prev => ({
        ...prev,
        category: "",
        subcategory: "",
        attributes: {}
      }));
      setCategoryAttributes([]);
      return;
    }
    const selectedCat = categories.find(c => c._id === catId);
    setFormData(prev => ({
      ...prev,
      category: catId,
      subcategory: "", // reset subcategory
      attributes: {} // reset dynamic attributes
    }));

    if (selectedCat && selectedCat.attributes) {
      setCategoryAttributes(selectedCat.attributes);
      // Initialize attributes with default values
      const initialAttrs: Record<string, any> = {};
      selectedCat.attributes.forEach(attr => {
        if (attr.type === "boolean") {
          initialAttrs[attr.name] = false;
        } else {
          initialAttrs[attr.name] = "";
        }
      });
      setFormData(prev => ({ ...prev, attributes: initialAttrs }));
    } else {
      setCategoryAttributes([]);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: parseFloat(value) || 0 }));
  };

  const handleAttributeChange = (name: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      attributes: {
        ...prev.attributes,
        [name]: value
      }
    }));
  };

  const handleSave = async () => {
    // Perform Zod validation
    const validationResult = CreateItemSchema.safeParse(formData);
    if (!validationResult.success) {
      // Find the first validation error message
      const errorMsg = validationResult.error.issues[0]?.message || "Validation failed";
      toast.error(errorMsg);
      
      // Attempt to guide step location
      const errorPath = validationResult.error.issues[0]?.path[0];
      if (["name", "description", "barcode", "brand", "model", "hsnCode"].includes(String(errorPath))) {
        setStep(1);
      } else if (["category", "unit", "attributes"].includes(String(errorPath))) {
        setStep(2);
      } else {
        setStep(3);
      }
      return;
    }

    // Check dynamic attributes required fields manually
    for (const attr of categoryAttributes) {
      if (attr.required && (formData.attributes[attr.name] === undefined || formData.attributes[attr.name] === null || formData.attributes[attr.name] === "")) {
        toast.error(`Custom attribute '${attr.name}' is required for this category`);
        setStep(2);
        return;
      }
    }

    setSaving(true);
    try {
      const res = await fetch("/api/items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Item '${formData.name}' created with SKU ${json.data.sku}`);
        router.push("/inventory");
        router.refresh();
      } else {
        toast.error(json.error?.message || "Failed to save item.");
      }
    } catch (err) {
      console.error("Save item error:", err);
      toast.error("An error occurred while saving the item.");
    } finally {
      setSaving(false);
    }
  };

  if (loadingFilters) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
        <p className="text-gray-500 text-sm font-medium animate-pulse">Loading item form metadata...</p>
      </div>
    );
  }

  // Filter subcategories of the selected parent category
  const subcategoriesList = categories.filter(c => c.parent === formData.category);

  return (
    <Card className="max-w-4xl mx-auto bg-white border-gray-200 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md">
      
      {/* Wizard Step Indicator Headers */}
      <div className="grid grid-cols-3 border-b border-gray-200">
        <div 
          onClick={() => step > 1 && setStep(1)}
          className={`p-4 text-center cursor-pointer transition-colors border-r border-gray-200 flex items-center justify-center gap-2 ${
            step === 1 
              ? "bg-blue-600/10 text-blue-400 font-extrabold" 
              : "text-gray-400 hover:text-gray-700"
          }`}
        >
          <FileText className="w-4 h-4 shrink-0" />
          <span className="text-xs sm:text-sm">1. Basic Info</span>
        </div>
        
        <div 
          onClick={() => {
            if (formData.name && step > 2) setStep(2);
            else if (!formData.name) toast.error("Complete Step 1 first");
          }}
          className={`p-4 text-center cursor-pointer transition-colors border-r border-gray-200 flex items-center justify-center gap-2 ${
            step === 2 
              ? "bg-blue-600/10 text-blue-400 font-extrabold" 
              : "text-gray-400 hover:text-gray-700"
          }`}
        >
          <Sliders className="w-4 h-4 shrink-0" />
          <span className="text-xs sm:text-sm">2. Category & Custom fields</span>
        </div>
        
        <div 
          onClick={() => {
            if (formData.name && formData.category && formData.unit) setStep(3);
            else toast.error("Complete Step 1 & 2 first");
          }}
          className={`p-4 text-center cursor-pointer transition-colors flex items-center justify-center gap-2 ${
            step === 3 
              ? "bg-blue-600/10 text-blue-400 font-extrabold" 
              : "text-gray-400 hover:text-gray-700"
          }`}
        >
          <Package className="w-4 h-4 shrink-0" />
          <span className="text-xs sm:text-sm">3. Stock & Tracking</span>
        </div>
      </div>

      <CardContent className="p-6">
        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-gray-700 text-xs font-semibold">
                  Product / Item Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={handleTextChange}
                  placeholder="e.g. Stainless Steel Plate 5mm"
                  className="bg-gray-50 border-gray-200 text-gray-900 rounded-lg focus:border-blue-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="barcode" className="text-gray-700 text-xs font-semibold">
                  Barcode / EAN (Optional)
                </Label>
                <Input
                  id="barcode"
                  value={formData.barcode}
                  onChange={handleTextChange}
                  placeholder="e.g. 8901234567890"
                  className="bg-gray-50 border-gray-200 text-gray-900 rounded-lg focus:border-blue-500 font-mono"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-gray-700 text-xs font-semibold">
                Item Description
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={handleTextChange}
                placeholder="Detailed specifications, storage locations, or special handling rules..."
                className="bg-gray-50 border-gray-200 text-gray-900 rounded-lg focus:border-blue-500 h-24"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="brand" className="text-gray-700 text-xs font-semibold">Brand / Manufacturer</Label>
                <Input
                  id="brand"
                  value={formData.brand}
                  onChange={handleTextChange}
                  placeholder="e.g. Tata Steel"
                  className="bg-gray-50 border-gray-200 text-gray-900 rounded-lg focus:border-blue-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="model" className="text-gray-700 text-xs font-semibold">Model / Type No.</Label>
                <Input
                  id="model"
                  value={formData.model}
                  onChange={handleTextChange}
                  placeholder="e.g. Grade-304"
                  className="bg-gray-50 border-gray-200 text-gray-900 rounded-lg focus:border-blue-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="partNumber" className="text-gray-700 text-xs font-semibold">Part Number (MPN)</Label>
                <Input
                  id="partNumber"
                  value={formData.partNumber}
                  onChange={handleTextChange}
                  placeholder="e.g. Tata-304-5"
                  className="bg-gray-50 border-gray-200 text-gray-900 rounded-lg focus:border-blue-500 font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="hsnCode" className="text-gray-700 text-xs font-semibold">HSN / SAC Code (GST)</Label>
                <Input
                  id="hsnCode"
                  value={formData.hsnCode}
                  onChange={handleTextChange}
                  placeholder="e.g. 72199000"
                  className="bg-gray-50 border-gray-200 text-gray-900 rounded-lg focus:border-blue-500 font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Category & Unit */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Category Dropdown */}
              <div className="space-y-2">
                <Label className="text-gray-700 text-xs font-semibold">
                  Primary Category <span className="text-red-500">*</span>
                </Label>
                <Select value={formData.category} onValueChange={handleCategoryChange}>
                  <SelectTrigger className="w-full bg-gray-50 border-gray-200 text-gray-900 rounded-lg">
                    <SelectValue placeholder="Choose Category" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200 text-gray-900">
                    {categories.filter(c => !c.parent).map(cat => (
                      <SelectItem key={cat._id} value={cat._id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Subcategory Dropdown */}
              <div className="space-y-2">
                <Label className="text-gray-700 text-xs font-semibold">Subcategory (Optional)</Label>
                <Select 
                  value={formData.subcategory} 
                  onValueChange={val => setFormData(prev => ({ ...prev, subcategory: val || "" }))}
                  disabled={!formData.category}
                >
                  <SelectTrigger className="w-full bg-gray-50 border-gray-200 text-gray-900 rounded-lg disabled:opacity-40">
                    <SelectValue placeholder="Choose Subcategory" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200 text-gray-900">
                    {categories.filter(c => c.parent === formData.category).map(sub => (
                      <SelectItem key={sub._id} value={sub._id}>{sub.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Unit Of Measure */}
              <div className="space-y-2">
                <Label className="text-gray-700 text-xs font-semibold">
                  Unit of Measure (Base UoM) <span className="text-red-500">*</span>
                </Label>
                <Select 
                  value={formData.unit} 
                  onValueChange={val => setFormData(prev => ({ ...prev, unit: val || "" }))}
                >
                  <SelectTrigger className="w-full bg-gray-50 border-gray-200 text-gray-900 rounded-lg">
                    <SelectValue placeholder="Choose Unit" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200 text-gray-900">
                    {units.map(u => (
                      <SelectItem key={u._id} value={u._id}>{u.name} ({u.symbol})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Dynamic Attributes Form Panel */}
            {categoryAttributes.length > 0 && (
              <div className="bg-gray-50/50 border border-gray-200 rounded-xl p-4 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-200/60">
                  <Sliders className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-bold text-gray-900">Dynamic Specifications Fields</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {categoryAttributes.map((attr) => {
                    const value = formData.attributes[attr.name] ?? "";

                    return (
                      <div key={attr.name} className="space-y-1.5">
                        <Label className="text-gray-700 text-xs font-semibold flex items-center justify-between">
                          <span>
                            {attr.name} {attr.required && <span className="text-red-500">*</span>}
                          </span>
                          {attr.unit && <span className="text-[10px] text-gray-400">({attr.unit})</span>}
                        </Label>

                        {/* Rendering dynamic fields depending on attribute definition */}
                        {attr.type === "select" ? (
                          <Select 
                            value={value} 
                            onValueChange={val => handleAttributeChange(attr.name, val)}
                          >
                            <SelectTrigger className="w-full bg-gray-50 border-gray-200 text-gray-900 rounded-lg">
                              <SelectValue placeholder={`Select ${attr.name}`} />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-gray-200 text-gray-900">
                              {attr.options?.map(opt => (
                                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : attr.type === "boolean" ? (
                          <div className="flex items-center gap-2 p-2 bg-gray-50 border border-gray-200 rounded-lg">
                            <Checkbox
                              checked={!!value}
                              onCheckedChange={checked => handleAttributeChange(attr.name, !!checked)}
                              id={`attr-${attr.name}`}
                              className="border-slate-500"
                            />
                            <Label htmlFor={`attr-${attr.name}`} className="text-xs text-gray-700 select-none">
                              Enabled / Yes
                            </Label>
                          </div>
                        ) : (
                          <Input
                            type={attr.type === "number" ? "number" : attr.type === "date" ? "date" : "text"}
                            value={value}
                            onChange={e => {
                              const val = attr.type === "number" ? (parseFloat(e.target.value) || 0) : e.target.value;
                              handleAttributeChange(attr.name, val);
                            }}
                            placeholder={`Enter ${attr.name.toLowerCase()}`}
                            className="bg-gray-50 border-gray-200 text-gray-900 rounded-lg focus:border-blue-500"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Stock & Tracking Settings */}
        {step === 3 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Pricing and Levels */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="costPrice" className="text-gray-700 text-xs font-semibold">
                  Cost Price (₹) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="costPrice"
                  type="number"
                  value={formData.costPrice}
                  onChange={handleNumberChange}
                  className="bg-gray-50 border-gray-200 text-gray-900 rounded-lg focus:border-blue-500 font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="minStockLevel" className="text-gray-700 text-xs font-semibold">
                  Min Stock (Safety) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="minStockLevel"
                  type="number"
                  value={formData.minStockLevel}
                  onChange={handleNumberChange}
                  className="bg-gray-50 border-gray-200 text-gray-900 rounded-lg focus:border-blue-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxStockLevel" className="text-gray-700 text-xs font-semibold">Max Stock Level</Label>
                <Input
                  id="maxStockLevel"
                  type="number"
                  value={formData.maxStockLevel}
                  onChange={handleNumberChange}
                  className="bg-gray-50 border-gray-200 text-gray-900 rounded-lg focus:border-blue-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reorderQty" className="text-gray-700 text-xs font-semibold">Reorder Qty (ROQ)</Label>
                <Input
                  id="reorderQty"
                  type="number"
                  value={formData.reorderQty}
                  onChange={handleNumberChange}
                  className="bg-gray-50 border-gray-200 text-gray-900 rounded-lg focus:border-blue-500"
                />
              </div>
            </div>

            {/* Tracking Settings Flags */}
            <div className="bg-gray-50/50 border border-gray-200 rounded-xl p-4 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-200/60">
                <ListOrdered className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-bold text-gray-900">Item Tracking Details</span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-3 bg-white/40 border border-gray-200/80 rounded-xl">
                  <Checkbox
                    id="isBatchTracked"
                    checked={formData.isBatchTracked}
                    onCheckedChange={val => setFormData(prev => ({ ...prev, isBatchTracked: !!val }))}
                    className="border-slate-500 h-4 w-4"
                  />
                  <div className="space-y-0.5">
                    <Label htmlFor="isBatchTracked" className="text-gray-900 text-xs font-semibold cursor-pointer select-none">
                      Batch / Lot Tracking
                    </Label>
                    <p className="text-[10px] text-gray-400">Track lots with numbers</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-white/40 border border-gray-200/80 rounded-xl">
                  <Checkbox
                    id="isSerialTracked"
                    checked={formData.isSerialTracked}
                    onCheckedChange={val => setFormData(prev => ({ ...prev, isSerialTracked: !!val }))}
                    className="border-slate-500 h-4 w-4"
                  />
                  <div className="space-y-0.5">
                    <Label htmlFor="isSerialTracked" className="text-gray-900 text-xs font-semibold cursor-pointer select-none">
                      Serial Number Tracking
                    </Label>
                    <p className="text-[10px] text-gray-400">Unique identifier per unit</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-white/40 border border-gray-200/80 rounded-xl">
                  <Checkbox
                    id="hasExpiry"
                    checked={formData.hasExpiry}
                    onCheckedChange={val => setFormData(prev => ({ ...prev, hasExpiry: !!val }))}
                    className="border-slate-500 h-4 w-4"
                  />
                  <div className="space-y-0.5">
                    <Label htmlFor="hasExpiry" className="text-gray-900 text-xs font-semibold cursor-pointer select-none">
                      Expiry Date Tracking
                    </Label>
                    <p className="text-[10px] text-gray-400">Flag items with shelf lives</p>
                  </div>
                </div>
              </div>

              {formData.hasExpiry && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 animate-in slide-in-from-top duration-300">
                  <div className="space-y-2">
                    <Label htmlFor="expiryAlertDays" className="text-gray-700 text-xs font-semibold">
                      Expiry Warning Alert (Days before) <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="expiryAlertDays"
                      type="number"
                      value={formData.expiryAlertDays}
                      onChange={handleNumberChange}
                      className="bg-gray-50 border-gray-200 text-gray-900 rounded-lg focus:border-blue-500 w-full sm:w-[150px]"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Helper Info */}
            <div className="p-3 bg-blue-950/15 border border-blue-800/20 text-blue-400 rounded-xl flex items-start gap-2.5 text-xs">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                Creating this item will automatically initialize real-time stock matrix counts to <span className="font-bold">0</span> for all active warehouses in the system.
              </div>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="bg-gray-50/50 border-t border-gray-200 px-6 py-4 flex items-center justify-between">
        {step > 1 ? (
          <Button
            type="button"
            onClick={() => setStep(prev => prev - 1)}
            className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-xl flex items-center gap-1.5 active:scale-[0.98]"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </Button>
        ) : (
          <div /> // Placeholder
        )}

        {step < 3 ? (
          <Button
            type="button"
            onClick={() => {
              if (step === 1 && !formData.name) {
                toast.error("Item name is required");
                return;
              }
              if (step === 2 && (!formData.category || !formData.unit)) {
                toast.error("Category and Unit of measure are required");
                return;
              }
              setStep(prev => prev + 1);
            }}
            className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl flex items-center gap-1.5 active:scale-[0.98]"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl flex items-center gap-2 active:scale-[0.98] transition-transform"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Product
              </>
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
