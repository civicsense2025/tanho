"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

export function LogoutButton() {
  const router = useRouter();
  async function logout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/admin/login");
  }
  return (
    <Button variant="ghost" size="sm" uppercase onClick={logout}>
      Log out
    </Button>
  );
}
