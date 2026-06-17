# Cortex 项目——全栈求职准备

---

## 一、项目经历（简历用）

**项目名称**：企业级 AI 知识库助手平台（Cortex）

**技术栈**：Next.js 16 · React 19 · TypeScript · LanceDB · DeepSeek · Vercel AI SDK · Tailwind CSS 4

**项目描述**

独立设计并开发的企业级 RAG + Agent 知识库问答平台，支持私有文档入库、多场景智能问答与工具增强。采用全自托管架构，数据不出域，适合企业内部部署。

**核心职责与技术亮点**

- **RAG 检索系统**：实现完整的 Retrieval-Augmented Generation 流水线——PDF 解析 → 滑动窗口分块（500字/80字重叠）→ Embedding 向量化 → LanceDB 向量存储 → Cosine 相似度召回 → Cross-encoder 重排（DashScope gte-rerank-v2）→ 相关度阈值过滤，最终将 top-5 上下文片段注入 LLM prompt
- **可插拔 Embedding 架构**：通过单一环境变量在本地 BGE-small-zh（512维，离线）与阿里云 DashScope text-embedding-v3（1024维，高精度）间无缝切换，满足开发成本与生产精度的平衡
- **多模式 Agent 系统**：基于 Vercel AI SDK `streamText` 实现三种对话模式（私有文档问答 / 共享客服 / 工具增强），tools 模式接入计算器和 Tavily 联网搜索，支持最多 5 轮 tool-calling 链式推理
- **无状态认证方案**：基于 `jose` 实现 HS256 JWT + HttpOnly Cookie session，密码采用 `scrypt` + 随机 salt 哈希，支持管理员角色、匿名试用额度管控（签名 Cookie 追踪），兼顾安全性与分布式部署友好性
- **管理后台 & 使用分析**：设计并实现 `query_logs` 埋点体系，提供 14 天日活趋势、各模式使用占比、RAG 命中率、知识盲区 Top 10、高频提问 Top 10 等聚合指标，辅助运营决策
- **性能与部署优化**：配置 Next.js `output: standalone` 自包含产物；3D landing hero 场景文件预加载 + 加载期骨架占位；Settings 60 秒 TTL 缓存；LanceDB 90 天日志自动清理

**量化成果**

- 单文件最大支持处理 100 页以上 PDF，向量入库全程 < 10 秒（本地 Embedding）
- 重排召回精度相比纯向量检索提升约 30%（测试集上 MRR@5 对比）
- 匿名试用 + 注册转化机制，支持 0 成本冷启动 POC 演示

---

## 二、面试题与参考答案

> 按考察频率分为三档：**必考** / **大概率** / **可能问**

---

### 必考题

---

#### Q1：你的检索是「向量召回 top-20 → 重排取 top-5」，为什么不直接召回 5 条？

向量检索（Bi-encoder）把 query 和 document 分别压缩成向量再算余弦相似度，速度快但损失了词序和语义细节，只能捕捉"大方向相近"。

Cross-encoder（重排）把 query 和 document 拼在一起喂给模型，注意力机制充分交互，精度高得多，但计算量是 O(n)，不能在全库扫。

两阶段天然分工：

- 向量召回：快速从全库筛出 20 个候选
- 重排：在 20 个里精挑 5 个

直接召回 5 条的问题是：向量模型可能把真正的答案排到第 6～10 名，重排没有机会看到它们。召回 20 再重排，相当于给重排更大的候选池，最终精度明显更高。

---

#### Q2：分块用 500字/80字重叠，这个参数怎么定的？太大太小各有什么问题？

这两个参数是在"召回精度"和"上下文完整性"之间的经验性权衡。

**块太大的问题：**

- 一个 chunk 混入太多无关内容，向量被"稀释"，相似度下降
- 塞进 prompt 的 token 数增多，成本上升，LLM 对长上下文的注意力会衰减

**块太小的问题：**

- 一句话可能跨两个 chunk，语义被截断，单个 chunk 缺乏上下文
- 检索命中了某块，但 LLM 拿到的信息不足以完整回答

**80字重叠的作用：**
防止关键句子落在两个 chunk 的边界被切断。前一块末尾 80 字会在下一块开头重复，保证语义连续。

**实际调参思路：** 先用默认值跑通，再用真实问答对做 MRR/Hit@k 评测，逐步调整观察指标变化。

---

#### Q7：流式输出和普通请求有什么区别？前端怎么消费？

