"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Building2, ChevronRight, ChevronLeft, Save, Loader2, User, MapPin, CreditCard, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const STEPS = [
  { id: 1, label: "Basic Info", icon: Building2 },
  { id: 2, label: "Contact & Address", icon: User },
  { id: 3, label: "Financial", icon: CreditCard },
];

const GST_STATE_CODES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand",
  "West Bengal", "Delhi", "Jammu & Kashmir", "Ladakh",
];

export default function VendorForm() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    type: "" as "manufacturer" | "distributor" | "trader" | "service" | "",
    notes: "",
    contact: { person: "", phone: "", email: "", alternatePhone: "" },
    address: { line1: "", line2: "", city: "", state: "", pincode: "", country: "India" },
    gstin: "",
    pan: "",
    paymentTerms: "",
    creditDays: 0,
    bankingDetails: { bankName: "", accountNumber: "", ifscCode: "", accountType: "current" },
  });

  const set = (path: string, value: any) => {
    setFormData((prev) => {
      const parts = path.split(".");
      if (parts.length === 1) return { ...prev, [path]: value };
      const [top, sub] = parts;
      return { ...prev, [top]: { ...(prev as any)[top], [sub]: value } };
    });
  };

  const validateStep = (): boolean => {
    if (step === 1) {
      if (!formData.name.trim()) { toast.error("Vendor name is required."); return false; }
      if (!formData.type) { toast.error("Vendor type is required."); return false; }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          creditDays: Number(formData.creditDays),
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Vendor '${json.data.name}' created with code ${json.data.code}`);
        router.push(`/vendors/${json.data._id}`);
      } else {
        toast.error(json.error?.message || "Failed to create vendor.");
      }
    } catch (err) {
      toast.error("An error occurred while creating the vendor.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Step Indicator */}
      <div className="flex items-center gap-0">
        {STEPS.map((s, i) => (
          <React.Fragment key={s.id}>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${step === s.id ? "bg-blue-600 text-white" : step > s.id ? "text-emerald-400" : "text-gray-400"}`}>
              <s.icon className="w-4 h-4" />
              <span className="text-sm font-semibold hidden sm:block">{s.label}</span>
            </div>
            {i < STEPS.length - 1 && <ChevronRight className="w-4 h-4 text-gray-400 mx-1" />}
          </React.Fragment>
        ))}
      </div>

      {/* Step 1: Basic Info */}
      {step === 1 && (
        <Card className="bg-white border-gray-200 text-gray-900 rounded-2xl shadow-xl">
          <CardHeader>
            <CardTitle className="text-gray-900 font-bold flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-400" /> Basic Information
            </CardTitle>
            <CardDescription className="text-gray-500">Core details about this supplier or service provider.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-1.5">
              <Label className="text-gray-700 text-xs font-semibold">Vendor Name <span className="text-red-400">*</span></Label>
              <Input value={formData.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Tata Steel Limited"
                className="bg-gray-50 border-gray-200 text-gray-900 rounded-xl h-10 text-sm focus:border-blue-500/50" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-gray-700 text-xs font-semibold">Vendor Type <span className="text-red-400">*</span></Label>
              <Select value={formData.type} onValueChange={(v) => set("type", v)}>
                <SelectTrigger className="w-full bg-gray-50 border-gray-200 text-gray-900 rounded-xl h-10 text-sm">
                  <SelectValue placeholder="Select vendor type..." />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200 text-gray-900">
                  <SelectItem value="manufacturer">Manufacturer</SelectItem>
                  <SelectItem value="distributor">Distributor</SelectItem>
                  <SelectItem value="trader">Trader</SelectItem>
                  <SelectItem value="service">Service Provider</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-gray-700 text-xs font-semibold">Internal Notes</Label>
              <Textarea value={formData.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Any notes about this vendor..."
                className="bg-gray-50 border-gray-200 text-gray-900 rounded-xl text-sm h-24 placeholder-gray-400 focus:border-blue-500/50" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Contact & Address */}
      {step === 2 && (
        <Card className="bg-white border-gray-200 text-gray-900 rounded-2xl shadow-xl">
          <CardHeader>
            <CardTitle className="text-gray-900 font-bold flex items-center gap-2">
              <User className="w-5 h-5 text-blue-400" /> Contact & Address
            </CardTitle>
            <CardDescription className="text-gray-500">Primary contact person and physical address details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-gray-700 text-xs font-semibold">Contact Person</Label>
                <Input value={formData.contact.person} onChange={(e) => set("contact.person", e.target.value)} placeholder="Full name"
                  className="bg-gray-50 border-gray-200 text-gray-900 rounded-xl h-10 text-sm focus:border-blue-500/50" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-gray-700 text-xs font-semibold">Phone</Label>
                <Input value={formData.contact.phone} onChange={(e) => set("contact.phone", e.target.value)} placeholder="+91 98765 43210"
                  className="bg-gray-50 border-gray-200 text-gray-900 rounded-xl h-10 text-sm focus:border-blue-500/50" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-gray-700 text-xs font-semibold">Email</Label>
                <Input type="email" value={formData.contact.email} onChange={(e) => set("contact.email", e.target.value)} placeholder="vendor@example.com"
                  className="bg-gray-50 border-gray-200 text-gray-900 rounded-xl h-10 text-sm focus:border-blue-500/50" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-gray-700 text-xs font-semibold">Alternate Phone</Label>
                <Input value={formData.contact.alternatePhone} onChange={(e) => set("contact.alternatePhone", e.target.value)} placeholder="+91 ..."
                  className="bg-gray-50 border-gray-200 text-gray-900 rounded-xl h-10 text-sm focus:border-blue-500/50" />
              </div>
            </div>

            <hr className="border-gray-200" />

            <div className="space-y-1.5">
              <Label className="text-gray-700 text-xs font-semibold flex items-center gap-2"><MapPin className="w-3.5 h-3.5" />Address Line 1</Label>
              <Input value={formData.address.line1} onChange={(e) => set("address.line1", e.target.value)} placeholder="Building, Street"
                className="bg-gray-50 border-gray-200 text-gray-900 rounded-xl h-10 text-sm focus:border-blue-500/50" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-gray-700 text-xs font-semibold">Address Line 2</Label>
              <Input value={formData.address.line2} onChange={(e) => set("address.line2", e.target.value)} placeholder="Area, Landmark"
                className="bg-gray-50 border-gray-200 text-gray-900 rounded-xl h-10 text-sm focus:border-blue-500/50" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-gray-700 text-xs font-semibold">City</Label>
                <Input value={formData.address.city} onChange={(e) => set("address.city", e.target.value)} placeholder="Mumbai"
                  className="bg-gray-50 border-gray-200 text-gray-900 rounded-xl h-10 text-sm focus:border-blue-500/50" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-gray-700 text-xs font-semibold">State</Label>
                <Select value={formData.address.state} onValueChange={(v) => set("address.state", v)}>
                  <SelectTrigger className="w-full bg-gray-50 border-gray-200 text-gray-900 rounded-xl h-10 text-sm">
                    <SelectValue placeholder="State" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200 text-gray-900 max-h-48">
                    {GST_STATE_CODES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-gray-700 text-xs font-semibold">Pincode</Label>
                <Input value={formData.address.pincode} onChange={(e) => set("address.pincode", e.target.value)} placeholder="400001"
                  className="bg-gray-50 border-gray-200 text-gray-900 rounded-xl h-10 text-sm focus:border-blue-500/50" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Financial */}
      {step === 3 && (
        <Card className="bg-white border-gray-200 text-gray-900 rounded-2xl shadow-xl">
          <CardHeader>
            <CardTitle className="text-gray-900 font-bold flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-400" /> Financial Details
            </CardTitle>
            <CardDescription className="text-gray-500">Tax identifiers, payment terms, and banking information.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-gray-700 text-xs font-semibold">GSTIN</Label>
                <Input value={formData.gstin} onChange={(e) => set("gstin", e.target.value.toUpperCase())} placeholder="22AAAAA0000A1Z5" maxLength={15}
                  className="bg-gray-50 border-gray-200 text-gray-900 rounded-xl h-10 text-sm font-mono focus:border-blue-500/50" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-gray-700 text-xs font-semibold">PAN</Label>
                <Input value={formData.pan} onChange={(e) => set("pan", e.target.value.toUpperCase())} placeholder="AAAAA0000A" maxLength={10}
                  className="bg-gray-50 border-gray-200 text-gray-900 rounded-xl h-10 text-sm font-mono focus:border-blue-500/50" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-gray-700 text-xs font-semibold">Payment Terms</Label>
                <Select value={formData.paymentTerms} onValueChange={(v) => set("paymentTerms", v)}>
                  <SelectTrigger className="w-full bg-gray-50 border-gray-200 text-gray-900 rounded-xl h-10 text-sm">
                    <SelectValue placeholder="Select terms..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200 text-gray-900">
                    <SelectItem value="Advance">Advance</SelectItem>
                    <SelectItem value="Net 7">Net 7 Days</SelectItem>
                    <SelectItem value="Net 15">Net 15 Days</SelectItem>
                    <SelectItem value="Net 30">Net 30 Days</SelectItem>
                    <SelectItem value="Net 45">Net 45 Days</SelectItem>
                    <SelectItem value="Net 60">Net 60 Days</SelectItem>
                    <SelectItem value="COD">Cash on Delivery</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-gray-700 text-xs font-semibold">Credit Days</Label>
                <Input type="number" value={formData.creditDays} onChange={(e) => set("creditDays", parseInt(e.target.value) || 0)} min={0}
                  className="bg-gray-50 border-gray-200 text-gray-900 rounded-xl h-10 text-sm focus:border-blue-500/50" />
              </div>
            </div>

            <hr className="border-gray-200" />
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Banking Details (Optional)</p>
            <div className="space-y-1.5">
              <Label className="text-gray-700 text-xs font-semibold">Bank Name</Label>
              <Input value={formData.bankingDetails.bankName} onChange={(e) => set("bankingDetails.bankName", e.target.value)} placeholder="HDFC Bank"
                className="bg-gray-50 border-gray-200 text-gray-900 rounded-xl h-10 text-sm focus:border-blue-500/50" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-gray-700 text-xs font-semibold">Account Number</Label>
                <Input value={formData.bankingDetails.accountNumber} onChange={(e) => set("bankingDetails.accountNumber", e.target.value)} placeholder="123456789012"
                  className="bg-gray-50 border-gray-200 text-gray-900 rounded-xl h-10 text-sm font-mono focus:border-blue-500/50" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-gray-700 text-xs font-semibold">IFSC Code</Label>
                <Input value={formData.bankingDetails.ifscCode} onChange={(e) => set("bankingDetails.ifscCode", e.target.value.toUpperCase())} placeholder="HDFC0001234"
                  className="bg-gray-50 border-gray-200 text-gray-900 rounded-xl h-10 text-sm font-mono focus:border-blue-500/50" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-gray-700 text-xs font-semibold">Account Type</Label>
              <Select value={formData.bankingDetails.accountType} onValueChange={(v) => set("bankingDetails.accountType", v)}>
                <SelectTrigger className="w-full bg-gray-50 border-gray-200 text-gray-900 rounded-xl h-10 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200 text-gray-900">
                  <SelectItem value="current">Current Account</SelectItem>
                  <SelectItem value="savings">Savings Account</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => step > 1 ? setStep((s) => s - 1) : router.back()}
          className="text-gray-500 hover:text-gray-900 rounded-xl h-10 px-4 flex items-center gap-2">
          <ChevronLeft className="w-4 h-4" />
          {step > 1 ? "Previous" : "Cancel"}
        </Button>

        {step < STEPS.length ? (
          <Button onClick={() => { if (validateStep()) setStep((s) => s + 1); }}
            className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl h-10 px-5 flex items-center gap-2">
            Next <ChevronRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button disabled={saving} onClick={handleSubmit}
            className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl h-10 px-5 flex items-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Saving…" : "Create Vendor"}
          </Button>
        )}
      </div>
    </div>
  );
}
