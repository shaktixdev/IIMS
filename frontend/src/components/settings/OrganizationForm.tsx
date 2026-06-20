"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Building2, Save, Loader2, Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function OrganizationForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    gstin: "",
    pan: "",
    email: "",
    phone: "",
    currency: "INR",
    fiscalYearStart: 4,
    address: {
      line1: "",
      line2: "",
      city: "",
      state: "",
      country: "",
      pincode: "",
    },
  });

  useEffect(() => {
    async function fetchOrg() {
      try {
        const res = await fetch("/api/settings/organization");
        const json = await res.json();
        if (json.success && json.data) {
          setFormData((prev) => ({
            ...prev,
            ...json.data,
            address: {
              ...prev.address,
              ...(json.data.address || {}),
            },
          }));
        } else {
          toast.error("Failed to load organization settings");
        }
      } catch (err) {
        console.error("Fetch org settings error:", err);
        toast.error("Error loading settings");
      } finally {
        setLoading(false);
      }
    }
    fetchOrg();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name.startsWith("address.")) {
      const field = name.split(".")[1];
      setFormData((prev) => ({
        ...prev,
        address: {
          ...prev.address,
          [field]: value,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: name === "fiscalYearStart" ? parseInt(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error("Organization name is required");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/settings/organization", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (json.success) {
        toast.success("Organization profile updated successfully");
      } else {
        toast.error(json.error?.message || "Failed to update profile");
      }
    } catch (err) {
      console.error("Save org settings error:", err);
      toast.error("Error saving settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
        <p className="text-gray-500 text-sm font-medium animate-pulse">Loading organization settings...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="bg-white border-gray-200 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md">
        <CardHeader className="pb-4">
          <CardTitle className="text-gray-900 text-xl flex items-center gap-3 font-bold">
            <Building2 className="w-6 h-6 text-blue-400" />
            Organization Profile
          </CardTitle>
          <CardDescription className="text-gray-500 text-sm">
            Set up your company details, billing addresses, and tax identifiers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Section 1: General Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-200 border-b border-gray-200 pb-1.5 uppercase tracking-wider">
              General Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-gray-700 text-xs font-semibold">
                  Company Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Acme Industrial Corp"
                  className="bg-gray-50 border-gray-200 text-gray-900 rounded-lg focus:border-blue-500 transition-all"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-700 text-xs font-semibold">
                  Corporate Email
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="e.g. info@company.com"
                  className="bg-gray-50 border-gray-200 text-gray-900 rounded-lg focus:border-blue-500 transition-all"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-gray-700 text-xs font-semibold">
                  Contact Phone
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="e.g. +91 657 220033"
                  className="bg-gray-50 border-gray-200 text-gray-900 rounded-lg focus:border-blue-500 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="currency" className="text-gray-700 text-xs font-semibold">
                    Currency
                  </Label>
                  <Select
                    value={formData.currency}
                    onValueChange={(val) => handleSelectChange("currency", val || "INR")}
                  >
                    <SelectTrigger className="w-full bg-gray-50 border-gray-200 text-gray-900 rounded-lg">
                      <SelectValue placeholder="INR" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200 text-gray-900">
                      <SelectItem value="INR">INR (₹)</SelectItem>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fiscalYearStart" className="text-gray-700 text-xs font-semibold">
                    Fiscal Start Month
                  </Label>
                  <Select
                    value={String(formData.fiscalYearStart)}
                    onValueChange={(val) => handleSelectChange("fiscalYearStart", val || "4")}
                  >
                    <SelectTrigger className="w-full bg-gray-50 border-gray-200 text-gray-900 rounded-lg">
                      <SelectValue placeholder="April" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200 text-gray-900">
                      <SelectItem value="1">January</SelectItem>
                      <SelectItem value="3">March</SelectItem>
                      <SelectItem value="4">April (India)</SelectItem>
                      <SelectItem value="10">October</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Taxation */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-200 border-b border-gray-200 pb-1.5 uppercase tracking-wider flex items-center gap-2">
              <Landmark className="w-4 h-4 text-indigo-400" />
              Tax Identifiers
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gstin" className="text-gray-700 text-xs font-semibold">
                  GSTIN
                </Label>
                <Input
                  id="gstin"
                  name="gstin"
                  value={formData.gstin}
                  onChange={handleChange}
                  placeholder="e.g. 20AAAAA0000A1Z0"
                  className="bg-gray-50 border-gray-200 text-gray-900 rounded-lg uppercase placeholder:normal-case focus:border-blue-500 transition-all"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pan" className="text-gray-700 text-xs font-semibold">
                  Corporate PAN
                </Label>
                <Input
                  id="pan"
                  name="pan"
                  value={formData.pan}
                  onChange={handleChange}
                  placeholder="e.g. ABCDE1234F"
                  className="bg-gray-50 border-gray-200 text-gray-900 rounded-lg uppercase placeholder:normal-case focus:border-blue-500 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Registered Address */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-200 border-b border-gray-200 pb-1.5 uppercase tracking-wider">
              Registered Address
            </h3>
            <div className="grid grid-cols-1 gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="address.line1" className="text-gray-700 text-xs font-semibold">
                    Address Line 1
                  </Label>
                  <Input
                    id="address.line1"
                    name="address.line1"
                    value={formData.address.line1}
                    onChange={handleChange}
                    placeholder="e.g. Unit 4B, Industrial Park"
                    className="bg-gray-50 border-gray-200 text-gray-900 rounded-lg focus:border-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address.line2" className="text-gray-700 text-xs font-semibold">
                    Address Line 2
                  </Label>
                  <Input
                    id="address.line2"
                    name="address.line2"
                    value={formData.address.line2}
                    onChange={handleChange}
                    placeholder="e.g. Phase II, Main Road"
                    className="bg-gray-50 border-gray-200 text-gray-900 rounded-lg focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="address.city" className="text-gray-700 text-xs font-semibold">
                    City
                  </Label>
                  <Input
                    id="address.city"
                    name="address.city"
                    value={formData.address.city}
                    onChange={handleChange}
                    placeholder="e.g. Jamshedpur"
                    className="bg-gray-50 border-gray-200 text-gray-900 rounded-lg focus:border-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address.state" className="text-gray-700 text-xs font-semibold">
                    State
                  </Label>
                  <Input
                    id="address.state"
                    name="address.state"
                    value={formData.address.state}
                    onChange={handleChange}
                    placeholder="e.g. Jharkhand"
                    className="bg-gray-50 border-gray-200 text-gray-900 rounded-lg focus:border-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address.country" className="text-gray-700 text-xs font-semibold">
                    Country
                  </Label>
                  <Input
                    id="address.country"
                    name="address.country"
                    value={formData.address.country}
                    onChange={handleChange}
                    placeholder="e.g. India"
                    className="bg-gray-50 border-gray-200 text-gray-900 rounded-lg focus:border-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address.pincode" className="text-gray-700 text-xs font-semibold">
                    Pincode
                  </Label>
                  <Input
                    id="address.pincode"
                    name="address.pincode"
                    value={formData.address.pincode}
                    onChange={handleChange}
                    placeholder="e.g. 831001"
                    className="bg-gray-50 border-gray-200 text-gray-900 rounded-lg focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

        </CardContent>
        <CardFooter className="bg-white/40 border-t border-gray-200 px-6 py-4 flex justify-end">
          <Button
            type="submit"
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-5 py-2.5 flex items-center gap-2 shadow-lg hover:shadow-blue-500/20 active:scale-[0.98] transition-all"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving Changes...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Organization Config
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
