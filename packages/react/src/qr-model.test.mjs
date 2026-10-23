/* The QR encoder behind QrCode (HAR-1251), proven by decoding: every symbol here is rasterised
 * and read back with jsQR (a dev-only reference decoder), so a wrong table, mask or placement
 * fails a named case instead of printing a pretty but unreadable square.
 *
 * Covered: the inputs the products print (a campaign URL, a pairing code, a voucher, Bosnian and
 * emoji UTF-8), all four error-correction levels, every version from 1 to 12 filled to its last
 * byte, a sample of large versions up to 40, every mask, capacity limits and the SVG path.
 *
 * jsQR 1.4.0 has a wrong alignment centre for version 23 (74 instead of 78), so it cannot read a
 * version 23 symbol at L, where too little error correction is left to repair its own misread.
 * The large-version sample skips 23; a scratch sweep of all 40 versions × 4 levels decoded every
 * other symbol (2026-10-22). */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { encodeQr, qrDataCapacity, qrPath, qrVersionFor, QrCapacityError } from './qr-model.ts';

const jsQR = createRequire(import.meta.url)('jsqr');

/** Black modules on white at `scale` px per module, with a quiet zone of `margin` modules. */
function raster(matrix, scale = 3, margin = 4) {
  const n = (matrix.size + margin * 2) * scale;
  const data = new Uint8ClampedArray(n * n * 4).fill(255);
  matrix.modules.forEach((row, y) => row.forEach((dark, x) => {
    if (!dark) return;
    for (let dy = 0; dy < scale; dy += 1) {
      for (let dx = 0; dx < scale; dx += 1) {
        const i = (((y + margin) * scale + dy) * n + (x + margin) * scale + dx) * 4;
        data[i] = 0; data[i + 1] = 0; data[i + 2] = 0;
      }
    }
  }));
  return { data, width: n, height: n };
}

const decode = (matrix, scale) => {
  const { data, width, height } = raster(matrix, scale);
  return jsQR(data, width, height, { inversionAttempts: 'dontInvert' })?.data;
};

/** A string of exactly `bytes` ASCII bytes that varies along its length. */
const filler = (bytes, seed = 0) => Array.from({ length: bytes }, (_, i) => String.fromCharCode(97 + ((i * 7 + seed) % 26))).join('');

test('the products’ own inputs decode back exactly, at every level', () => {
  const inputs = [
    'https://shopx.example/kampanja/ljetna-akcija-2026?trgovina=SA-0042&uloga=blagajna',
    'K7Q-4PX-9MW',
    'VOUCHER:2026-10-22:00042:ŽŠĐČĆ',
    'Nalaz i mišljenje — dr. Đurđević, Čapljina 🏥',
    'a',
  ];
  for (const text of inputs) {
    for (const errorCorrection of ['L', 'M', 'Q', 'H']) {
      const matrix = encodeQr(text, { errorCorrection });
      assert.equal(decode(matrix), text, `${errorCorrection}: ${text}`);
      assert.equal(matrix.errorCorrection, errorCorrection);
      assert.equal(matrix.size, matrix.version * 4 + 17);
    }
  }
});

test('every version 1 to 12, filled to its last byte, decodes at every level', () => {
  for (let version = 1; version <= 12; version += 1) {
    for (const errorCorrection of ['L', 'M', 'Q', 'H']) {
      const bytes = qrDataCapacity(version, errorCorrection) - (version <= 9 ? 2 : 3);
      const text = filler(bytes, version);
      const matrix = encodeQr(text, { errorCorrection });
      assert.equal(matrix.version, version, `${bytes} bytes at ${errorCorrection} fill version ${version}`);
      assert.equal(decode(matrix), text, `version ${version} ${errorCorrection}`);
      // one byte more needs the next version
      assert.equal(encodeQr(`${text}x`, { errorCorrection }).version, version + 1);
    }
  }
});

test('large versions decode (a sample up to 40)', () => {
  for (const [version, errorCorrection] of [[14, 'Q'], [20, 'M'], [27, 'H'], [33, 'L'], [40, 'M']]) {
    const bytes = qrDataCapacity(version, errorCorrection) - 3;
    const text = filler(bytes, version);
    const matrix = encodeQr(text, { errorCorrection });
    assert.equal(matrix.version, version);
    assert.equal(decode(matrix, 2), text, `version ${version} ${errorCorrection}`);
  }
});

test('every mask decodes, and the chosen mask is deterministic', () => {
  const text = 'https://shopx.example/c/42';
  for (let mask = 0; mask < 8; mask += 1) {
    const matrix = encodeQr(text, { mask });
    assert.equal(matrix.mask, mask);
    assert.equal(decode(matrix), text, `mask ${mask}`);
  }
  // Deterministic: the same text always gets the same symbol.
  assert.deepEqual(encodeQr(text), encodeQr(text));
});

