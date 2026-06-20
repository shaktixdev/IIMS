import React from "react";
import { Settings } from "lucide-react";
import { auth } from "@/lib/auth/auth";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Settings Header */}
      <div className="flex flex-col border-b border-gray-200 pb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <Settings className="w-7 h-7 text-blue-500" />
          Settings
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Admin configurations for organizational structures, categories, units, and document identifiers
        </p>
      </div>

      {/* Settings Content */}
      <div className="w-full">{children}</div>

    </div>
  );
}

