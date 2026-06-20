"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Building2, 
  Tags, 
  Scale, 
  Hash, 
  ChevronRight,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarItem {
  name: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  description: string;
}

const sidebarItems: SidebarItem[] = [
  {
    name: "Organization",
    href: "/settings/organization",
    icon: Building2 as React.ComponentType<React.SVGProps<SVGSVGElement>>,
    description: "Company details, tax IDs, and logo",
  },
  {
    name: "Categories",
    href: "/settings/categories",
    icon: Tags as React.ComponentType<React.SVGProps<SVGSVGElement>>,
    description: "Item categories and custom attributes",
  },
  {
    name: "Units of Measure",
    href: "/settings/units",
    icon: Scale as React.ComponentType<React.SVGProps<SVGSVGElement>>,
    description: "Units of measurement and conversions",
  },
  {
    name: "Auto-Numbering",
    href: "/settings/numbering",
    icon: Hash as React.ComponentType<React.SVGProps<SVGSVGElement>>,
    description: "ID sequence formats and custom prefixes",
  },
];

const adminItems: SidebarItem[] = [
  {
    name: "User Management",
    href: "/settings/users",
    icon: Users as React.ComponentType<React.SVGProps<SVGSVGElement>>,
    description: "Manage system users and roles",
  },
];

interface SettingsSidebarProps {
  userRole?: string;
}

export default function SettingsSidebar({ userRole }: SettingsSidebarProps) {
  const pathname = usePathname();
  const isAdmin = userRole === "super_admin" || userRole === "admin";
  const allItems = isAdmin ? [...sidebarItems, ...adminItems] : sidebarItems;


  return (
    <aside className="w-full md:w-80 bg-white/40 border border-gray-200 rounded-2xl p-4 space-y-2 backdrop-blur-md">
      <div className="px-3 py-2 border-b border-gray-200 mb-4">
        <h2 className="text-lg font-bold text-gray-900 tracking-tight">System Settings</h2>
        <p className="text-xs text-gray-500 mt-1">Configure and customize IIMS platform</p>
      </div>

      <nav className="space-y-1">
        {allItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center justify-between p-3 rounded-xl transition-all duration-300 relative overflow-hidden",
                isActive
                  ? "bg-gradient-to-r from-blue-600/15 to-blue-500/5 text-blue-400 border border-blue-500/30"
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-100 border border-transparent"
              )}
            >
              {/* Left active line decoration */}
              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-r-lg" />
              )}

              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "p-2 rounded-lg transition-colors",
                    isActive
                      ? "bg-blue-600/10 text-blue-400"
                      : "bg-gray-50 text-gray-500 group-hover:text-gray-900 group-hover:bg-white"
                  )}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold tracking-wide">{item.name}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5 group-hover:text-gray-500 transition-colors">
                    {item.description}
                  </div>
                </div>
              </div>

              <ChevronRight
                className={cn(
                  "w-4 h-4 transition-transform duration-300",
                  isActive ? "text-blue-400 translate-x-0" : "text-gray-400 group-hover:text-gray-500 group-hover:translate-x-0.5"
                )}
              />
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
