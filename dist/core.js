export const all = Array.from({ length: 10000 }, (_, i) =>
  String(i).padStart(4, '0'),
);
export const matches = (a, b) =>
  Number(a[0] === b[0]) +
  Number(a[1] === b[1]) +
  Number(a[2] === b[2]) +
  Number(a[3] === b[3]);
export const filter = history =>
  all.filter(s => history.every(h => matches(s, h.guess) === h.matches));
export function best(candidates, history = []) {
  if (candidates.length === 10000 && !history.length) return '0000';
  if (candidates.length === 1) return candidates[0];
  const set = new Set(candidates),
    used = new Set(history.map(x => x.guess));
  let bestGuess = '',
    bestWorst = Infinity,
    bestSum = Infinity,
    bestCandidate = false;
  for (const g of all) {
    if (used.has(g)) continue;
    let bins = [0, 0, 0, 0, 0];
    for (const c of candidates) bins[matches(g, c)]++;
    let worst = Math.max(...bins),
      sum = bins.reduce((a, b) => a + b * b, 0),
      isc = set.has(g);
    if (
      worst < bestWorst ||
      (worst === bestWorst &&
        (sum < bestSum || (sum === bestSum && isc && !bestCandidate)))
    ) {
      bestGuess = g;
      bestWorst = worst;
      bestSum = sum;
      bestCandidate = isc;
    }
  }
  return bestGuess;
}
