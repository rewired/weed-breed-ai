

import { BlueprintDB, StructureBlueprint, StrainBlueprint, DeviceBlueprint, CultivationMethodBlueprint, DevicePrice, Company, StrainPrice, UtilityPrices, PersonnelData, Trait, TaskDefinition, TaskType, DiseaseBlueprint, PestBlueprint, DifficultySetting, BalancingConfig, TreatmentOptionsConfig, TreatmentOption } from './types';

// #region VALIDATION_ENGINE
class ValidationError extends Error {
  constructor(message: string, path: string[]) {
    super(`Validation Error at '${path.join('.')}': ${message}`);
    this.name = 'ValidationError';
  }
}

// --- Primitive Validators ---
function isString(v: any, p: string[]): string {
  if (typeof v !== 'string') throw new ValidationError(`Expected a string but got ${typeof v}`, p);
  return v;
}
function isNumber(v: any, p: string[]): number {
  if (typeof v !== 'number') throw new ValidationError(`Expected a number but got ${typeof v}`, p);
  return v;
}
function isBoolean(v: any, p: string[]): boolean {
  if (typeof v !== 'boolean') throw new ValidationError(`Expected a boolean but got ${typeof v}`, p);
  return v;
}
function isObject(v: any, p: string[]): Record<string, any> {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) {
        throw new ValidationError(`Expected an object but got ${v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v}`, p);
    }
    return v;
}

// --- Higher-Order Validators ---
function isArray<T>(itemValidator: (item: any, path: string[]) => T): (value: any, path: string[]) => T[] {
  return (v: any, p: string[]) => {
    if (!Array.isArray(v)) throw new ValidationError(`Expected an array but got ${typeof v}`, p);
    return v.map((item, index) => itemValidator(item, [...p, `[${index}]`]));
  };
}
function isRecord<T>(itemValidator: (item: any, path: string[]) => T): (value: any, path: string[]) => Record<string, T> {
  return (v: any, p: string[]) => {
    isObject(v, p);
    const result: Record<string, T> = {};
    for (const key in v) {
      result[key] = itemValidator(v[key], [...p, key]);
    }
    return result;
  };
}
function optional<T>(validator: (val: any, path: string[]) => T): (val: any, path: string[]) => T | undefined {
  return (v: any, p: string[]) => (v === undefined ? undefined : validator(v, p));
}
function validateObject<T>(data: any, schema: Record<string, (val: any, path: string[]) => any>, path: string[] = []): T {
  isObject(data, path);
  const result: any = {};
  for (const key in schema) {
    const value = data[key];
    // Allow optional validators to handle undefined values
    if (value === undefined && schema[key].toString().includes('optional')) {
        result[key] = schema[key](value, [...path, key]);
        continue;
    }
    if (value === undefined) throw new ValidationError(`Missing required property '${key}'`, path);
    result[key] = schema[key](value, [...path, key]);
  }
  return result as T;
}
// #endregion VALIDATION_ENGINE


// #region SCHEMAS
const validateStructureBlueprint = (data: any, path: string[]): StructureBlueprint => validateObject(data, {
    id: isString, name: isString,
    footprint: (v, p) => validateObject(v, { length_m: isNumber, width_m: isNumber, height_m: isNumber }, p),
    rentalCostPerSqmPerMonth: isNumber, upfrontFee: isNumber,
}, path);

const validateStrainBlueprint = (data: any, path: string[]): StrainBlueprint => validateObject(data, {
    id: isString, slug: isString, name: isString,
    lineage: (v, p) => validateObject(v, { parents: isArray(isString) }, p),
    genotype: (v, p) => validateObject(v, { sativa: isNumber, indica: isNumber, ruderalis: isNumber }, p),
    generalResilience: isNumber, germinationRate: optional(isNumber),
    chemotype: (v, p) => validateObject(v, { thcContent: isNumber, cbdContent: isNumber }, p),
    morphology: (v, p) => validateObject(v, { growthRate: isNumber, yieldFactor: isNumber, leafAreaIndex: isNumber }, p),
    growthModel: (v, p) => validateObject(v, { maxBiomassDry_g: isNumber }, p),
    noise: optional((v, p) => validateObject(v, { enabled: isBoolean, pct: isNumber }, p)),
    environmentalPreferences: (v, p) => validateObject(v, {
        idealTemperature: (v, p) => validateObject(v, { vegetation: isArray(isNumber), flowering: isArray(isNumber) }, p),
        lightIntensity: (v, p) => validateObject(v, { vegetation: isArray(isNumber), flowering: isArray(isNumber) }, p),
        idealHumidity: (v, p) => validateObject(v, { vegetation: isArray(isNumber), flowering: isArray(isNumber) }, p),
        lightCycle: (v, p) => validateObject(v, { vegetation: isArray(isNumber), flowering: isArray(isNumber) }, p),
    }, p),
    waterDemand: (v, p) => validateObject(v, { dailyWaterUsagePerSquareMeter: isRecord(isNumber) }, p),
    nutrientDemand: (v, p) => validateObject(v, { dailyNutrientDemand: isRecord((v, p) => validateObject(v, { nitrogen: isNumber, phosphorus: isNumber, potassium: isNumber }, p)) }, p),
    photoperiod: (v, p) => validateObject(v, { vegetationDays: isNumber, floweringDays: isNumber, transitionTriggerHours: isNumber }, p),
    harvestWindowInDays: isArray(isNumber),
    meta: (v, p) => validateObject(v, { description: isString, advantages: isArray(isString), disadvantages: isArray(isString), notes: isString }, p),
}, path);

