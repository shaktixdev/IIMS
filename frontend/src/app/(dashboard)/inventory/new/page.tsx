import ItemForm from "@/components/inventory/ItemForm";
import { ChevronLeft, PackagePlus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "New Item Setup | IIMS",
  description: "Register a new product, raw material, or spare part in the Catalog",
};

export default function NewItemPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header banner */}
      <div className="flex flex-col border-b border-gray-200 pb-6">
        <div className="mb-2">
          <Link href="/inventory">
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-500 hover:text-gray-900 px-0 hover:bg-transparent text-xs gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to Catalog list
            </Button>
          </Link>
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
          <PackagePlus className="w-8 h-8 text-blue-500" />
          New Item Catalog Setup
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Complete the steps to configure pricing, measurement metrics, and alert limits
        </p>
      </div>

      {/* Render Wizard Form */}
      <ItemForm />
      
    </div>
  );
}
