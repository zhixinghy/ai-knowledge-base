import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // self-contained build artifact for deployment (server runs node server.js,
  // no npm install / build on the server)
  output: "standalone",

  // native / dynamically-required packages must not be bundled by Turbopack
  serverExternalPackages: [
    "@lancedb/lancedb",
    "@huggingface/transformers",
    "pdf-parse",
  ],

  // production uses DashScope embedding, so the local-BGE stack (transformers +
  // onnxruntime, hundreds of MB) is never used at runtime — keep it out of the
  // standalone bundle.
  outputFileTracingExcludes: {
    "/*": [
      "./node_modules/@huggingface/transformers/**",
      "./node_modules/onnxruntime-node/**",
    ],
  },
};

export default nextConfig;
