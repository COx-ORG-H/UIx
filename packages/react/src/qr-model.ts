/**
 * A QR Code encoder (ISO/IEC 18004) for `QrCode` (HAR-1251): byte mode (UTF-8), the four
 * error-correction levels, versions 1 to 40, all eight masks scored by the standard's
 * penalty rules. Pure and dependency-free, so a consumer never pulls a QR library in for a
 * poster or a voucher. `qr-model.test.mjs` decodes its output with a reference decoder.
 *
 * The algorithm follows the standard's own construction (function patterns, Reed-Solomon over
 * GF(256) with 0x11D, zig-zag placement, BCH-coded format and version information).
 */

/** How much of the symbol can be lost and still read: about 7, 15, 25 and 30 % of codewords. */
export type QrErrorCorrection = 'L' | 'M' | 'Q' | 'H';

export interface QrMatrix {
  /** 1 to 40. Each version is 4 modules wider than the one before (version 1 is 21 × 21). */
  version: number;
  /** Modules per side, without the quiet zone. */
  size: number;
  errorCorrection: QrErrorCorrection;
  /** The mask the penalty rules chose, 0 to 7. */
  mask: number;
  /** `modules[y][x]` is true for a dark module. */
  modules: boolean[][];
}

export interface QrEncodeOptions {
  /** Default `M`: survives a crease or a smudge on a printed poster. */
  errorCorrection?: QrErrorCorrection;
  /** The smallest version to use (1 to 40); a larger one is chosen when the text needs it. */
  minVersion?: number;
  /** Force a mask (0 to 7) instead of the lowest-penalty one; for tests. */
  mask?: number;
}

/** Thrown when the text does not fit in version 40 at the requested level. */
export class QrCapacityError extends Error {
  readonly bytes: number;
  readonly errorCorrection: QrErrorCorrection;
  constructor(bytes: number, errorCorrection: QrErrorCorrection) {
    super(`QR: ${bytes} bytes do not fit in version 40 at error correction ${errorCorrection}`);
    this.name = 'QrCapacityError';
    this.bytes = bytes;
    this.errorCorrection = errorCorrection;
  }
}

const LEVEL_INDEX: Record<QrErrorCorrection, number> = { L: 0, M: 1, Q: 2, H: 3 };
/** The two format bits of each level, as the standard numbers them (M is 00). */
const FORMAT_BITS: Record<QrErrorCorrection, number> = { L: 1, M: 0, Q: 3, H: 2 };

