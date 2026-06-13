import type { ModeConfig } from "./types";

// Mode presets (real config — drives the chat mode switcher, empty-state
// suggestions, and the per-mode system prompt on the server).
export const MODES: ModeConfig[] = [
  {
    id: "docs",
    label: "文档助手",
    tagline: "针对你上传的文档作答,逐句标注出处",
    suggestions: [
      "这份文档的核心结论是什么?",
      "总结第二章的关键要点",
      "文中提到的部署步骤有哪些?",
    ],
  },
  {
    id: "support",
    label: "客服",
    tagline: "预置知识库 + 客服人设,回答用户常见问题",
    suggestions: [
      "你们的退款政策是怎样的?",
      "如何联系人工客服?",
      "会员到期后数据会保留多久?",
    ],
  },
  {
    id: "tools",
    label: "工具增强",
    tagline: "可调用联网搜索、计算器等工具完成复合任务",
    suggestions: [
      "1024 人民币按今天汇率是多少美元?",
      "搜索 2026 年向量数据库的最新进展",
      "帮我算一下这份报价的总价和税额",
    ],
  },
];
