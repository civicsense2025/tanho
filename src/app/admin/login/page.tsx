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
        <h1 className="text-sm uppercase tracking-widest mb-8" style={{ color: "var(--muted)" }}>Admin</h1>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          placeholder="Password" autoFocus
          className="w-full px-4 py-3 text-sm outline-none transition-colors"
          style={{ background: "var(--subtle)", border: "1px solid var(--border)", color: "var(--foreground)" }} />
        {error && <p className="text-red-500 text-xs">{error}</p>}
        <button type="submit" disabled={loading}
          className="w-full text-sm font-medium py-3 transition-colors disabled:opacity-50"
          style={{ background: "var(--foreground)", color: "var(--background)" }}>
          {loading ? "..." : "Enter"}
        </button>
      </form>
    </div>
  );
}
