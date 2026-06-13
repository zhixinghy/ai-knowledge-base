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
    "@napi-rs/canvas",
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

  // pdf-parse → pdfjs loads @napi-rs/canvas dynamically (for DOMMatrix etc.);
  // tracing misses it, so force-include it (+ its platform binary) in the
  // standalone bundle for the ingest route.
  outputFileTracingIncludes: {
    "/api/ingest": ["./node_modules/@napi-rs/**/*"],
  },
};

export default nextConfig;
