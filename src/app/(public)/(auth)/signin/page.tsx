import { redirect } from "next/navigation";
import { getViewer } from "@/modules/people/viewer";
import { SigninForm } from "@/modules/people/public/SigninForm";

export const metadata = { title: "Sign in" };

export default async function SigninPage() {
  if (await getViewer()) redirect("/account");
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
      <SigninForm />
    </main>
  );
}
