/**
 * Repo Cosmos — backend
 *
 * A tiny zero-dependency Node server that:
 *   1. serves the static galaxy app
 *   2. proxies + aggregates the GitHub REST API (so the browser never hits
 *      rate limits directly, and a server-side token is never exposed)
 *
 * Endpoints
 *   GET /api/repo?repo=owner/name&limit=300   → aggregated cosmos payload
 *   GET /api/commit?repo=owner/name&sha=...   → per-commit diff stats (lazy)
 *   GET /api/explore                          → a handful of huge repos to visit
 *   GET /api/health
 */

import http from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/* Some sandboxes and corporate networks terminate TLS with their own CA.
   curl trusts it (it reads the system store); Node ships its own store and
   does not — so we transparently re-exec once with the system bundle added. */
(function bootstrapCAs() {
  if (process.env.NODE_EXTRA_CA_CERTS) return;
  if (process.env.COSMOS_NO_CA_BOOTSTRAP === '1') return;
  const bundle = [
    '/etc/ssl/certs/ca-certificates.crt',
    '/etc/pki/tls/certs/ca-bundle.crt',
    '/etc/ssl/cert.pem',
  ].find((p) => existsSync(p));
  if (!bundle) return;
  const res = spawnSync(process.execPath, [fileURLToPath(import.meta.url), ...process.argv.slice(2)], {
    stdio: 'inherit',
    env: { ...process.env, NODE_EXTRA_CA_CERTS: bundle, COSMOS_NO_CA_BOOTSTRAP: '1' },
  });
  process.exit(res.status ?? 0);
})();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, 'public');
const CACHE_DIR = path.join(__dirname, '.cache', 'cosmos');
const PORT = Number(process.env.PORT || 3000);

const TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || '';
const UA = 'repo-cosmos/1.0';

const MEM_CACHE = new Map(); // key -> { at, ttl, value }
const DISK_TTL = 1000 * 60 * 60 * 6; // 6h on disk
const MEM_TTL = 1000 * 60 * 10; // 10m in memory

/* ------------------------------------------------------------------ */
/* GitHub fetch helpers                                                */
/* ------------------------------------------------------------------ */

