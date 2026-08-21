#!/usr/bin/env node

import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, relative, dirname, join } from "node:path";

const root = resolve(process.cwd());
const docsRoot = resolve(root, "docs");
const failures = [];

function walk(directory) {
  const result = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) result.push(...walk(path));
    else result.push(path);
  }
  return result;
}

function display(path) {
  return relative(root, path) || ".";
}

function fail(message) {
  failures.push(message);
}

function exists(path) {
  try {
    statSync(path);
    return true;
  } catch {
    return false;
  }
}

function headingSlug(heading) {
  return heading
    .toLowerCase()
    .trim()
    .replace(/[`*_~]/g, "")
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, "")
    .replace(/\s+/g, "-");
}

const requiredDirectories = [
  "docs/architecture",
  "docs/decisions",
  "docs/runbooks",
  "docs/templates",
];
for (const directory of requiredDirectories) {
  if (!exists(resolve(root, directory)))
    fail(`Відсутня обов’язкова директорія: ${directory}`);
}

const markdownFiles = walk(docsRoot).filter((path) => path.endsWith(".md"));
if (markdownFiles.length === 0)
  fail("Не знайдено жодного markdown-файлу в docs/");

const registerPath = resolve(root, "docs/documentation-register.md");
if (!exists(registerPath)) fail("Відсутній docs/documentation-register.md");
const register = exists(registerPath) ? readFileSync(registerPath, "utf8") : "";

for (const path of markdownFiles) {
  const text = readFileSync(path, "utf8");
  const source = text.replace(/^```[\s\S]*?^```\s*$/gm, "");
  if (!/[А-Яа-яІіЇїЄєҐґ]/u.test(source)) {
    fail(`${display(path)}: поза code fence немає українського тексту`);
  }
  const headings = [...source.matchAll(/^#\s+(.+)$/gm)].map(
    (match) => match[1],
  );
  if (headings.length !== 1) {
    fail(
      `${display(path)}: очікується рівно один H1, знайдено ${headings.length}`,
    );
  }

  if (path !== registerPath && !register.includes(`\`${display(path)}\``)) {
    fail(`${display(path)}: немає запису в docs/documentation-register.md`);
  }

  const links = [...source.matchAll(/(?<!!)\[[^\]]+\]\(([^)]+)\)/g)].map(
    (match) => match[1].trim(),
  );
  for (const rawLink of links) {
    const link = rawLink.replace(/^<|>$/g, "");
    if (
      link === "" ||
      link.startsWith("#") ||
      /^[a-z][a-z\d+.-]*:/i.test(link) ||
      link.startsWith("//")
    ) {
      continue;
    }

    const [rawTarget, rawAnchor] = link.split("#", 2);
    const target = decodeURIComponent(rawTarget.split("?", 1)[0]);
    const resolvedTarget = resolve(dirname(path), target);
    if (!exists(resolvedTarget)) {
      fail(`${display(path)}: локальне посилання не існує: ${rawLink}`);
      continue;
    }

    if (rawAnchor && statSync(resolvedTarget).isFile()) {
      const targetText = readFileSync(resolvedTarget, "utf8");
      const targetSlugs = new Set(
        [...targetText.matchAll(/^#{1,6}\s+(.+)$/gm)].map((match) =>
          headingSlug(match[1]),
        ),
      );
      if (!targetSlugs.has(rawAnchor.toLowerCase())) {
        fail(`${display(path)}: anchor не існує в ${rawTarget}: #${rawAnchor}`);
      }
    }
  }
}

const adrDirectory = resolve(docsRoot, "adr");
const adrFiles = readdirSync(adrDirectory)
  .filter((name) => name.endsWith(".md"))
  .sort();
const adrNumbers = new Map();
for (const name of adrFiles) {
  const path = join(adrDirectory, name);
  const filenameMatch = /^(\d{4})-.+\.md$/.exec(name);
  if (!filenameMatch) {
    fail(`ADR filename не має номера: ${display(path)}`);
    continue;
  }

  const fileNumber = filenameMatch[1];
  const text = readFileSync(path, "utf8");
  const headingMatch = /^#\s+ADR\s+(\d{4})\b/im.exec(text);
  if (!headingMatch) {
    fail(`${display(path)}: H1 не містить номера ADR`);
  } else if (headingMatch[1] !== fileNumber) {
    fail(
      `${display(path)}: filename ADR ${fileNumber} не збігається з H1 ${headingMatch[1]}`,
    );
  }

  const previous = adrNumbers.get(fileNumber);
  if (previous)
    fail(`Дубльований номер ADR ${fileNumber}: ${previous} і ${display(path)}`);
  else adrNumbers.set(fileNumber, display(path));
}

const forbiddenPaths = [
  "docs/adr/0007-vendor-verification-and-compliance.md",
  "0007-vendor-verification-and-compliance.md",
];
const allText = markdownFiles
  .map((path) => readFileSync(path, "utf8"))
  .join("\n");
for (const forbiddenPath of forbiddenPaths) {
  if (allText.includes(forbiddenPath))
    fail(`Знайдено stale ADR path: ${forbiddenPath}`);
}

const productionGate = resolve(
  root,
  "docs/decisions/production-readiness-gate.md",
);
if (exists(productionGate)) {
  const gateText = readFileSync(productionGate, "utf8");
  if (!/НЕ ДОЗВОЛЕНО ДЛЯ PRODUCTION/i.test(gateText)) {
    fail("Production gate не містить явної заборони production");
  }
  if (!/BLOCKED|ЗАБЛОКОВАНО/i.test(gateText)) {
    fail("Production gate не містить blocked status");
  }
}

if (failures.length > 0) {
  console.error("Перевірка документації: FAILED");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(
    `Перевірка документації: PASSED (${markdownFiles.length} files, ${adrFiles.length} ADRs, local links checked)`,
  );
}
