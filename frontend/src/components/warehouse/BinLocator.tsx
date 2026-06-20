"use client";

import React, { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Zone {
  _id: string;
  code: string;
  name: string;
}

interface BinLocatorProps {
  zones: Zone[];
  initialValue?: string;
  onChange: (value: string) => void;
  label?: string;
}

export default function BinLocator({ zones, initialValue = "", onChange, label = "Bin Location Locator" }: BinLocatorProps) {
  // Parse initialValue (format: ZONE-ROW-BIN e.g., Z1-02-05 or Z1-2-5)
  const [selectedZone, setSelectedZone] = useState("");
  const [row, setRow] = useState("");
  const [bin, setBin] = useState("");

  useEffect(() => {
    if (initialValue) {
      const parts = initialValue.split("-");
      if (parts.length >= 1) setSelectedZone(parts[0]);
      if (parts.length >= 2) setRow(parts[1]);
      if (parts.length >= 3) setBin(parts[2]);
    }
  }, [initialValue]);

  // Propagate changes when fields update
  useEffect(() => {
    if (selectedZone) {
      const formattedRow = row.trim() ? String(row.trim()).padStart(2, "0") : "00";
      const formattedBin = bin.trim() ? String(bin.trim()).padStart(2, "0") : "00";
      onChange(`${selectedZone}-${formattedRow}-${formattedBin}`);
    } else {
      onChange("");
    }
  }, [selectedZone, row, bin, onChange]);

  return (
    <div className="space-y-1.5 p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
      <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">{label}</Label>
      <div className="grid grid-cols-3 gap-3">
        {/* Zone Selector */}
        <div className="space-y-1">
          <span className="text-[10px] font-semibold text-gray-400 uppercase">Zone</span>
          <Select value={selectedZone} onValueChange={(val) => setSelectedZone(val || "")}>
            <SelectTrigger className="bg-white border-gray-200 text-xs h-9 rounded-lg">
              <SelectValue placeholder="Zone" />
            </SelectTrigger>
            <SelectContent className="bg-white border-gray-200 text-gray-900 text-xs">
              {zones.map((zone) => (
                <SelectItem key={zone._id} value={zone.code}>
                  {zone.code} ({zone.name})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Row Input */}
        <div className="space-y-1">
          <span className="text-[10px] font-semibold text-gray-400 uppercase">Row</span>
          <Input
            value={row}
            onChange={(e) => setRow(e.target.value)}
            placeholder="01"
            className="bg-white border-gray-200 text-xs h-9 rounded-lg font-mono"
          />
        </div>

        {/* Bin Input */}
        <div className="space-y-1">
          <span className="text-[10px] font-semibold text-gray-400 uppercase">Bin/Shelf</span>
          <Input
            value={bin}
            onChange={(e) => setBin(e.target.value)}
            placeholder="05"
            className="bg-white border-gray-200 text-xs h-9 rounded-lg font-mono"
          />
        </div>
      </div>
      {selectedZone && (
        <div className="text-[10px] text-gray-400 font-bold bg-white border border-gray-100 p-1.5 rounded-md font-mono text-center select-none uppercase">
          Output: <span className="text-blue-500 font-extrabold">{selectedZone}-{row.trim() ? String(row.trim()).padStart(2, "0") : "00"}-{bin.trim() ? String(bin.trim()).padStart(2, "0") : "00"}</span>
        </div>
      )}
    </div>
  );
}
