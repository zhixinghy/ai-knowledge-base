// 一次性脚本:给落地页 hero 的 3D 机器人截一张静态海报,用作加载期占位。
// 复用系统已装的 Edge / Chrome(puppeteer-core,不下载 Chromium),与 md2pdf 同思路。
//   用法:确保 dev 在跑,然后 node scripts/shoot-poster.mjs [url]
//   可选:BROWSER_PATH="C:\\...\\chrome.exe" 指定浏览器
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const ROOT = path.resolve(fileURLToPath(import.meta.url), "../..");
const URL = process.argv[2] || "http://localhost:3000";
const OUT = path.join(ROOT, "public", "spline", "robot-poster.webp");

function findBrowser() {
  if (process.env.BROWSER_PATH) return process.env.BROWSER_PATH;
  const candidates = [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  ];
  for (const c of candidates) if (fs.existsSync(c)) return c;
  throw new Error("未找到 Edge / Chrome,请用 BROWSER_PATH 指定浏览器 exe。");
}

const exe = findBrowser();
console.log("浏览器:", exe);
console.log("目标页:", URL);

const browser = await puppeteer.launch({
  executablePath: exe,
  headless: true,
  // 软渲染 WebGL,无 GPU 也能出图(headless 下常见)
  args: [
    "--no-sandbox",
    "--ignore-gpu-blocklist",
    "--enable-webgl",
    "--use-gl=angle",
    "--use-angle=swiftshader",
  ],
});

try {
  const page = await browser.newPage();
  // 高清:大视口走桌面 lg 布局(左右分栏),deviceScaleFactor=2 出 2x 图
  await page.setViewport({ width: 1280, height: 860, deviceScaleFactor: 2 });
  await page.goto(URL, { waitUntil: "networkidle2", timeout: 90000 });

  // 等 Spline 把 <canvas> 画出来
  await page.waitForSelector("canvas", { timeout: 90000 });
  console.log("canvas 已出现,等待模型与贴图稳定…");
  // Spline 加载场景 + 解码贴图是异步的,固定多等几秒让画面稳定
  await new Promise((r) => setTimeout(r, 8000));

  const canvas = await page.$("canvas");
  if (!canvas) throw new Error("没找到 canvas");

  await canvas.screenshot({
    path: OUT,
    type: "webp",
    quality: 88,
    omitBackground: true, // 尽量保留透明背景,叠在黑卡上更自然
  });

  const kb = (fs.statSync(OUT).size / 1024).toFixed(0);
  console.log(`已保存:${OUT}  (${kb} KB)`);
} finally {
  await browser.close();
}