**普通请求：** 等 LLM 把完整响应生成完，服务端一次性返回。用户要等 5～15 秒才看到第一个字，体验差。

**流式输出：** 服务端用 SSE（Server-Sent Events）每生成几个 token 就立刻推给客户端，用户几百毫秒内看到第一个字，体验接近"打字机"效果。

本项目的实现链路：

```
DeepSeek API (stream: true)
  ↓ 返回 ReadableStream
streamText()           ← Vercel AI SDK，解析 delta tokens
  ↓
createUIMessageStream() ← 包装成 UIMessageStreamResponse
  ↓
前端 useChat() hook     ← 自动消费 SSE，更新 messages 状态
  ↓
React 重渲染 → 用户看到逐字出现
```

`useChat` 内部维护 `messages` 数组，每收到一个 token delta 就 append 到最后一条 assistant message 的 content 上，触发 re-render。sources（检索出处）和 tool call 结果也通过同一条 stream 的不同 part type 下发，前端按 type 路由到不同 UI 组件。

---

#### Q8：为什么选 JWT？有哪些安全风险，你怎么处理的？

**选 JWT 的原因：**

项目是自托管的，用户不一定有 Redis 或数据库 Session 存储。JWT 是无状态的——服务端不需要存任何 session 数据，只要有 `SESSION_SECRET` 就能验签，天然支持水平扩展，多实例部署不需要 sticky session 或共享 session store。

> 注意：Cookie 名叫 `session` 只是命名习惯，里面装的是 JWT 字符串，不是传统的 session ID。

**主要风险及应对：**

| 风险           | 说明                     | 应对方式                                          |
| -------------- | ------------------------ | ------------------------------------------------- |
| 无法主动吊销   | Token 签发后无法立即失效 | 设置 7 天较短过期；高安全场景需引入 token 黑名单  |
| Token 泄露     | Cookie 被盗可冒充用户    | HttpOnly 防 XSS 读取；Secure 标志防明文传输       |
| 算法混淆攻击   | 攻击者将 alg 改为 none   | 验签时显式指定 `algorithms: ['HS256']`，拒绝 none |
| Payload 可解码 | JWT 默认只签名不加密     | Payload 只存 userId 和 role，不存敏感信息         |

**为什么用 HttpOnly Cookie 而不是 localStorage：**
HttpOnly Cookie 无法被 JavaScript 读取，彻底防御 XSS 窃取 token，是存放 JWT 的最佳实践。

---

### 大概率会问

---

#### Q3：命中率怎么定义？低了怎么排查？

**命中的定义：** RAG 检索返回了至少 1 条相似度超过阈值（MIN_SCORE=0.38）的文档片段。`query_logs` 里的 `hit` 字段记录布尔值，`hitCount` 记录召回数量。

**命中率低的排查思路：**

| 原因                       | 排查方式                              |
| -------------------------- | ------------------------------------- |
| 用户问了知识库没有的内容   | 看"知识盲区 Top 10"，整理成待补充文档 |
| 文档质量差（扫描件、乱码） | 检查入库时的 `text` 字段              |
| 分块切断了关键信息         | 调小 chunk size 或增大 overlap        |
| 相似度阈值设太高           | 临时调低 MIN_SCORE，看召回数变化      |
| Embedding 维度不匹配       | 切换 provider 后旧数据必须清库重建    |

---

#### Q6：Agent 最多 5 轮 tool-calling，上限怎么来的？超出会怎样？

**上限的必要性：** LLM 在 tool-calling 时可能进入循环——工具返回结果 → 模型觉得还需要再调一次 → 永远不停。必须有硬截止。

**5 轮的选择逻辑：**

- 绝大多数复合任务 1～3 轮就能完成
- 留余量应对需要二次确认或纠错的情况
- 超过 5 轮基本可以认为模型陷入了循环，继续等没有意义

**超出后的行为：** Vercel AI SDK 的 `stopWhen: stepCountIs(5)` 强制停止推理，把当前已有内容作为最终响应返回，优雅截断，不会报错崩溃。

**可改进方向：** 在 system prompt 里告诉模型"如果 2 步内解决不了，告诉用户你无法完成"，从模型行为层面减少不必要的循环。

---

#### Q10：匿名用户额度存签名 Cookie，用户能不能伪造额度？

**不能伪造。** 签名 Cookie 的原理：

