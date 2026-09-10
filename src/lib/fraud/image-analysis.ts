import crypto from 'node:crypto';

// Screenshot integrity: exact hash matching + lightweight similarity (aHash on downscaled luminance).
// Exact duplicates are hard signals; similarity is a soft signal for review.
export function sha256Buffer(buf: Buffer): string {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

// Average-hash over raw bytes (cheap, dependency-free). Not a perceptual breakthrough,
// but catches trivial re-saves/resizes combined with exact-hash checks.
export function averageHash(buf: Buffer): string {
  const N = 64;
  const samples: number[] = [];
  const step = Math.max(1, Math.floor(buf.length / N));
  for (let i = 0; i < buf.length && samples.length < N; i += step) samples.push(buf[i]);
  while (samples.length < N) samples.push(0);
  const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
  let bits = '';
  for (const s of samples) bits += s >= avg ? '1' : '0';
  return BigInt('0b' + bits).toString(16).padStart(16, '0');
}

export function hammingDistanceHex(a: string, b: string): number {
  try {
    let x = BigInt('0x' + a) ^ BigInt('0x' + b);
    let d = 0;
    const one = BigInt(1);
    while (x) { d += Number(x & one); x >>= one; }
    return d;
  } catch { return 64; }
}
