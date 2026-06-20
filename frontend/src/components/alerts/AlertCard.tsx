import React from "react";
import { formatDistanceToNow } from "date-fns";
import { Check, Trash2, ArrowRight, AlertTriangle, AlertCircle, Info, Calendar } from "lucide-react";
import Link from "next/link";
import { AlertBadge } from "./AlertBadge";

export interface AlertData {
  _id: string;
  type: "low_stock" | "expiry_warning" | "po_overdue" | "delayed_delivery" | "info";
  title: string;
  message: string;
  item?: { _id: string; name: string; sku: string };
  warehouse?: { _id: string; name: string; code: string };
  referenceId?: string;
  referenceType?: string;
  status: "unread" | "read";
  severity: "info" | "warning" | "critical";
  createdAt: string;
}

interface AlertCardProps {
  alert: AlertData;
  onMarkAsRead?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function AlertCard({ alert, onMarkAsRead, onDelete }: AlertCardProps) {
  const isUnread = alert.status === "unread";
  
  const getSeverityIcon = () => {
    switch (alert.severity) {
      case "critical":
        return <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />;
      default:
        return <Info className="w-5 h-5 text-blue-600 shrink-0" />;
    }
  };

  const getActionLink = () => {
    if (alert.type === "po_overdue" && alert.referenceId) {
      return `/purchase-orders/${alert.referenceId}`;
    }
    if (alert.type === "low_stock" && alert.item?._id) {
      return `/inventory/${alert.item._id}`;
    }
    if (alert.type === "expiry_warning" && alert.item?._id) {
      return `/inventory/${alert.item._id}`;
    }
    return null;
  };

  const actionLink = getActionLink();

  return (
    <div
      className={`border rounded-xl p-4 flex gap-4 transition-all duration-200 bg-white ${
        isUnread
          ? "border-l-4 shadow-sm border-l-blue-500"
          : "opacity-75 hover:opacity-100 border-gray-100"
      } ${
        alert.severity === "critical" && isUnread ? "border-l-red-500 bg-red-50/20" : ""
      } ${
        alert.severity === "warning" && isUnread ? "border-l-amber-500 bg-amber-50/20" : ""
      }`}
    >
      {/* Icon based on severity */}
      <div className="mt-0.5">{getSeverityIcon()}</div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <h4 className={`text-sm font-semibold truncate text-gray-900 ${isUnread ? "font-bold" : ""}`}>
            {alert.title}
          </h4>
          <AlertBadge type={alert.type} severity={alert.severity} />
        </div>

        <p className="text-sm text-gray-600 mb-2 leading-relaxed">{alert.message}</p>

        <div className="flex items-center justify-between mt-3 text-xs text-gray-400">
          <div className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>
              {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Context/Navigation Action */}
            {actionLink && (
              <Link
                href={actionLink}
                className="inline-flex items-center gap-1 font-medium text-blue-600 hover:text-blue-800 transition-colors"
              >
                <span>View Details</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}

            {/* Read/Unread toggler */}
            {isUnread && onMarkAsRead && (
              <button
                onClick={() => onMarkAsRead(alert._id)}
                className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-800 font-medium transition-colors"
                title="Mark as Read"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Mark Read</span>
              </button>
            )}

            {/* Delete button */}
            {onDelete && (
              <button
                onClick={() => onDelete(alert._id)}
                className="inline-flex items-center gap-1 text-red-500 hover:text-red-700 font-medium transition-colors"
                title="Delete Alert"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
