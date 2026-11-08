// Converts the restricted Markdown used by this sample into an editable DOCX.
// Install docx@9.5.1 in a separate directory and set NODE_PATH to its node_modules.
const fs = require('node:fs');
const path = require('node:path');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, LevelFormat } = require('docx');

const dir = __dirname;
const source = fs.readFileSync(path.join(dir, 'manuscript-sample.md'), 'utf8');
const blocks = source.trim().split(/\n\s*\n/);
function runs(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.filter(Boolean).map(t => new TextRun({
    text: t.startsWith('**') && t.endsWith('**') ? t.slice(2, -2) : t,
    bold: t.startsWith('**') && t.endsWith('**'),
  }));
}
const paragraphs = [];
let numberedList = 0;
for (const block of blocks) {
  const lines = block.split('\n');
  if (lines.every(line => /^- /.test(line))) {
    for (const line of lines) paragraphs.push(new Paragraph({children: runs(line.slice(2)), numbering: {reference: 'bullets', level: 0}}));
  } else if (lines.every(line => /^\d+\. /.test(line))) {
    numberedList += 1;
    if (numberedList > 2) throw new Error('Add a numbering definition for another list');
    for (const line of lines) paragraphs.push(new Paragraph({children: runs(line.replace(/^\d+\. /, '')), numbering: {reference: `numbers${numberedList}`, level: 0}}));
  } else if (/^#{1,3} /.test(block)) {
    const m = block.match(/^(#{1,3}) (.*)$/s);
    const heading = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3][m[1].length - 1];
    paragraphs.push(new Paragraph({text: m[2], heading}));
  } else {
    paragraphs.push(new Paragraph({style: 'Normal', children: runs(block.replace(/\n/g, ' ')), spacing: {after: 160}}));
  }
}
const doc = new Document({
  styles: {default: {document: {run: {font: 'Georgia', size: 22}}}, paragraphStyles: [{id: 'Normal', name: 'Normal', default: true, run: {font: 'Georgia', size: 22}}]},
  numbering: {config: [
    {reference: 'bullets', levels: [{level: 0, format: LevelFormat.BULLET, text: '•', alignment: 'left', style: {paragraph: {indent: {left: 720, hanging: 360}}}}]},
    ...['numbers1', 'numbers2'].map(reference => ({reference, levels: [{level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: 'left', style: {paragraph: {indent: {left: 720, hanging: 360}}}}]})),
  ]},
  sections: [{properties: {page: {size: {width: 8640, height: 12960}, margin: {top: 1080, bottom: 1080, left: 1080, right: 1080}}}, children: paragraphs}],
});
Packer.toBuffer(doc).then(b => fs.writeFileSync(path.join(dir, 'manuscript-sample.docx'), b)).catch(e => {console.error(e); process.exitCode = 1;});
