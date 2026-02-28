import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 280, 320, 384],
  },
};

export default nextConfig;