test('capacity: the standard’s published limits, and an error past version 40', () => {
  // ISO/IEC 18004 table 7, byte mode: version 1 holds 17/14/11/7 bytes, version 40 2953/2331/1663/1273.
  assert.deepEqual(['L', 'M', 'Q', 'H'].map((level) => qrDataCapacity(1, level) - 2), [17, 14, 11, 7]);
  assert.deepEqual(['L', 'M', 'Q', 'H'].map((level) => qrDataCapacity(40, level) - 3), [2953, 2331, 1663, 1273]);
  assert.equal(qrVersionFor(2953, 'L'), 40);
  assert.equal(qrVersionFor(2954, 'L'), undefined);
  assert.throws(() => encodeQr(filler(1274), { errorCorrection: 'H' }), QrCapacityError);
  // minVersion keeps a family of posters the same size
  assert.equal(encodeQr('a', { minVersion: 5 }).version, 5);
});

test('function patterns: three finders, the timing rows, the dark module', () => {
  const { modules, size } = encodeQr('https://shopx.example');
  const finder = (x0, y0) => Array.from({ length: 7 }, (_, y) => Array.from({ length: 7 }, (_, x) => modules[y0 + y][x0 + x] ? 1 : 0).join('')).join('/');
  const expected = '1111111/1000001/1011101/1011101/1011101/1000001/1111111';
  assert.equal(finder(0, 0), expected);
  assert.equal(finder(size - 7, 0), expected);
  assert.equal(finder(0, size - 7), expected);
  for (let i = 8; i < size - 8; i += 1) {
    assert.equal(modules[6][i], i % 2 === 0, `timing row ${i}`);
    assert.equal(modules[i][6], i % 2 === 0, `timing column ${i}`);
  }
  assert.equal(modules[size - 8][8], true, 'the dark module');
});

test('qrPath: one run per stretch of dark modules, offset by the quiet zone', () => {
  const matrix = encodeQr('K7Q-4PX-9MW');
  const path = qrPath(matrix);
  const runs = [...path.matchAll(/M(\d+) (\d+)h(\d+)v1h-(\d+)z/g)];
  assert.equal(runs.map((r) => r[0]).join(''), path, 'nothing but runs');
  const area = runs.reduce((sum, r) => sum + Number(r[3]), 0);
  const dark = matrix.modules.flat().filter(Boolean).length;
  assert.equal(area, dark);
  assert.ok(runs.every((r) => Number(r[1]) >= 4 && Number(r[2]) >= 4), 'the quiet zone is 4 modules');
  assert.match(qrPath(matrix, 0), /^M0 0h7v1h-7z/, 'the finder’s top row starts the path');
});

/* Review of PR #166: an optional ECI designator for UTF-8, and a minVersion that is not a number. */

test('eci: non-ASCII text can carry an ECI 26 (UTF-8) designator, and still reads', () => {
  const text = 'Ćevapi u Sarajevu — 5 KM';
  const marked = encodeQr(text, { eci: true });
  const plain = encodeQr(text);
  assert.notDeepEqual(marked.modules, plain.modules, 'the designator changes the symbol');
  const image = raster(marked);
  const read = jsQR(image.data, image.width, image.height, { inversionAttempts: 'dontInvert' });
  assert.equal(read?.data, text);
  assert.ok(read.chunks.some((chunk) => chunk.type === 'eci' && chunk.assignmentNumber === 26), 'jsQR saw ECI 26');
  // ASCII needs no designator: the flag leaves it alone
  assert.deepEqual(encodeQr('VOUCHER-0042', { eci: true }).modules, encodeQr('VOUCHER-0042').modules);
  // the 12 bits count: at the edge of a version, the designator moves the text to the next one
  // version 1 at L holds 17 bytes of byte mode: "a" and eight "č" are exactly that
  const edge = `a${'č'.repeat(8)}`;
  assert.equal(qrDataCapacity(1, 'L') * 8, 4 + 8 + 17 * 8 + 4, 'v1-L: 152 bits, room for 17 bytes and 4 spare');
  assert.equal(encodeQr(edge, { errorCorrection: 'L' }).version, 1);
  assert.equal(encodeQr(edge, { errorCorrection: 'L', eci: true }).version, 2);
});

test('minVersion that is not a number is a mistake, not a text too long', () => {
  assert.throws(() => encodeQr('a', { minVersion: Number.NaN }), RangeError);
  assert.throws(() => encodeQr('a', { minVersion: Number.POSITIVE_INFINITY }), RangeError);
  assert.equal(encodeQr('a', { minVersion: 2.7 }).version, 2);
});
