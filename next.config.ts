import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Ensure this project directory is treated as the app root
    root: __dirname,
  },
};

export default nextConfig;