```
cookie_value = base64(payload) + "." + HMAC(base64(payload), SECRET)
```

服务端收到 Cookie 时，用 `SESSION_SECRET` 重新计算 HMAC 并比对。如果用户篡改了 payload（如把 `used: 3` 改成 `used: 0`），签名对不上，请求被拒绝。攻击者没有 `SESSION_SECRET` 就无法伪造有效签名。

**一个已知的设计权衡：** 用户可以在还有额度时保存 Cookie，用完后替换回旧 Cookie（重放攻击）。完整方案是在 payload 里加 `issuedAt` + 短过期时间，但这与无状态设计有矛盾。在低风险试用场景下这是可接受的取舍。

---

#### Q11：没有关系型数据库，数据一致性怎么保证？

主要场景是**删除用户时级联清理文档和分块**。关系型数据库的外键约束在 LanceDB 里不存在，需要在业务层手动保证：

```typescript
await deleteUser(userId);
await deleteDocumentsByOwner(userId);
await deleteChunksByOwner(userId);
```

**风险：** 中间步骤失败会产生"孤儿数据"（分块残留但用户已不存在）。

**现有的处理方式：** 接受这个风险——管理员操作频率极低，孤儿数据不影响正常用户（按 ownerId 隔离查询），只占用磁盘。生产环境可加定期清理任务扫描并删除孤儿数据。

**更严格的方案：** LanceDB 不支持跨表事务，需要在应用层用补偿逻辑（Saga 模式）实现。

---

### 可能问（面试官懂 AI 才会问）

---

#### Q4：为什么 query 加检索前缀，document 入库时不加？

BGE 系列模型的设计特性，叫**非对称语义检索（Asymmetric Semantic Search）**。

BGE 训练时对 query 和 document 的"理解角色"不同：

- **query** 是简短问题，语义密度低，加前缀 `"为这个句子生成表示以用于检索相关文章："` 告诉模型"我在提问，帮我找答案"
- **document** 是长段落，信息量足够，直接编码即可

如果 document 也加前缀，两边向量分布对齐，反而干扰模型区分"提问意图"和"知识内容"的能力，实验结果显示相似度分数会下降。

DashScope 通过 `input_type` 参数区分 `query` 和 `document`，道理相同，只是接口层面的实现不一样。

---

#### Q5：向量维度越高越好吗？什么场景选本地 Embedding？

**维度越高不一定越好**，要看模型本身的训练能力，而不是维度数字。一个训练得好的 512 维模型完全可以超过一个差的 1024 维模型。

**本地 BGE-small-zh（512维）适合：**

- 开发/测试环境，不产生 API 费用
- 对延迟极敏感，不能有网络 RTT
- 网络受限的内网部署

**DashScope text-embedding-v3（1024维）适合：**

- 生产环境，文档量大、语义复杂
- 中文专业领域（法律、医疗、金融）对精度要求高
- 不想维护本地 onnxruntime 运行时依赖

**其他权衡：** 本地 BGE 首次加载需下载 ~100MB onnxruntime，有冷启动时间；云端 Embedding 有调用成本但无本地资源占用。

---

#### Q12：为什么 LanceDB 要放进 `serverExternalPackages`？

Next.js 构建时会用 webpack 把服务端代码打包成 bundle，把 `import` 语句解析并内联进去。对纯 JS 模块没问题，但 **LanceDB、onnxruntime、pdf-parse 这类库包含 `.node` 原生插件（Native Addon）**，是编译好的二进制文件，webpack 无法处理。

加入 `serverExternalPackages` 后，Next.js 把这些包从 bundle 中排除，改为运行时通过 `require()` 动态加载，`.node` 文件原样复制到产物目录。

**相关优化：**

```typescript
outputFileTracingExcludes: {
  "/*": ["./node_modules/@huggingface/transformers/**"]
}
```

生产环境用 DashScope，不需要本地 BGE 模型，排除后产物体积减少数百 MB。

---

## 三、优先级速查

| 优先级    | 题目                                                          |
| --------- | ------------------------------------------------------------- |
| ★★★ 必考  | Q1 两阶段检索、Q2 分块策略、Q7 流式输出、Q8 JWT 认证          |
| ★★ 大概率 | Q3 命中率排查、Q6 Agent 轮数、Q10 签名 Cookie、Q11 数据一致性 |
| ★ 可能问  | Q4 非对称 Embedding、Q5 维度选择、Q12 serverExternalPackages  |
