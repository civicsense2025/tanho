"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();
  async function logout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/admin/login");
  }
  return <button onClick={logout} className="text-xs text-[#444] hover:text-[#666] transition-colors">Sign out</button>;
}
