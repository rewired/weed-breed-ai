import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { promises as fs } from 'node:fs';

import { createSeededRandomAdapter } from '../game/utils';
import { Company } from '../game/models/Company';
import { processDailyUpdates } from '../game/services/hr';
import { Zone } from '../game/models/Zone';
import { loadAllBlueprints, getBlueprints } from '../game/blueprints';

// Provide a deterministic no-op alert implementation for Node-based tests.
// eslint-disable-next-line @typescript-eslint/no-empty-function
(globalThis as any).alert = () => {};

const projectRoot = path.resolve(__dirname, '..', '..');

let blueprintsLoaded = false;
const originalFetch = globalThis.fetch;

async function ensureBlueprintsLoaded() {
  if (blueprintsLoaded) {
    return;
  }

  globalThis.fetch = async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString();
    if (!url.startsWith('/data/')) {
      throw new Error(`Unsupported fetch request during tests: ${url}`);
    }

    const filePath = path.resolve(projectRoot, `.${url}`);
    const data = await fs.readFile(filePath, 'utf8');
    return {
      ok: true,
      json: async () => JSON.parse(data),
    } as Response;
  };

  await loadAllBlueprints();
  blueprintsLoaded = true;
}

function createBaseCompanyData() {
  return {
    id: 'company-test',
    name: 'Determinism Labs',
    capital: 100000,
    structures: {
      'structure-1': {
        id: 'structure-1',
        blueprintId: 'small_warehouse',
        name: 'Main Facility',
        area_m2: 100,
        height_m: 5,
        rooms: {
          'room-1': {
            id: 'room-1',
            name: 'Break Area',
            area_m2: 20,
            purpose: 'breakroom',
            zones: {},
          },
        },
        employeeIds: ['emp-1'],
        tasks: [],
      },
    },
    customStrains: {},
    employees: {
      'emp-1': {
        id: 'emp-1',
        firstName: 'Alex',
        lastName: 'Taylor',
        salaryPerDay: 120,
        role: 'Gardener',
        skills: {
          Gardening: { name: 'Gardening', level: 5, xp: 0 },
          Maintenance: { name: 'Maintenance', level: 3, xp: 0 },
          Technical: { name: 'Technical', level: 2, xp: 0 },
          Cleanliness: { name: 'Cleanliness', level: 4, xp: 0 },
          Botanical: { name: 'Botanical', level: 3, xp: 0 },
          Negotiation: { name: 'Negotiation', level: 1, xp: 0 },
        },
        traits: [],
        energy: 80,
        morale: 18,
        structureId: 'structure-1',
        status: 'Idle',
        currentTask: null,
        leaveHours: 0,
        lastRaiseTick: 0,
      },
    },
    jobMarketCandidates: [],
    ledger: {
      revenue: { harvests: 0, other: 0 },
      expenses: { rent: 0, maintenance: 0, power: 0, structures: 0, devices: 0, supplies: 0, seeds: 0, salaries: 0 },
    },
    cumulativeYield_g: 0,
    alerts: [],
    alertCooldowns: {},
    overtimePolicy: 'payout',
  };
}

function createTestCompany() {
  return new Company(createBaseCompanyData());
}

function withFixedNow<T>(value: number, fn: () => T): T {
  const original = Date.now;
  Date.now = () => value;
  try {
    return fn();
  } finally {
    Date.now = original;
  }
}

function sanitizeCompany(company: Company) {
  return {
    snapshot: company.toJSON(),
    capital: company.capital,
    jobMarketCandidates: company.jobMarketCandidates,
  };
}

test('seeded random adapters produce deterministic sequences', () => {
  const rngA = createSeededRandomAdapter(42);
  const rngB = createSeededRandomAdapter(42);
  const sequenceA = Array.from({ length: 5 }, () => rngA.float());
  const sequenceB = Array.from({ length: 5 }, () => rngB.float());
  assert.deepStrictEqual(sequenceA, sequenceB);

  const rngC = createSeededRandomAdapter(7);
  const sequenceC = Array.from({ length: 5 }, () => rngC.float());
  assert.notDeepStrictEqual(sequenceA, sequenceC);
});

test('processDailyUpdates is deterministic with a fixed seed', () => {
  const companyA = createTestCompany();
  const companyB = createTestCompany();
  const seed = 2025;
  const rngA = createSeededRandomAdapter(seed);
  const rngB = createSeededRandomAdapter(seed);

  processDailyUpdates(companyA, 48, rngA);
  processDailyUpdates(companyB, 48, rngB);

  assert.deepStrictEqual(sanitizeCompany(companyA), sanitizeCompany(companyB));
});

test('zone planting yields deterministic germination results', async () => {
  await ensureBlueprintsLoaded();
  const companyA = createTestCompany();
  const companyB = createTestCompany();

  const baseZoneData = {
    id: 'zone-1',
    name: 'Test Zone',
    area_m2: 20,
    cultivationMethodId: 'basic_soil_pot',
    devices: {},
    plantings: {},
    lightCycle: { on: 18, off: 6 },
    status: 'Ready' as const,
    waterLevel_L: 0,
    nutrientLevel_g: 0,
    deviceGroupSettings: {},
    cyclesUsed: 0,
  };

  const zoneA = new Zone(baseZoneData);
  const zoneB = new Zone({ ...baseZoneData, id: 'zone-2' });

  const seed = 1337;
  const rngA = createSeededRandomAdapter(seed);
  const rngB = createSeededRandomAdapter(seed);

  const strainId = Object.keys(getBlueprints().strains)[0];
  assert.ok(strainId, 'Expected at least one strain blueprint');

  const fixedTimestamp = 1_700_000_000_000;
  const resultA = withFixedNow(fixedTimestamp, () => zoneA.plantStrain(strainId, 5, companyA, rngA));
  const resultB = withFixedNow(fixedTimestamp, () => zoneB.plantStrain(strainId, 5, companyB, rngB));

  assert.deepStrictEqual(resultA, resultB);
  assert.strictEqual(zoneA.getTotalPlantedCount(), zoneB.getTotalPlantedCount());
});

test('codebase avoids Math RNG usage', async () => {
  async function* walk(dir: string): AsyncGenerator<string> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'dist-test' || entry.name.startsWith('.')) {
        continue;
      }
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        yield* walk(fullPath);
      } else if (entry.isFile()) {
        yield fullPath;
      }
    }
  }

  for await (const filePath of walk(projectRoot)) {
    const relativePath = path.relative(projectRoot, filePath);
    if (!/\.(ts|tsx|js|jsx)$/.test(filePath)) {
      continue;
    }
    const content = await fs.readFile(filePath, 'utf8');
    const forbidden = `Math.${'random'}`;
    assert.ok(!content.includes(forbidden), `Found forbidden ${forbidden} usage in ${relativePath}`);
  }
});

process.on('exit', () => {
  if (originalFetch) {
    globalThis.fetch = originalFetch;
  }
});
