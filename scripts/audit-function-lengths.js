import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const MAX_FUNCTION_LINES = 30;
const roots = ["src", "scripts", "test", "UnityClient/Assets/RetroRpg/Scripts"];
const extensions = new Set([".js", ".cs"]);

function sourceFiles(directory) {
  const result = [];
  for (const name of readdirSync(directory)) {
    const path = join(directory, name),
      metadata = statSync(path);
    if (metadata.isDirectory()) result.push(...sourceFiles(path));
    else if (extensions.has(extname(path))) result.push(path);
  }
  return result;
}

function lineNumber(source, index) {
  return source.slice(0, index).split("\n").length;
}

function matchingBrace(source, opening) {
  let depth = 0,
    quote = null;
  const mode = { escaped: false, line: false, block: false };
  for (let index = opening; index < source.length; index += 1) {
    const character = source[index],
      next = source[index + 1];
    if (mode.line) {
      if (character === "\n") mode.line = false;
      continue;
    }
    if (mode.block) {
      if (character === "*" && next === "/") {
        mode.block = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (mode.escaped) mode.escaped = false;
      else if (character === "\\") mode.escaped = true;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === "/" && next === "/") {
      mode.line = true;
      index += 1;
    } else if (character === "/" && next === "*") {
      mode.block = true;
      index += 1;
    } else if (["'", '"', "`"].includes(character)) quote = character;
    else if (character === "{") depth += 1;
    else if (character === "}" && --depth === 0) return index;
  }
  return source.length - 1;
}

function codeLineCount(source, start, end) {
  return source
    .slice(start, end + 1)
    .split("\n")
    .filter((line) => {
      const value = line.trim();
      const structuralOnly = /^[{}()[\],;]+$/.test(value);
      return (
        value &&
        !structuralOnly &&
        !value.startsWith("//") &&
        !value.startsWith("/*")
      );
    }).length;
}

function exempted(lines, startLine) {
  return lines
    .slice(Math.max(0, startLine - 4), startLine - 1)
    .some((line) => line.includes("function-length-exempt: template"));
}

function javascriptPatterns() {
  return [
    /(?:export\s+)?(?:async\s+)?function\s+([\w$]+)\s*\([^)]*\)\s*\{/g,
    /(?:const|let|var)\s+([\w$]+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>\s*\{/g,
  ];
}

// function-length-exempt: template -- source-parser grammar
function csharpPatterns() {
  return [
    /(?:public|private|protected|internal)\s+(?:static\s+)?(?:async\s+)?[\w<>,\[\]?]+\s+(\w+)\s*\([^;{}]*\)\s*\{/g,
  ];
}

function recordsForPattern(source, pattern, path) {
  const records = [],
    lines = source.split("\n");
  let match;
  while ((match = pattern.exec(source))) {
    const opening = source.indexOf("{", match.index),
      ending = matchingBrace(source, opening),
      startLine = lineNumber(source, match.index),
      endLine = lineNumber(source, ending);
    records.push({
      path,
      name: match[1],
      startLine,
      endLine,
      lines: codeLineCount(source, match.index, ending),
      exempt: exempted(lines, startLine),
    });
  }
  return records;
}

function functionRecords(path) {
  const source = readFileSync(path, "utf8"),
    patterns =
      extname(path) === ".cs" ? csharpPatterns() : javascriptPatterns();
  return patterns.flatMap((pattern) =>
    recordsForPattern(source, pattern, path),
  );
}

function audit() {
  const files = roots.flatMap((directory) =>
      sourceFiles(join(root, directory)),
    ),
    records = files.flatMap(functionRecords),
    violations = records
      .filter((record) => record.lines > MAX_FUNCTION_LINES && !record.exempt)
      .sort((left, right) => right.lines - left.lines);
  return {
    maximumLines: MAX_FUNCTION_LINES,
    files: files.length,
    functions: records.length,
    exemptions: records.filter((record) => record.exempt).length,
    violations: violations.map((record) => ({
      ...record,
      path: relative(root, record.path),
    })),
  };
}

const report = audit();
console.log(JSON.stringify(report, null, 2));
if (report.violations.length) process.exitCode = 1;
