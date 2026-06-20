"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plus, Trash2, Edit2, Grid, Layers, X, Save, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface Zone {
  _id: string;
  code: string;
  name: string;
  rows: number;
  columns: number;
}

interface ZoneManagerProps {
  warehouseId: string;
  initialZones: Zone[];
  onRefresh: () => void;
}

export default function ZoneManager({ warehouseId, initialZones, onRefresh }: ZoneManagerProps) {
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<Zone | null>(null);

  // Form states
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [rows, setRows] = useState(5);
  const [columns, setColumns] = useState(5);
  const [loading, setLoading] = useState(false);

  const handleAddZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) {
      toast.error("Code and Name are required.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/warehouses/${warehouseId}/zones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          name: name.trim(),
          rows: Number(rows),
          columns: Number(columns),
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Zone added successfully.");
        setAddOpen(false);
        setCode("");
        setName("");
        setRows(5);
        setColumns(5);
        onRefresh();
      } else {
        toast.error(json.error?.message || "Failed to add zone.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error creating zone.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingZone || !name.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/warehouses/${warehouseId}/zones/${editingZone._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          rows: Number(rows),
          columns: Number(columns),
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Zone updated successfully.");
        setEditOpen(false);
        setEditingZone(null);
        setName("");
        setRows(5);
        setColumns(5);
        onRefresh();
      } else {
        toast.error(json.error?.message || "Failed to update zone.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error updating zone.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteZone = async (zoneId: string, zoneCode: string) => {
    if (!confirm(`Are you sure you want to delete zone '${zoneCode}'? This cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/warehouses/${warehouseId}/zones/${zoneId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Zone ${zoneCode} deleted successfully.`);
        if (selectedZone?._id === zoneId) {
          setSelectedZone(null);
        }
        onRefresh();
      } else {
        toast.error(json.error?.message || "Failed to delete zone.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error deleting zone.");
    }
  };

  const startEdit = (zone: Zone) => {
    setEditingZone(zone);
    setName(zone.name);
    setRows(zone.rows || 0);
    setColumns(zone.columns || 0);
    setEditOpen(true);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Zone list side panel */}
      <Card className="lg:col-span-1 border-gray-200 shadow-md bg-white">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-md font-bold text-gray-900">Zones List</CardTitle>
            <CardDescription className="text-xs text-gray-400">Add or manage warehouse physical partitions</CardDescription>
          </div>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger render={<Button size="icon" className="h-8 w-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm" />}>
              <Plus className="w-4 h-4" />
            </DialogTrigger>
            <DialogContent className="bg-white text-gray-950 max-w-sm rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-base font-bold">Add Storage Zone</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddZone} className="space-y-4 pt-2">
                <div className="space-y-1">
                  <Label htmlFor="zoneCode" className="text-xs font-semibold text-gray-700">Zone Code (Unique Short Name)</Label>
                  <Input
                    id="zoneCode"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="e.g. ZA, COLD, DOCK"
                    className="uppercase bg-gray-50 border-gray-200"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="zoneName" className="text-xs font-semibold text-gray-700">Display Name</Label>
                  <Input
                    id="zoneName"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Cold Storage Room A"
                    className="bg-gray-50 border-gray-200"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 border-t border-gray-100 pt-3">
                  <div className="space-y-1">
                    <Label htmlFor="zoneRows" className="text-xs font-semibold text-gray-700">Layout Rows</Label>
                    <Input
                      id="zoneRows"
                      type="number"
                      value={rows}
                      onChange={(e) => setRows(Number(e.target.value))}
                      min={0}
                      max={50}
                      className="bg-gray-50 border-gray-200 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="zoneCols" className="text-xs font-semibold text-gray-700">Layout Columns</Label>
                    <Input
                      id="zoneCols"
                      type="number"
                      value={columns}
                      onChange={(e) => setColumns(Number(e.target.value))}
                      min={0}
                      max={50}
                      className="bg-gray-50 border-gray-200 font-mono"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                  <Button type="button" variant="outline" onClick={() => setAddOpen(false)} className="rounded-xl text-xs h-9">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading} className="bg-blue-600 text-white rounded-xl text-xs h-9">
                    Create Zone
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="space-y-2 max-h-[60vh] overflow-y-auto">
          {initialZones.length === 0 ? (
            <p className="text-xs text-gray-400 py-8 text-center">No zones defined yet. Create one to begin layout mapping.</p>
          ) : (
            initialZones.map((zone) => (
              <div
                key={zone._id}
                onClick={() => setSelectedZone(zone)}
                className={`p-3 border rounded-xl flex items-center justify-between cursor-pointer transition-all duration-150 ${
                  selectedZone?._id === zone._id
                    ? "border-blue-500 bg-blue-50/50 shadow-sm"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-extrabold bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">
                      {zone.code}
                    </span>
                    <h5 className="font-bold text-gray-800 text-sm leading-none">{zone.name}</h5>
                  </div>
                  {zone.rows > 0 && zone.columns > 0 ? (
                    <span className="text-[10px] text-gray-400 font-semibold uppercase flex items-center gap-1">
                      <Grid className="w-3 h-3 text-gray-400" />
                      {zone.rows} x {zone.columns} Grid ({zone.rows * zone.columns} Bins)
                    </span>
                  ) : (
                    <span className="text-[10px] text-amber-500 font-semibold uppercase flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 text-amber-400" /> No grid layout
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-gray-400 hover:text-blue-500 hover:bg-white"
                    onClick={() => startEdit(zone)}
                  >
                    <Edit2 className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-gray-400 hover:text-red-500 hover:bg-red-50"
                    onClick={() => handleDeleteZone(zone._id, zone.code)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Visual map viewer */}
      <Card className="lg:col-span-2 border-gray-200 shadow-md bg-white">
        <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-gray-100">
          <div>
            <CardTitle className="text-md font-bold text-gray-900">
              {selectedZone ? `Visual Layout Grid: ${selectedZone.name}` : "Select a Zone"}
            </CardTitle>
            <CardDescription className="text-xs text-gray-400">
              {selectedZone
                ? `Bin location format: ${selectedZone.code}-{Row}-{Column}`
                : "Choose a zone from the sidebar to view bin layouts"}
            </CardDescription>
          </div>
          {selectedZone && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-400 hover:text-gray-900 rounded-full"
              onClick={() => setSelectedZone(null)}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </CardHeader>
        <CardContent className="flex items-center justify-center p-6 min-h-[40vh]">
          {!selectedZone ? (
            <div className="text-center space-y-2 py-10">
              <Layers className="w-12 h-12 text-gray-300 mx-auto stroke-1 animate-pulse" />
              <p className="text-xs font-semibold text-gray-400">No zone selected. Click a zone from the list to display its bin matrix.</p>
            </div>
          ) : selectedZone.rows === 0 || selectedZone.columns === 0 ? (
            <div className="text-center space-y-4 py-8">
              <Grid className="w-12 h-12 text-amber-300 mx-auto stroke-1" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-gray-700">No Grid Dimensions Configured</p>
                <p className="text-[11px] text-gray-400">Please edit this zone to define rows and columns layout metrics.</p>
              </div>
              <Button onClick={() => startEdit(selectedZone)} className="bg-blue-600 text-white rounded-xl text-xs h-9">
                Configure Layout
              </Button>
            </div>
          ) : (
            <div className="w-full space-y-4">
              {/* Layout legend */}
              <div className="flex items-center gap-4 text-[10px] text-gray-400 font-semibold justify-end uppercase">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 bg-gray-50 border border-gray-200 rounded" />
                  Available Bin
                </div>
              </div>

              {/* Grid Scroll Area */}
              <div className="overflow-auto border border-gray-100 p-4 rounded-xl bg-gray-50/50 max-h-[50vh]">
                <div
                  className="grid gap-2 mx-auto"
                  style={{
                    gridTemplateColumns: `repeat(${selectedZone.columns}, minmax(55px, 1fr))`,
                    width: `${Math.max(selectedZone.columns * 65, 300)}px`,
                  }}
                >
                  {Array.from({ length: selectedZone.rows }).map((_, rIdx) =>
                    Array.from({ length: selectedZone.columns }).map((__, cIdx) => {
                      const rowNum = String(rIdx + 1).padStart(2, "0");
                      const colNum = String(cIdx + 1).padStart(2, "0");
                      const binCode = `${selectedZone.code}-${rowNum}-${colNum}`;
                      return (
                        <div
                          key={binCode}
                          className="bg-white border border-gray-200 hover:border-blue-400 hover:shadow-sm p-2 rounded-lg flex flex-col justify-between h-14 transition-all duration-100 cursor-pointer group"
                          title={`Bin locator coordinate: ${binCode}`}
                          onClick={() => toast.info(`Selected Bin: ${binCode}`)}
                        >
                          <span className="text-[8px] font-bold text-gray-400 font-mono tracking-tighter block group-hover:text-blue-500">
                            {selectedZone.code}
                          </span>
                          <span className="font-extrabold text-[11px] text-gray-800 text-center font-mono leading-none">
                            {rowNum}-{colNum}
                          </span>
                          <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full self-end mt-0.5" />
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Zone Dialog */}
      {editingZone && (
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="bg-white text-gray-950 max-w-sm rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">Edit Zone: {editingZone.code}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditZone} className="space-y-4 pt-2">
              <div className="space-y-1">
                <Label htmlFor="editZoneName" className="text-xs font-semibold text-gray-700">Display Name</Label>
                <Input
                  id="editZoneName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Cold Storage Room A"
                  className="bg-gray-50 border-gray-200"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3 border-t border-gray-100 pt-3">
                <div className="space-y-1">
                  <Label htmlFor="editZoneRows" className="text-xs font-semibold text-gray-700">Layout Rows</Label>
                  <Input
                    id="editZoneRows"
                    type="number"
                    value={rows}
                    onChange={(e) => setRows(Number(e.target.value))}
                    min={0}
                    max={50}
                    className="bg-gray-50 border-gray-200 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="editZoneCols" className="text-xs font-semibold text-gray-700">Layout Columns</Label>
                  <Input
                    id="editZoneCols"
                    type="number"
                    value={columns}
                    onChange={(e) => setColumns(Number(e.target.value))}
                    min={0}
                    max={50}
                    className="bg-gray-50 border-gray-200 font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditOpen(false);
                    setEditingZone(null);
                  }}
                  className="rounded-xl text-xs h-9"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="bg-blue-600 text-white rounded-xl text-xs h-9">
                  Save Changes
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
