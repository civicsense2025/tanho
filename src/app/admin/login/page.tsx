"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input, Button } from "@/components/ui";

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
    <div style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <form onSubmit={handleSubmit} style={{ width: "var(--width-form)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <h1
          style={{
            margin: "0 0 var(--space-5)",
            fontFamily: "var(--font-label)",
            fontSize: "var(--text-sm)",
            textTransform: "uppercase",
            letterSpacing: "var(--tracking-widest)",
            color: "var(--text-muted)",
          }}
        >
          Admin
        </h1>
        <Input
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError("");
          }}
          placeholder="Password"
          autoFocus
          invalid={!!error}
        />
        {error && <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--danger)" }}>{error}</p>}
        <Button type="submit" disabled={loading} style={{ width: "100%" }}>
          {loading ? "…" : "Enter"}
        </Button>
      </form>
    </div>
  );
}
