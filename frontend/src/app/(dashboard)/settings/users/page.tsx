import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import UsersClient from "./UsersClient";

export default async function UsersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <UsersClient
      currentRole={session.user.role}
      currentUserId={session.user.id}
    />
  );
}
