import CategoryTree from "@/components/settings/CategoryTree";

export const metadata = {
  title: "Categories Taxonomy Settings | IIMS",
  description: "Configure multi-level category trees and custom attributes for item specifications",
};

export default function CategoriesSettingsPage() {
  return <CategoryTree />;
}
