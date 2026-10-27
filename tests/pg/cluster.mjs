// 在临时目录起一个真实的 PostgreSQL（+ PostGIS），跑完自动关掉。第四批 4c（同时操作）、4d（正式数据库）共用。
// 需要本机装有 PostgreSQL 15/16 和 PostGIS（Ubuntu：apt install postgresql postgresql-16-postgis-3）；NBQ_PGBIN 可指定 bin 目录。
import fs from 'fs'; import os from 'os'; import path from 'path'; import { execSync } from 'child_process';

export function pgBin() {
  if (process.env.NBQ_PGBIN) return process.env.NBQ_PGBIN;
  const base = '/usr/lib/postgresql';
  if (!fs.existsSync(base)) return null;
  const v = fs.readdirSync(base).filter(x => fs.existsSync(path.join(base, x, 'bin', 'initdb'))).sort((a, b) => b - a)[0];
  return v ? path.join(base, v, 'bin') : null;
}

export function startCluster(settings = {}) {
  const bin = pgBin(); if (!bin) throw new Error('找不到 PostgreSQL（initdb）。安装：apt install postgresql postgresql-16-postgis-3，或设置 NBQ_PGBIN');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nbq-pg-')), port = 55000 + Math.floor(Math.random() * 4000);
  const root = process.getuid && process.getuid() === 0;   // initdb 不能用 root 跑：容器里换成 postgres 用户
  fs.chmodSync(dir, 0o777);
  const sh = cmd => execSync(root ? `su postgres -s /bin/sh -c ${JSON.stringify(cmd)}` : cmd, { stdio: 'pipe' }).toString();
  sh(`"${bin}/initdb" -D "${dir}/data" -U postgres -A trust -E UTF8 --locale=C.UTF-8`);
  sh(`"${bin}/pg_ctl" -D "${dir}/data" -l "${dir}/log.txt" -w -o "-p ${port} -k ${dir} -c listen_addresses='' -c max_connections=60 -c deadlock_timeout=200ms${Object.entries(settings).map(([k, v]) => ` -c ${k}=${v}`).join('')}" start`);
  const env = { ...process.env, PGHOST: dir, PGPORT: String(port), PGUSER: 'postgres' };
  const psql = (db, args) => execSync(`"${bin}/psql" -X -d ${db} ${args}`, { env, stdio: 'pipe', maxBuffer: 64 << 20 }).toString();
  return {
    bin, dir, port, host: dir, env, psql,
    version: () => psql('postgres', `-tAc "select version()"`).trim(),
    createdb: name => execSync(`"${bin}/createdb" ${name}`, { env, stdio: 'pipe' }),
    stop: () => { try { sh(`"${bin}/pg_ctl" -D "${dir}/data" -m immediate stop`) } catch (_) { } try { fs.rmSync(dir, { recursive: true, force: true }) } catch (_) { } },
  };
}

// 执行 schema.sql，返回出错的语句（ON_ERROR_STOP=0，逐条报告）
export function loadSchema(c, db, file) {
  let out = '';
  try { out = execSync(`"${c.bin}/psql" -X -q -d ${db} -v ON_ERROR_STOP=0 -f "${file}" 2>&1`, { env: c.env, stdio: 'pipe', maxBuffer: 64 << 20 }).toString() }
  catch (e) { out = (e.stdout || '') + (e.stderr || '') }
  return out.split('\n').filter(l => /ERROR:/.test(l));
}
