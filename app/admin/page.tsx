"use client";

import { useRouter } from "next/navigation";
import AdminPanel from "./AdminPanel";

export default function AdminPage() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/login", { method: "DELETE" });
    localStorage.removeItem("adminAuthenticated");
    router.push("/admin/login");
  }

  return <AdminPanel onLogout={handleLogout} />;
}
