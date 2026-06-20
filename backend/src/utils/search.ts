function levenshtein(a: string, b: string): number {
  const tmp: number[][] = [];
  for (let i = 0; i <= a.length; i++) {
    tmp[i] = [i];
  }
  for (let j = 0; j <= b.length; j++) {
    tmp[0][j] = j;
  }
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      tmp[i][j] = Math.min(
        tmp[i - 1][j] + 1, // deletion
        tmp[i][j - 1] + 1, // insertion
        tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1) // substitution
      );
    }
  }
  return tmp[a.length][b.length];
}

export function computeFuzzyScore(query: string, target: string): number {
  const qClean = query.toLowerCase().trim();
  const tClean = target.toLowerCase().trim();
  if (!qClean || !tClean) return 0;

  if (qClean === tClean) return 1.0;

  // Substring match: if the query is a complete substring of the target, or vice versa
  if (tClean.includes(qClean)) {
    return 0.8 + 0.2 * (qClean.length / tClean.length);
  }
  if (qClean.includes(tClean)) {
    return 0.8 * (tClean.length / qClean.length);
  }

  // Token-by-token comparison
  const qWords = qClean.split(/\s+/).filter(Boolean);
  const tWords = tClean.split(/\s+/).filter(Boolean);

  if (qWords.length === 0 || tWords.length === 0) return 0;

  let totalScore = 0;
  for (const qw of qWords) {
    let maxWordScore = 0;
    for (const tw of tWords) {
      if (qw === tw) {
        maxWordScore = 1.0;
        break;
      }
      if (tw.includes(qw)) {
        maxWordScore = Math.max(maxWordScore, 0.8 * (qw.length / tw.length));
      } else if (qw.includes(tw)) {
        maxWordScore = Math.max(maxWordScore, 0.8 * (tw.length / qw.length));
      }

      const dist = levenshtein(qw, tw);
      const maxLen = Math.max(qw.length, tw.length);
      const sim = 1 - dist / maxLen;
      maxWordScore = Math.max(maxWordScore, sim);
    }
    totalScore += maxWordScore;
  }

  return totalScore / qWords.length;
}
