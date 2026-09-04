/*
 * The single door to the audience-measurement vendor.
 *
 * Every event on this page goes through `track`, so no section ever touches the
 * vendor's global and swapping tools is editing this file. Same reason the
 * WhatsApp number lives in src/lib/whatsapp.ts instead of at seven call sites.
 */

/*
 * The website id the Umami dashboard issues for tessele.com.br.
 *
 * Public by design: it ships inside the delivered HTML, exactly like
 * WHATSAPP_NUMBER. It is not a secret and does not belong in an environment
 * variable -- that would mean a repository variable in deploy.yml to protect a
 * value the page hands to every visitor.
 *
 * Empty is the off switch, and it is load-bearing: with no id, layout.tsx
 * renders no script, window.umami never exists, and `track` below returns
 * silently. The privacy policy's claim that this site uses no audience
 * measurement is true exactly while this string is empty, and
 * tests/layout/analytics.spec.mjs is what holds those two files together.
 */
export const UMAMI_WEBSITE_ID: string = "";

// Umami Cloud's documented default. Phase 4 confirms the dashboard snippet:
// a wrong script path fails silently instead of surfacing a configuration error.
export const UMAMI_SCRIPT_SRC = "https://cloud.umami.is/script.js";

/*
 * The one hostname the tracker may run on. This is what keeps localhost, the
 * Playwright run and any preview out of the data, without an environment switch
 * -- the tracker itself compares this against window.location.hostname.
 */
export const UMAMI_ALLOWED_DOMAIN = "tessele.com.br";

type EventData = Record<string, string | number>;

declare global {
  interface Window {
    umami?: { track: (event: string, data?: EventData) => void };
  }
}

/*
 * Fire and forget. A missing vendor is the normal case, not an error --
 * development, an ad blocker, a measurement that is simply off -- so this
 * returns silently instead of throwing from inside a click handler or a scroll
 * callback, where an exception would break the thing being measured.
 */
export function track(event: string, data?: EventData): void {
  // A prerender has no window at all, and this is the one "vendor absent" case
  // that would throw rather than pass quietly -- layout.tsx imports this module
  // from the server, so the guard belongs here and not at the call sites.
  if (typeof window === "undefined") return;
  window.umami?.track(event, data);
}
