"use client";

import React from "react";
import { X, Building2, Star, Phone, Mail, MapPin, CreditCard, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface Vendor {
  _id: string;
  code: string;
  name: string;
  type: string;
  contact?: { person?: string; phone?: string; email?: string; alternatePhone?: string };
  address?: { line1?: string; line2?: string; city?: string; state?: string; pincode?: string; country?: string };
  gstin?: string;
  pan?: string;
  paymentTerms?: string;
  creditDays?: number;
  bankingDetails?: { bankName?: string; accountNumber?: string; ifscCode?: string; accountType?: string };
  rating: number;
  notes?: string;
  isActive: boolean;
  activePOsCount?: number;
}

interface VendorDetailDrawerProps {
  vendor: Vendor | null;
  open: boolean;
  onClose: () => void;
}

const TYPE_COLORS: Record<string, string> = {
  manufacturer: "bg-violet-500/15 text-violet-400 border-violet-500/20",
  distributor: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  trader: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  service: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`w-4 h-4 ${s <= Math.round(rating) ? "text-amber-400 fill-amber-400" : "text-gray-300"}`}
        />
      ))}
      <span className="text-xs text-gray-500 ml-1">{rating > 0 ? rating.toFixed(1) : "No rating"}</span>
    </div>
  );
}

export default function VendorDetailDrawer({ vendor, open, onClose }: VendorDetailDrawerProps) {
  const router = useRouter();

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div
        className={`fixed right-0 top-0 h-full w-full max-w-md bg-gray-50 border-l border-gray-200 z-50 transform transition-transform duration-300 ease-out flex flex-col shadow-2xl ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        {!vendor ? null : (
          <>
            {/* Header */}
            <div className="flex items-start justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600/30 to-blue-600/30 border border-violet-500/20 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-violet-400" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">{vendor.name}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md">{vendor.code}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-md border capitalize ${TYPE_COLORS[vendor.type] || "bg-slate-500/15 text-gray-500"}`}>{vendor.type}</span>
                  </div>
                </div>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-900 transition-colors p-1 rounded-lg hover:bg-gray-50">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-gray-300">

              {/* Rating */}
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-2">Vendor Rating</p>
                <StarRating rating={vendor.rating} />
              </div>

              {/* Contact */}
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-3">Contact Information</p>
                <div className="space-y-2">
                  {vendor.contact?.person && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="w-4 h-4 text-gray-400 shrink-0">👤</span>
                      <span className="text-gray-700">{vendor.contact.person}</span>
                    </div>
                  )}
                  {vendor.contact?.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                      <span className="text-gray-700">{vendor.contact.phone}</span>
                    </div>
                  )}
                  {vendor.contact?.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                      <a href={`mailto:${vendor.contact.email}`} className="text-blue-400 hover:text-blue-300">{vendor.contact.email}</a>
                    </div>
                  )}
                  {!vendor.contact?.person && !vendor.contact?.phone && !vendor.contact?.email && (
                    <p className="text-gray-400 text-xs">No contact details added</p>
                  )}
                </div>
              </div>

              {/* Address */}
              {(vendor.address?.line1 || vendor.address?.city) && (
                <div>
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-3">Address</p>
                  <div className="flex items-start gap-2 text-sm text-gray-700">
                    <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                    <div>
                      {vendor.address.line1 && <p>{vendor.address.line1}</p>}
                      {vendor.address.line2 && <p>{vendor.address.line2}</p>}
                      <p>{[vendor.address.city, vendor.address.state, vendor.address.pincode].filter(Boolean).join(", ")}</p>
                      {vendor.address.country && <p className="text-gray-400">{vendor.address.country}</p>}
                    </div>
                  </div>
                </div>
              )}

              {/* Tax Info */}
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-3">Tax & Compliance</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white border border-gray-200 rounded-xl p-3">
                    <p className="text-xs text-gray-400 mb-1">GSTIN</p>
                    <p className="text-sm font-mono text-gray-900">{vendor.gstin || "—"}</p>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-xl p-3">
                    <p className="text-xs text-gray-400 mb-1">PAN</p>
                    <p className="text-sm font-mono text-gray-900">{vendor.pan || "—"}</p>
                  </div>
                </div>
              </div>

              {/* Payment Terms */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white border border-gray-200 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-1">Payment Terms</p>
                  <p className="text-sm text-gray-900">{vendor.paymentTerms || "—"}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-1">Credit Days</p>
                  <p className="text-sm text-gray-900">{vendor.creditDays || 0} days</p>
                </div>
              </div>

              {/* Banking */}
              {(vendor.bankingDetails?.bankName || vendor.bankingDetails?.accountNumber) && (
                <div>
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-3">Banking Details</p>
                  <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-700">{vendor.bankingDetails.bankName}</span>
                    </div>
                    {vendor.bankingDetails.accountNumber && (
                      <p className="text-xs font-mono text-gray-500 pl-6">A/C: {vendor.bankingDetails.accountNumber}</p>
                    )}
                    {vendor.bankingDetails.ifscCode && (
                      <p className="text-xs font-mono text-gray-500 pl-6">IFSC: {vendor.bankingDetails.ifscCode}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Notes */}
              {vendor.notes && (
                <div>
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-2">Notes</p>
                  <p className="text-sm text-gray-700 bg-white border border-gray-200 rounded-xl p-3 leading-relaxed">{vendor.notes}</p>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="border-t border-gray-200 p-4 flex gap-3">
              <Button
                onClick={() => { onClose(); router.push(`/vendors/${vendor._id}`); }}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm h-9 flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                View Full Profile
              </Button>
              <Button
                onClick={() => { onClose(); router.push(`/purchase-orders/new?vendor=${vendor._id}`); }}
                className="flex-1 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 hover:text-gray-900 rounded-xl text-sm h-9"
              >
                Create PO
              </Button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
