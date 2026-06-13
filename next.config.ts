import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 自包含的部署产物(服务器直接 node server.js 运行,
  // 无需在服务器上 npm install / build)
  output: "standalone",

  // 原生 / 动态 require 的包不能被 Turbopack 打包
  serverExternalPackages: [
    "@lancedb/lancedb",
    "@huggingface/transformers",
    "pdf-parse",
    "@napi-rs/canvas",
  ],

  // 线上用 DashScope embedding,所以本地 BGE 那套(transformers +
  // onnxruntime,几百 MB)运行时根本用不到 —— 把它排除出 standalone 产物。
  outputFileTracingExcludes: {
    "/*": [
      "./node_modules/@huggingface/transformers/**",
      "./node_modules/onnxruntime-node/**",
    ],
  },

  // pdf-parse → pdfjs 会动态加载 @napi-rs/canvas(用于 DOMMatrix 等);
  // 依赖追踪抓不到它,因此为 ingest 路由强制把它(及其平台二进制)
  // 打进 standalone 产物。
  outputFileTracingIncludes: {
    "/api/ingest": [
      "./node_modules/@napi-rs/**/*",
      // pdfjs 动态加载 pdf.worker.mjs —— 依赖追踪抓不到它
      "./node_modules/pdfjs-dist/legacy/build/**/*",
    ],
  },
};

export default nextConfig;
