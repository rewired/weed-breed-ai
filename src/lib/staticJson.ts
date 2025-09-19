import { z, ZodError, ZodIssue } from 'zod';

const RAW_JSON_FILES = import.meta.glob('../../data/**/*.json', {
  eager: true,
  as: 'raw',
}) as Record<string, string>;

const JSON_FILES: Record<string, string> = {};

for (const [key, value] of Object.entries(RAW_JSON_FILES)) {
  JSON_FILES[normalizeGlobKey(key)] = value;
}

function normalizeGlobKey(key: string): string {
  let normalized = key;

  while (normalized.startsWith('../')) {
    normalized = normalized.slice(3);
  }

  if (normalized.startsWith('./')) {
    normalized = normalized.slice(2);
  }

  if (!normalized.startsWith('/')) {
    normalized = `/${normalized}`;
  }

  return normalized;
}

function normalizeRequestedPath(path: string): string {
  let normalized = path.trim();
  normalized = normalized.replace(/^(\.\/)+/, '');
  normalized = normalized.replace(/^(\.\.\/)+/, '/');

  if (normalized.startsWith('data/')) {
    normalized = `/${normalized}`;
  }
  if (!normalized.startsWith('/')) {
    throw new Error(`Unsupported data path '${path}'. Only files within /data can be loaded.`);
  }
  if (!normalized.startsWith('/data/')) {
    throw new Error(`Unsupported data path '${path}'. Only files within /data can be loaded.`);
  }
  return normalized;
}

function normalizeDirectoryPath(path: string): string {
  let normalized = normalizeRequestedPath(path);
  if (!normalized.endsWith('/')) {
    normalized = `${normalized}/`;
  }
  return normalized;
}

function formatIssuePath(path: (string | number)[]): string {
  if (path.length === 0) {
    return '<root>';
  }
  return path
    .reduce<string>((acc, segment) => {
      if (typeof segment === 'number') {
        return `${acc}[${segment}]`;
      }
      return acc ? `${acc}.${segment}` : segment;
    }, '');
}

function formatIssueExpectation(issue: ZodIssue): string {
  switch (issue.code) {
    case z.ZodIssueCode.invalid_type:
      return `expected ${issue.expected}, received ${issue.received}`;
    case z.ZodIssueCode.invalid_literal:
      return `expected literal ${JSON.stringify(issue.expected)}`;
    case z.ZodIssueCode.unrecognized_keys:
      return `unrecognized keys: ${issue.keys.join(', ')}`;
    case z.ZodIssueCode.invalid_union:
      return `expected one of the union options`;
    case z.ZodIssueCode.invalid_enum_value:
      return `expected one of ${issue.options.join(', ')}, received ${issue.received}`;
    case z.ZodIssueCode.too_small:
      return `expected ${issue.type} with ${issue.inclusive ? '≥' : '>'} ${issue.minimum}`;
    case z.ZodIssueCode.too_big:
      return `expected ${issue.type} with ${issue.inclusive ? '≤' : '<'} ${issue.maximum}`;
    default:
      return issue.message;
  }
}

export function formatZodError(filePath: string, error: ZodError): string[] {
  return error.issues.map((issue) => {
    const path = formatIssuePath(issue.path);
    const expectation = formatIssueExpectation(issue);
    return `${filePath} → ${path} → ${expectation}`;
  });
}

export class DataValidationError extends Error {
  readonly messages: string[];

  constructor(messages: string[]) {
    super(messages.join('\n'));
    this.name = 'DataValidationError';
    this.messages = messages;
  }
}

export function parseJsonFile<T>(filePath: string, schema: z.ZodSchema<T>): T {
  const normalizedPath = normalizeRequestedPath(filePath);
  const raw = JSON_FILES[normalizedPath];

  if (raw === undefined) {
    throw new Error(`Could not locate static JSON file at ${normalizedPath}. Ensure it is included in the build.`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new DataValidationError([`${normalizedPath} → <root> → JSON parse error: ${message}`]);
  }

  try {
    return schema.parse(parsed);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new DataValidationError(formatZodError(normalizedPath, error));
    }
    throw error;
  }
}

export function tryParseJsonFile<T>(filePath: string, schema: z.ZodSchema<T>, errors: string[]): T | undefined {
  try {
    return parseJsonFile(filePath, schema);
  } catch (error) {
    if (error instanceof DataValidationError) {
      errors.push(...error.messages);
      return undefined;
    }
    throw error;
  }
}

export function listJsonFiles(prefix: string): string[] {
  const normalizedPrefix = normalizeDirectoryPath(prefix);
  return Object.keys(JSON_FILES)
    .filter((path) => path.startsWith(normalizedPrefix))
    .sort();
}
