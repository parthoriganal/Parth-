#!/usr/bin/env node
/**
 * Verifies all downloaded GitHub repos, Agent Skill packs, and code libraries.
 * Run with: npm run verify:downloads
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
let passed = 0;
let failed = 0;

function check(name, fn) {
  try {
    fn();
    console.log(`PASS  ${name}`);
    passed++;
  } catch (err) {
    console.error(`FAIL  ${name}\n      ${err.message}`);
    failed++;
  }
}

function findFiles(dir, filename, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findFiles(full, filename, results);
    } else if (entry.name === filename) {
      results.push(full);
    }
  }
  return results;
}

// 1. Verify all 9 newly installed skill packs in .claude/skills/
const expectedPacks = [
  { dir: 'superpowers', minSkills: 15, license: true },
  { dir: 'mattpocock', minSkills: 27, license: true },
  { dir: 'threejs', minSkills: 13, license: true },
  { dir: 'blender', minSkills: 94, license: true },
  { dir: 'remotion', minSkills: 13, license: false },
  { dir: 'marketing', minSkills: 19, license: true },
  { dir: 'supabase', minSkills: 2, license: true },
  { dir: 'zens-ink-seo', minSkills: 9, license: true },
  { dir: 'scrapling', minSkills: 1, license: true },
];

for (const pack of expectedPacks) {
  check(`skill pack .claude/skills/${pack.dir} (>= ${pack.minSkills} skills)`, () => {
    const packDir = path.join(ROOT, '.claude', 'skills', pack.dir);
    if (!fs.existsSync(packDir)) throw new Error(`Missing directory: ${packDir}`);
    if (pack.license && !fs.existsSync(path.join(packDir, 'LICENSE'))) {
      throw new Error(`Missing LICENSE in ${packDir}`);
    }
    const skillFiles = findFiles(packDir, 'SKILL.md');
    if (skillFiles.length < pack.minSkills) {
      throw new Error(`Expected >= ${pack.minSkills} SKILL.md files, found ${skillFiles.length}`);
    }
    for (const sf of skillFiles) {
      const content = fs.readFileSync(sf, 'utf8').trimStart();
      if (!content.startsWith('---')) {
        throw new Error(`Missing YAML frontmatter in ${path.relative(ROOT, sf)}`);
      }
    }
  });
}

// 2. Verify ZensInk Python SEO toolkit (CLI + 23 upstream unit tests)
check('libraries/zens-ink-seo-package CLI & 23 unit tests', () => {
  const zensDir = path.join(ROOT, 'libraries', 'zens-ink-seo-package');
  const env = { ...process.env, PYTHONPATH: zensDir };
  const helpOut = execFileSync('python3', ['-m', 'zens_ink', '--help'], {
    env,
    encoding: 'utf8',
  });
  if (!helpOut.includes('22 tools')) {
    throw new Error('Unexpected zens_ink --help output');
  }
  execFileSync(
    'python3',
    ['-m', 'unittest', 'discover', '-s', path.join(zensDir, 'tests')],
    { env, stdio: 'pipe' }
  );
});

// 3. Verify SkillHawk zero-dependency scanner runs cleanly on .claude/skills/zens-ink-seo
check('libraries/skillhawk scans .claude/skills/zens-ink-seo cleanly', () => {
  const cli = path.join(ROOT, 'libraries', 'skillhawk', 'src', 'cli.js');
  const target = path.join(ROOT, '.claude', 'skills', 'zens-ink-seo');
  const out = execFileSync('node', [cli, 'scan', target, '--no-color', '--fail-on', 'high'], {
    encoding: 'utf8',
  });
  if (!out.includes('100/100')) {
    throw new Error(`Expected 100/100 clean scan, got:\n${out}`);
  }
});

// 4. Verify Scrapling source repository exists and top-level package imports
check('libraries/scrapling source & Python import', () => {
  const scraplingDir = path.join(ROOT, 'libraries', 'scrapling');
  if (!fs.existsSync(path.join(scraplingDir, 'pyproject.toml'))) {
    throw new Error('Missing libraries/scrapling/pyproject.toml');
  }
  const out = execFileSync(
    'python3',
    ['-c', 'import scrapling; print(scrapling.__file__)'],
    { env: { ...process.env, PYTHONPATH: scraplingDir }, encoding: 'utf8' }
  );
  if (!out.includes('scrapling')) {
    throw new Error(`Unexpected import output: ${out}`);
  }
});

// 5. Verify npm code libraries (animejs + simplex-noise)
const esmChecks = async () => {
  try {
    const anime = await import('animejs');
    if (typeof anime.animate !== 'function' && typeof anime.createTimeline !== 'function' && !anime.Timeline) {
      throw new Error('animejs missing expected exports');
    }
    console.log('PASS  npm code library: animejs runtime exports');
    passed++;
  } catch (err) {
    console.error(`FAIL  npm code library: animejs runtime exports\n      ${err.message}`);
    failed++;
  }

  try {
    const noise = await import('simplex-noise');
    const n2 = noise.createNoise2D();
    const val = n2(0.25, 0.75);
    if (typeof val !== 'number' || Number.isNaN(val) || val < -1 || val > 1) {
      throw new Error(`Unexpected simplex-noise value: ${val}`);
    }
    console.log('PASS  npm code library: simplex-noise runtime output');
    passed++;
  } catch (err) {
    console.error(`FAIL  npm code library: simplex-noise runtime output\n      ${err.message}`);
    failed++;
  }
};

await esmChecks();

console.log(`\nSummary: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
