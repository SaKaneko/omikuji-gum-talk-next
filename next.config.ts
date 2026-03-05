import type { NextConfig } from "next";

const basePath = process.env.BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "standalone",
  basePath,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  images: {
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 280, 320, 384],
  },
};

export default nextConfig;
