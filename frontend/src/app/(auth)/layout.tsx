import React from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full flex bg-white">
      {/* Left Branding Panel */}
      <div className="hidden lg:flex lg:w-[45%] bg-gradient-to-br from-blue-50 via-blue-100/50 to-white relative items-center justify-center p-12">
        {/* Decorative shapes */}
        <div className="absolute top-12 left-12 w-20 h-20 rounded-2xl bg-blue-500/10 rotate-12" />
        <div className="absolute bottom-20 right-16 w-16 h-16 rounded-full bg-blue-400/10" />
        <div className="absolute top-1/3 right-20 w-8 h-8 rounded-lg bg-emerald-400/15 rotate-45" />
        
        <div className="text-center relative z-10">
          {/* Logo Icon */}
          <div className="w-28 h-28 mx-auto mb-8 rounded-3xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-xl shadow-blue-500/20">
            <svg viewBox="0 0 48 48" className="w-14 h-14 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="8" y="14" width="32" height="28" rx="3" />
              <path d="M8 22h32" />
              <path d="M16 6v8" />
              <path d="M32 6v8" />
              <path d="M18 30h12" />
              <path d="M18 36h8" />
            </svg>
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">EICPL</h2>
          <p className="text-base text-gray-500 mt-2 max-w-xs mx-auto leading-relaxed">
            Industrial Inventory Management System
          </p>
          
          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-2 mt-8">
            {["Stock Control", "Procurement", "Warehouse Ops"].map((f) => (
              <span key={f} className="bg-white border border-gray-200 text-gray-600 text-xs font-medium px-3 py-1.5 rounded-full shadow-sm">
                {f}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-white">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  );
}
