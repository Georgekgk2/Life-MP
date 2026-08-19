// Ukrainian Morphology, Synonyms & Typo Tolerance Utilities

export const ukrainianStopWords = new Set([
  "і",
  "й",
  "та",
  "або",
  "чи",
  "в",
  "у",
  "на",
  "до",
  "з",
  "із",
  "зі",
  "про",
  "для",
  "від",
  "як",
  "що",
  "це",
  "так",
  "не",
  "по",
  "за",
  "при",
  "під",
  "над",
]);

export const ukrainianSynonyms: Readonly<Record<string, readonly string[]>> = {
  кераміка: ["посуд", "гончарство", "глина", "таріль", "чашка", "ваза"],
  посуд: ["кераміка", "гончарство", "глина", "таріль", "чашка"],
  гончарство: ["кераміка", "посуд", "глина"],
  глина: ["кераміка", "гончарство", "посуд"],
  текстиль: [
    "ткацтво",
    "льон",
    "рушник",
    "сорочка",
    "одяг",
    "вишивка",
    "шопер",
  ],
  ткацтво: ["текстиль", "льон", "рушник", "вишивка", "шопер", "одяг"],
  льон: ["текстиль", "ткацтво", "рушник", "сорочка", "шопер"],
  шопер: ["текстиль", "ткацтво", "льон", "одяг", "сумка"],
  одяг: ["сорочка", "футболка", "шопер", "текстиль", "ткацтво"],
  дерево: ["різьба", "дуб", "ясень", "свічник", "декор", "панно"],
  різьба: ["дерево", "дуб", "свічник", "панно"],
  гастрономія: ["мед", "чай", "трави", "дикороси", "смаколики"],
  мед: ["гастрономія", "трави", "солодощі"],
  чай: ["трави", "дикороси", "гастрономія"],
  трави: ["чай", "дикороси", "гастрономія"],
  канцелярія: ["нотатник", "олівці", "закладка", "папір", "зошит"],
  нотатник: ["канцелярія", "зошит", "папір", "книги"],
  подарунки: ["сувеніри", "декор", "набір", "листівка"],
};

export function normalizeUkrainianText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[«»"'`’]/g, "")
    .replace(/[.,/#!$%^&*;:{}=\-_~()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenizeUkrainian(text: string): string[] {
  const normalized = normalizeUkrainianText(text);
  if (!normalized) return [];
  return normalized
    .split(" ")
    .filter((token) => token.length > 0 && !ukrainianStopWords.has(token));
}

export function expandWithSynonyms(tokens: readonly string[]): string[] {
  const expanded = new Set<string>(tokens);
  for (const token of tokens) {
    const directSynonyms = ukrainianSynonyms[token];
    if (directSynonyms) {
      for (const syn of directSynonyms) {
        expanded.add(syn);
      }
    }
  }
  return Array.from(expanded);
}

export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    const row = matrix[0];
    if (row) {
      row[j] = j;
    }
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const bChar = b.charAt(i - 1);
      const aChar = a.charAt(j - 1);
      const prevRow = matrix[i - 1];
      const currRow = matrix[i];
      if (bChar === aChar) {
        if (currRow && prevRow) {
          currRow[j] = prevRow[j - 1] ?? 0;
        }
      } else {
        if (currRow && prevRow) {
          currRow[j] = Math.min(
            (prevRow[j - 1] ?? 0) + 1, // substitution
            (currRow[j - 1] ?? 0) + 1, // insertion
            (prevRow[j] ?? 0) + 1, // deletion
          );
        }
      }
    }
  }

  const lastRow = matrix[b.length];
  return lastRow ? (lastRow[a.length] ?? 0) : 0;
}

export function matchesWithTypoTolerance(
  queryToken: string,
  targetToken: string,
): boolean {
  if (targetToken.includes(queryToken)) return true;
  if (queryToken.includes(targetToken)) return true;
  const qLen = queryToken.length;
  const tLen = targetToken.length;

  // Root stem match for Ukrainian word inflections (e.g., "глин" in "глина" and "глиняний")
  const minStemLen = 4;
  if (
    qLen >= minStemLen &&
    tLen >= minStemLen &&
    queryToken.slice(0, minStemLen) === targetToken.slice(0, minStemLen)
  ) {
    return true;
  }

  // Typo distance threshold
  const maxDistance = qLen <= 4 ? 0 : qLen <= 6 ? 1 : 2;
  const dist = levenshteinDistance(queryToken, targetToken);

  return dist <= maxDistance;
}
