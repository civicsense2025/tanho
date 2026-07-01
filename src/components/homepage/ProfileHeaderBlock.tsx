import { Avatar } from "@/components/ui";

export interface ProfileHeaderProps {
  name: string;
  bio: string;
  avatarSrc: string;
}

export function ProfileHeaderBlock({ name, bio, avatarSrc }: ProfileHeaderProps) {
  return (
    <section style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-5)", marginBottom: "var(--space-12)" }}>
      <Avatar src={avatarSrc} name={name} size={96} />
      <div>
        <h1 style={{ margin: "0 0 var(--space-4)", fontSize: "var(--text-display)", fontWeight: 500, letterSpacing: "var(--tracking-tight)", color: "var(--text)" }}>
          {name}
        </h1>
        <p style={{ margin: 0, maxWidth: "36rem", fontSize: "var(--text-lg)", lineHeight: "var(--leading-relaxed)", color: "var(--text-muted)" }}>
          {bio}
        </p>
      </div>
    </section>
  );
}
