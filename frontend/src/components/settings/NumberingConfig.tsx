"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Hash, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface SequenceConfig {
  prefix: string;
  separator: string;
  digits: number;
  includeYear: boolean;
}

interface NumberingSettings {
  items: SequenceConfig;
  purchaseOrders: SequenceConfig;
  grn: SequenceConfig;
  issueVouchers: SequenceConfig;
  transfers: SequenceConfig;
  vendors: SequenceConfig;
  warehouses: SequenceConfig;
}

const defaultSequence: SequenceConfig = {
  prefix: "",
  separator: "",
  digits: 5,
  includeYear: false,
};

export default function NumberingConfig() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<NumberingSettings>({
    items: { ...defaultSequence, prefix: "ITM-", includeYear: true },
    purchaseOrders: { ...defaultSequence, prefix: "PO-", includeYear: true },
    grn: { ...defaultSequence, prefix: "GRN-", includeYear: true },
    issueVouchers: { ...defaultSequence, prefix: "IV-", includeYear: true },
    transfers: { ...defaultSequence, prefix: "TRF-", includeYear: true },
    vendors: { ...defaultSequence, prefix: "VND-", digits: 3 },
    warehouses: { ...defaultSequence, prefix: "WH-", digits: 2 },
  });

  useEffect(() => {
    async function fetchNumbering() {
      try {
        const res = await fetch("/api/settings/numbering");
        const json = await res.json();
        if (json.success && json.data) {
          setSettings(json.data);
        } else {
          toast.error("Failed to load numbering settings");
        }
      } catch (err) {
        console.error("Fetch numbering error:", err);
        toast.error("Error loading numbering layout");
      } finally {
        setLoading(false);
      }
    }
    fetchNumbering();
  }, []);

  const handleChange = (
    key: keyof NumberingSettings,
    field: keyof SequenceConfig,
    value: string | number | boolean
  ) => {
    setSettings((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value,
      },
    }));
  };

  const generatePreview = (config: SequenceConfig) => {
    const year = config.includeYear ? new Date().getFullYear().toString().slice(-2) : "";
    const seq = "1".padStart(config.digits, "0");
    return `${config.prefix || ""}${year}${seq}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/settings/numbering", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });

      const json = await res.json();
      if (json.success) {
        toast.success("Auto-numbering configuration updated successfully");
      } else {
        toast.error(json.error?.message || "Failed to update numbering configuration");
      }
    } catch (err) {
      console.error("Save numbering settings error:", err);
      toast.error("Error saving numbering formats");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
        <p className="text-gray-500 text-sm font-medium animate-pulse">Loading numbering setup...</p>
      </div>
    );
  }

  const sections: { key: keyof NumberingSettings; title: string }[] = [
    { key: "items", title: "Item Master (SKU)" },
    { key: "purchaseOrders", title: "Purchase Orders (PO)" },
    { key: "grn", title: "Goods Receipt Notes (GRN)" },
    { key: "issueVouchers", title: "Issue Vouchers (IV)" },
    { key: "transfers", title: "Stock Transfers (TRF)" },
    { key: "vendors", title: "Vendors (VND)" },
    { key: "warehouses", title: "Warehouses (WH)" },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="bg-white border-gray-200 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md">
        <CardHeader className="pb-4">
          <CardTitle className="text-gray-900 text-xl flex items-center gap-3 font-bold">
            <Hash className="w-6 h-6 text-blue-400" />
            Auto-Numbering Config
          </CardTitle>
          <CardDescription className="text-gray-500 text-sm">
            Set prefix tags, year identifiers, and digit lengths for automated transaction number generation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            {sections.map(({ key, title }) => {
              const config = settings[key];

              return (
                <div
                  key={key}
                  className="p-4 bg-gray-50/50 border border-gray-200 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-800 transition-colors"
                >
                  <div className="w-full md:w-1/4">
                    <h4 className="text-sm font-bold text-gray-900 tracking-wide">{title}</h4>
                    <div className="text-[10px] text-gray-400 font-mono mt-1 uppercase">
                      Code: {key}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-end gap-4 flex-1">
                    <div className="space-y-1.5 w-24">
                      <Label htmlFor={`${key}.prefix`} className="text-gray-500 text-[10px] font-semibold uppercase">
                        Prefix
                      </Label>
                      <Input
                        id={`${key}.prefix`}
                        value={config.prefix}
                        onChange={(e) => handleChange(key, "prefix", e.target.value)}
                        placeholder="e.g. PO-"
                        className="h-8 bg-gray-50 border-gray-200 text-gray-900 text-xs rounded-lg uppercase"
                      />
                    </div>

                    <div className="space-y-1.5 w-20">
                      <Label htmlFor={`${key}.digits`} className="text-gray-500 text-[10px] font-semibold uppercase">
                        Digits
                      </Label>
                      <Input
                        id={`${key}.digits`}
                        type="number"
                        min={2}
                        max={10}
                        value={config.digits}
                        onChange={(e) => handleChange(key, "digits", parseInt(e.target.value) || 2)}
                        className="h-8 bg-gray-50 border-gray-200 text-gray-900 text-xs rounded-lg"
                      />
                    </div>

                    <div className="flex items-center gap-2 h-8 pb-1">
                      <Checkbox
                        id={`${key}.includeYear`}
                        checked={config.includeYear}
                        onCheckedChange={(checked) => handleChange(key, "includeYear", !!checked)}
                        className="border-gray-200 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 rounded"
                      />
                      <Label
                        htmlFor={`${key}.includeYear`}
                        className="text-gray-700 text-xs font-semibold select-none cursor-pointer"
                      >
                        Add Year
                      </Label>
                    </div>
                  </div>

                  {/* Live Preview Display */}
                  <div className="p-3 bg-white/90 border border-blue-500/10 rounded-lg flex items-center justify-between gap-3 min-w-[150px] shadow-inner font-mono text-center md:text-right">
                    <div className="text-[9px] text-gray-400 uppercase tracking-widest text-left">
                      Next Code
                    </div>
                    <div className="text-xs font-bold text-blue-400 select-all tracking-wider">
                      {generatePreview(config)}
                    </div>
                  </div>
                </div>
              );
            })}
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
                Updating numbering formats...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Auto-Numbering Settings
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
