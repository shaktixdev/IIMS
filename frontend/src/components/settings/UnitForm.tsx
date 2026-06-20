"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Scale, Plus, Save, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Unit {
  _id: string;
  name: string;
  symbol: string;
  type: "weight" | "length" | "volume" | "area" | "count" | "time" | "other";
  isActive: boolean;
}

export default function UnitForm() {
  const [loading, setLoading] = useState(true);
  const [units, setUnits] = useState<Unit[]>([]);
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const [newUnit, setNewUnit] = useState({
    name: "",
    symbol: "",
    type: "count" as const,
  });

  const fetchUnits = async () => {
    try {
      const res = await fetch("/api/units");
      const json = await res.json();
      if (json.success && json.data) {
        setUnits(json.data);
      }
    } catch (err) {
      console.error("Fetch units error:", err);
      toast.error("Error loading units list");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnits();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUnit.name || !newUnit.symbol) {
      toast.error("Name and Symbol are required");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/units", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newUnit),
      });

      const json = await res.json();
      if (json.success) {
        toast.success(`Unit '${newUnit.name}' created successfully`);
        setNewUnit({ name: "", symbol: "", type: "count" });
        setShowAddForm(false);
        fetchUnits();
      } else {
        toast.error(json.error?.message || "Failed to create unit");
      }
    } catch (err) {
      console.error("Create unit error:", err);
      toast.error("Error creating unit");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/units/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success("Unit status updated");
        fetchUnits();
      } else {
        toast.error("Failed to update status");
      }
    } catch (err) {
      console.error("Update unit status error:", err);
      toast.error("Error updating status");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
        <p className="text-gray-500 text-sm font-medium animate-pulse">Loading units of measure...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* List Card */}
      <Card className="lg:col-span-2 bg-white border-gray-200 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="text-gray-900 text-xl flex items-center gap-3 font-bold">
              <Scale className="w-6 h-6 text-blue-400" />
              Units of Measurement
            </CardTitle>
            <CardDescription className="text-gray-500 text-sm">
              Manage units and standard scaling factors for inventory items
            </CardDescription>
          </div>
          {!showAddForm && (
            <Button
              onClick={() => setShowAddForm(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl flex items-center gap-2 active:scale-[0.98] transition-transform"
            >
              <Plus className="w-4 h-4" />
              Add Unit
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <Table>
              <TableHeader className="bg-gray-50 border-b border-gray-200">
                <TableRow className="hover:bg-transparent border-gray-200">
                  <TableHead className="text-gray-500 font-semibold">Name</TableHead>
                  <TableHead className="text-gray-500 font-semibold">Symbol</TableHead>
                  <TableHead className="text-gray-500 font-semibold">Dimension Type</TableHead>
                  <TableHead className="text-gray-500 font-semibold text-center">Status</TableHead>
                  <TableHead className="text-gray-500 font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="bg-gray-50">
                {units.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-400 py-8 text-sm">
                      No units configured. Add a new unit to start.
                    </TableCell>
                  </TableRow>
                ) : (
                  units.map((unit) => (
                    <TableRow key={unit._id} className="hover:bg-gray-50/80 border-gray-200 transition-colors">
                      <TableCell className="font-semibold text-gray-900">{unit.name}</TableCell>
                      <TableCell className="font-mono text-blue-400 text-xs">{unit.symbol}</TableCell>
                      <TableCell className="capitalize text-gray-700 text-xs">{unit.type}</TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={
                            unit.isActive
                              ? "bg-emerald-600/10 text-emerald-400 border-emerald-500/20"
                              : "bg-red-600/10 text-red-400 border-red-500/20"
                          }
                        >
                          {unit.isActive ? "ACTIVE" : "INACTIVE"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          onClick={() => toggleStatus(unit._id, unit.isActive)}
                          className="h-8 px-2 hover:bg-white/80 text-xs text-gray-500 hover:text-gray-900"
                        >
                          {unit.isActive ? "Deactivate" : "Activate"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Creation panel on right */}
      {showAddForm && (
        <Card className="bg-white border-gray-200 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md h-fit animate-in slide-in-from-right duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-gray-900 text-md font-bold">New Unit Setup</CardTitle>
              <CardDescription className="text-gray-500 text-xs">Register a new packaging or measure scale</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowAddForm(false)}
              className="text-gray-400 hover:text-gray-900 hover:bg-slate-800 rounded-full"
            >
              <X className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="unit-name" className="text-gray-700 text-xs font-semibold">
                  Unit Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="unit-name"
                  value={newUnit.name}
                  onChange={(e) => setNewUnit((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Kilogram"
                  className="bg-gray-50 border-gray-200 text-gray-900 rounded-lg focus:border-blue-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit-symbol" className="text-gray-700 text-xs font-semibold">
                  Symbol / Tag <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="unit-symbol"
                  value={newUnit.symbol}
                  onChange={(e) => setNewUnit((prev) => ({ ...prev, symbol: e.target.value }))}
                  placeholder="e.g. kg"
                  className="bg-gray-50 border-gray-200 text-gray-900 rounded-lg focus:border-blue-500 font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-700 text-xs font-semibold">Dimension Type</Label>
                <Select
                  value={newUnit.type}
                  onValueChange={(val) => setNewUnit((prev) => ({ ...prev, type: val || "count" }))}
                >
                  <SelectTrigger className="w-full bg-gray-50 border-gray-200 text-gray-900 rounded-lg">
                    <SelectValue placeholder="Count" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200 text-gray-900">
                    <SelectItem value="weight">Weight (Mass)</SelectItem>
                    <SelectItem value="length">Length (Distance)</SelectItem>
                    <SelectItem value="volume">Volume (Fluid)</SelectItem>
                    <SelectItem value="area">Area (Square Size)</SelectItem>
                    <SelectItem value="count">Count (Discrete PCS)</SelectItem>
                    <SelectItem value="time">Time</SelectItem>
                    <SelectItem value="other">Other / Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="submit"
                disabled={saving}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-xl mt-4 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Unit
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
