"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { CheckCircle2, ShieldAlert, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface UserSnapshot {
  name: string;
  email: string;
}

interface PO {
  _id: string;
  poNumber: string;
  status: string;
  approvedBy?: UserSnapshot | null;
  updatedAt: string;
}

interface POApprovalBarProps {
  po: PO;
  onApprove?: () => void;
}

export default function POApprovalBar({ po, onApprove }: POApprovalBarProps) {
  const { data: session } = useSession();
  const [approving, setApproving] = useState(false);

  const userRole = session?.user?.role || "";
  const isManager = ["super_admin", "admin", "manager"].includes(userRole);
  const isDraft = po.status === "draft";
  const isApproved = !!po.approvedBy;

  if (!isDraft) {
    return null; // Approval bar is only relevant for draft state
  }

  const handleApprove = async () => {
    setApproving(true);
    try {
      const res = await fetch(`/api/purchase-orders/${po._id}/approve`, {
        method: "POST",
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Purchase order approved successfully.");
        onApprove?.();
      } else {
        toast.error(json.error?.message || "Failed to approve purchase order.");
      }
    } catch (err) {
      toast.error("Error connecting to server for PO approval.");
    } finally {
      setApproving(false);
    }
  };

  return (
    <div
      className={`border rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-300 ${
        isApproved
          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
          : "bg-amber-500/10 border-amber-500/20 text-amber-400"
      }`}
    >
      <div className="flex items-start sm:items-center gap-3">
        {isApproved ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 sm:mt-0 flex-shrink-0" />
        ) : (
          <ShieldAlert className="w-5 h-5 text-amber-500 mt-0.5 sm:mt-0 flex-shrink-0" />
        )}
        <div>
          <h4 className="font-extrabold text-sm tracking-wide">
            {isApproved ? "Approved by Management" : "Purchase Order Approval Pending"}
          </h4>
          <p className="text-xs text-gray-500 mt-0.5">
            {isApproved
              ? `Approved by ${po.approvedBy?.name || "Manager"} (${po.approvedBy?.email || ""}). Ready for dispatch.`
              : "This purchase order must be approved before it can be sent to the vendor."}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {!isApproved ? (
          isManager ? (
            <Button
              onClick={handleApprove}
              disabled={approving}
              className="bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold h-9 px-4 flex items-center gap-1.5 active:scale-[0.98] transition-transform shadow-lg"
            >
              {approving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Approving...
                </>
              ) : (
                <>
                  <CheckCircle className="w-3.5 h-3.5" />
                  Approve Order
                </>
              )}
            </Button>
          ) : (
            <span className="text-[11px] text-gray-400 italic">
              Awaiting manager review
            </span>
          )
        ) : (
          <span className="text-xs bg-emerald-500/20 text-emerald-400 font-bold px-3 py-1 rounded-full uppercase tracking-wider">
            Approved
          </span>
        )}
      </div>
    </div>
  );
}
