"use client";

import { usePathname } from "next/navigation";
import { SubscribeForm } from "@/modules/people/public/SubscribeForm";
import { sendTrack, type TrackProps } from "./beacon";

/**
 * The newsletter block's subscribe form, plus an analytics beacon. Wraps the
 * people module's SubscribeForm untouched: the submit event bubbles to this
 * capturing listener, which fires a fire-and-forget track event before the
 * form action runs. Used only when the block author set a trackEvent.
 */
export function TrackedSubscribe({
  list,
  placeholder,
  cta,
  event,
  params,
}: {
  list: string;
  placeholder: string;
  cta: string;
  event: string;
  params?: TrackProps;
}) {
  const pathname = usePathname();
  return (
    <div
      onSubmitCapture={() => {
        sendTrack(event, pathname, params);
      }}
    >
      <SubscribeForm list={list} placeholder={placeholder} cta={cta} />
    </div>
  );
}
