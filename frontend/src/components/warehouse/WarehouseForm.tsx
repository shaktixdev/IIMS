"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface User {
  _id: string;
  name: string;
  role: string;
}

interface Address {
  line1?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

interface WarehouseData {
  _id?: string;
  code: string;
  name: string;
  type: "main" | "sub" | "transit" | "production" | "dispatch";
  address?: Address;
  manager?: any;
  isActive?: boolean;
}

interface WarehouseFormProps {
  initialData?: WarehouseData;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function WarehouseForm({ initialData, onSuccess, onCancel }: WarehouseFormProps) {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);

  // Form Fields
  const [name, setName] = useState(initialData?.name || "");
  const [code, setCode] = useState(initialData?.code || "");
  const [type, setType] = useState<WarehouseData["type"]>(initialData?.type || "main");
  const [addressLine1, setAddressLine1] = useState(initialData?.address?.line1 || "");
  const [addressCity, setAddressCity] = useState(initialData?.address?.city || "");
  const [addressState, setAddressState] = useState(initialData?.address?.state || "");
  const [addressPincode, setAddressPincode] = useState(initialData?.address?.pincode || "");
  const [managerId, setManagerId] = useState<string>(
    initialData?.manager
      ? typeof initialData.manager === "object"
        ? initialData.manager._id
        : initialData.manager
      : ""
  );

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch("/api/users");
        const json = await res.json();
        if (json.success) {
          // Filter to roles that can manage or run stores
          const allowedUsers = json.data.filter((u: User) =>
            ["super_admin", "admin", "manager", "store_keeper"].includes(u.role)
          );
          setUsers(allowedUsers);
        }
      } catch (err) {
        console.error("Failed to load users:", err);
      } finally {
        setUsersLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !code.trim()) {
      toast.error("Warehouse Name and Code are required.");
      return;
    }

    setLoading(true);

    const payload = {
      name: name.trim(),
      code: code.toUpperCase().trim(),
      type,
      address: {
        line1: addressLine1.trim(),
        city: addressCity.trim(),
        state: addressState.trim(),
        pincode: addressPincode.trim(),
      },
      manager: managerId || undefined,
    };

    try {
      const url = initialData?._id ? `/api/warehouses/${initialData._id}` : "/api/warehouses";
      const method = initialData?._id ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (json.success) {
        toast.success(initialData?._id ? "Warehouse updated successfully." : "Warehouse created successfully.");
        onSuccess();
      } else {
        toast.error(json.error?.message || "Failed to save warehouse.");
      }
    } catch (err) {
      console.error("Submit warehouse error:", err);
      toast.error("An error occurred while connecting to the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[85vh] overflow-y-auto pr-1">
      <div className="grid grid-cols-2 gap-4">
        {/* Name */}
        <div className="space-y-1.5 col-span-2">
          <Label htmlFor="name" className="text-gray-700 text-xs font-semibold">Warehouse Name *</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Storage Yard Beta"
            className="bg-gray-50 border-gray-200 text-gray-900 rounded-xl"
            required
          />
        </div>

        {/* Code */}
        <div className="space-y-1.5">
          <Label htmlFor="code" className="text-gray-700 text-xs font-semibold">Warehouse Code *</Label>
          <Input
            id="code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="e.g. WH-BETA"
            disabled={!!initialData?._id}
            className="bg-gray-50 border-gray-200 text-gray-900 rounded-xl uppercase font-mono"
            required
          />
        </div>

        {/* Type */}
        <div className="space-y-1.5">
          <Label className="text-gray-700 text-xs font-semibold">Warehouse Type</Label>
          <Select value={type} onValueChange={(val) => setType((val as any) || "main")}>
            <SelectTrigger className="bg-gray-50 border-gray-200 text-gray-900 rounded-xl">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent className="bg-white border-gray-200 text-gray-900 text-sm">
              <SelectItem value="main">Main Warehouse</SelectItem>
              <SelectItem value="sub">Sub Warehouse</SelectItem>
              <SelectItem value="transit">Transit Store</SelectItem>
              <SelectItem value="production">Production Store</SelectItem>
              <SelectItem value="dispatch">Dispatch Yard</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Manager */}
        <div className="space-y-1.5 col-span-2">
          <Label className="text-gray-700 text-xs font-semibold">Assigned Manager</Label>
          <Select value={managerId} onValueChange={(val) => setManagerId(val || "")}>
            <SelectTrigger className="bg-gray-50 border-gray-200 text-gray-900 rounded-xl">
              <SelectValue placeholder={usersLoading ? "Loading users..." : "Select a manager"} />
            </SelectTrigger>
            <SelectContent className="bg-white border-gray-200 text-gray-900 text-sm">
              <SelectItem value="none_assigned">No Manager Assigned</SelectItem>
              {users.map((user) => (
                <SelectItem key={user._id} value={user._id}>
                  {user.name} ({user.role.replace("_", " ")})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Address */}
      <div className="border-t border-gray-100 pt-4 space-y-3">
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Location Address</h4>
        
        <div className="space-y-1.5">
          <Label htmlFor="addressLine1" className="text-gray-700 text-xs font-semibold font-medium">Street Address</Label>
          <Input
            id="addressLine1"
            value={addressLine1}
            onChange={(e) => setAddressLine1(e.target.value)}
            placeholder="Gate No, Phase, Industrial Area"
            className="bg-gray-50 border-gray-200 text-gray-900 rounded-xl"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5 col-span-2">
            <Label htmlFor="addressCity" className="text-gray-700 text-xs font-semibold font-medium">City</Label>
            <Input
              id="addressCity"
              value={addressCity}
              onChange={(e) => setAddressCity(e.target.value)}
              placeholder="e.g. Jamshedpur"
              className="bg-gray-50 border-gray-200 text-gray-900 rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="addressPincode" className="text-gray-700 text-xs font-semibold font-medium">Pincode</Label>
            <Input
              id="addressPincode"
              value={addressPincode}
              onChange={(e) => setAddressPincode(e.target.value)}
              placeholder="831001"
              className="bg-gray-50 border-gray-200 text-gray-900 rounded-xl font-mono"
            />
          </div>

          <div className="space-y-1.5 col-span-3">
            <Label htmlFor="addressState" className="text-gray-700 text-xs font-semibold font-medium">State</Label>
            <Input
              id="addressState"
              value={addressState}
              onChange={(e) => setAddressState(e.target.value)}
              placeholder="e.g. Jharkhand"
              className="bg-gray-50 border-gray-200 text-gray-900 rounded-xl"
            />
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
        <Button
          type="button"
          onClick={onCancel}
          variant="outline"
          className="border-gray-200 text-gray-500 rounded-xl h-10 px-4 hover:bg-gray-50 text-xs"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-10 px-5 text-xs font-semibold flex items-center gap-1.5"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {initialData?._id ? "Save Changes" : "Create Warehouse"}
        </Button>
      </div>
    </form>
  );
}
