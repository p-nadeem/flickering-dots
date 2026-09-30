import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const ENTRY_POINTS = ['src/index.ts', 'src/react/index.ts', 'src/element/index.ts'];
const COMPILER_OPTIONS: ts.CompilerOptions = {
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  jsx: ts.JsxEmit.ReactJSX,
  strict: true,
  noEmit: true,
  skipLibCheck: true,
};

function resolveSymbol(checker: ts.TypeChecker, symbol: ts.Symbol): ts.Symbol {
  return symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
}

function hasSummary(checker: ts.TypeChecker, symbol: ts.Symbol): boolean {
  return ts.displayPartsToString(symbol.getDocumentationComment(checker)).trim() !== '';
}

function findUndocumentedExports(): readonly string[] {
  const program = ts.createProgram(ENTRY_POINTS, COMPILER_OPTIONS);
  const checker = program.getTypeChecker();
  return ENTRY_POINTS.flatMap((entry) => {
    const source = program.getSourceFile(entry);
    const moduleSymbol = source === undefined ? undefined : checker.getSymbolAtLocation(source);
    if (moduleSymbol === undefined) return [`${entry}: cannot be read`];
    return checker
      .getExportsOfModule(moduleSymbol)
      .filter((symbol) => !hasSummary(checker, resolveSymbol(checker, symbol)))
      .map((symbol) => `${entry}: ${symbol.getName()}`);
  });
}

describe('runtime public API', () => {
  it('gives every export of the package entry points a JSDoc summary', () => {
    expect(findUndocumentedExports()).toEqual([]);
  });
});
