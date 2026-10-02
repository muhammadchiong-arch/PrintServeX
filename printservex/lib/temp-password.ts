// Makes an easy-to-read temporary password like "kape-4817-tala".
// Business rule: staff must change it the first time they sign in.
const WORDS = ["kape", "tala", "bayan", "ulap", "araw", "dagat", "bituin", "ilog", "bundok", "hangin", "puno", "lupa"];

export function makeTempPassword(): string {
  const n = new Uint32Array(3);
  crypto.getRandomValues(n);
  const word = (x: number) => WORDS[x % WORDS.length];
  const first = word(n[0]);
  const second = WORDS.filter((w) => w !== first)[n[2] % (WORDS.length - 1)]; // two different words
  return `${first}-${String(1000 + (n[1] % 9000))}-${second}`;
}