const validateDeviceBlueprint = (data: any, path: string[]): DeviceBlueprint => validateObject(data, {
    id: isString, name: isString, kind: isString, settings: optional(isObject),
}, path);

const validateCultivationMethodBlueprint = (data: any, path: string[]): CultivationMethodBlueprint => validateObject(data, {
    id: isString, name: isString, kind: isString, areaPerPlant: isNumber, setupCost: isNumber, maxCycles: isNumber,
    strainTraitCompatibility: optional(isObject),
}, path);

const validateDiseaseBlueprint = (data: any, path: string[]): DiseaseBlueprint => validateObject(data, {
    id: isString, kind: isString, name: isString, pathogenType: isString, targets: isArray(isString),
    environmentalRisk: isObject, transmission: isArray(isString), contagious: isBoolean,
    model: isRecord(isNumber), detection: (v, p) => validateObject(v, {symptoms: isArray(isString), scoutingHints: optional(isArray(isString))}, p),
    treatments: isRecord(isArray(isString)), yieldImpact: optional(isRecord(isNumber))
}, path);

const validatePestBlueprint = (data: any, path: string[]): PestBlueprint => validateObject(data, {
    id: isString, kind: isString, name: isString, category: isString, targets: isArray(isString),
    environmentalRisk: isObject, populationDynamics: isRecord(isNumber), damageModel: isObject,
    detection: (v, p) => validateObject(v, {symptoms: isArray(isString), monitoring: isArray(isString)}, p),
    controlOptions: isRecord(isArray(isString))
}, path);

const validateDevicePrice = (data: any, path: string[]): DevicePrice => validateObject(data, {
    capitalExpenditure: isNumber, baseMaintenanceCostPerTick: isNumber, costIncreasePer1000Ticks: isNumber
}, path);

const validateStrainPrice = (data: any, path: string[]): StrainPrice => validateObject(data, {
    seedPrice: isNumber, harvestPricePerGram: isNumber
}, path);

const validateUtilityPrices = (data: any, path: string[]): UtilityPrices => validateObject(data, {
    pricePerKwh: isNumber, pricePerLiterWater: isNumber, pricePerGramNutrients: isNumber
}, path);

const validateTrait = (data: any, path: string[]): Trait => validateObject(data, {
    id: isString, name: isString, description: isString, type: isString, effects: optional(isObject)
}, path);

const validateTaskDefinition = (data: any, path: string[]): TaskDefinition => validateObject(data, {
    costModel: (v, p) => validateObject(v, { basis: isString, laborMinutes: isNumber }, p),
    priority: isNumber, requiredRole: isString, minSkillLevel: isNumber, requiredSkill: isString, description: isString
}, path);

const validateDifficultySetting = (data: any, path: string[]): DifficultySetting => validateObject(data, {
    name: isString, description: isString, modifiers: isObject
}, path);

const validateBalancingConfig = (data: any, path: string[]): BalancingConfig => validateObject(data, {
    kind: isString, version: isString, global: isObject, phaseMultipliers: isObject
}, path);

const validateTreatmentOption = (data: any, path: string[]): TreatmentOption => validateObject(data, {
    id: isString, name: isString, category: isString, targets: isArray(isString), applicability: isArray(isString),
    efficacy: isObject, costs: isObject, cooldownDays: isNumber, notes: isString, costBasis: isString, risks: optional(isObject)
}, path);

const validateTreatmentOptionsConfig = (data: any, path: string[]): TreatmentOptionsConfig => validateObject(data, {
    kind: isString, version: isString, options: isArray(validateTreatmentOption)
}, path);
// #endregion SCHEMAS


const BLUEPRINT_BASE_PATH = '/data/blueprints/';
const PERSONNEL_BASE_PATH = '/data/personnel/';
const CONFIG_BASE_PATH = '/data/configs/';

let blueprintDB: BlueprintDB | null = null;
let blueprintPromise: Promise<BlueprintDB> | null = null;

export function getBlueprints(): BlueprintDB {
  if (!blueprintDB) {
    throw new Error("Blueprints must be loaded before they can be accessed. Ensure loadAllBlueprints() has resolved.");
  }
  return blueprintDB;
}

export function getAvailableStrains(company: Company): Record<string, StrainBlueprint> {
    const baseStrains = getBlueprints().strains;
    return { ...baseStrains, ...(company.customStrains || {}) };
}

