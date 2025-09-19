import type { HealthDefinitionData, HealthDefinitionSummary, TreatmentOption } from './types';
import {
  DiseaseBalancingConfigSchema,
  DiseaseDefinitionSchema,
  PestBalancingConfigSchema,
  PestDefinitionSchema,
  TreatmentCatalogSchema,
} from './schemas';
import { listJsonFiles, tryParseJsonFile } from '@/src/lib/staticJson';
import type { ZodType } from 'zod';

const DISEASE_CONFIG_URL = '/data/configs/disease_balancing.json';
const PEST_CONFIG_URL = '/data/configs/pest_balancing.json';
const TREATMENT_CONFIG_URL = '/data/configs/treatment_options.json';
const DISEASE_BLUEPRINT_DIR = '/data/blueprints/diseases/';
const PEST_BLUEPRINT_DIR = '/data/blueprints/pests/';

type Identified = { id: string };

type DefinitionSchema<T extends Identified> = ZodType<T>;

function loadDefinitions<T extends Identified>(
  directory: string,
  schema: DefinitionSchema<T>,
  errors: string[],
): T[] {
  const definitions: T[] = [];
  const idSources = new Map<string, string>();

  const files = listJsonFiles(directory);

  files.forEach((filePath) => {
    const definition = tryParseJsonFile(filePath, schema, errors);
    if (!definition) {
      return;
    }

    const existing = idSources.get(definition.id);
    if (existing) {
      errors.push(`${filePath} → id → duplicate id '${definition.id}' also used in ${existing}`);
      return;
    }

    idSources.set(definition.id, filePath);
    definitions.push(definition);
  });

  return definitions;
}

let memory: HealthDefinitionData | null = null;
let loadPromise: Promise<HealthDefinitionData> | null = null;

function load(): HealthDefinitionData {
  const errors: string[] = [];

  const diseaseBalancing = tryParseJsonFile(DISEASE_CONFIG_URL, DiseaseBalancingConfigSchema, errors);
  const pestBalancing = tryParseJsonFile(PEST_CONFIG_URL, PestBalancingConfigSchema, errors);
  const treatmentCatalog = tryParseJsonFile(TREATMENT_CONFIG_URL, TreatmentCatalogSchema, errors);

  const diseases = loadDefinitions(DISEASE_BLUEPRINT_DIR, DiseaseDefinitionSchema, errors);
  const pests = loadDefinitions(PEST_BLUEPRINT_DIR, PestDefinitionSchema, errors);

  if (!diseaseBalancing) {
    throw new Error(`Health data validation failed:\n${errors.join('\n')}`);
  }
  if (!pestBalancing) {
    throw new Error(`Health data validation failed:\n${errors.join('\n')}`);
  }
  if (!treatmentCatalog) {
    throw new Error(`Health data validation failed:\n${errors.join('\n')}`);
  }
  if (errors.length > 0) {
    throw new Error(`Health data validation failed:\n${errors.join('\n')}`);
  }

  return {
    diseaseBalancing,
    pestBalancing,
    treatmentCatalog,
    diseases,
    pests,
  };
}

export function loadAllHealthData(): Promise<HealthDefinitionData> {
  if (memory) {
    return Promise.resolve(memory);
  }

  if (!loadPromise) {
    loadPromise = Promise.resolve()
      .then(() => load())
      .then((result) => {
        memory = result;
        return result;
      })
      .catch((error) => {
        loadPromise = null;
        throw error;
      });
  }

  return loadPromise;
}

export function loadHealthData(): Promise<HealthDefinitionData> {
  return loadAllHealthData();
}

export function ensureHealthData(): Promise<HealthDefinitionData> {
  return loadAllHealthData();
}

export function getHealthData(): HealthDefinitionData {
  if (!memory) {
    throw new Error('Health definitions are not loaded yet. Call loadAllHealthData() first.');
  }
  return memory;
}

export async function listTreatmentOptions(): Promise<TreatmentOption[]> {
  const data = await loadAllHealthData();
  return data.treatmentCatalog.options;
}

export async function listHealthDefinitions(): Promise<HealthDefinitionSummary> {
  const data = await loadAllHealthData();
  return {
    diseases: data.diseaseBalancing,
    pests: data.pestBalancing,
  };
}
