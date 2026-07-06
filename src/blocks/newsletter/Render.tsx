import type { RenderCtx } from "../types";
import { SubscribeForm } from "@/modules/people/public/SubscribeForm";
import { TrackedSubscribe } from "@/components/analytics/TrackedSubscribe";
import type { NewsletterContent } from "./fields";
import styles from "./newsletter.module.css";

/**
 * Subscribe band. Pure presentation + a client-island form (SubscribeForm)
 * that posts to subscribeAction — no data fetching happens here. When an
 * author sets trackEvent, the live-site form is wrapped so a submit fires an
 * analytics beacon (TrackedSubscribe); the editor canvas stays plain.
 *
 * `variant: "compact"` drops the bordered-card chrome for a footer-column-style
 * fit (small-caps muted label, no border/padding) — the `card` variant's
 * generous padding/h4 title looks broken squeezed into a footer's ~150-300px
 * column slot.
 */
export function RenderNewsletter({ content, ctx }: { content: NewsletterContent; ctx: RenderCtx }) {
  const compact = content.variant === "compact";
  const form =
    ctx.mode === "public" && content.trackEvent ? (
      <TrackedSubscribe
        list={content.list}
        placeholder={content.placeholder}
        cta={content.cta}
        event={content.trackEvent}
        params={content.params}
      />
    ) : (
      <SubscribeForm list={content.list} placeholder={content.placeholder} cta={content.cta} />
    );

  if (compact) {
    return (
      <div className={styles.compact} aria-label="Newsletter signup">
        {content.title ? <span className={styles.compactLabel}>{content.title}</span> : null}
        {content.body ? <p className={styles.compactBody}>{content.body}</p> : null}
        {form}
      </div>
    );
  }

  return (
    <section className={styles.band} aria-label="Newsletter signup">
      <h2 className={styles.title}>{content.title}</h2>
      {content.body ? <p className={styles.body}>{content.body}</p> : null}
      {form}
    </section>
  );
}