// Error-correction codewords per block and number of blocks, by level then version (index 0 unused).
const ECC_PER_BLOCK: readonly (readonly number[])[] = [
  [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
  [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
];
const BLOCKS: readonly (readonly number[])[] = [
  [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
  [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
  [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
  [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81],
];

/** Modules left for data and error correction once the function patterns are drawn. */
function rawDataModules(version: number): number {
  let result = (16 * version + 128) * version + 64;
  if (version >= 2) {
    const align = Math.floor(version / 7) + 2;
    result -= (25 * align - 10) * align - 55;
    if (version >= 7) result -= 36;
  }
  return result;
}

/** Data codewords (bytes) a version holds at a level. */
export function qrDataCapacity(version: number, errorCorrection: QrErrorCorrection): number {
  const level = LEVEL_INDEX[errorCorrection];
  return Math.floor(rawDataModules(version) / 8) - ECC_PER_BLOCK[level]![version]! * BLOCKS[level]![version]!;
}

/** Bits a byte-mode segment of `bytes` bytes needs: mode, count, data. */
const segmentBits = (bytes: number, version: number) => 4 + (version <= 9 ? 8 : 16) + bytes * 8;

/** The smallest version that holds `bytes` bytes at a level, or undefined past version 40. */
export function qrVersionFor(bytes: number, errorCorrection: QrErrorCorrection, minVersion = 1): number | undefined {
  for (let version = Math.max(1, Math.min(40, minVersion)); version <= 40; version += 1) {
    if (bytes < (version <= 9 ? 256 : 65536) && segmentBits(bytes, version) <= qrDataCapacity(version, errorCorrection) * 8) return version;
  }
  return undefined;
}

// ── Reed-Solomon over GF(2^8), primitive polynomial 0x11D ─────────────────────────────────
function gfMultiply(x: number, y: number): number {
  let z = 0;
  for (let i = 7; i >= 0; i -= 1) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z;
}

function rsDivisor(degree: number): number[] {
  const result = new Array<number>(degree).fill(0);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i += 1) {
    for (let j = 0; j < result.length; j += 1) {
      result[j] = gfMultiply(result[j]!, root);
      if (j + 1 < result.length) result[j]! ^= result[j + 1]!;
    }
    root = gfMultiply(root, 0x02);
  }
  return result;
}

function rsRemainder(data: readonly number[], divisor: readonly number[]): number[] {
  const result = divisor.map(() => 0);
  for (const byte of data) {
    const factor = byte ^ result.shift()!;
    result.push(0);
    divisor.forEach((coefficient, i) => { result[i]! ^= gfMultiply(coefficient, factor); });
  }
  return result;
}

/** Splits the data into blocks, appends each block's error correction, interleaves. */
function withErrorCorrection(data: readonly number[], version: number, errorCorrection: QrErrorCorrection): number[] {
  const level = LEVEL_INDEX[errorCorrection];
  const blockCount = BLOCKS[level]![version]!;
  const eccLength = ECC_PER_BLOCK[level]![version]!;
  const rawCodewords = Math.floor(rawDataModules(version) / 8);
  const shortBlocks = blockCount - (rawCodewords % blockCount);
  const shortLength = Math.floor(rawCodewords / blockCount);
  const divisor = rsDivisor(eccLength);
  const blocks: number[][] = [];
  for (let i = 0, k = 0; i < blockCount; i += 1) {
    const block = data.slice(k, k + shortLength - eccLength + (i < shortBlocks ? 0 : 1));
    k += block.length;
    const ecc = rsRemainder(block, divisor);
    if (i < shortBlocks) block.push(0);
    blocks.push(block.concat(ecc));
  }
  const result: number[] = [];
  for (let i = 0; i < blocks[0]!.length; i += 1) {
    blocks.forEach((block, j) => {
      // The padding byte of a short block is not part of the symbol.
      if (i !== shortLength - eccLength || j >= shortBlocks) result.push(block[i]!);
    });
  }
  return result;
}

/** Mode, count, data, terminator and padding, as codewords for one version and level. */
function dataCodewords(bytes: Uint8Array, version: number, errorCorrection: QrErrorCorrection): number[] {
  const bits: number[] = [];
  const append = (value: number, length: number) => { for (let i = length - 1; i >= 0; i -= 1) bits.push((value >>> i) & 1); };
  append(0b0100, 4);
  append(bytes.length, version <= 9 ? 8 : 16);
  for (const byte of bytes) append(byte, 8);
  const capacity = qrDataCapacity(version, errorCorrection) * 8;
  append(0, Math.min(4, capacity - bits.length));
  append(0, (8 - (bits.length % 8)) % 8);
  for (let pad = 0xec; bits.length < capacity; pad ^= 0xec ^ 0x11) append(pad, 8);
  const codewords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) codewords.push(bits.slice(i, i + 8).reduce((byte, bit) => (byte << 1) | bit, 0));
  return codewords;
}

/** Centres of the alignment patterns along one axis. */
function alignmentPositions(version: number): number[] {
  if (version === 1) return [];
  const count = Math.floor(version / 7) + 2;
  const step = Math.floor((version * 8 + count * 3 + 5) / (count * 4 - 4)) * 2;
  const result = [6];
  for (let position = version * 4 + 17 - 7; result.length < count; position -= step) result.splice(1, 0, position);
  return result;
}

const MASKS: readonly ((x: number, y: number) => boolean)[] = [
  (x, y) => (x + y) % 2 === 0,
  (_x, y) => y % 2 === 0,
  (x) => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

class QrSymbol {
  readonly size: number;
  readonly modules: boolean[][];
  readonly reserved: boolean[][];
  readonly version: number;
  readonly errorCorrection: QrErrorCorrection;

  constructor(version: number, errorCorrection: QrErrorCorrection) {
    this.version = version;
    this.errorCorrection = errorCorrection;
    this.size = version * 4 + 17;
    this.modules = Array.from({ length: this.size }, () => new Array<boolean>(this.size).fill(false));
    this.reserved = Array.from({ length: this.size }, () => new Array<boolean>(this.size).fill(false));
    this.drawFunctionPatterns();
  }

  private set(x: number, y: number, dark: boolean) {
    this.modules[y]![x] = dark;
    this.reserved[y]![x] = true;
  }

  private drawFunctionPatterns() {
    const { size } = this;
    for (let i = 0; i < size; i += 1) {
      this.set(6, i, i % 2 === 0);
      this.set(i, 6, i % 2 === 0);
    }
    for (const [cx, cy] of [[3, 3], [size - 4, 3], [3, size - 4]] as const) {
      for (let dy = -4; dy <= 4; dy += 1) {
        for (let dx = -4; dx <= 4; dx += 1) {
          const x = cx + dx;
          const y = cy + dy;
          if (x < 0 || x >= size || y < 0 || y >= size) continue;
          const ring = Math.max(Math.abs(dx), Math.abs(dy));
          this.set(x, y, ring !== 2 && ring !== 4);
        }
      }
    }
    const positions = alignmentPositions(this.version);
    const last = positions.length - 1;
    positions.forEach((cx, i) => positions.forEach((cy, j) => {
      if ((i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0)) return;
      for (let dy = -2; dy <= 2; dy += 1) {
        for (let dx = -2; dx <= 2; dx += 1) this.set(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }
    }));
    this.drawFormat(0);
    this.drawVersion();
  }

  drawFormat(mask: number) {
    const data = (FORMAT_BITS[this.errorCorrection] << 3) | mask;
    let remainder = data;
    for (let i = 0; i < 10; i += 1) remainder = (remainder << 1) ^ ((remainder >>> 9) * 0x537);
    const bits = ((data << 10) | remainder) ^ 0x5412;
    const bit = (i: number) => ((bits >>> i) & 1) !== 0;
    const { size } = this;
    for (let i = 0; i <= 5; i += 1) this.set(8, i, bit(i));
    this.set(8, 7, bit(6));
    this.set(8, 8, bit(7));
    this.set(7, 8, bit(8));
    for (let i = 9; i < 15; i += 1) this.set(14 - i, 8, bit(i));
    for (let i = 0; i < 8; i += 1) this.set(size - 1 - i, 8, bit(i));
    for (let i = 8; i < 15; i += 1) this.set(8, size - 15 + i, bit(i));
    this.set(8, size - 8, true);
  }

  private drawVersion() {
    if (this.version < 7) return;
    let remainder = this.version;
    for (let i = 0; i < 12; i += 1) remainder = (remainder << 1) ^ ((remainder >>> 11) * 0x1f25);
    const bits = (this.version << 12) | remainder;
    for (let i = 0; i < 18; i += 1) {
      const dark = ((bits >>> i) & 1) !== 0;
      const a = this.size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      this.set(a, b, dark);
      this.set(b, a, dark);
    }
  }

  drawCodewords(codewords: readonly number[]) {
    const { size } = this;
    let i = 0;
    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let vertical = 0; vertical < size; vertical += 1) {
        for (let j = 0; j < 2; j += 1) {
          const x = right - j;
          const upward = ((right + 1) & 2) === 0;
          const y = upward ? size - 1 - vertical : vertical;
          if (this.reserved[y]![x] || i >= codewords.length * 8) continue;
          this.modules[y]![x] = ((codewords[i >>> 3]! >>> (7 - (i & 7))) & 1) !== 0;
          i += 1;
        }
      }
    }
  }

  /** XORs a mask over the data modules; applying it twice undoes it. */
  applyMask(mask: number) {
    const flip = MASKS[mask]!;
    for (let y = 0; y < this.size; y += 1) {
      for (let x = 0; x < this.size; x += 1) {
        if (!this.reserved[y]![x] && flip(x, y)) this.modules[y]![x] = !this.modules[y]![x];
      }
    }
  }

  /** The standard's four penalty rules: runs, 2 × 2 blocks, finder look-alikes, dark balance. */
  penalty(): number {
    const { size, modules } = this;
    let score = 0;
    const line = (get: (i: number) => boolean) => {
      let run = 1;
      for (let i = 1; i <= size; i += 1) {
        if (i < size && get(i) === get(i - 1)) { run += 1; continue; }
        if (run >= 5) score += 3 + (run - 5);
        run = 1;
      }
      // 1:1:3:1:1 with four light modules on either side
      for (let i = 0; i + 11 <= size; i += 1) {
        const window = Array.from({ length: 11 }, (_, k) => get(i + k));
        const core = window[4]! && !window[5]! && window[6]! && window[7]! && window[8]! && !window[9]! && window[10]!;
        const coreReverse = window[0]! && !window[1]! && window[2]! && window[3]! && window[4]! && !window[5]! && window[6]!;
        if (core && !window[0] && !window[1] && !window[2] && !window[3]) score += 40;
        if (coreReverse && !window[7] && !window[8] && !window[9] && !window[10]) score += 40;
      }
    };
    for (let y = 0; y < size; y += 1) line((x) => modules[y]![x]!);
    for (let x = 0; x < size; x += 1) line((y) => modules[y]![x]!);
    let dark = 0;
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const value = modules[y]![x]!;
        if (value) dark += 1;
        if (x + 1 < size && y + 1 < size && value === modules[y]![x + 1] && value === modules[y + 1]![x] && value === modules[y + 1]![x + 1]) score += 3;
      }
    }
    const total = size * size;
    score += (Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1) * 10;
    return score;
  }
}

/** UTF-8 bytes of a string, without relying on TextEncoder (old runtimes, server rendering). */
function utf8(text: string): Uint8Array {
  if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(text);
  const escaped = unescape(encodeURIComponent(text));
  return Uint8Array.from(escaped, (c) => c.charCodeAt(0));
}

/**
 * Encodes `text` (as UTF-8 bytes) into a QR matrix: the smallest version that fits at the
 * level, the mask with the lowest penalty. Throws `QrCapacityError` past version 40
 * (2,953 bytes at L, 1,273 at H).
 */
export function encodeQr(text: string, options: QrEncodeOptions = {}): QrMatrix {
  const errorCorrection = options.errorCorrection ?? 'M';
  const bytes = utf8(text);
  const version = qrVersionFor(bytes.length, errorCorrection, options.minVersion);
  if (version === undefined) throw new QrCapacityError(bytes.length, errorCorrection);
  const symbol = new QrSymbol(version, errorCorrection);
  symbol.drawCodewords(withErrorCorrection(dataCodewords(bytes, version, errorCorrection), version, errorCorrection));
  let mask = options.mask;
  if (mask === undefined) {
    let best = Infinity;
    for (let candidate = 0; candidate < 8; candidate += 1) {
      symbol.applyMask(candidate);
      symbol.drawFormat(candidate);
      const score = symbol.penalty();
      if (score < best) { best = score; mask = candidate; }
      symbol.applyMask(candidate);
    }
  }
  symbol.applyMask(mask!);
  symbol.drawFormat(mask!);
  return { version, size: symbol.size, errorCorrection, mask: mask!, modules: symbol.modules };
}

/**
 * The dark modules as one SVG path in module units, offset by `margin` (the quiet zone):
 * one `h`-run per stretch of dark modules in a row, so a version-10 symbol is one short path.
 */
export function qrPath(matrix: QrMatrix, margin = 4): string {
  const parts: string[] = [];
  matrix.modules.forEach((row, y) => {
    for (let x = 0; x < row.length; x += 1) {
      if (!row[x]) continue;
      let end = x;
      while (end + 1 < row.length && row[end + 1]) end += 1;
      const length = end - x + 1;
      parts.push(`M${x + margin} ${y + margin}h${length}v1h-${length}z`);
      x = end;
    }
  });
  return parts.join('');
}
