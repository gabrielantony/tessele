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
 * silently. The privacy policy describes this measurement exactly while this
 * string is non-empty; it denied any measurement while this string was empty.
 * tests/layout/analytics.spec.mjs holds the pair together in both directions,
 * so neither can go live without the other.
 */
export const UMAMI_WEBSITE_ID: string = "f38cf6d2-cbbc-48e2-b712-a349c60c9848";

// Verbatim from the Umami Cloud dashboard snippet for this site.
export const UMAMI_SCRIPT_SRC = "https://cloud.umami.is/script.js";

/*
 * The one hostname the tracker may run on. This is what keeps localhost, the
 * Playwright run and any preview out of the data, without an environment switch
 * -- the tracker itself compares this against window.location.hostname.
 */
export const UMAMI_ALLOWED_DOMAIN = "tessele.com.br";

/*
 * The attribute that carries a section's key. Exported because two components
 * read it and a rename has to be one edit -- a missed literal does not fail the
 * build, it just stops measuring that section.
 */
export const SECTION_ATTRIBUTE = "data-analytics-section";

type EventData = Record<string, string | number>;

declare global {
  interface Window {
    umami?: { track: (event: string, data?: EventData) => void };
  }
}

/*
 * The key Umami documents for keeping your own visits out of your own data:
 * run `localStorage.setItem('umami.disabled', 1)` in the browser console, once
 * per browser.
 *
 * Checking it here rather than trusting the vendor script is the whole point.
 * That script honours the flag for the pageview it sends by itself, but
 * umami-software/umami#3031 reports it does NOT honour it for anything sent
 * through `umami.track()` -- which is every event this page produces. Without
 * this, opting out would remove the studio's own pageviews while leaving their
 * own section samples and CTA clicks in the numbers, which is worse than not
 * opting out at all: the ranking would be skewed by exactly the person reading
 * it.
 */
const OPT_OUT_KEY = "umami.disabled";

function optedOut(): boolean {
  try {
    return Boolean(window.localStorage.getItem(OPT_OUT_KEY));
  } catch {
    /*
     * Reading storage throws outright in a private window and wherever site
     * data is blocked. That is a browser refusing to answer, not a visitor
     * asking to be left out, so they are measured -- the same thing that
     * happens when the key is simply absent.
     */
    return false;
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
  if (optedOut()) return;
  window.umami?.track(event, data);
}
