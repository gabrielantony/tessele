import localFont from "next/font/local";

// Both files are variable fonts covering the full 100–900 range, so one file per
// family serves every weight. next/font/local rewrites the URL for basePath and
// emits the preload tags, which is why the fonts are imported here instead of
// declared with @font-face in CSS — CSS cannot read the basePath.

export const raleway = localFont({
  src: "../fonts/raleway-latin.woff2",
  weight: "100 900",
  style: "normal",
  display: "swap",
  variable: "--font-raleway",
});

export const fraunces = localFont({
  src: "../fonts/fraunces-latin.woff2",
  weight: "100 900",
  style: "normal",
  display: "swap",
  variable: "--font-fraunces",
});
