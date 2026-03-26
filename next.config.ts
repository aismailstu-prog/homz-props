import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      leaflet: "leaflet/dist/leaflet-src.esm.js",
    };
    return config;
  },
  turbopack: {}, // ✅ Add this to silence Turbopack warning
};

export default nextConfig;
