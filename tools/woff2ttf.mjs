// Minimal WOFF1 -> TTF converter (tables are zlib-deflated; sfnt rebuilt as-is).
import { inflateSync } from 'node:zlib';
import { readFileSync, writeFileSync } from 'node:fs';

const TAG = (b, o) => b.toString('latin1', o, o + 4);

export function woffToTtf(buf) {
  if (TAG(buf, 0) !== 'wOFF') throw new Error('not a WOFF file');
  const flavor = buf.readUInt32BE(4);
  const numTables = buf.readUInt16BE(12);
  const entries = [];
  for (let i = 0; i < numTables; i++) {
    const o = 44 + i * 20;
    entries.push({
      tag: TAG(buf, o),
      offset: buf.readUInt32BE(o + 4),
      compLength: buf.readUInt32BE(o + 8),
      origLength: buf.readUInt32BE(o + 12),
    });
  }
  entries.sort((a, b) => (a.tag < b.tag ? -1 : a.tag > b.tag ? 1 : 0));

  const tables = entries.map((e) => {
    const raw = buf.subarray(e.offset, e.offset + e.compLength);
    let data = raw;
    if (e.compLength < e.origLength) data = inflateSync(raw);
    if (data.length !== e.origLength) throw new Error(`bad length for ${e.tag}`);
    return { tag: e.tag, data };
  });

  const num = tables.length;
  const searchRange = 16 * 2 ** Math.floor(Math.log2(num));
  const entrySelector = Math.floor(Math.log2(num));
  const rangeShift = num * 16 - searchRange;

  const headerSize = 12 + num * 16;
  let offset = headerSize;
  const chunks = [];
  const dir = [];
  for (const t of tables) {
    const padded = (t.data.length + 3) & ~3;
    const pad = Buffer.alloc(padded - t.data.length, 0);
    const chunk = Buffer.concat([t.data, pad]);
    dir.push({ tag: t.tag, offset, length: t.data.length });
    chunks.push(chunk);
    offset += padded;
  }

  const head = Buffer.alloc(headerSize);
  head.writeUInt32BE(flavor, 0);
  head.writeUInt16BE(num, 4);
  head.writeUInt16BE(searchRange, 6);
  head.writeUInt16BE(entrySelector, 8);
  head.writeUInt16BE(rangeShift, 10);
  dir.forEach((d, i) => {
    const o = 12 + i * 16;
    head.write(d.tag, o, 'latin1');
    head.writeUInt32BE(0, o + 4); // checksum (ignored by FreeType)
    head.writeUInt32BE(d.offset, o + 8);
    head.writeUInt32BE(d.length, o + 12);
  });
  return Buffer.concat([head, ...chunks]);
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  const [, , src, dst] = process.argv;
  writeFileSync(dst, woffToTtf(readFileSync(src)));
  console.log('wrote', dst);
}
