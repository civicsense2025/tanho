"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      router.push("/admin");
    } else {
      setError("Wrong password");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-4">
        <h1 className="text-sm uppercase tracking-widest text-[#444] mb-8">Admin</h1>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          placeholder="Password" autoFocus
          className="w-full bg-[#111] border border-[#1f1f1f] text-[#ededed] px-4 py-3 text-sm outline-none focus:border-[#333] transition-colors" />
        {error && <p className="text-red-500 text-xs">{error}</p>}
        <button type="submit" disabled={loading}
          className="w-full bg-[#ededed] text-[#0a0a0a] text-sm font-medium py-3 hover:bg-white transition-colors disabled:opacity-50">
          {loading ? "..." : "Enter"}
        </button>
      </form>
    </div>
  );
}
