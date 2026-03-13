import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiDir = path.resolve(__dirname, "../api");

// Remove implementation directories from public API output
fs.rmSync(path.join(apiDir, "internal"), { recursive: true, force: true });
fs.rmSync(path.join(apiDir, "physics/rapier"), { recursive: true, force: true });

// Strip private, protected, #private, and @internal members from all .d.ts files
function removeNonPublicMembers(content, filePath) {
  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true,
  );
  const rangesToRemove = [];

  function hasInternalTag(node) {
    const jsdocTags = ts.getJSDocTags(node);
    return jsdocTags.some(
      (tag) => tag.tagName.text === "internal",
    );
  }

  function visit(node) {
    if (ts.isClassDeclaration(node) || ts.isClassExpression(node)) {
      for (const member of node.members) {
        const modifiers = ts.canHaveModifiers(member)
          ? ts.getModifiers(member)
          : undefined;
        const isPrivate = modifiers?.some(
          (m) => m.kind === ts.SyntaxKind.PrivateKeyword,
        );
        const isProtected = modifiers?.some(
          (m) => m.kind === ts.SyntaxKind.ProtectedKeyword,
        );
        const isHashPrivate =
          ts.isPropertyDeclaration(member) &&
          member.name &&
          ts.isPrivateIdentifier(member.name);
        const isInternal = hasInternalTag(member);

        if (isPrivate || isProtected || isHashPrivate || isInternal) {
          rangesToRemove.push({
            start: member.getFullStart(),
            end: member.end,
          });
        }
      }
    }

    // Strip @internal members from interfaces
    if (ts.isInterfaceDeclaration(node) || ts.isTypeLiteralNode(node)) {
      for (const member of node.members) {
        if (hasInternalTag(member)) {
          rangesToRemove.push({
            start: member.getFullStart(),
            end: member.end,
          });
        }
      }
    }

    // Strip top-level @internal declarations (interfaces, types, functions, variables, classes)
    if (
      node.parent === sourceFile &&
      hasInternalTag(node) &&
      !ts.isSourceFile(node)
    ) {
      rangesToRemove.push({
        start: node.getFullStart(),
        end: node.end,
      });
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  if (rangesToRemove.length === 0) return content;

  // Remove in reverse order to preserve positions
  rangesToRemove.sort((a, b) => b.start - a.start);
  let result = content;
  for (const range of rangesToRemove) {
    result = result.slice(0, range.start) + result.slice(range.end);
  }

  // Clean up consecutive blank lines
  result = result.replace(/\n{3,}/g, "\n\n");
  return result;
}

function walkDtsFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkDtsFiles(fullPath));
    } else if (entry.name.endsWith(".d.ts")) {
      files.push(fullPath);
    }
  }
  return files;
}

for (const filePath of walkDtsFiles(apiDir)) {
  const original = fs.readFileSync(filePath, "utf-8");
  const cleaned = removeNonPublicMembers(original, filePath);
  if (cleaned !== original) {
    fs.writeFileSync(filePath, cleaned);
  }
}
