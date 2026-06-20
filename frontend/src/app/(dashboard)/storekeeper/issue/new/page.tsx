"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { 
  ArrowLeft, 
  ClipboardList, 
  Warehouse as WarehouseIcon, 
  User as UserIcon, 
  Search, 
  Trash2, 
  Loader2,
  AlertCircle,
  Check
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreateIssueSchema } from "@/lib/validations/issue.schema";
import RequesterFields from "@/components/storekeeper/RequesterFields";

interface Warehouse {
  _id: string;
  name: string;
  code: string;
}

interface Item {
  _id: string;
  name: string;
  sku: string;
  unit: {
    _id: string;
    name: string;
    symbol: string;
  };
  isBatchTracked?: boolean;
  isSerialTracked?: boolean;
  hasExpiry?: boolean;
}

interface SelectedItem {
  item: string;
  sku: string;
  name: string;
  quantity: number;
  unit: string;
  unitSymbol: string;
  availableStock: number;
  remarks: string;
  isBatchTracked?: boolean;
  isSerialTracked?: boolean;
  batchesList: any[];
  serialsList: any[];
  selectedBatch: string;
  selectedSerials: string[];
}

export default function NewIssueVoucherPage() {
  const router = useRouter();
  const { data: session } = useSession();

  // Wizard Steps
  const [step, setStep] = useState(1);

  // Form Fields
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [notes, setNotes] = useState("");

  const [requester, setRequester] = useState({
    name: "",
    employeeId: "",
    department: "",
    departmentOther: "",
  });

  const [approver, setApprover] = useState({
    name: "",
    designation: "",
    slipReference: "",
  });

  // Items checkout list
  const [checkoutItems, setCheckoutItems] = useState<SelectedItem[]>([]);

  // Items search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Item[]>([]);
  const [searching, setSearching] = useState(false);
  
  const [errors, setErrors] = useState<any>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch warehouses on mount
  useEffect(() => {
    fetch("/api/warehouses")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setWarehouses(data.data);
          if (data.data.length > 0) {
            setSelectedWarehouse(data.data[0]._id);
          }
        }
      });
  }, []);

  // Search items when query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    const delayDebounceFn = setTimeout(() => {
      fetch(`/api/items/search?q=${searchQuery}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setSearchResults(data.data);
          }
        })
        .finally(() => setSearching(false));
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // Handle requester inputs
  const handleRequesterChange = (field: string, value: string) => {
    setRequester((prev) => ({ ...prev, [field]: value }));
    if (errors[`requester.${field}`]) {
      setErrors((prev: any) => {
        const newErrs = { ...prev };
        delete newErrs[`requester.${field}`];
        return newErrs;
      });
    }
  };

  // Add Item to checkout list
  const handleAddItem = async (item: Item) => {
    // Check if item is already in list
    if (checkoutItems.some((ci) => ci.item === item._id)) {
      toast.warning("Item is already added to checkout list.");
      setSearchQuery("");
      return;
    }

    try {
      // Fetch item available stock in selected warehouse
      const res = await fetch(`/api/items/${item._id}/stock`);
      const data = await res.json();
      
      let available = 0;
      if (data.success) {
        // Find stock matching selected warehouse
        const matchingStock = data.data.find(
          (s: any) => s.warehouse?._id === selectedWarehouse
        );
        if (matchingStock) {
          available = matchingStock.quantityOnHand - matchingStock.quantityReserved;
        }
      }

      // Fetch active batches if batch tracked
      let batchesList: any[] = [];
      if (item.isBatchTracked) {
        const batchRes = await fetch(`/api/items/${item._id}/batches?warehouse=${selectedWarehouse}`);
        const batchData = await batchRes.json();
        if (batchData.success) {
          batchesList = batchData.data;
        }
      }

      // Fetch available serial numbers if serial tracked
      let serialsList: any[] = [];
      if (item.isSerialTracked) {
        const serialRes = await fetch(`/api/items/${item._id}/serial-numbers?warehouse=${selectedWarehouse}`);
        const serialData = await serialRes.json();
        if (serialData.success) {
          serialsList = serialData.data;
        }
      }

      let selectedBatch = "";
      if (item.isBatchTracked && batchesList.length > 0) {
        selectedBatch = batchesList[0]._id;
        available = batchesList[0].currentQuantity;
      }

      const newItem: SelectedItem = {
        item: item._id,
        sku: item.sku,
        name: item.name,
        quantity: 1,
        unit: item.unit?._id || "",
        unitSymbol: item.unit?.symbol || "pcs",
        availableStock: available,
        remarks: "",
        isBatchTracked: item.isBatchTracked,
        isSerialTracked: item.isSerialTracked,
        batchesList,
        serialsList,
        selectedBatch,
        selectedSerials: []
      };

      setCheckoutItems((prev) => [...prev, newItem]);
      setSearchQuery("");
      setSearchResults([]);
      toast.success(`${item.name} added to slip.`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to check item stock level.");
    }
  };

  // Remove item
  const handleRemoveItem = (index: number) => {
    setCheckoutItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Update item details in table
  const handleItemChange = (index: number, field: string, value: string | number) => {
    const newItems = [...checkoutItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setCheckoutItems(newItems);
  };

  // Step 1 validation
  const validateStep1 = () => {
    const deptValue = requester.department === "other" ? "" : requester.department;
    const validation = CreateIssueSchema.safeParse({
      warehouse: selectedWarehouse,
      requester: {
        ...requester,
        department: deptValue || undefined,
      },
      approver,
      items: [{ item: "dummy", quantity: 1, unit: "dummy" }], // dummy item to bypass zod list validation for step 1
    });

    if (!validation.success) {
      const errMap: any = {};
      validation.error.issues.forEach((err: any) => {
        const path = err.path.join(".");
        errMap[path] = err.message;
      });
      setErrors(errMap);
      toast.error("Please fill in all required fields correctly.");
      return false;
    }
    setErrors({});
    return true;
  };

  // Handle final submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (checkoutItems.length === 0) {
      toast.error("You must add at least one line item to issue.");
      return;
    }

    // Verify all items have positive quantity and do not exceed available stock
    for (const line of checkoutItems) {
      if (line.quantity <= 0) {
        toast.error(`Quantity for item ${line.sku} must be greater than 0.`);
        return;
      }
      if (line.quantity > line.availableStock) {
        toast.error(`Stock insufficient for ${line.sku}. Available: ${line.availableStock}, Requested: ${line.quantity}`);
        return;
      }
      if (line.isBatchTracked && !line.selectedBatch) {
        toast.error(`Please select a batch for batch-tracked item ${line.sku}.`);
        return;
      }
      if (line.isSerialTracked) {
        if (!line.selectedSerials || line.selectedSerials.length !== line.quantity) {
          toast.error(`Please select exactly ${line.quantity} serial numbers for serial-tracked item ${line.sku}. Currently selected: ${line.selectedSerials?.length || 0}`);
          return;
        }
      }
    }

    setIsSubmitting(true);
    try {
      const payload = {
        warehouse: selectedWarehouse,
        requester: {
          name: requester.name,
          employeeId: requester.employeeId,
          department: requester.department || undefined,
          departmentOther: requester.departmentOther || "",
        },
        approver,
        items: checkoutItems.map((line) => ({
          item: line.item,
          quantity: line.quantity,
          unit: line.unit,
          remarks: line.remarks,
          batch: line.selectedBatch || undefined,
          serialNumbers: line.isSerialTracked ? line.selectedSerials : undefined
        })),
        notes,
        createdBy: session?.user?.id || undefined,
      };

      const res = await fetch("/api/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Materials issued successfully!");
        router.push(`/storekeeper/issue/${data.data._id}`);
      } else {
        toast.error(data.error?.message || "Failed to create issue voucher.");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred during material checkout.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link href="/storekeeper" className="flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <ClipboardList className="w-7 h-7 text-blue-500" /> New Material Issue Slip
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {step === 1 ? "Step 1: Enter slip references, worker details, and supervisor authorization." : "Step 2: Scan barcodes or search items to checkout."}
          </p>
        </div>
      </div>

      {/* Step 1 Form: Worker & Approver details */}
      {step === 1 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-gray-100">
            
            {/* Issuing Store */}
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                <WarehouseIcon className="w-4 h-4 text-gray-400" /> Issuing Warehouse *
              </Label>
              <select
                value={selectedWarehouse}
                onChange={(e) => setSelectedWarehouse(e.target.value)}
                className="flex h-11 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                required
              >
                {warehouses.map((wh) => (
                  <option key={wh._id} value={wh._id}>
                    {wh.name} ({wh.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Requester Details */}
            <div className="space-y-4">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-2">
                <UserIcon className="w-4 h-4 text-blue-500" /> Requester / Helper Details
              </h2>
              <RequesterFields
                requester={requester}
                onChange={handleRequesterChange}
                errors={errors}
              />
            </div>

            {/* Approver Details */}
            <div className="space-y-4">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-2">
                <Check className="w-4 h-4 text-blue-500" /> Signed Approver (Supervisor)
              </h2>
              <div className="space-y-4">
                
                {/* Approver Name */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-gray-700">Approver Name *</Label>
                  <Input
                    type="text"
                    placeholder="e.g. Mr. Sharma"
                    value={approver.name}
                    onChange={(e) => setApprover(prev => ({ ...prev, name: e.target.value }))}
                    className="bg-white border-gray-300 text-gray-900 rounded-xl"
                    required
                  />
                  {errors?.["approver.name"] && <span className="text-xs text-red-500">{errors["approver.name"]}</span>}
                </div>

                {/* Designation */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-gray-700">Designation *</Label>
                  <Input
                    type="text"
                    placeholder="e.g. Electrical Supervisor"
                    value={approver.designation}
                    onChange={(e) => setApprover(prev => ({ ...prev, designation: e.target.value }))}
                    className="bg-white border-gray-300 text-gray-900 rounded-xl"
                    required
                  />
                  {errors?.["approver.designation"] && <span className="text-xs text-red-500">{errors["approver.designation"]}</span>}
                </div>

                {/* Slip Reference */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-gray-700">Physical Slip Reference #</Label>
                  <Input
                    type="text"
                    placeholder="e.g. EL-2024-012 (optional)"
                    value={approver.slipReference}
                    onChange={(e) => setApprover(prev => ({ ...prev, slipReference: e.target.value }))}
                    className="bg-white border-gray-300 text-gray-900 rounded-xl"
                  />
                </div>

              </div>
            </div>

          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              onClick={() => {
                if (validateStep1()) {
                  setStep(2);
                }
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm px-6 font-semibold"
            >
              Continue to Materials &rarr;
            </Button>
          </div>
        </div>
      )}

      {/* Step 2 Form: Materials Search & Quantity entry */}
      {step === 2 && (
        <div className="space-y-6">
          
          {/* Summary Details Box */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <Label className="text-xs text-gray-400 uppercase tracking-wider block">Helper</Label>
              <div className="text-sm font-bold text-gray-900 mt-1">{requester.name}</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <Label className="text-xs text-gray-400 uppercase tracking-wider block">Authorized By</Label>
              <div className="text-sm font-bold text-gray-900 mt-1">{approver.name} ({approver.designation})</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <Label className="text-xs text-gray-400 uppercase tracking-wider block">Store</Label>
              <div className="text-sm font-bold text-gray-900 mt-1">{warehouses.find(w => w._id === selectedWarehouse)?.name}</div>
            </div>
          </div>

          {/* Search bar */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm relative">
            <Label className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2 mb-2">
              <Search className="w-4 h-4 text-gray-400" /> Search & Add Materials
            </Label>
            <div className="relative">
              <Input
                type="text"
                placeholder="Type item name or SKU code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-white border-gray-300 text-gray-900 rounded-xl pl-9"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>

            {/* Results Dropdown */}
            {searchResults.length > 0 && (
              <div className="absolute left-6 right-6 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 divide-y divide-gray-100 max-h-60 overflow-y-auto">
                {searchResults.map((item) => (
                  <div
                    key={item._id}
                    onClick={() => handleAddItem(item)}
                    className="p-3 hover:bg-blue-50/50 cursor-pointer flex justify-between items-center transition-colors"
                  >
                    <div>
                      <div className="text-sm font-bold text-gray-900">{item.name}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{item.sku}</div>
                    </div>
                    <span className="text-xs text-blue-600 font-semibold">+ Add Item</span>
                  </div>
                ))}
              </div>
            )}
            {searching && (
              <div className="absolute right-9 top-[46px]"><Loader2 className="w-4 h-4 animate-spin text-gray-400" /></div>
            )}
          </div>

          {/* Lines Table */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                <h2 className="text-lg font-bold text-gray-900">Line Items to Issue</h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/20">
                      <th className="px-6 py-3">Material Details</th>
                      <th className="px-6 py-3 text-right">Available Qty</th>
                      <th className="px-6 py-3 text-right">Checkout Qty</th>
                      <th className="px-6 py-3">Remarks / Usage</th>
                      <th className="px-6 py-3 text-center">Remove</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {checkoutItems.map((item, index) => (
                      <React.Fragment key={index}>
                        <tr className="hover:bg-gray-50/30">
                          <td className="px-6 py-4">
                            <div className="font-bold text-gray-900">{item.name}</div>
                            <div className="text-xs text-gray-400 mt-0.5">{item.sku}</div>
                            {item.isBatchTracked && <span className="inline-block mt-1 mr-2 px-1.5 py-0.5 rounded text-[10px] bg-blue-105 text-blue-800 font-semibold uppercase tracking-wider">Batch Tracked</span>}
                            {item.isSerialTracked && <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] bg-purple-105 text-purple-800 font-semibold uppercase tracking-wider">Serial Tracked</span>}
                          </td>
                          <td className="px-6 py-4 text-right text-gray-600 font-semibold">
                            {item.availableStock} {item.unitSymbol}
                          </td>
                          <td className="px-6 py-4 text-right w-36">
                            <div className="flex items-center gap-1.5 justify-end">
                              <Input
                                type="number"
                                min="0.001"
                                step="any"
                                value={item.quantity}
                                onChange={(e) => handleItemChange(index, "quantity", parseFloat(e.target.value) || 0)}
                                className={`text-right font-bold w-24 h-9 rounded-lg ${
                                  item.quantity > item.availableStock ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:border-emerald-500"
                                }`}
                                required
                              />
                              <span className="text-xs text-gray-500 font-medium shrink-0">{item.unitSymbol}</span>
                            </div>
                            {item.quantity > item.availableStock && (
                              <span className="text-[10px] text-red-500 block mt-1 text-right">Exceeds available stock</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <Input
                              type="text"
                              placeholder="e.g. for panel-3 wire mesh assembly"
                              value={item.remarks}
                              onChange={(e) => handleItemChange(index, "remarks", e.target.value)}
                              className="bg-white border-gray-300 text-gray-900 rounded-lg h-9"
                            />
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(index)}
                              className="text-gray-400 hover:text-red-600 transition-colors p-1.5"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                        {(item.isBatchTracked || item.isSerialTracked) && (
                          <tr className="bg-gray-50/40">
                            <td colSpan={5} className="px-6 py-2.5 border-b border-gray-100">
                              <div className="flex flex-col md:flex-row gap-4 p-3 bg-white border border-gray-200 rounded-xl text-xs">
                                {item.isBatchTracked && (
                                  <div className="space-y-1 w-full md:max-w-xs">
                                    <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Select Active Batch *</Label>
                                    <select
                                      value={item.selectedBatch}
                                      onChange={(e) => {
                                        const batchId = e.target.value;
                                        const batch = item.batchesList.find((b: any) => b._id === batchId);
                                        const available = batch ? batch.currentQuantity : 0;
                                        const newItems = [...checkoutItems];
                                        newItems[index] = {
                                          ...newItems[index],
                                          selectedBatch: batchId,
                                          availableStock: available
                                        };
                                        setCheckoutItems(newItems);
                                      }}
                                      className="flex h-8 w-full rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900 focus-visible:outline-none"
                                      required
                                    >
                                      <option value="">-- Choose Batch --</option>
                                      {item.batchesList.map((b: any) => (
                                        <option key={b._id} value={b._id}>
                                          {b.batchNumber} ({b.currentQuantity} available) {b.expiryDate ? `• Exp: ${new Date(b.expiryDate).toLocaleDateString()}` : ""}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                )}
                                {item.isSerialTracked && (
                                  <div className="space-y-1.5 w-full">
                                    <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                                      Select Serial Numbers * (Choose exactly {item.quantity})
                                    </Label>
                                    <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto border border-gray-200 p-2 rounded-lg bg-gray-50/50">
                                      {item.serialsList.map((s: any) => {
                                        const isChecked = item.selectedSerials?.includes(s._id);
                                        return (
                                          <label key={s._id} className="flex items-center gap-1.5 bg-white border border-gray-200 rounded px-2 py-1 cursor-pointer hover:bg-blue-50/20 text-xs">
                                            <input
                                              type="checkbox"
                                              checked={isChecked}
                                              onChange={() => {
                                                const newItems = [...checkoutItems];
                                                const currentSelected = item.selectedSerials || [];
                                                let nextSelected;
                                                if (isChecked) {
                                                  nextSelected = currentSelected.filter((id: string) => id !== s._id);
                                                } else {
                                                  nextSelected = [...currentSelected, s._id];
                                                }
                                                newItems[index] = {
                                                  ...newItems[index],
                                                  selectedSerials: nextSelected
                                                };
                                                setCheckoutItems(newItems);
                                              }}
                                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span>{s.serialNumber}</span>
                                          </label>
                                        );
                                      })}
                                      {item.serialsList.length === 0 && (
                                        <span className="text-red-500 font-semibold italic">No serial numbers available in this warehouse!</span>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                    {checkoutItems.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                          <AlertCircle className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                          No materials added yet. Search and select items above to checkout.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* General notes */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-2">
              <Label htmlFor="notes" className="text-sm font-semibold text-gray-700">General Slip Remarks</Label>
              <Input
                id="notes"
                type="text"
                placeholder="Include vehicle info, general notes on slip condition, etc."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="bg-white border-gray-300 text-gray-900 rounded-xl h-11"
              />
            </div>

            {/* Buttons */}
            <div className="flex justify-between items-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
                className="rounded-xl border-gray-200"
              >
                &larr; Back to Worker Details
              </Button>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={isSubmitting || checkoutItems.length === 0}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm px-6 font-semibold flex items-center gap-2 h-11"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Checking stock...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Confirm Issue & Print MIV
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>

        </div>
      )}

    </div>
  );
}
