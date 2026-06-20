"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  ArrowLeft, 
  ClipboardList, 
  Plus, 
  Search, 
  Filter, 
  Loader2,
  Calendar,
  RotateCcw
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Department {
  _id: string;
  name: string;
  code: string;
}

interface IssueVoucher {
  _id: string;
  ivNumber: string;
  requester: {
    name: string;
    departmentName: string;
  };
  warehouse: {
    name: string;
  };
  status: "issued" | "partial_return" | "fully_returned" | "draft" | "cancelled";
  createdAt: string;
  items: {
    item: {
      name: string;
    };
    issuedQty: number;
  }[];
}

export default function IssueVoucherListPage() {
  const [issues, setIssues] = useState<IssueVoucher[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [selectedDept, setSelectedDept] = useState("");

  const fetchIssues = () => {
    setLoading(true);
    const query = new URLSearchParams();
    if (search) query.append("search", search);
    if (status) query.append("status", status);
    if (selectedDept) query.append("department", selectedDept);

    fetch(`/api/issues?${query.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setIssues(data.data);
        } else {
          toast.error("Failed to load issue slips");
        }
      })
      .catch((err) => {
        console.error(err);
        toast.error("Error loading issue slips");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    // Load departments once
    fetch("/api/departments")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setDepartments(data.data);
      });
  }, []);

  // Fetch issues whenever filters change
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchIssues();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [search, status, selectedDept]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors mb-2">
            <Link href="/storekeeper" className="flex items-center"><ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard</Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <ClipboardList className="w-7 h-7 text-blue-500" /> Material Issue Vouchers
          </h1>
          <p className="text-gray-500 text-sm mt-1">Audit log of all materials issued to workers and helpers.</p>
        </div>
        <Link href="/storekeeper/issue/new">
          <button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center gap-2 h-10 px-4 text-sm font-semibold transition-all shadow-sm">
            <Plus className="w-4 h-4" /> New Material Issue
          </button>
        </Link>
      </div>

      {/* Filter panel */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Text Search */}
          <div className="space-y-1.5">
            <Label htmlFor="search" className="text-xs font-bold text-gray-400 uppercase tracking-wider">Search Vouchers</Label>
            <div className="relative">
              <Input
                id="search"
                type="text"
                placeholder="Search by Voucher # or worker name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-white border-gray-300 text-gray-900 rounded-xl pl-9"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* Status Filter */}
          <div className="space-y-1.5">
            <Label htmlFor="status" className="text-xs font-bold text-gray-400 uppercase tracking-wider">Status</Label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="flex h-10 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">All Statuses</option>
              <option value="issued">Issued (No Returns)</option>
              <option value="partial_return">Partial Returns</option>
              <option value="fully_returned">Fully Returned</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Department Filter */}
          <div className="space-y-1.5">
            <Label htmlFor="department" className="text-xs font-bold text-gray-400 uppercase tracking-wider">Department</Label>
            <select
              id="department"
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="flex h-10 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept._id} value={dept._id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* Vouchers Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-24 flex justify-center"><Loader2 className="w-10 h-10 animate-spin text-gray-300" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-3.5">Voucher #</th>
                  <th className="px-6 py-3.5">Date</th>
                  <th className="px-6 py-3.5">Worker Details</th>
                  <th className="px-6 py-3.5">Warehouse</th>
                  <th className="px-6 py-3.5 text-right">Items Count</th>
                  <th className="px-6 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {issues.map((issue) => (
                  <tr key={issue._id} className="hover:bg-gray-50/30 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-900">
                      <Link href={`/storekeeper/issue/${issue._id}`} className="text-blue-600 hover:underline">
                        {issue.ivNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(issue.createdAt).toLocaleDateString("en-IN")}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-900 font-semibold">{issue.requester.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{issue.requester.departmentName}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {issue.warehouse?.name}
                    </td>
                    <td className="px-6 py-4 text-right text-gray-600 font-mono">
                      {issue.items.length}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                        issue.status === "fully_returned" 
                          ? "bg-emerald-100 text-emerald-800" 
                          : issue.status === "partial_return" 
                          ? "bg-amber-100 text-amber-800" 
                          : "bg-blue-100 text-blue-800"
                      }`}>
                        {issue.status.replace("_", " ")}
                      </span>
                    </td>
                  </tr>
                ))}
                {issues.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                      <ClipboardList className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                      No issue vouchers match the search filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
