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

export function whatsappHref(message: string) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
