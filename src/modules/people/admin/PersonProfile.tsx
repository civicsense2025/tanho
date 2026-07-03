import Link from "next/link";
import type { getPerson } from "../queries";
import { ProfileHeader } from "./ProfileHeader";
import { ActivityTimeline } from "./ActivityTimeline";
import { NotesEditor } from "./NotesEditor";
import { MembershipCard } from "./MembershipCard";
import { SubscriptionCard } from "./SubscriptionCard";
import { ContactCard } from "./ContactCard";
import { OrderHistory } from "./OrderHistory";
import { SocialsCard } from "./SocialsCard";
import styles from "./profile.module.css";

type ProfileData = NonNullable<Awaited<ReturnType<typeof getPerson>>>;

/** Person profile layout: header, two columns, and a sidebar of cards. */
export function PersonProfile({
  data,
  isOwner,
}: {
  data: ProfileData;
  isOwner: boolean;
}) {
  const { person, activity, memberships, subscriptions, orders } = data;
  const active = memberships.find((m) => m.status === "active") ?? null;

  return (
    <div className={styles.page}>
      <Link className={styles.back} href="/admin/people">
        ← People
      </Link>
      <ProfileHeader
        personId={person.id}
        name={person.name}
        email={person.email}
        kind={person.kind}
        status={person.status}
        isOwner={isOwner}
      />

      <div className={styles.grid}>
        <div className={styles.col}>
          <section className={styles.card}>
            <h3 className={styles.cardHead}>Activity</h3>
            <ActivityTimeline activity={activity} />
          </section>
          <section className={styles.card}>
            <h3 className={styles.cardHead}>Order history</h3>
            <OrderHistory orders={orders} />
          </section>
          <NotesEditor
            personId={person.id}
            initialNotes={person.notes}
            initialTags={person.tags ?? []}
          />
        </div>

        <aside className={styles.side}>
          <MembershipCard personId={person.id} membership={active} isOwner={isOwner} />
          <SubscriptionCard subscriptions={subscriptions} />
          <SocialsCard socials={person.socials ?? []} />
          <ContactCard
            personId={person.id}
            initial={{
              email: person.email,
              phone: person.phone,
              company: person.company,
              location: person.location,
            }}
          />
        </aside>
      </div>
    </div>
  );
}
