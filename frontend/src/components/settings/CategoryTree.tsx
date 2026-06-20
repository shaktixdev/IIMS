"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { 
  Folder, 
  FolderPlus, 
  ChevronDown, 
  ChevronRight, 
  Plus, 
  Trash2, 
  Save, 
  Loader2, 
  Tag, 
  Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

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
  slug: string;
  parent: string | null;
  description?: string;
  attributes: CategoryAttribute[];
  isActive: boolean;
}

// Nested node for visual rendering
interface TreeCategoryNode extends Category {
  children: TreeCategoryNode[];
}

export default function CategoryTree() {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Form State
  const [formName, setFormName] = useState("");
  const [formParent, setFormParent] = useState<string>("root");
  const [formDescription, setFormDescription] = useState("");
  const [formAttributes, setFormAttributes] = useState<CategoryAttribute[]>([]);

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/categories");
      const json = await res.json();
      if (json.success && json.data) {
        setCategories(json.data);
      }
    } catch (err) {
      console.error("Fetch categories error:", err);
      toast.error("Error loading categories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Construct Tree Hierarchy
  const buildTree = (list: Category[], parentId: string | null = null): TreeCategoryNode[] => {
    return list
      .filter((cat) => {
        if (parentId === null) {
          return !cat.parent;
        }
        return cat.parent === parentId;
      })
      .map((cat) => ({
        ...cat,
        children: buildTree(list, cat._id),
      }));
  };

  const treeNodes = buildTree(categories);

  const toggleExpand = (id: string) => {
    setExpandedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSelectNode = (cat: Category) => {
    setSelectedCategory(cat);
    setIsCreating(false);
    setFormName(cat.name);
    setFormParent(cat.parent || "root");
    setFormDescription(cat.description || "");
    setFormAttributes(cat.attributes || []);
  };

  const handleInitiateCreate = (parentId: string | null = null) => {
    setSelectedCategory(null);
    setIsCreating(true);
    setFormName("");
    setFormParent(parentId || "root");
    setFormDescription("");
    setFormAttributes([]);
  };

  // Attributes Config Handlers
  const addAttributeField = () => {
    setFormAttributes((prev) => [
      ...prev,
      { name: "", type: "text", required: false, unit: "", options: [] },
    ]);
  };

  const removeAttributeField = (index: number) => {
    setFormAttributes((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAttributeChange = (
    index: number,
    field: keyof CategoryAttribute,
    value: string | boolean | string[]
  ) => {
    setFormAttributes((prev) =>
      prev.map((attr, i) => (i === index ? { ...attr, [field]: value } : attr))
    );
  };

  const handleOptionsStringChange = (index: number, optionsStr: string) => {
    const options = optionsStr.split(",").map((s) => s.trim()).filter(Boolean);
    handleAttributeChange(index, "options", options);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName) {
      toast.error("Category name is required");
      return;
    }

    // Check for empty attribute names
    for (const attr of formAttributes) {
      if (!attr.name.trim()) {
        toast.error("All custom attributes must have a name");
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        name: formName,
        parent: formParent === "root" ? null : formParent,
        description: formDescription,
        attributes: formAttributes,
      };

      let res;
      if (isCreating) {
        res = await fetch("/api/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`/api/categories/${selectedCategory?._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const json = await res.json();
      if (json.success) {
        toast.success(
          isCreating
            ? `Category '${formName}' created successfully`
            : `Category '${formName}' updated successfully`
        );
        fetchCategories();
        if (isCreating) {
          setIsCreating(false);
          setSelectedCategory(json.data);
        } else {
          setSelectedCategory(json.data);
        }
      } else {
        toast.error(json.error?.message || "Failed to save category");
      }
    } catch (err) {
      console.error("Save category error:", err);
      toast.error("Error saving category");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCategory) return;
    if (!confirm("Are you sure you want to delete this category?")) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/categories/${selectedCategory._id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Category deleted successfully");
        setSelectedCategory(null);
        setIsCreating(false);
        fetchCategories();
      } else {
        toast.error(json.error?.message || "Failed to delete category");
      }
    } catch (err) {
      console.error("Delete category error:", err);
      toast.error("Error deleting category");
    } finally {
      setDeleting(false);
    }
  };

  // Recursive Tree Node Renderer
  const renderTreeNode = (node: TreeCategoryNode, depth = 0) => {
    const isExpanded = !!expandedNodes[node._id];
    const isSelected = selectedCategory?._id === node._id;
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node._id} className="space-y-1">
        <div
          style={{ paddingLeft: `${depth * 16}px` }}
          className={`group flex items-center justify-between p-2 rounded-xl transition-all duration-200 cursor-pointer ${
            isSelected
              ? "bg-blue-600/15 border border-blue-500/20 text-blue-400"
              : "hover:bg-gray-50/80 border border-transparent text-gray-700"
          }`}
          onClick={() => handleSelectNode(node)}
        >
          <div className="flex items-center gap-2">
            <div
              className="p-1 rounded hover:bg-white text-gray-400 hover:text-gray-900 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(node._id);
              }}
            >
              {hasChildren ? (
                isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )
              ) : (
                <Folder className="w-4 h-4 text-gray-400 shrink-0" />
              )}
            </div>
            <span className="text-sm font-semibold">{node.name}</span>
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="icon"
              variant="ghost"
              className="w-7 h-7 hover:bg-blue-600 hover:text-white rounded-lg"
              title="Add subcategory"
              onClick={(e) => {
                e.stopPropagation();
                handleInitiateCreate(node._id);
              }}
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="space-y-1 mt-1">
            {node.children.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
        <p className="text-gray-500 text-sm font-medium animate-pulse">Loading category tree...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Categories Tree Explorer */}
      <Card className="lg:col-span-1 bg-white border-gray-200 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md flex flex-col h-[600px]">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-gray-900 text-md font-bold flex items-center gap-2">
              <Tag className="w-5 h-5 text-blue-400" />
              Category Taxonomy
            </CardTitle>
            <CardDescription className="text-gray-500 text-xs">
              Explore and arrange category structures
            </CardDescription>
          </div>
          <Button
            size="icon"
            className="bg-blue-600 hover:bg-blue-500 rounded-xl"
            title="Create root category"
            onClick={() => handleInitiateCreate(null)}
          >
            <FolderPlus className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent className="overflow-y-auto flex-1 px-4 space-y-1 custom-scrollbar">
          {treeNodes.length === 0 ? (
            <div className="text-center text-gray-400 py-12 text-xs">
              No categories configured. Click + to add a category.
            </div>
          ) : (
            treeNodes.map((node) => renderTreeNode(node))
          )}
        </CardContent>
      </Card>

      {/* Editor Panel on right */}
      <Card className="lg:col-span-2 bg-white border-gray-200 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md flex flex-col h-[600px]">
        <CardHeader className="pb-4 border-b border-gray-200">
          <CardTitle className="text-gray-900 text-md font-bold flex items-center justify-between">
            <span>{isCreating ? "New Category Setup" : selectedCategory ? `Configure: ${selectedCategory.name}` : "Category Configurator"}</span>
            {!isCreating && selectedCategory && (
              <Button
                variant="destructive"
                size="sm"
                disabled={deleting}
                onClick={handleDelete}
                className="bg-red-600/10 hover:bg-red-600 border border-red-500/20 text-red-400 hover:text-white rounded-lg flex items-center gap-1.5 h-8"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </Button>
            )}
          </CardTitle>
          <CardDescription className="text-gray-500 text-xs">
            {isCreating ? "Set up parent reference, description, and properties for the new category" : selectedCategory ? "Edit metadata and custom attribute fields for product entries" : "Select a category node or create a new one to begin editing"}
          </CardDescription>
        </CardHeader>
        
        {(!selectedCategory && !isCreating) ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-2 p-6">
            <Settings className="w-12 h-12 text-gray-300 animate-pulse" />
            <p className="text-sm font-semibold">No category selected</p>
            <p className="text-xs text-gray-400 max-w-xs text-center">
              Click a category node in the tree list or click the add button to configure properties
            </p>
          </div>
        ) : (
          <form onSubmit={handleSave} className="flex-1 flex flex-col justify-between overflow-hidden">
            <CardContent className="overflow-y-auto flex-1 p-6 space-y-4 custom-scrollbar">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cat-name" className="text-gray-700 text-xs font-semibold">
                    Category Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="cat-name"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Fasteners"
                    className="bg-gray-50 border-gray-200 text-gray-900 rounded-lg focus:border-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-700 text-xs font-semibold">Parent Category</Label>
                  <Select
                    value={formParent}
                    onValueChange={(val) => setFormParent(val || "root")}
                  >
                    <SelectTrigger className="w-full bg-gray-50 border-gray-200 text-gray-900 rounded-lg">
                      <SelectValue placeholder="Root / None" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200 text-gray-900 max-h-[200px]">
                      <SelectItem value="root">None (Root Category)</SelectItem>
                      {categories
                        .filter((c) => c._id !== selectedCategory?._id)
                        .map((c) => (
                          <SelectItem key={c._id} value={c._id}>
                            {c.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cat-desc" className="text-gray-700 text-xs font-semibold">Description</Label>
                <Textarea
                  id="cat-desc"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Describe items in this category..."
                  className="bg-gray-50 border-gray-200 text-gray-900 rounded-lg focus:border-blue-500 min-h-[60px]"
                />
              </div>

              {/* Custom Attributes Fields Section */}
              <div className="space-y-3 pt-3 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Custom Attributes Schema
                  </h4>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addAttributeField}
                    className="border-dashed border-gray-200 hover:border-slate-700 bg-transparent text-gray-500 hover:text-gray-900 rounded-lg flex items-center gap-1.5 h-8 text-xs px-3"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Field
                  </Button>
                </div>

                {formAttributes.length === 0 ? (
                  <div className="text-center text-gray-400 py-6 text-xs bg-gray-50/20 rounded-xl border border-gray-200 border-dashed">
                    No custom attributes defined. Products in this category will use default parameters.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {formAttributes.map((attr, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-gray-50/50 border border-gray-200 rounded-xl space-y-3 animate-in fade-in duration-200"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-gray-500 text-[10px] uppercase font-bold">Field Name</Label>
                              <Input
                                value={attr.name}
                                onChange={(e) => handleAttributeChange(idx, "name", e.target.value)}
                                placeholder="e.g. Thread Pitch"
                                className="h-8 bg-gray-50 border-gray-200 text-gray-900 text-xs rounded-lg"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-gray-500 text-[10px] uppercase font-bold">Data Type</Label>
                              <Select
                                value={attr.type}
                                onValueChange={(val) => handleAttributeChange(idx, "type", val || "text")}
                              >
                                <SelectTrigger className="w-full h-8 bg-gray-50 border-gray-200 text-gray-900 text-xs rounded-lg">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-white border-gray-200 text-gray-900">
                                  <SelectItem value="text">Text (String)</SelectItem>
                                  <SelectItem value="number">Number</SelectItem>
                                  <SelectItem value="boolean">Yes/No (Boolean)</SelectItem>
                                  <SelectItem value="date">Date</SelectItem>
                                  <SelectItem value="select">Dropdown Choice (Select)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeAttributeField(idx)}
                            className="h-8 w-8 hover:bg-red-500/10 text-gray-400 hover:text-red-400 rounded-lg shrink-0 mt-4"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        {/* Extra configurations per type */}
                        <div className="flex flex-wrap items-center gap-4 pt-1 border-t border-gray-100">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`attr-req-${idx}`}
                              checked={attr.required}
                              onCheckedChange={(checked) => handleAttributeChange(idx, "required", !!checked)}
                              className="border-gray-200 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 rounded"
                            />
                            <Label htmlFor={`attr-req-${idx}`} className="text-gray-500 text-[10px] font-semibold select-none cursor-pointer">
                              Mark Required
                            </Label>
                          </div>

                          {attr.type === "number" && (
                            <div className="flex items-center gap-2">
                              <Label className="text-gray-500 text-[10px] font-semibold">Unit symbol (e.g. mm)</Label>
                              <Input
                                value={attr.unit || ""}
                                onChange={(e) => handleAttributeChange(idx, "unit", e.target.value)}
                                placeholder="e.g. mm"
                                className="h-6 w-20 bg-gray-50 border-gray-200 text-gray-900 text-xs rounded-lg"
                              />
                            </div>
                          )}

                          {attr.type === "select" && (
                            <div className="flex-1 flex items-center gap-2">
                              <Label className="text-gray-500 text-[10px] font-semibold shrink-0">Options (comma-separated)</Label>
                              <Input
                                value={(attr.options || []).join(", ")}
                                onChange={(e) => handleOptionsStringChange(idx, e.target.value)}
                                placeholder="e.g. High, Medium, Low"
                                className="h-6 bg-gray-50 border-gray-200 text-gray-900 text-xs rounded-lg"
                              />
                            </div>
                          )}
                        </div>

                      </div>
                    ))}
                  </div>
                )}
              </div>

            </CardContent>
            <CardFooter className="bg-white/40 border-t border-gray-200 px-6 py-4 flex justify-end gap-3 shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSelectedCategory(null);
                  setIsCreating(false);
                }}
                className="border-gray-200 hover:bg-gray-50 text-gray-500 hover:text-gray-900 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-5 py-2.5 flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving Category...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Category
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        )}
      </Card>
      
    </div>
  );
}
