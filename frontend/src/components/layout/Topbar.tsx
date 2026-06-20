"use client";

import React from "react";
import { Search, LogOut } from "lucide-react";
import { AlertBell } from "@/components/alerts/AlertBell";

interface TopbarProps {
  userName: string;
  userRole: string;
  onSignOut: () => void;
}

export default function Topbar({ userName, userRole, onSignOut }: TopbarProps) {
  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-30 shrink-0">
      {/* Search Bar */}
      <div className="relative flex-1 max-w-lg pl-10 lg:pl-0">
        <Search className="absolute left-2 lg:left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search product, supplier, order"
          className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:bg-white focus:ring-1 focus:ring-blue-400/30 transition-all"
        />
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4 ml-4">
        {/* Notification Bell */}
        <AlertBell />

        {/* User Avatar */}
        <div className="flex items-center gap-3 pl-3 border-l border-gray-200">
          <div className="w-9 h-9 rounded-full overflow-hidden bg-blue-100 flex items-center justify-center text-blue-600 text-sm font-bold">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-gray-900 leading-tight">{userName}</p>
            <p className="text-[11px] text-gray-400 capitalize">{userRole?.replace("_", " ")}</p>
          </div>
        </div>

        {/* Sign Out */}
        <button
          onClick={() => onSignOut()}
          className="w-9 h-9 rounded-lg hover:bg-red-50 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
          title="Sign Out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
