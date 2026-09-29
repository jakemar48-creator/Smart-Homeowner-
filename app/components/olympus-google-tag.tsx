'use client';

import Script from 'next/script';

const MEASUREMENT_ID = 'G-57J13Q204N';

/** Loads GA4 only for the Olympus roofing campaign and its confirmation page. */
export default function OlympusGoogleTag() {
  return <>
    <Script async src={`https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`} strategy="afterInteractive" />
    <Script
      id="olympus-google-tag"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', '${MEASUREMENT_ID}');`,
      }}
    />
  </>;
}