async function fetchAndValidate<T>(filePath: string, validator: (data: any, path: string[]) => T): Promise<T> {
  try {
    const response = await fetch(filePath);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    return validator(data, [filePath]);
  } catch (e: any) {
    console.error(`Failed to load and validate: ${filePath}`, e);
    if (e.name !== 'ValidationError') throw new Error(`Error processing ${filePath}: ${e.message}`);
    throw e;
  }
}

async function fetchAndStoreCollection<T extends { id: string }>(
    basePath: string, files: string[], store: Record<string, T>, validator: (data: any, path: string[]) => T
): Promise<void> {
    await Promise.all(files.map(async (fileName) => {
        const filePath = `${basePath}${fileName}`;
        const bp = await fetchAndValidate(filePath, validator);
        store[bp.id] = bp;
    }));
}

export function loadAllBlueprints(): Promise<BlueprintDB> {
  if (blueprintPromise) return blueprintPromise;
  
  blueprintPromise = (async () => {
    const manifest = await fetchAndValidate(`${BLUEPRINT_BASE_PATH}manifest.json`, isObject);

    const db: BlueprintDB = {
      structures: {}, strains: {}, devices: {}, cultivationMethods: {}, diseases: {}, pests: {},
      devicePrices: {}, strainPrices: {},
      utilityPrices: { pricePerKwh: 0, pricePerLiterWater: 0, pricePerGramNutrients: 0 },
      personnelData: { firstNames: [], lastNames: [], traits: [] },
      taskDefinitions: {} as Record<TaskType, TaskDefinition>,
      difficulty: {}, diseaseBalancing: {} as BalancingConfig, pestBalancing: {} as BalancingConfig,
      treatmentOptions: { kind: '', version: '', options: [] }
    };

    const personnelPromises = (manifest.personnel as string[] || []).map(async (fileName) => {
        const dataKey = fileName.replace('.json', '') as keyof PersonnelData;
        const filePath = `${PERSONNEL_BASE_PATH}${fileName}`;
        if (dataKey === 'traits') {
            db.personnelData.traits = await fetchAndValidate(filePath, isArray(validateTrait));
        } else {
            (db.personnelData[dataKey] as any) = await fetchAndValidate(filePath, isArray(isString));
        }
    });

    await Promise.all([
      // Blueprints from Manifest
      fetchAndStoreCollection(`${BLUEPRINT_BASE_PATH}structures/`, manifest.structures || [], db.structures, validateStructureBlueprint),
      fetchAndStoreCollection(`${BLUEPRINT_BASE_PATH}strains/`, manifest.strains || [], db.strains, validateStrainBlueprint),
      fetchAndStoreCollection(`${BLUEPRINT_BASE_PATH}devices/`, manifest.devices || [], db.devices, validateDeviceBlueprint),
      fetchAndStoreCollection(`${BLUEPRINT_BASE_PATH}cultivationMethods/`, manifest.cultivationMethods || [], db.cultivationMethods, validateCultivationMethodBlueprint),
      fetchAndStoreCollection(`${BLUEPRINT_BASE_PATH}diseases/`, manifest.diseases || [], db.diseases, validateDiseaseBlueprint),
      fetchAndStoreCollection(`${BLUEPRINT_BASE_PATH}pests/`, manifest.pests || [], db.pests, validatePestBlueprint),
      
      // Standalone Files
      fetchAndValidate('/data/prices/devicePrices.json', (d,p) => db.devicePrices = isRecord(validateDevicePrice)(d.devicePrices, p)),
      fetchAndValidate('/data/prices/strainPrices.json', (d,p) => db.strainPrices = isRecord(validateStrainPrice)(d.strainPrices, p)),
      fetchAndValidate('/data/prices/utilityPrices.json', (d,p) => db.utilityPrices = validateUtilityPrices(d,p)),
      fetchAndValidate(`${CONFIG_BASE_PATH}task_definitions.json`, (d,p) => db.taskDefinitions = isRecord(validateTaskDefinition)(d, p)),
      fetchAndValidate(`${CONFIG_BASE_PATH}difficulty.json`, (d,p) => db.difficulty = isRecord(validateDifficultySetting)(d, p)),
      fetchAndValidate(`${CONFIG_BASE_PATH}disease_balancing.json`, (d,p) => db.diseaseBalancing = validateBalancingConfig(d, p)),
      fetchAndValidate(`${CONFIG_BASE_PATH}pest_balancing.json`, (d,p) => db.pestBalancing = validateBalancingConfig(d, p)),
      fetchAndValidate(`${CONFIG_BASE_PATH}treatment_options.json`, (d,p) => db.treatmentOptions = validateTreatmentOptionsConfig(d, p)),

      // Personnel
      ...personnelPromises,
    ]);
    
    blueprintDB = db;
    return db;
  })();

  return blueprintPromise;
}
