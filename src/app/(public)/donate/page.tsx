import { notFound } from "next/navigation";
import { getDonationsSettings } from "@/modules/donations/donations-settings";
import { DonateForm } from "@/modules/donations/public/DonateForm";

export const metadata = { title: "Donate" };

export default async function DonatePage() {
  const settings = await getDonationsSettings();
  if (!settings.enabled) notFound();

  return (
    <div style={{ maxWidth: "var(--width-prose)", margin: "0 auto", padding: "var(--space-10) var(--gutter)" }}>
      <h1 style={{ fontSize: "var(--text-2xl)", marginBottom: "var(--space-3)" }}>{settings.heading}</h1>
      {settings.body ? (
        <p style={{ color: "var(--text-muted)", marginBottom: "var(--space-6)" }}>{settings.body}</p>
      ) : null}
      <DonateForm />
    </div>
  );
}
