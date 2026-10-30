import fs from "fs";
const checks = [
  ["index.html exists", fs.existsSync("index.html")],
  ["src/app.js exists", fs.existsSync("src/app.js")],
  ["src/style.css exists", fs.existsSync("src/style.css")],
  ["backend/app.py exists", fs.existsSync("backend/app.py")],
  ["backend/requirements.txt", fs.existsSync("backend/requirements.txt")],
  ["docs/COMPATIBILITY_REPORT.md", fs.existsSync("docs/COMPATIBILITY_REPORT.md")],
  ["dist built", fs.existsSync("dist/index.html")],
];
let ok=true;
for(const [name, exists] of checks){ console.log((exists?"✓":"✗")+" "+name); if(!exists) ok=false; }
console.log(ok ? "All checks passed" : "Some checks failed");
process.exit(ok?0:1);