async function gh(urlPath, { accept = 'application/vnd.github+json' } = {}) {
  const headers = {
    Accept: accept,
    'User-Agent': UA,
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;

  const res = await fetch(`https://api.github.com${urlPath}`, {
    headers,
    redirect: 'follow',
  });

  const body = await res.text();
  let json = null;
  try {
    json = body ? JSON.parse(body) : null;
  } catch {
    json = null;
  }

  if (!res.ok) {
    const msg = json?.message || `GitHub responded ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.rateLimit = {
      remaining: res.headers.get('x-ratelimit-remaining'),
      limit: res.headers.get('x-ratelimit-limit'),
      reset: res.headers.get('x-ratelimit-reset'),
    };
    throw err;
  }

  return {
    data: json,
    rate: {
      remaining: Number(res.headers.get('x-ratelimit-remaining') ?? -1),
      limit: Number(res.headers.get('x-ratelimit-limit') ?? -1),
      reset: Number(res.headers.get('x-ratelimit-reset') ?? 0),
    },
  };
}

/** "https://github.com/facebook/react/tree/main" → "facebook/react" */
function normalizeRepo(raw) {
  if (!raw || typeof raw !== 'string') return null;
  let s = raw.trim();
  s = s.replace(/^git@github\.com:/i, '');
  s = s.replace(/^https?:\/\/(www\.)?github\.com\//i, '');
  s = s.replace(/^github\.com\//i, '');
  s = s.replace(/\.git$/i, '');
  s = s.replace(/^\/+/, '').replace(/\/+$/, '');
  const parts = s.split('/').filter(Boolean);
  if (parts.length < 2) return null;
  const owner = parts[0];
  const name = parts[1];
  if (!/^[\w.-]+$/.test(owner) || !/^[\w.-]+$/.test(name)) return null;
  return `${owner}/${name}`;
}

/* ------------------------------------------------------------------ */
/* Cache                                                              */
/* ------------------------------------------------------------------ */

function cacheKey(kind, repo) {
  return `${kind}:${repo.toLowerCase()}`;
}

async function readCache(key) {
  const mem = MEM_CACHE.get(key);
  if (mem && Date.now() - mem.at < MEM_TTL) return { value: mem.value, fresh: 'memory' };

  const file = path.join(CACHE_DIR, `${key.replace(/[^\w.-]+/g, '_')}.json`);
  try {
    if (!existsSync(file)) return null;
    const raw = JSON.parse(await readFile(file, 'utf8'));
    if (Date.now() - raw.at > DISK_TTL) return null;
    MEM_CACHE.set(key, { at: raw.at, value: raw.value });
    return { value: raw.value, fresh: 'disk' };
  } catch {
    return null;
  }
}

async function writeCache(key, value) {
  MEM_CACHE.set(key, { at: Date.now(), value });
  try {
    await mkdir(CACHE_DIR, { recursive: true });
    const file = path.join(CACHE_DIR, `${key.replace(/[^\w.-]+/g, '_')}.json`);
    await writeFile(file, JSON.stringify({ at: Date.now(), value }));
  } catch {
    /* cache is a nicety, never fatal */
  }
}

/* ------------------------------------------------------------------ */
/* Aggregation                                                       */
/* ------------------------------------------------------------------ */

function prettyLanguages(langs) {
  const entries = Object.entries(langs || {}).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, v]) => s + v, 0) || 1;
  return entries.slice(0, 8).map(([name, bytes]) => ({
    name,
    bytes,
    pct: +((bytes / total) * 100).toFixed(1),
  }));
}

async function buildCosmos(repoFullName, limit) {
  const encoded = repoFullName
    .split('/')
    .map(encodeURIComponent)
    .join('/');

  const { data: repo, rate } = await gh(`/repos/${encoded}`);

  // Everything else can fail gracefully — the galaxy still renders.
  const [languagesRes, contributorsRes] = await Promise.allSettled([
    gh(`/repos/${encoded}/languages`),
    gh(`/repos/${encoded}/contributors?per_page=100&anon=false`),
  ]);

  const languages = prettyLanguages(
    languagesRes.status === 'fulfilled' ? languagesRes.value.data : {}
  );
  const contributors =
    contributorsRes.status === 'fulfilled' && Array.isArray(contributorsRes.value.data)
      ? contributorsRes.value.data
          .filter((c) => c && c.type !== 'Anonymous')
          .map((c) => ({
            login: c.login,
            avatar: c.avatar_url,
            contributions: c.contributions,
            url: c.html_url,
          }))
      : [];

  // Page through commits until we hit the limit (or run out of history).
  const perPage = 100;
  const pages = Math.max(1, Math.ceil(limit / perPage));
  const commits = [];
  let truncated = false;

  for (let page = 1; page <= pages; page++) {
    const { data } = await gh(
      `/repos/${encoded}/commits?per_page=${perPage}&page=${page}`
    );
    if (!Array.isArray(data) || data.length === 0) break;
    for (const c of data) {
      const author = c.author || null;
      const dateStr = c.commit?.author?.date || c.commit?.committer?.date;
      commits.push({
        sha: c.sha,
        short: c.sha.slice(0, 7),
        message: (c.commit?.message || '').split('\n')[0].slice(0, 240),
        fullMessage: (c.commit?.message || '').slice(0, 1200),
        login: author?.login || null,
        avatar: author?.avatar_url || null,
        authorName: c.commit?.author?.name || author?.login || 'unknown',
        date: dateStr ? Date.parse(dateStr) : null,
        url: c.html_url,
        isMerge: (c.parents?.length || 0) > 1,
      });
    }
    if (data.length < perPage) {
      truncated = false;
      break;
    }
    if (page === pages) truncated = true;
    if (commits.length >= limit) break;
  }

  const clean = commits
    .filter((c) => c.date)
    .slice(0, limit)
    .sort((a, b) => a.date - b.date); // oldest → newest

  return {
    repo: {
      fullName: repo.full_name,
      name: repo.name,
      owner: repo.owner?.login,
      avatar: repo.owner?.avatar_url,
      description: repo.description,
      url: repo.html_url,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      watchers: repo.subscribers_count ?? repo.watchers_count,
      issues: repo.open_issues_count,
      sizeKb: repo.size,
      language: repo.language,
      topics: repo.topics || [],
      license: repo.license?.spdx_id || null,
      defaultBranch: repo.default_branch,
      createdAt: repo.created_at ? Date.parse(repo.created_at) : null,
      pushedAt: repo.pushed_at ? Date.parse(repo.pushed_at) : null,
      archived: !!repo.archived,
      home: repo.homepage || null,
    },
    languages,
    contributors,
    commits: clean,
    truncated,
    requested: limit,
    fetchedAt: Date.now(),
    rate,
  };
}

/* ------------------------------------------------------------------ */
/* HTTP plumbing                                                      */
/* ------------------------------------------------------------------ */

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
};

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(body);
}

async function serveStatic(req, res, pathname) {
  let rel = decodeURIComponent(pathname);
  if (rel === '/' || rel === '') rel = '/index.html';
  const file = path.join(PUBLIC_DIR, path.normalize(rel).replace(/^(\.\.[/\\])+/, ''));
  if (!file.startsWith(PUBLIC_DIR)) {
    res.writeHead(403).end('Forbidden');
    return;
  }
  try {
    const data = await readFile(file);
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Content-Length': data.length,
      'Cache-Control': 'public, max-age=60',
    });
    res.end(data);
  } catch {
    if (path.extname(rel)) {
      res.writeHead(404).end('Not found');
    } else {
      // SPA-ish fallback
      try {
        const html = await readFile(path.join(PUBLIC_DIR, 'index.html'));
        res.writeHead(200, { 'Content-Type': MIME['.html'] }).end(html);
      } catch {
        res.writeHead(404).end('Not found');
      }
    }
  }
}

const EXPLORE = [
  { repo: 'facebook/react', hint: 'The library that ate the web' },
  { repo: 'torvalds/linux', hint: '28 years of commits' },
  { repo: 'microsoft/vscode', hint: 'The editor you are not using' },
  { repo: 'supabase/supabase', hint: 'Postgres, but spicy' },
  { repo: 'rust-lang/rust', hint: 'A borrow checker in space' },
  { repo: 'nodejs/node', hint: 'JavaScript escapes the browser' },
  { repo: 'vercel/next.js', hint: 'Server components go brrr' },
  { repo: 'flutter/flutter', hint: 'One codebase, every screen' },
  { repo: 'kubernetes/kubernetes', hint: 'YAML all the way down' },
  { repo: 'tensorflow/tensorflow', hint: 'A galaxy of gradients' },
  { repo: 'sveltejs/svelte', hint: 'Compiled into pure joy' },
  { repo: 'denoland/deno', hint: 'Secure runtime, rusty core' },
  { repo: 'golang/go', hint: 'Boring on purpose, gorgeous inside' },
  { repo: 'home-assistant/core', hint: 'The house that commits built' },
  { repo: 'd3/d3', hint: 'Data becomes art' },
  { repo: 'threejs/three.js', hint: 'WebGL for the rest of us' },
];

async function handleApi(req, res, url) {
  const { pathname, searchParams } = url;

  if (pathname === '/api/health') {
    return sendJson(res, 200, {
      ok: true,
      token: !!TOKEN,
      cached: MEM_CACHE.size,
      uptime: Math.round(process.uptime()),
    });
  }

  if (pathname === '/api/explore') {
    return sendJson(res, 200, { items: EXPLORE });
  }

  if (pathname === '/api/repo') {
    const repo = normalizeRepo(searchParams.get('repo'));
    if (!repo) {
      return sendJson(res, 400, {
        error: 'Give me a repo like "facebook/react" or a full github.com URL.',
      });
    }
    const limit = Math.min(
      500,
      Math.max(20, Number(searchParams.get('limit')) || 300)
    );

    const key = cacheKey('cosmos', `${repo}:${limit}`);
    const hit = await readCache(key);
    if (hit) {
      return sendJson(res, 200, { ...hit.value, cached: hit.fresh });
    }

    try {
      const payload = await buildCosmos(repo, limit);
      await writeCache(key, payload);
      return sendJson(res, 200, { ...payload, cached: false });
    } catch (err) {
      if (err.status === 404) {
        return sendJson(res, 404, {
          error: `GitHub has no idea what "${repo}" is. Check the spelling?`,
        });
      }
      if (err.status === 403 || err.status === 429) {
        return sendJson(res, 429, {
          error:
            'GitHub rate limit reached. ' +
            (TOKEN
              ? 'Try again in a minute.'
              : 'Set GH_TOKEN on the server for 5000 req/hr instead of 60.'),
        });
      }
      return sendJson(res, 502, { error: err.message || 'GitHub request failed.' });
    }
  }

  if (pathname === '/api/commit') {
    const repo = normalizeRepo(searchParams.get('repo'));
    const sha = searchParams.get('sha') || '';
    if (!repo || !/^[0-9a-f]{7,40}$/i.test(sha)) {
      return sendJson(res, 400, { error: 'Need a repo and a commit sha.' });
    }
    const key = cacheKey('commit', `${repo}:${sha}`);
    const hit = await readCache(key);
    if (hit) return sendJson(res, 200, { ...hit.value, cached: hit.fresh });

    try {
      const encoded = repo.split('/').map(encodeURIComponent).join('/');
      const { data } = await gh(`/repos/${encoded}/commits/${sha}`);
      const payload = {
        sha: data.sha,
        additions: data.stats?.additions ?? 0,
        deletions: data.stats?.deletions ?? 0,
        total: data.stats?.total ?? 0,
        files: (data.files || []).slice(0, 20).map((f) => ({
          name: f.filename,
          additions: f.additions,
          deletions: f.deletions,
          status: f.status,
        })),
        message: data.commit?.message || '',
      };
      await writeCache(key, payload);
      return sendJson(res, 200, { ...payload, cached: false });
    } catch (err) {
      return sendJson(res, 502, { error: err.message || 'Could not load commit.' });
    }
  }

  return sendJson(res, 404, { error: 'Unknown endpoint.' });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'OPTIONS') {
    res
      .writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      })
      .end();
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405).end('Method not allowed');
    return;
  }

  try {
    if (url.pathname.startsWith('/api/')) {
      await handleApi(req, res, url);
    } else {
      await serveStatic(req, res, url.pathname);
    }
  } catch (err) {
    console.error('[cosmos]', err);
    if (!res.headersSent) sendJson(res, 500, { error: 'Server exploded.' });
    else res.end();
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  ✦ Repo Cosmos online → http://0.0.0.0:${PORT}`);
  console.log(`    GitHub token: ${TOKEN ? 'yes (5000 req/hr)' : 'no (60 req/hr)'}\n`);
});
