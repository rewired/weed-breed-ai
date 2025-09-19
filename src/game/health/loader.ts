import type {
  DiseaseBalancingConfig,
  HealthDefinitionData,
  HealthDefinitionSummary,
  PestBalancingConfig,
  TreatmentCatalog,
  TreatmentOption,
} from './types';

const DISEASE_CONFIG_URL = '/data/configs/disease_balancing.json';
const PEST_CONFIG_URL = '/data/configs/pest_balancing.json';
const TREATMENT_CONFIG_URL = '/data/configs/treatment_options.json';

let memory: HealthDefinitionData | null = null;
let loadPromise: Promise<HealthDefinitionData> | null = null;

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load health config from ${url}: ${response.status} ${response.statusText}`);
  }
  return (await response.json()) as T;
}

async function load(): Promise<HealthDefinitionData> {
  const [diseaseBalancing, pestBalancing, treatmentCatalog] = await Promise.all([
    fetchJson<DiseaseBalancingConfig>(DISEASE_CONFIG_URL),
    fetchJson<PestBalancingConfig>(PEST_CONFIG_URL),
    fetchJson<TreatmentCatalog>(TREATMENT_CONFIG_URL),
  ]);

  return {
    diseaseBalancing,
    pestBalancing,
    treatmentCatalog,
  };
}

export async function loadHealthData(): Promise<HealthDefinitionData> {
  if (memory) {
    return memory;
  }

  if (!loadPromise) {
    loadPromise = load()
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

export async function ensureHealthData(): Promise<HealthDefinitionData> {
  if (memory) {
    return memory;
  }
  return loadHealthData();
}

export function getHealthData(): HealthDefinitionData {
  if (!memory) {
    throw new Error('Health definitions are not loaded yet. Call loadHealthData() first.');
  }
  return memory;
}

export async function listTreatmentOptions(): Promise<TreatmentOption[]> {
  const data = await ensureHealthData();
  return data.treatmentCatalog.options;
}

export async function listHealthDefinitions(): Promise<HealthDefinitionSummary> {
  const data = await ensureHealthData();
  return {
    diseases: data.diseaseBalancing,
    pests: data.pestBalancing,
  };
}
