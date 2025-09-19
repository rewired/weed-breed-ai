import type { GameState } from '@/game/types';
import { Company } from '@/game/models/Company';
import { compressToBase64, decompressFromBase64 } from '@/src/lib/lzString';

type SerializedCompany = ReturnType<Company['toJSON']>;

export type PersistedGameState = Omit<GameState, 'company'> & {
  company: SerializedCompany;
};

export interface SaveGameEnvelope<TPayload = PersistedGameState> {
  version: number;
  createdAt: string;
  seed: number;
  payload: TPayload;
}

export const SAVEGAME_VERSION = 1;

const COMPRESSION_PREFIX = 'lz:';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const extractSeed = (payload: PersistedGameState): number => {
  if (isRecord(payload) && typeof payload.seed === 'number') {
    return payload.seed;
  }
  return 0;
};

type SaveMigration = (
  envelope: SaveGameEnvelope<PersistedGameState>,
) => SaveGameEnvelope<PersistedGameState>;

const migrateFromVersionZero: SaveMigration = envelope => ({
  version: 1,
  createdAt: envelope.createdAt,
  seed: envelope.seed ?? extractSeed(envelope.payload),
  payload: envelope.payload,
});

const SAVE_MIGRATIONS: Record<number, SaveMigration> = {
  0: migrateFromVersionZero,
};

type SaveEnvelopeCandidate = Partial<Omit<SaveGameEnvelope<PersistedGameState>, 'payload'>> & {
  payload: PersistedGameState;
};

const normalizeCandidate = (
  candidate: SaveEnvelopeCandidate,
): SaveGameEnvelope<PersistedGameState> => {
  let envelope: SaveGameEnvelope<PersistedGameState> = {
    version: typeof candidate.version === 'number' ? candidate.version : 0,
    createdAt: typeof candidate.createdAt === 'string'
      ? candidate.createdAt
      : new Date().toISOString(),
    seed: typeof candidate.seed === 'number'
      ? candidate.seed
      : extractSeed(candidate.payload),
    payload: candidate.payload,
  };

  if (envelope.version > SAVEGAME_VERSION) {
    console.warn(
      `Save file version ${envelope.version} is newer than supported version ${SAVEGAME_VERSION}. Attempting to load without migration.`,
    );
    return envelope;
  }

  while (envelope.version < SAVEGAME_VERSION) {
    const migration = SAVE_MIGRATIONS[envelope.version];
    if (!migration) {
      throw new Error(`Missing migration for save version ${envelope.version}.`);
    }
    envelope = migration(envelope);
  }

  return envelope;
};

const toCandidate = (value: unknown): SaveEnvelopeCandidate => {
  if (isRecord(value)) {
    if (
      typeof value.version === 'number' &&
      typeof value.createdAt === 'string' &&
      typeof value.seed === 'number' &&
      'payload' in value
    ) {
      return value as SaveEnvelopeCandidate;
    }

    if ('payload' in value) {
      const payload = value.payload as PersistedGameState;
      const version = typeof value.version === 'number' ? value.version : 0;
      const createdAt = typeof value.createdAt === 'string' ? value.createdAt : undefined;
      const seed = typeof value.seed === 'number' ? value.seed : undefined;
      return { version, createdAt, seed, payload };
    }
  }

  return {
    payload: value as PersistedGameState,
  };
};

const decodeStorageValue = (value: string): string => {
  if (value.startsWith(COMPRESSION_PREFIX)) {
    const compressed = value.slice(COMPRESSION_PREFIX.length);
    const decompressed = decompressFromBase64(compressed);
    if (!decompressed) {
      throw new Error('Failed to decompress save game payload.');
    }
    return decompressed;
  }
  return value;
};

export const parseSaveGameString = (
  jsonString: string,
): { state: PersistedGameState; envelope: SaveGameEnvelope } => {
  const normalized = decodeStorageValue(jsonString);
  const raw = JSON.parse(normalized) as unknown;
  const candidate = toCandidate(raw);
  const envelope = normalizeCandidate(candidate);
  return { state: envelope.payload, envelope };
};

export const serializeGameState = (state: GameState): PersistedGameState => {
  const { company, ...rest } = state;
  return {
    ...rest,
    company: company.toJSON(),
  };
};

export const hydrateGameState = (state: PersistedGameState): GameState => {
  const { company, ...rest } = state;
  return {
    ...rest,
    company: new Company(company),
  };
};

export const createEnvelope = (
  state: PersistedGameState,
  previousEnvelope?: SaveGameEnvelope | null,
): SaveGameEnvelope => ({
  version: SAVEGAME_VERSION,
  createdAt: previousEnvelope?.createdAt ?? new Date().toISOString(),
  seed: state.seed,
  payload: state,
});

export const encodeSaveGameEnvelope = (envelope: SaveGameEnvelope): string => {
  const json = JSON.stringify(envelope);
  const compressed = compressToBase64(json);
  if (compressed && compressed.length + COMPRESSION_PREFIX.length < json.length) {
    return `${COMPRESSION_PREFIX}${compressed}`;
  }
  return json;
};
