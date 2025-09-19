import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const projectRoot = process.cwd();
const includeRoots = [
  'App.tsx',
  'index.tsx',
  'components',
  'hooks',
  'views',
  'src',
  'game',
];

const allowedExtensions = new Set(['.ts', '.tsx', '.js', '.jsx']);

const bannedPatterns = [
  {
    pattern: '@/game/internal',
    message: 'verwende die öffentliche Fassade `@/game/api` statt interner Pfade',
  },
];

const failures = [];

async function walk(relativePath) {
  const absolutePath = path.join(projectRoot, relativePath);
  let fileStats;
  try {
    fileStats = await stat(absolutePath);
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return;
    }
    throw error;
  }

  if (fileStats.isDirectory()) {
    const entries = await readdir(absolutePath);
    await Promise.all(entries.map(entry => walk(path.join(relativePath, entry))));
    return;
  }

  const extension = path.extname(relativePath);
  if (!allowedExtensions.has(extension)) {
    return;
  }

  const content = await readFile(absolutePath, 'utf8');
  bannedPatterns.forEach(({ pattern, message }) => {
    if (content.includes(pattern)) {
      failures.push({ file: relativePath, pattern, message });
    }
  });
}

async function main() {
  await Promise.all(includeRoots.map(root => walk(root)));

  if (failures.length > 0) {
    console.error('Lint-Checks fehlgeschlagen:');
    failures.forEach(({ file, pattern, message }) => {
      console.error(` - ${file} enthält "${pattern}": ${message}`);
    });
    process.exitCode = 1;
    return;
  }

  console.log('Lint-Checks erfolgreich.');
}

main().catch(error => {
  console.error('Lint-Skript abgebrochen:', error);
  process.exitCode = 1;
});
