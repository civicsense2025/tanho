import { redirect } from "next/navigation";
import { getViewer } from "@/modules/people/viewer";
import { getPeopleSettings } from "@/modules/people/people-settings";
import { JoinForm } from "@/modules/people/public/JoinForm";

export const metadata = { title: "Create account" };

export default async function JoinPage() {
  if (await getViewer()) redirect("/account");
  const settings = await getPeopleSettings();
  return (
    <main
      style={{
        minHeight: "60vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-10) var(--gutter)",
      }}
    >
      <JoinForm open={settings.signups === "open"} />
    </main>
  );
}
