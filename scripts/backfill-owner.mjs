// 一次性迁移:给存量文档补 ownerId。
//   - docs 库:无 ownerId 的行回填为管理员(ADMIN_USERNAME 对应账号)的 id
//   - support 库:无 ownerId 的行设为共享哨兵 "shared"
//
// 用法(在项目根目录):
//   ADMIN_USERNAME=你的管理员用户名 [LANCEDB_DIR=/线上库路径] node scripts/backfill-owner.mjs
//
// 前提:该管理员账号已经注册过(脚本要从 users 表查它的 id)。
// 幂等:重复跑只会把仍缺 ownerId 的行补上,已迁移的不动。

import path from "node:path";
import * as lancedb from "@lancedb/lancedb";

const DB_DIR = process.env.LANCEDB_DIR || path.join(process.cwd(), ".lancedb");
const ADMIN_USERNAME = process.env.ADMIN_USERNAME;

if (!ADMIN_USERNAME) {
  console.error("缺少 ADMIN_USERNAME 环境变量");
  process.exit(1);
}

const conn = await lancedb.connect(DB_DIR);
const names = await conn.tableNames();

if (!names.includes("users")) {
  console.error("users 表不存在,请先让管理员账号注册一次再跑迁移");
  process.exit(1);
}

const users = await conn.openTable("users");
const adminRows = await users
  .query()
  .where(`username = '${ADMIN_USERNAME.replace(/'/g, "''")}'`)
  .limit(1)
  .toArray();
const admin = adminRows[0];
if (!admin) {
  console.error(`未找到管理员账号「${ADMIN_USERNAME}」,请先注册该用户名`);
  process.exit(1);
}
console.log(`管理员 ${ADMIN_USERNAME} → id=${admin.id}`);

/** 给一张表回填 ownerId,整表 overwrite(从而新增/补全该列)。 */
async function backfill(table) {
  if (!names.includes(table)) {
    console.log(`跳过 ${table}(表不存在)`);
    return;
  }
  const tbl = await conn.openTable(table);
  const rows = await tbl.query().limit(1_000_000).toArray();
  if (rows.length === 0) {
    console.log(`跳过 ${table}(空表)`);
    return;
  }

  let filled = 0;
  const out = rows.map((r) => {
    const row = { ...r };
    // vector 读回来可能是 TypedArray,转成普通数组以便重建表
    if (row.vector && typeof row.vector.length === "number") {
      row.vector = Array.from(row.vector);
    }
    if (!row.ownerId) {
      row.ownerId = row.collection === "support" ? "shared" : admin.id;
      filled++;
    }
    return row;
  });

  await conn.createTable(table, out, { mode: "overwrite" });
  console.log(`${table}: 共 ${rows.length} 行,回填 ${filled} 行 ownerId`);
}

await backfill("documents");
await backfill("chunks");

console.log("迁移完成 ✅");
