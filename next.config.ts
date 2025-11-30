import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ...tes autres options éventuelles

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
};

export default nextConfig;
