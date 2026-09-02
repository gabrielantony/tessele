import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emits plain HTML/CSS/JS into out/ — no Node server at runtime.
  output: "export",

  // No basePath: the site is served at the root of tessele.com.br, the custom
  // domain declared in public/CNAME, so dev and production share the same URLs.

  // next/image has no optimizer in a static export.
  images: { unoptimized: true },

  // /route/ resolves to /route/index.html, which is how Pages serves files.
  trailingSlash: true,
};

export default nextConfig;
