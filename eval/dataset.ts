// 评估数据集:一个自包含的「迷你知识库」+ 带标准答案的问题。
// 自包含 = 不依赖你上传过什么,谁来跑结果都一样(可复现,这点很重要)。
//
// 每个 passage 是一段独立资料(相当于一个 chunk),有唯一 id。
// 每个 question 标注了「正确答案藏在哪个 passage」(relevant)。
// 评估脚本就靠这个标注,判断检索有没有把对的片段排进前几名。
//
// 设计了几处「陷阱」:字面词重叠但答非所问(比如「导出」同时出现在 a2 和 d2),
// 用来体现重排序相比纯向量的价值。

export interface Passage {
  id: string;
  docId: string;
  docName: string;
  page: number;
  text: string;
}

export interface Question {
  q: string;
  /** 能回答该问题的 passage id(可多个) */
  relevant: string[];
}

export const PASSAGES: Passage[] = [
  // 《产品定价手册》
  { id: "a1", docId: "A", docName: "产品定价手册", page: 1, text: "云笔记 Pro 提供三档套餐:免费版、专业版(每月 29 元)、团队版(每人每月 59 元)。免费版适合个人轻量使用。" },
  { id: "a2", docId: "A", docName: "产品定价手册", page: 2, text: "专业版包含无限笔记、100GB 存储和 PDF 导出;团队版在专业版基础上增加成员协作、细粒度权限管理和审计日志。" },
  { id: "a3", docId: "A", docName: "产品定价手册", page: 3, text: "所有付费套餐均支持按年订阅,选择年付可享受 8 折优惠,相当于免费多用两个多月。" },

  // 《退款与账单政策》
  { id: "b1", docId: "B", docName: "退款与账单政策", page: 1, text: "新用户首次购买付费套餐后,14 天内可无理由申请全额退款。" },
  { id: "b2", docId: "B", docName: "退款与账单政策", page: 2, text: "退款申请审核通过后,款项将在 5 个工作日内原路退回到原支付账户。" },
  { id: "b3", docId: "B", docName: "退款与账单政策", page: 3, text: "通过苹果 App Store 购买的订阅,退款需在 App Store 内申请,本平台无法直接处理。" },

  // 《数据安全与隐私》
  { id: "c1", docId: "C", docName: "数据安全与隐私", page: 1, text: "云笔记 Pro 的所有数据采用 AES-256 加密存储,数据传输使用 TLS 1.3 协议保护。" },
  { id: "c2", docId: "C", docName: "数据安全与隐私", page: 2, text: "我们已通过 SOC 2 Type II 与 ISO 27001 安全认证,数据中心位于杭州和新加坡。" },
  { id: "c3", docId: "C", docName: "数据安全与隐私", page: 3, text: "用户可随时在「账户设置 - 隐私」页面导出或永久删除自己的全部个人数据。" },

  // 《常见问题 FAQ》
  { id: "d1", docId: "D", docName: "常见问题 FAQ", page: 1, text: "忘记密码怎么办?在登录页点击「忘记密码」,系统会通过你的注册邮箱发送重置链接。" },
  { id: "d2", docId: "D", docName: "常见问题 FAQ", page: 2, text: "云笔记 Pro 支持的导出格式包括 Markdown、PDF 和 HTML 三种。" },
  { id: "d3", docId: "D", docName: "常见问题 FAQ", page: 3, text: "客户端方面,桌面端支持 Windows 和 macOS,移动端支持 iOS 和 Android。" },
];

export const QUESTIONS: Question[] = [
  { q: "专业版多少钱一个月?", relevant: ["a1"] },
  { q: "团队版比专业版多了哪些功能?", relevant: ["a2"] },
  { q: "按年付费有折扣吗?", relevant: ["a3"] },
  { q: "买了之后不满意能退钱吗?", relevant: ["b1"] },
  { q: "退款大概多久能到账?", relevant: ["b2"] },
  { q: "我是在苹果商店订阅的,怎么退款?", relevant: ["b3"] },
  { q: "你们的数据是加密保存的吗?", relevant: ["c1"] },
  { q: "通过了哪些安全合规认证?", relevant: ["c2"] },
  { q: "怎样彻底删除我的所有个人数据?", relevant: ["c3"] },
  { q: "登录密码忘记了如何找回?", relevant: ["d1"] },
  { q: "笔记可以导出成哪些格式?", relevant: ["d2"] },
  { q: "手机上能用吗?支持安卓系统吗?", relevant: ["d3"] },
  { q: "你们的服务器/数据中心在什么地方?", relevant: ["c2"] },
  { q: "一共有几种套餐可以选?", relevant: ["a1"] },
  { q: "笔记数量有上限吗?", relevant: ["a2"] },
];
