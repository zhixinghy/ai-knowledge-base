import type { Metadata } from "next";
import { Fraunces, Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import { AuthProvider } from "@/components/auth/auth-context";
import "./globals.css";

const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
  axes: ["opsz", "SOFT"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Cortex · 企业知识库智能助手",
  description:
    "基于 RAG + Agent 的企业知识库问答平台 —— PDF 文档入库、多场景问答、工具增强,一套内核四种场景。",
};

// Set theme before paint to avoid flash. Defaults to dark.
const themeScript = `
(function () {
  try {
    var t = localStorage.getItem('cortex-theme');
    if (t === 'light') { document.documentElement.classList.remove('dark'); }
    else { document.documentElement.classList.add('dark'); }
  } catch (e) {
    document.documentElement.classList.add('dark');
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${hanken.variable} ${fraunces.variable} ${jetbrains.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="grain min-h-full">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
