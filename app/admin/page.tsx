import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AdminPanel from "./AdminPanel";

export default async function AdminPage() {
  const cookieStore = cookies();
  if (cookieStore.get("admin_auth")?.value !== "authenticated") {
    redirect("/admin/login");
  }
  return <AdminPanel />;
}
