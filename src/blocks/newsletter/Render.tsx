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
 */
export function RenderNewsletter({ content, ctx }: { content: NewsletterContent; ctx: RenderCtx }) {
  return (
    <section className={styles.band} aria-label="Newsletter signup">
      <h2 className={styles.title}>{content.title}</h2>
      {content.body ? <p className={styles.body}>{content.body}</p> : null}
      {ctx.mode === "public" && content.trackEvent ? (
        <TrackedSubscribe
          list={content.list}
          placeholder={content.placeholder}
          cta={content.cta}
          event={content.trackEvent}
          params={content.params}
        />
      ) : (
        <SubscribeForm
          list={content.list}
          placeholder={content.placeholder}
          cta={content.cta}
        />
      )}
    </section>
  );
}
