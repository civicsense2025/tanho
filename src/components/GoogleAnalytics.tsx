import Script from "next/script";

interface Props {
  measurementId?: string;
}

/** Renders nothing when NEXT_PUBLIC_GA_MEASUREMENT_ID is unset, so an unconfigured
 * checkout loads no third-party script and sends no data anywhere. */
export function GoogleAnalytics({ measurementId }: Props) {
  if (!measurementId) return null;

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`} strategy="afterInteractive" />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${measurementId}');
        `}
      </Script>
    </>
  );
}
