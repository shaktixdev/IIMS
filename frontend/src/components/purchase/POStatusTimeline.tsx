"use client";

import React from "react";
import { Check, Clock } from "lucide-react";

type POStatus = "draft" | "sent" | "partial" | "received" | "cancelled" | "closed";

const STEPS: { key: POStatus; label: string; description: string }[] = [
  { key: "draft", label: "Draft", description: "Created, items added" },
  { key: "sent", label: "Sent", description: "Dispatched to vendor" },
  { key: "partial", label: "Partial", description: "Some items received" },
  { key: "received", label: "Received", description: "All items received" },
];

const STATUS_ORDER: Record<POStatus, number> = {
  draft: 0, sent: 1, partial: 2, received: 3, cancelled: -1, closed: -2,
};

interface POStatusTimelineProps {
  status: POStatus;
  sentAt?: string;
  receivedAt?: string;
  cancelledAt?: string;
  closedAt?: string;
  createdAt?: string;
}

export default function POStatusTimeline({ status, sentAt, receivedAt, cancelledAt, closedAt, createdAt }: POStatusTimelineProps) {
  const currentOrder = STATUS_ORDER[status] ?? 0;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  if (status === "cancelled") {
    return (
      <div className="flex items-center gap-3 p-4 bg-red-950/20 border border-red-900/30 rounded-2xl">
        <div className="w-10 h-10 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">✕</div>
        <div>
          <p className="font-semibold text-red-400">Purchase Order Cancelled</p>
          {cancelledAt && <p className="text-xs text-gray-400">{formatDate(cancelledAt)}</p>}
        </div>
      </div>
    );
  }

  if (status === "closed") {
    return (
      <div className="flex items-center gap-3 p-4 bg-slate-800/20 border border-slate-700/30 rounded-2xl">
        <div className="w-10 h-10 rounded-full bg-slate-700/30 border border-slate-600/40 flex items-center justify-center text-gray-400">✓</div>
        <div>
          <p className="font-semibold text-gray-500">Purchase Order Closed</p>
          {closedAt && <p className="text-xs text-gray-400">{formatDate(closedAt)}</p>}
        </div>
      </div>
    );
  }

  const stepTimestamps: Record<string, string | undefined> = {
    draft: createdAt,
    sent: sentAt,
    partial: undefined,
    received: receivedAt,
  };

  return (
    <div className="relative">
      <div className="flex items-start gap-0">
        {STEPS.map((step, idx) => {
          const done = currentOrder > STATUS_ORDER[step.key];
          const active = status === step.key;
          const pending = currentOrder < STATUS_ORDER[step.key];

          return (
            <React.Fragment key={step.key}>
              <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
                {/* Circle */}
                <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                  done ? "bg-emerald-500/20 border-emerald-500 text-emerald-400" :
                  active ? "bg-blue-500/20 border-blue-500 text-blue-400 ring-4 ring-blue-500/10" :
                  "bg-white border-gray-200 text-gray-400"
                }`}>
                  {done ? <Check className="w-4 h-4" /> : active ? <Clock className="w-4 h-4 animate-pulse" /> : <span className="text-xs font-bold">{idx + 1}</span>}
                </div>

                {/* Label */}
                <div className="text-center px-1">
                  <p className={`text-xs font-bold ${done ? "text-emerald-400" : active ? "text-blue-300" : "text-gray-400"}`}>
                    {step.label}
                  </p>
                  <p className="text-[10px] text-gray-400 hidden sm:block">{step.description}</p>
                  {stepTimestamps[step.key] && (done || active) && (
                    <p className="text-[10px] text-gray-400 mt-0.5 hidden md:block">{formatDate(stepTimestamps[step.key])}</p>
                  )}
                </div>
              </div>

              {/* Connector */}
              {idx < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mt-5 mx-1 rounded-full transition-all ${currentOrder > STATUS_ORDER[STEPS[idx + 1].key] || done ? "bg-emerald-500/50" : currentOrder > STATUS_ORDER[step.key] ? "bg-gradient-to-r from-emerald-500/50 to-gray-200" : "bg-gray-200"}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
