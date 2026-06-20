"use client";

import React, { useEffect, useState } from "react";
import { Bell, CheckCircle2, Inbox } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useSocket } from "@/lib/socket/client";
import { AlertData } from "./AlertCard";

export function AlertBell() {
  const router = useRouter();
  const { socket } = useSocket();
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [shake, setShake] = useState(false);

  // Fetch initial alerts
  const fetchAlerts = async () => {
    try {
      const res = await fetch("/api/alerts?status=unread");
      const json = await res.json();
      if (json.success) {
        setAlerts(json.data.slice(0, 5));
        setUnreadCount(json.data.length);
      }
    } catch (err) {
      console.error("Error fetching alerts in bell:", err);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  // Listen to Socket.io events
  useEffect(() => {
    if (!socket) return;

    // Listen to new alerts
    socket.on("new-alert", (newAlert: AlertData) => {
      console.log("[Socket Client] Received new alert:", newAlert);
      
      setAlerts((prev) => {
        const filtered = prev.filter((a) => a._id !== newAlert._id);
        return [newAlert, ...filtered].slice(0, 5);
      });
      
      setUnreadCount((c) => c + 1);
      setShake(true);

      const toastOptions = {
        description: newAlert.message,
        action: {
          label: "View",
          onClick: () => {
            if (newAlert.type === "po_overdue" && newAlert.referenceId) {
              router.push(`/purchase-orders/${newAlert.referenceId}`);
            } else if (newAlert.type === "low_stock" && newAlert.item?._id) {
              router.push(`/inventory/${newAlert.item._id}`);
            } else {
              router.push("/alerts");
            }
          },
        },
      };

      if (newAlert.severity === "critical") {
        toast.error(newAlert.title, toastOptions);
      } else if (newAlert.severity === "warning") {
        toast.warning(newAlert.title, toastOptions);
      } else {
        toast.info(newAlert.title, toastOptions);
      }
    });

    // Listen for alert-read event to update badge count and list in real time
    socket.on("alert-read", (id: string) => {
      setAlerts((prev) => prev.filter((a) => a._id !== id));
      setUnreadCount((c) => Math.max(0, c - 1));
    });

    // Listen for alerts-all-read event to clear badge count and list
    socket.on("alerts-all-read", () => {
      setAlerts([]);
      setUnreadCount(0);
    });

    // Listen for alert-deleted event
    socket.on("alert-deleted", (payload: { id: string; wasUnread: boolean }) => {
      setAlerts((prev) => prev.filter((a) => a._id !== payload.id));
      if (payload.wasUnread) {
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    });

    return () => {
      socket.off("new-alert");
      socket.off("alert-read");
      socket.off("alerts-all-read");
      socket.off("alert-deleted");
    };
  }, [socket, router]);

  // Turn off bell shaking animation after 1s
  useEffect(() => {
    if (shake) {
      const timer = setTimeout(() => setShake(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [shake]);

  const markAllRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch("/api/alerts/mark-all-read", { method: "POST" });
      const json = await res.json();
      if (json.success) {
        setAlerts([]);
        setUnreadCount(0);
        toast.success("All alerts marked as read");
      }
    } catch (err) {
      console.error("Error marking all read:", err);
    }
  };

  const handleAlertClick = async (alert: AlertData) => {
    try {
      await fetch(`/api/alerts/${alert._id}/read`, { method: "PATCH" });
      
      setAlerts((prev) => prev.filter((a) => a._id !== alert._id));
      setUnreadCount((c) => Math.max(0, c - 1));

      if (alert.type === "po_overdue" && alert.referenceId) {
        router.push(`/purchase-orders/${alert.referenceId}`);
      } else if (alert.type === "low_stock" && alert.item?._id) {
        router.push(`/inventory/${alert.item._id}`);
      } else if (alert.type === "expiry_warning" && alert.item?._id) {
        router.push(`/inventory/${alert.item._id}`);
      } else {
        router.push("/alerts");
      }
    } catch (err) {
      console.error("Error handling alert click:", err);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="focus:outline-none">
        <div className={`relative w-10 h-10 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-all ${shake ? "animate-bounce" : ""}`}>
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white animate-pulse">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </div>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-80 bg-white border border-gray-200 shadow-xl rounded-xl p-1 z-50">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm font-bold text-gray-900">Notifications</span>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Mark all read</span>
            </button>
          )}
        </div>
        
        <DropdownMenuSeparator className="bg-gray-100" />
        
        <div className="max-h-72 overflow-y-auto">
          {alerts.length === 0 ? (
            <div className="py-6 text-center text-gray-400 flex flex-col items-center justify-center gap-1.5">
              <Inbox className="w-8 h-8 text-gray-300" />
              <span className="text-xs">No unread alerts</span>
            </div>
          ) : (
            alerts.map((alert) => (
              <DropdownMenuItem
                key={alert._id}
                onClick={() => handleAlertClick(alert)}
                className="flex flex-col items-start gap-1 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors border-b border-gray-50 last:border-b-0"
              >
                <div className="flex items-center gap-1.5 w-full">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${
                    alert.severity === "critical" ? "bg-red-500" :
                    alert.severity === "warning" ? "bg-amber-500" : "bg-blue-500"
                  }`} />
                  <span className="text-xs font-bold text-gray-900 truncate flex-1">
                    {alert.title}
                  </span>
                </div>
                <p className="text-xs text-gray-500 line-clamp-2 pl-3.5 leading-normal">
                  {alert.message}
                </p>
              </DropdownMenuItem>
            ))
          )}
        </div>
        
        <DropdownMenuSeparator className="bg-gray-100" />
        
        <DropdownMenuItem className="p-0">
          <Link
            href="/alerts"
            className="block text-center text-xs font-bold text-blue-600 hover:text-blue-800 py-2.5 w-full hover:bg-blue-50/50 rounded-b-lg transition-colors"
          >
            View All Notifications
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
