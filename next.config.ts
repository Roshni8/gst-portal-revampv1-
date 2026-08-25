import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // svg-captcha reads its bundled TTF at runtime; keep the package external so
  // __dirname continues to resolve to node_modules instead of the route bundle.
  serverExternalPackages: ["svg-captcha"],
  outputFileTracingIncludes: {
    "/api/captcha": ["./node_modules/svg-captcha/fonts/Comismsh.ttf"],
  },
};

export default nextConfig;
