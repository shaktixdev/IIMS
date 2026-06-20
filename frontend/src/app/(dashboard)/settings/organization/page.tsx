import OrganizationForm from "@/components/settings/OrganizationForm";

export const metadata = {
  title: "Organization Profile Settings | IIMS",
  description: "Configure your corporate profile details, GSTIN, PAN, and address",
};

export default function OrganizationSettingsPage() {
  return <OrganizationForm />;
}
