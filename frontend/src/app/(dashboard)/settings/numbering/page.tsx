import NumberingConfig from "@/components/settings/NumberingConfig";

export const metadata = {
  title: "Auto-Numbering Configuration | IIMS",
  description: "Configure code and sequence lengths for automatic transaction names",
};

export default function NumberingSettingsPage() {
  return <NumberingConfig />;
}
