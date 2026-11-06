// Verify the youtube-agent-skill pack installed under .claude/skills/youtube-agent-skill/.
// This does not re-implement anything: it runs the six real Python tools from their
// installed locations against generated fixtures and asserts on their actual output.
// That is what proves the install layout is correct - three of the tools import
// across sibling skill folders (../yt-edit/deadair.py, ../yt-script/hooks.json), so a
// broken layout fails here rather than later.
import fs from "fs";
import os from "os";
import path from "path";
import { execFileSync } from "child_process";

const ROOT = path.resolve(import.meta.dirname, "..", ".claude", "skills", "youtube-agent-skill");

const SKILLS = [
  "yt-audit", "yt-chapters", "yt-comment", "yt-edit", "yt-package", "yt-plan",
  "yt-retention", "yt-script", "yt-seo", "yt-shorts", "yt-viral",
];

const TOOLS = {
  "yt-script/hookscore.py": ["--hook", "I deleted 40,000 lines of code and the app got faster"],
  "yt-package/title.py": ["--title", "The Truth About AI Coding Agents", "--thumb", "AI is dead"],
  "yt-edit/deadair.py": ["<srt>"],
  "yt-chapters/chapters.py": ["<srt>", "--target", "3"],
  "yt-retention/retention.py": ["<csv>", "--transcript", "<srt>"],
  "yt-viral/swipe.py": ["<json>", "--min", "2.0"],
};

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? `  ${detail}` : ""}`);
  ok ? pass++ : fail++;
};

// ---- fixtures -------------------------------------------------------------
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "yt-verify-"));
const srt = path.join(tmp, "transcript.srt");
const csv = path.join(tmp, "retention.csv");
const json = path.join(tmp, "collected.json");

// Deterministic. Cue 6 deliberately restates cue 5 so deadair has a REPEAT to find,
// and the retention curve has a hook leak, a cliff at 150s, and a flat middle.
fs.writeFileSync(srt, [
  "1", "00:00:00,000 --> 00:00:04,200", "I deleted forty thousand lines of code last month.", "",
  "2", "00:00:04,200 --> 00:00:09,800", "Um, and the app actually got faster.", "",
  "3", "00:00:09,800 --> 00:00:16,500", "So today I show you which files I removed and why.", "",
  "4", "00:00:16,500 --> 00:00:26,000", "Uh... let me just... okay. The first was the plugin loader.", "",
  "5", "00:00:26,000 --> 00:00:33,400", "The plugin loader supported eleven formats. Nobody used ten.", "",
  "6", "00:00:33,400 --> 00:00:41,000", "The plugin loader supported eleven formats, and nobody used ten.", "",
  "7", "00:00:41,000 --> 00:00:52,300", "So I deleted it and replaced it with one import statement.", "",
  "8", "00:00:52,300 --> 00:01:05,700", "The second was the caching layer, three thousand lines of locking.", "",
  "9", "00:01:05,700 --> 00:01:14,900", "And honestly the cache was slower than running the query again.", "",
  "10", "00:01:14,900 --> 00:01:24,100", "That is the whole video. Delete the thing, measure, keep it.", "",
].join("\n"));

fs.writeFileSync(csv, [
  "position,percent_still_watching",
  "0,100", "10,88", "20,71", "30,66", "60,64", "90,62", "120,61",
  "150,44", "180,42", "210,41", "240,40", "270,39", "300,38",
].join("\n"));

// >=4 videos per channel, or swipe.py correctly refuses to rank on noise.
// The small channel's 412k video is a 14x outlier; the big channel's 410k video is not,
// which is the whole point of ranking by own-channel multiple instead of raw views.
const vids = [];
const small = [21000, 30000, 27000, 36000, 25000, 41000];
const big = [1400000, 2000000, 1800000, 2600000, 1700000, 2200000];
small.forEach((v, i) => vids.push({ channel: "Small Dev Channel", title: `Small Dev Channel video ${i + 1}`, views: v, url: `https://youtu.be/s${i}`, duration: 600 }));
vids.push({ channel: "Small Dev Channel", title: "I deleted 40,000 lines of code and the app got 3x faster", views: 412000, url: "https://youtu.be/sx", duration: 613 });
big.forEach((v, i) => vids.push({ channel: "Big Tech Channel", title: `Big Tech Channel video ${i + 1}`, views: v, url: `https://youtu.be/b${i}`, duration: 600 }));
vids.push({ channel: "Big Tech Channel", title: "Nobody talks about this mistake in Python", views: 410000, url: "https://youtu.be/bx", duration: 613 });
fs.writeFileSync(json, JSON.stringify(vids));

