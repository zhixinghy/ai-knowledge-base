"use client";

import { useRef, useState } from "react";
import { UploadIcon } from "../icons";
import { cn } from "@/lib/utils";

export function UploadZone({
  onFiles,
}: {
  onFiles: (files: File[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleFiles(list: FileList | null) {
    if (!list) return;
    const pdfs = Array.from(list).filter(
      (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"),
    );
    if (pdfs.length) onFiles(pdfs);
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors",
        dragging
          ? "border-accent bg-accent-soft/50"
          : "border-border-strong hover:border-accent/60 hover:bg-surface-2/50",
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <div
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-xl transition-colors",
          dragging ? "bg-accent text-accent-fg" : "bg-surface-2 text-muted",
        )}
      >
        <UploadIcon />
      </div>
      <p className="mt-4 text-sm font-medium">
        拖拽 PDF 到这里,或<span className="text-accent">点击选择</span>
      </p>
      <p className="mt-1 text-xs text-faint">
        支持多文件 · 仅 PDF · 上传后自动解析、切块并建立索引
      </p>
    </div>
  );
}
