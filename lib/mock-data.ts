import type { ModeConfig } from "./types";

// Mode presets (real config — drives the chat mode switcher, empty-state
// suggestions, and the per-mode system prompt on the server).
export const MODES: ModeConfig[] = [
  {
    id: "docs",
    label: "文档助手",
    tagline: "优先依据你上传的文档作答,并附上出处",
    suggestions: [
      "这份文档主要讲了什么?",
      "帮我总结核心要点",
      "文档里有哪些关键结论?",
    ],
  },
  {
    id: "support",
    label: "客服",
    tagline: "客服人设,结合公共知识库解答常见问题",
    suggestions: [
      "支持上传哪些文件格式?",
      "未登录能用吗?有什么限制?",
      "我上传的文档别人能看到吗?",
    ],
  },
  {
    id: "tools",
    label: "工具增强",
    tagline: "可调用联网搜索、计算器等工具完成复合任务",
    suggestions: [
      "1024 人民币按今天汇率是多少美元?",
      "今天有什么值得关注的新闻?",
      "帮我算一下这份报价的总价和税额",
    ],
  },
];
