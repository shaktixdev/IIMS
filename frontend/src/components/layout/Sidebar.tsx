"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Building2,
  ShoppingCart,
  Warehouse,
  Settings,
  ChevronLeft,
  Menu,
  X,
  Tag,
  Ruler,
  LogOut,
  ArrowLeftRight,
  ClipboardList,
  RotateCcw,
  Tags,
  Scale,
  Hash,
  Users,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<any>;
  exact?: boolean;
  roles: string[];
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: "Operations",
    items: [
      { label: "Dashboard", href: "/", icon: LayoutDashboard, exact: true, roles: ["super_admin", "admin", "manager", "procurement", "store_keeper", "viewer"] },
      { label: "Inventory", href: "/inventory", icon: Package, roles: ["super_admin", "admin", "manager", "procurement", "store_keeper", "viewer"] },
      { label: "Vendors", href: "/vendors", icon: Building2, roles: ["super_admin", "admin", "manager", "procurement"] },
      { label: "Purchase Orders", href: "/purchase-orders", icon: ShoppingCart, roles: ["super_admin", "admin", "manager", "procurement"] },
      { label: "Warehouses", href: "/warehouses", icon: Warehouse, roles: ["super_admin", "admin", "manager"] },
      { label: "Material Issues", href: "/storekeeper/issue", icon: ClipboardList, roles: ["super_admin", "admin", "manager", "store_keeper"] },
      { label: "Returns Desk", href: "/storekeeper/returns", icon: RotateCcw, roles: ["super_admin", "admin", "manager", "store_keeper"] },
      { label: "Stock Transfers", href: "/transfers", icon: ArrowLeftRight, roles: ["super_admin", "admin", "manager", "store_keeper"] },
    ],
  },
  {
    title: "System Config",
    items: [
      { label: "Categories", href: "/settings/categories", icon: Tags, roles: ["super_admin", "admin"] },
      { label: "Units of Measure", href: "/settings/units", icon: Scale, roles: ["super_admin", "admin"] },
      { label: "Auto-Numbering", href: "/settings/numbering", icon: Hash, roles: ["super_admin", "admin"] },
      { label: "User Management", href: "/settings/users", icon: Users, roles: ["super_admin", "admin"] },
    ],
  },
];

const BOTTOM_ITEMS: NavItem[] = [
  { label: "Settings", href: "/settings/organization", icon: Settings, roles: ["super_admin", "admin"] },
];

interface SidebarProps {
  userName: string;
  userRole: string;
  userInitial: string;
}

export default function Sidebar({ userName, userRole, userInitial }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const filteredSections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => item.roles.includes(userRole)),
  })).filter((section) => section.items.length > 0);

  const filteredBottomItems = BOTTOM_ITEMS.filter((item) =>
    item.roles.includes(userRole)
  );

  const isActive = (href: string, exact = false) => {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  };

  const NavLink = ({ item }: { item: NavItem }) => {
    const active = isActive(item.href, item.exact);
    return (
      <Link
        href={item.href}
        onClick={() => setMobileOpen(false)}
        className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
          active
            ? "bg-blue-50 text-blue-600"
            : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
        }`}
      >
        <item.icon className={`w-5 h-5 transition-colors ${active ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600"}`} />
        <span>{item.label}</span>
      </Link>
    );
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-gray-100 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm">
          <svg viewBox="0 0 48 48" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <rect x="8" y="14" width="32" height="28" rx="3" />
            <path d="M8 22h32" />
            <path d="M16 6v8" />
            <path d="M32 6v8" />
          </svg>
        </div>
        <div>
          <p className="font-bold text-gray-900 text-sm leading-tight">EICPL</p>
          <p className="text-[10px] text-gray-400 font-medium">Inventory System</p>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {filteredSections.map((section) => (
          <div key={section.title} className="space-y-1">
            <span className="block px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
              {section.title}
            </span>
            <div className="space-y-1">
              {section.items.map((item) => (
                <NavLink key={item.href} item={item} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom Nav */}
      <div className="border-t border-gray-100 py-3 px-3 space-y-1">
        {filteredBottomItems.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Toggle */}
      <button
        onClick={() => setMobileOpen((o) => !o)}
        className="lg:hidden fixed top-4 left-4 z-50 w-10 h-10 bg-white border border-gray-200 rounded-xl flex items-center justify-center text-gray-500 hover:text-gray-900 shadow-sm"
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <aside
        className={`lg:hidden fixed top-0 left-0 h-full z-50 transition-transform duration-300 ease-out shadow-xl ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ width: "240px" }}
      >
        <SidebarContent />
      </aside>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col h-screen sticky top-0 shrink-0" style={{ width: "240px" }}>
        <SidebarContent />
      </aside>
    </>
  );
}
