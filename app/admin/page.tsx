import { cookies } from "next/headers";
import AdminPanel from "./AdminPanel";

export default function AdminPage() {
  const cookieStore = cookies();
  const initiallyAuthenticated = cookieStore.get("admin_session")?.value === "1";
  return <AdminPanel initiallyAuthenticated={initiallyAuthenticated} />;
}
