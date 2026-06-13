// 把 docs/support/*.md 批量转成 PDF(供上传到「客服库」)。
//
// 复用系统已装的 Edge / Chrome 渲染(puppeteer-core,不下载 Chromium),
// 中文走系统字体。Windows 下一般无需配置;若检测不到浏览器,用环境变量指定:
//   BROWSER_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe" node scripts/md-to-pdf.mjs
//
// 输出到 docs/support/pdf/<同名>.pdf。

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import MarkdownIt from "markdown-it";
import puppeteer from "puppeteer-core";

const ROOT = path.resolve(fileURLToPath(import.meta.url), "../..");
const SRC_DIR = path.join(ROOT, "docs", "support");
const OUT_DIR = path.join(SRC_DIR, "pdf");

// 在常见安装路径里找一个可用的 Chromium 内核浏览器(Edge 在 Win10 基本必有)。
function findBrowser() {
  if (process.env.BROWSER_PATH) return process.env.BROWSER_PATH;
  const candidates = [
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ];
  return candidates.find((p) => fs.existsSync(p)) ?? null;
}

const md = new MarkdownIt({ html: false, linkify: true, typographer: false });

// 打印用样式:A4、中文字体、表格边框、合理留白。
function htmlShell(title, body) {
  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><title>${title}</title>
<style>
  @page { size: A4; margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body {
    font-family: "Microsoft YaHei", "PingFang SC", "Hiragino Sans GB",
      "Noto Sans CJK SC", sans-serif;
    color: #1a1a17; font-size: 13px; line-height: 1.75; margin: 0;
  }
  h1 { font-size: 24px; margin: 0 0 16px; border-bottom: 2px solid #e5e5df; padding-bottom: 8px; }
  h2 { font-size: 17px; margin: 22px 0 8px; }
  h3 { font-size: 15px; margin: 16px 0 6px; }
  p, li { margin: 6px 0; }
  ul, ol { padding-left: 22px; }
  strong { color: #000; }
  blockquote {
    margin: 10px 0; padding: 6px 14px; border-left: 3px solid #c9c9bf;
    background: #f6f6f3; color: #56564e;
  }
  table { border-collapse: collapse; width: 100%; margin: 10px 0; }
  th, td { border: 1px solid #d6d6cd; padding: 6px 10px; text-align: left; }
  th { background: #efefea; }
  code { background: #efefea; padding: 1px 5px; border-radius: 4px; font-size: 12px; }
</style></head>
<body>${body}</body></html>`;
}

async function main() {
  if (!fs.existsSync(SRC_DIR)) {
    console.error(`找不到目录:${SRC_DIR}`);
    process.exit(1);
  }
  const files = fs
    .readdirSync(SRC_DIR)
    .filter((f) => f.toLowerCase().endsWith(".md"))
    .sort();
  if (files.length === 0) {
    console.error("docs/support 下没有 .md 文件");
    process.exit(1);
  }

  const exe = findBrowser();
  if (!exe) {
    console.error(
      "未找到 Edge / Chrome。请用 BROWSER_PATH 环境变量指定浏览器 exe 路径后重试。",
    );
    process.exit(1);
  }
  console.log(`使用浏览器:${exe}`);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await puppeteer.launch({ executablePath: exe, headless: true });
  try {
    let ok = 0;
    const failed = [];
    for (const file of files) {
      const src = fs.readFileSync(path.join(SRC_DIR, file), "utf8");
      const title = file.replace(/\.md$/i, "");
      const html = htmlShell(title, md.render(src));

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "load" });
      const out = path.join(OUT_DIR, `${title}.pdf`);
      try {
        await page.pdf({ path: out, format: "A4", printBackground: true });
        console.log(`✓ ${file} → pdf/${title}.pdf`);
        ok++;
      } catch (e) {
        // 目标 PDF 被占用(在阅读器里打开着)等情况:跳过,不中断整批
        const busy = e?.code === "EBUSY" || e?.code === "EPERM";
        console.warn(
          `✗ ${file} 写入失败${busy ? "(文件被占用,请关闭该 PDF 后重试)" : ""}:${e?.message ?? e}`,
        );
        failed.push(file);
      } finally {
        await page.close();
      }
    }

    console.log(`\n完成 ${ok}/${files.length},输出在 ${OUT_DIR}`);
    if (failed.length) {
      console.warn(`未生成:${failed.join(", ")}`);
      process.exitCode = 1;
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
