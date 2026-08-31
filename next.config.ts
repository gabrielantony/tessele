import type { NextConfig } from "next";

// GitHub Pages serves the site from a subpath, so the production build needs a
// basePath. Dev does not: keeping it empty means `npm run dev` stays at
// http://localhost:3000 instead of /tessele.
const basePath = process.env.NODE_ENV === "production" ? "/tessele" : "";

const nextConfig: NextConfig = {
  // Emits plain HTML/CSS/JS into out/ — no Node server at runtime.
  output: "export",
  basePath,
  // next/image has no optimizer in a static export.
  images: { unoptimized: true },
  // /route/ resolves to /route/index.html, which is how Pages serves files.
  trailingSlash: true,
};

export default nextConfig;
