import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, verifyToken } from "@/app/lib/auth";
import { AdminLogin } from "./AdminLogin";
import { AdminDashboard } from "./AdminDashboard";

export const metadata: Metadata = {
  title: "管理后台 | LX 矩阵",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const store = await cookies();
  const authed = verifyToken(store.get(ADMIN_COOKIE)?.value);

  return (
    <div className="mx-auto max-w-[1216px] px-5 py-12">
      {authed ? <AdminDashboard /> : <AdminLogin />}
    </div>
  );
}
