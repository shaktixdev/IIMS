"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Check, Clock, X, AlertTriangle } from "lucide-react";

interface User {
  name: string;
}

interface TransferData {
  status: "draft" | "in_transit" | "received" | "cancelled" | "partial";
  dispatchDate?: string;
  dispatchedBy?: User | string;
  receivedDate?: string;
  receivedBy?: User | string;
  createdAt: string;
}

interface TransferStatusBarProps {
  transfer: TransferData;
}

export default function TransferStatusBar({ transfer }: TransferStatusBarProps) {
  const { status, dispatchDate, dispatchedBy, receivedDate, receivedBy, createdAt } = transfer;

  const getPerformerName = (performer: any) => {
    if (typeof performer === "object" && performer !== null) {
      return performer.name;
    }
    return "System / Staff";
  };

  const steps = [
    {
      key: "draft",
      label: "Draft Created",
      sub: new Date(createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }),
      completed: true,
    },
    {
      key: "in_transit",
      label: "Dispatched",
      sub: dispatchDate
        ? new Date(dispatchDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) + ` by ${getPerformerName(dispatchedBy)}`
        : "Awaiting Dispatch",
      completed: ["in_transit", "received", "partial"].includes(status),
    },
    {
      key: "received",
      label: status === "partial" ? "Partially Received" : "Received",
      sub: receivedDate
        ? new Date(receivedDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) + ` by ${getPerformerName(receivedBy)}`
        : "Awaiting Receipt",
      completed: ["received", "partial"].includes(status),
    },
  ];

  if (status === "cancelled") {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center justify-between">
        <div className="space-y-1">
          <span className="text-xs font-bold text-red-500 uppercase tracking-wider block">Transfer State</span>
          <h4 className="font-extrabold text-sm text-red-800 flex items-center gap-1.5">
            <X className="w-5 h-5" /> THIS TRANSFER WAS CANCELLED
          </h4>
          <p className="text-[11px] text-red-600">Stock items were not dispatched or have been returned back to the source warehouse.</p>
        </div>
        <Badge className="bg-red-600 hover:bg-red-700 text-white border-0 font-bold uppercase rounded-lg">
          Cancelled
        </Badge>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-4">
      {/* Upper info */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <span className="text-xs text-gray-500 font-semibold">Transfer Lifecycle Tracker</span>
        <div className="flex items-center gap-2">
          {status === "draft" && (
            <Badge className="bg-gray-100 text-gray-600 border border-gray-250 font-bold uppercase rounded-lg">Draft Mode</Badge>
          )}
          {status === "in_transit" && (
            <Badge className="bg-blue-50 text-blue-600 border border-blue-200 font-bold uppercase rounded-lg flex items-center gap-1">
              <Clock className="w-3 h-3 animate-spin" /> In Transit
            </Badge>
          )}
          {status === "partial" && (
            <Badge className="bg-amber-50 text-amber-600 border border-amber-200 font-bold uppercase rounded-lg flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Received (Shortage)
            </Badge>
          )}
          {status === "received" && (
            <Badge className="bg-emerald-50 text-emerald-600 border border-emerald-200 font-bold uppercase rounded-lg flex items-center gap-1">
              <Check className="w-3 h-3" /> Fully Received
            </Badge>
          )}
        </div>
      </div>

      {/* Horizontal Steps */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pt-2">
        {steps.map((step, idx) => {
          const isLast = idx === steps.length - 1;
          const isCurrent =
            (status === "draft" && step.key === "draft") ||
            (status === "in_transit" && step.key === "in_transit") ||
            (["received", "partial"].includes(status) && step.key === "received");

          return (
            <React.Fragment key={step.key}>
              <div className="flex items-start gap-3 flex-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center border-2 shrink-0 transition-colors ${
                    step.completed
                      ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                      : "bg-white border-gray-200 text-gray-400"
                  } ${isCurrent ? "ring-4 ring-blue-50" : ""}`}
                >
                  {step.completed ? <Check className="w-4 h-4" /> : <span className="text-xs font-bold font-mono">{idx + 1}</span>}
                </div>
                <div className="space-y-0.5">
                  <p className={`text-xs font-extrabold ${step.completed ? "text-gray-900" : "text-gray-400"}`}>{step.label}</p>
                  <p className="text-[10px] text-gray-400 font-semibold">{step.sub}</p>
                </div>
              </div>
              {!isLast && <div className={`hidden md:block h-0.5 flex-1 mx-4 rounded ${step.completed ? "bg-blue-600" : "bg-gray-200"}`} />}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
