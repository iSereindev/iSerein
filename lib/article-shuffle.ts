// Input is newest first. Mix two age groups so older readings resurface.
export function shuffleArticleOrder<T>(items: readonly T[], seed: string): T[] {
  let state = 2166136261;
  for (let index = 0; index < seed.length; index++) {
    state = Math.imul(state ^ seed.charCodeAt(index), 16777619);
  }

  function random() {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  }

  function shuffle(group: readonly T[]) {
    const result = [...group];
    for (let index = result.length - 1; index > 0; index--) {
      const other = Math.floor(random() * (index + 1));
      [result[index], result[other]] = [result[other], result[index]];
    }
    return result;
  }

  const middle = Math.ceil(items.length / 2);
  const newer = shuffle(items.slice(0, middle));
  const older = shuffle(items.slice(middle));
  const groups = random() < 0.5 ? [newer, older] : [older, newer];
  const mixed: T[] = [];

  for (let index = 0; index < middle; index++) {
    for (const group of groups) {
      if (index < group.length) mixed.push(group[index]);
    }
  }

  return mixed;
}
