/*
 * Every CTA on this page ends in the same WhatsApp conversation, so the number
 * and the URL encoding live here instead of at seven call sites -- one place to
 * change the number, one place that cannot forget to encode.
 *
 * The copy deliberately does NOT live here. Each section words its own message,
 * next to the section it belongs to, the same way each section already owns its
 * own data (the plans array, the FAQ items, the footer's link lists).
 */

// wa.me takes the number bare: country code, area code, digits. No +, no
// spaces, no punctuation -- anything else and it opens on a blank chat.
const WHATSAPP_NUMBER = "5547991994214";

// The prefix every CTA's href starts with, exported because
// WhatsappClickTracker matches on it: the module that builds the URL is the
// one that gets edited if WhatsApp ever changes the format, so the matcher has
// to be edited in the same place or it silently stops matching.
export const WHATSAPP_URL_PREFIX = "https://wa.me/";

export function whatsappHref(message: string) {
  return `${WHATSAPP_URL_PREFIX}${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
