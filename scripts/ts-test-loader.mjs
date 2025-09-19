import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

const compilerOptions = {
  module: ts.ModuleKind.ESNext,
  target: ts.ScriptTarget.ES2022,
  moduleResolution: ts.ModuleResolutionKind.NodeNext,
  esModuleInterop: true,
  jsx: ts.JsxEmit.ReactJSX,
  allowImportingTsExtensions: true,
};

export async function resolve(specifier, context, defaultResolve) {
  if (specifier.startsWith('@/')) {
    const absolute = path.resolve(process.cwd(), specifier.slice(2));
    return defaultResolve(pathToFileURL(`${absolute}.ts`).href, context, defaultResolve);
  }

  try {
    return await defaultResolve(specifier, context, defaultResolve);
  } catch (error) {
    if ((specifier.startsWith('.') || specifier.startsWith('/')) && !specifier.endsWith('.ts')) {
      const withTs = `${specifier}.ts`;
      return defaultResolve(withTs, context, defaultResolve);
    }
    throw error;
  }
}

export async function load(url, context, defaultLoad) {
  if (!url.endsWith('.ts')) {
    return defaultLoad(url, context, defaultLoad);
  }

  const filename = fileURLToPath(url);
  const source = await readFile(filename, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions,
    fileName: filename,
    reportDiagnostics: false,
  });
  return { format: 'module', source: transpiled.outputText, shortCircuit: true };
}