// ---- install shape --------------------------------------------------------
check("install root exists", fs.existsSync(ROOT), path.relative(process.cwd(), ROOT));
check("all 11 skills present", SKILLS.every(s => fs.existsSync(path.join(ROOT, s, "SKILL.md"))),
  `${SKILLS.filter(s => fs.existsSync(path.join(ROOT, s, "SKILL.md"))).length}/11`);

// Frontmatter must carry name + description or the skill is not discoverable.
let fmOk = 0, fmBad = [];
for (const s of SKILLS) {
  const p = path.join(ROOT, s, "SKILL.md");
  if (!fs.existsSync(p)) { fmBad.push(`${s} (missing)`); continue; }
  const t = fs.readFileSync(p, "utf8");
  const m = t.match(/^---\n([\s\S]*?)\n---/);
  if (!m || !/^name:\s*\S+$/m.test(m[1]) || !/^description:\s*/m.test(m[1])) { fmBad.push(s); continue; }
  const name = m[1].match(/^name:\s*(.+)$/m)[1].trim();
  if (name !== s) { fmBad.push(`${s} (name: ${name})`); continue; }
  fmOk++;
}
check("SKILL.md frontmatter valid (name matches folder + description)", fmBad.length === 0,
  fmBad.length ? `bad: ${fmBad.join(", ")}` : `${fmOk}/11`);

check("MIT LICENSE retained", fs.existsSync(path.join(ROOT, "LICENSE")));
check("voice.md template shipped", fs.existsSync(path.join(ROOT, "templates", "voice.md")));

// The 21 hook formulas are shared by yt-script and yt-viral.
const hooks = JSON.parse(fs.readFileSync(path.join(ROOT, "yt-script", "hooks.json"), "utf8"));
check("hooks.json has 21 formulas", Array.isArray(hooks.hooks) && hooks.hooks.length === 21,
  `found ${hooks.hooks?.length}`);

// ---- cross-skill sibling imports -----------------------------------------
// Resolved as ../<sibling>, so every skill must share one parent directory.
const siblings = [
  ["yt-chapters/chapters.py", "yt-edit/deadair.py"],
  ["yt-retention/retention.py", "yt-edit/deadair.py"],
  ["yt-viral/swipe.py", "yt-script/hooks.json"],
];
for (const [from, dep] of siblings) {
  check(`${from} -> ../${dep} resolves`, fs.existsSync(path.join(ROOT, dep)));
}

// ---- run the six real tools ----------------------------------------------
const expect = {
  "yt-script/hookscore.py": ["VERDICT", "SPECIFICITY", "formula"],
  "yt-package/title.py": ["chars", "score"],
  "yt-edit/deadair.py": ["REPEAT", "cuts"],
  "yt-chapters/chapters.py": ["chapters"],
  "yt-retention/retention.py": ["HOOK LEAK", "CLIFFS", "SLIDE"],
  "yt-viral/swipe.py": ["outliers at"],
};

for (const [tool, args] of Object.entries(TOOLS)) {
  const bin = path.join(ROOT, tool);
  if (!fs.existsSync(bin)) { check(`run ${tool}`, false, "tool missing"); continue; }
  const argv = args.map(a => a === "<srt>" ? srt : a === "<csv>" ? csv : a === "<json>" ? json : a);
  try {
    const out = execFileSync("python3", [bin, ...argv], { encoding: "utf8", cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] });
    const missing = expect[tool].filter(w => !out.includes(w));
    check(`run ${tool}`, missing.length === 0, missing.length ? `missing in output: ${missing.join(", ")}` : "output ok");
  } catch (e) {
    check(`run ${tool}`, false, `exited ${e.status}: ${(e.stderr || e.message).split("\n")[0]}`);
  }
}

// chapters.py and retention.py must reach deadair.py at runtime, not just on disk.
try {
  const out = execFileSync("python3", [path.join(ROOT, "yt-chapters/chapters.py"), srt, "--target", "3"],
    { encoding: "utf8", cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] });
  check("chapters.py imports deadair at runtime", /0:00/.test(out));
} catch (e) {
  check("chapters.py imports deadair at runtime", false, (e.stderr || e.message).split("\n").slice(-2)[0]);
}

// swipe.py must rank by own-channel multiple: small-channel spike in, big-channel spike out.
try {
  const out = execFileSync("python3", [path.join(ROOT, "yt-viral/swipe.py"), json, "--min", "2.0"],
    { encoding: "utf8", cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] });
  check("swipe.py ranks by own-channel multiple (412k small in, 410k big out)",
    out.includes("Small Dev Channel") && !out.includes("Nobody talks about this mistake"));
} catch (e) {
  check("swipe.py ranks by own-channel multiple (412k small in, 410k big out)", false,
    (e.stderr || e.message).split("\n")[0]);
}

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
