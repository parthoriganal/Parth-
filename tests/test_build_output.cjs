const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const outDir = path.resolve(process.argv[2] || path.join(root, 'dist'));
const report = 'docs/COMPATIBILITY_REPORT.md';
const html = fs.readFileSync(path.join(outDir, 'index.html'), 'utf8');
const hrefs = [...html.matchAll(/href=["']([^"']*COMPATIBILITY_REPORT\.md)["']/g)].map(m => m[1]);
assert.equal(hrefs.length, 2, 'both compatibility links should remain in the build');
for (const href of hrefs) {
  const target = path.resolve(outDir, href);
  assert.equal(target, path.join(outDir, report), 'report link must resolve inside the build');
  assert.deepEqual(fs.readFileSync(target), fs.readFileSync(path.join(root, report)));
}
const youtubeDir = path.join(root, '.claude/skills/youtube-agent-skill');
const youtubeReadme = fs.readFileSync(path.join(youtubeDir, 'README.md'), 'utf8');
const hookLink = youtubeReadme.match(/\[21 formulas\]\(([^)]+)\)/);
assert.ok(hookLink, 'YouTube hooks link is present');
assert.ok(fs.existsSync(path.resolve(youtubeDir, hookLink[1])), 'YouTube hooks link resolves');
const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
assert.ok(!readme.includes('docs/screenshot-placeholder.png'), 'missing screenshot placeholder is not linked');
console.log('Build report and corrected documentation links verified');
