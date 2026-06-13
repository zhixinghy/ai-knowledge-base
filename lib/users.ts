import "server-only";
import path from "node:path";
import { randomBytes, randomUUID, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import * as lancedb from "@lancedb/lancedb";
import type { Role } from "./session";

// 复用与向量库相同的 LanceDB 目录(随 LANCEDB_DIR 持久化),但用独立连接 +
// 独立写串行化,保持 vectorstore.ts「只管向量」的边界。
const DB_DIR = process.env.LANCEDB_DIR || path.join(process.cwd(), ".lancedb");
const USERS = "users";

const scryptAsync = promisify(scrypt);

interface UserRow {
  id: string;
  username: string;
  passwordHash: string;
  salt: string;
  role: Role;
  createdAt: number;
}

/** 对外暴露的脱敏用户(绝不含 hash/salt)。 */
export interface PublicUser {
  id: string;
  username: string;
  role: Role;
  createdAt: number;
}

let dbPromise: Promise<lancedb.Connection> | null = null;
function db() {
  dbPromise ??= lancedb.connect(DB_DIR);
  return dbPromise;
}

async function openUsers() {
  const conn = await db();
  const names = await conn.tableNames();
  return names.includes(USERS) ? conn.openTable(USERS) : null;
}

// 串行化写入,避免并发注册时在建表 / 查重上发生竞态。
let writeChain: Promise<unknown> = Promise.resolve();
function serialize<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeChain.then(fn, fn);
  writeChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return buf.toString("hex");
}

function escape(value: string): string {
  return value.replace(/'/g, "''");
}

export async function getUserByUsername(
  username: string,
): Promise<UserRow | null> {
  const tbl = await openUsers();
  if (!tbl) return null;
  const rows = (await tbl
    .query()
    .where(`username = '${escape(username)}'`)
    .limit(1)
    .toArray()) as UserRow[];
  return rows[0] ?? null;
}

/**
 * 注册新用户。用户名唯一(在写串行里先查重)。
 * role 由调用方决定(命中 ADMIN_USERNAME 时传 "admin")。
 */
export async function createUser(
  username: string,
  password: string,
  role: Role = "user",
): Promise<PublicUser> {
  return serialize(async () => {
    if (await getUserByUsername(username)) {
      throw new Error("用户名已被注册");
    }
    const salt = randomBytes(16).toString("hex");
    const row: UserRow = {
      id: randomUUID(),
      username,
      passwordHash: await hashPassword(password, salt),
      salt,
      role,
      createdAt: Date.now(),
    };
    const conn = await db();
    const names = await conn.tableNames();
    const data = [row] as unknown as Record<string, unknown>[];
    if (names.includes(USERS)) {
      await (await conn.openTable(USERS)).add(data);
    } else {
      await conn.createTable(USERS, data);
    }
    return { id: row.id, username: row.username, role: row.role, createdAt: row.createdAt };
  });
}

/** 校验账号密码,成功返回脱敏用户,失败返回 null。 */
export async function verifyUser(
  username: string,
  password: string,
): Promise<PublicUser | null> {
  const row = await getUserByUsername(username);
  if (!row) return null;
  const candidate = await hashPassword(password, row.salt);
  const a = Buffer.from(candidate, "hex");
  const b = Buffer.from(row.passwordHash, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return { id: row.id, username: row.username, role: row.role, createdAt: row.createdAt };
}

/** 注册用户总数。 */
export async function countUsers(): Promise<number> {
  const tbl = await openUsers();
  return tbl ? tbl.countRows() : 0;
}

/** 删除用户(按 id)。文档级联清理由调用方负责。 */
export async function deleteUser(id: string): Promise<void> {
  return serialize(async () => {
    const tbl = await openUsers();
    if (tbl) await tbl.delete(`id = '${escape(id)}'`);
  });
}

/** 用户名单(脱敏,最新在前)。 */
export async function listUsers(): Promise<PublicUser[]> {
  const tbl = await openUsers();
  if (!tbl) return [];
  const rows = (await tbl.query().limit(100_000).toArray()) as UserRow[];
  return rows
    .map((r) => ({
      id: r.id,
      username: r.username,
      role: (r.role ?? "user") as Role,
      createdAt: Number(r.createdAt),
    }))
    .sort((a, b) => b.createdAt - a.createdAt);
}
