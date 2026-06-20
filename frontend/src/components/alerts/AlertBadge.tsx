import React from "react";

interface AlertBadgeProps {
  type: "low_stock" | "expiry_warning" | "po_overdue" | "delayed_delivery" | "info";
  severity?: "info" | "warning" | "critical";
}

export function AlertBadge({ type, severity }: AlertBadgeProps) {
  const getColors = () => {
    if (severity === "critical") {
      return "bg-red-50 text-red-700 border-red-200";
    }
    if (severity === "warning") {
      return "bg-amber-50 text-amber-700 border-amber-200";
    }
    
    // Fallback to type specific colors
    switch (type) {
      case "low_stock":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "expiry_warning":
        return "bg-orange-50 text-orange-700 border-orange-200";
      case "po_overdue":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "delayed_delivery":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      default:
        return "bg-blue-50 text-blue-700 border-blue-200";
    }
  };

  const getLabel = () => {
    switch (type) {
      case "low_stock":
        return "Low Stock";
      case "expiry_warning":
        return "Expiry Warning";
      case "po_overdue":
        return "PO Overdue";
      case "delayed_delivery":
        return "Delayed Delivery";
      default:
        return "System Alert";
    }
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${getColors()}`}>
      {getLabel()}
    </span>
  );
}
