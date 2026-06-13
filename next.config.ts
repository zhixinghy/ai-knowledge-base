import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // native / dynamically-required packages must not be bundled by Turbopack
  serverExternalPackages: [
    "@lancedb/lancedb",
    "@huggingface/transformers",
    "pdf-parse",
  ],
};

export default nextConfig;
