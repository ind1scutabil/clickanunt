"use client";

import Script from "next/script";

/**
 * Microsoft Clarity — production only, opt-in via env.
 *
 *   NEXT_PUBLIC_CLARITY_ID=your_project_id
 *
 * Loads after interactive; does not block first paint.
 */
export function MicrosoftClarity() {
  const id = process.env.NEXT_PUBLIC_CLARITY_ID?.trim();
  if (process.env.NODE_ENV !== "production" || !id) {
    return null;
  }

  return (
    <Script id="microsoft-clarity" strategy="afterInteractive">
      {`
(function(c,l,a,r,i,t,y){
  c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
  t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
  y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
})(window, document, "clarity", "script", "${id}");
`}
    </Script>
  );
}
