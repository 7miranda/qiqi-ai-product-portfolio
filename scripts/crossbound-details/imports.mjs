import ts from 'typescript';

// Only module specifiers change; all executable code and asset geometry stay intact.
export function versionImports(source, version) {
  const sf = ts.createSourceFile('modules.js', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const edits = [];
  function visit(node) {
    let literal;
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) literal = node.moduleSpecifier;
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) literal = node.arguments[0];
    if (literal && ts.isStringLiteral(literal)) {
      const file = literal.text.split('?')[0];
      if (/^\.{1,2}\//.test(file) && file.endsWith('.js') && !file.includes('/vendor/') && !file.includes('/services/')) {
        edits.push([literal.getStart(sf) + 1, literal.end - 1, `${file}?v=${version}`]);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
  for (const [start, end, text] of edits.reverse()) source = source.slice(0, start) + text + source.slice(end);
  return source;
}
