import React, { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface Department {
  _id: string;
  name: string;
  code: string;
}

interface RequesterFieldsProps {
  requester: {
    name: string;
    employeeId: string;
    department: string;
    departmentOther: string;
  };
  onChange: (field: string, value: string) => void;
  errors?: any;
}

export default function RequesterFields({ requester, onChange, errors }: RequesterFieldsProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOther, setIsOther] = useState(false);

  useEffect(() => {
    fetch("/api/departments")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setDepartments(data.data);
          // Check if current department is set to "other"
          if (requester.department === "other" || (!data.data.some((d: any) => d._id === requester.department) && requester.departmentOther)) {
            setIsOther(true);
          }
        }
      })
      .catch((err) => console.error("Error loading departments:", err))
      .finally(() => setLoading(false));
  }, [requester.department, requester.departmentOther]);

  const handleDeptChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === "other") {
      setIsOther(true);
      onChange("department", "");
    } else {
      setIsOther(false);
      onChange("department", val);
      onChange("departmentOther", "");
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Helper Name */}
        <div className="space-y-1.5">
          <Label className="text-sm font-semibold text-gray-700">Helper / Worker Name *</Label>
          <Input
            type="text"
            placeholder="e.g. Suresh Kumar"
            value={requester.name}
            onChange={(e) => onChange("name", e.target.value)}
            className="bg-white border-gray-300 text-gray-900 rounded-xl"
            required
          />
          {errors?.name && <span className="text-xs text-red-500">{errors.name}</span>}
        </div>

        {/* Employee ID */}
        <div className="space-y-1.5">
          <Label className="text-sm font-semibold text-gray-700">Employee ID / Badge #</Label>
          <Input
            type="text"
            placeholder="e.g. EMP-0293"
            value={requester.employeeId}
            onChange={(e) => onChange("employeeId", e.target.value)}
            className="bg-white border-gray-300 text-gray-900 rounded-xl"
          />
        </div>

        {/* Department Dropdown */}
        <div className="space-y-1.5 md:col-span-2">
          <Label className="text-sm font-semibold text-gray-700">Department *</Label>
          {loading ? (
            <div className="h-10 animate-pulse bg-gray-100 rounded-xl" />
          ) : (
            <select
              value={isOther ? "other" : requester.department}
              onChange={handleDeptChange}
              className="flex h-10 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              required
            >
              <option value="">Select a department</option>
              {departments.map((dept) => (
                <option key={dept._id} value={dept._id}>
                  {dept.name} ({dept.code})
                </option>
              ))}
              <option value="other">Other / Custom</option>
            </select>
          )}
          {errors?.department && <span className="text-xs text-red-500">{errors.department}</span>}
        </div>

        {/* Department Other Input */}
        {isOther && (
          <div className="space-y-1.5 md:col-span-2 animate-in slide-in-from-top-1 duration-200">
            <Label className="text-sm font-semibold text-gray-700">Specify Custom Department *</Label>
            <Input
              type="text"
              placeholder="e.g. Instrumentation & Controls"
              value={requester.departmentOther}
              onChange={(e) => onChange("departmentOther", e.target.value)}
              className="bg-white border-gray-300 text-gray-900 rounded-xl"
              required
            />
            {errors?.departmentOther && <span className="text-xs text-red-500">{errors.departmentOther}</span>}
          </div>
        )}

      </div>
    </div>
  );
}
