import type {
  BlueprintDB,
  CultivationMethodBlueprint,
  DeviceBlueprint,
  PersonnelData,
  StrainBlueprint,
  StructureBlueprint,
  TaskDefinition,
  TaskType,
} from './types';
import type { Company } from './models/Company';
import {
  BlueprintManifestSchema,
  CultivationMethodBlueprintSchema,
  DeviceBlueprintSchema,
  DevicePricesFileSchema,
  NameListSchema,
  PersonnelDataSchema,
  StrainBlueprintSchema,
  StrainPricesFileSchema,
  StructureBlueprintSchema,
  TaskDefinitionsSchema,
  TraitListSchema,
  UtilityPricesSchema,
} from '../src/game/blueprints/validation';
import { formatZodError, parseJsonFile, tryParseJsonFile } from '../src/lib/staticJson';
import type { ZodType } from 'zod';
import { ZodError } from 'zod';

const BLUEPRINT_BASE_PATH = '/data/blueprints/';
const PERSONNEL_BASE_PATH = '/data/personnel/';
const PRICES_BASE_PATH = '/data/prices/';
const CONFIG_BASE_PATH = '/data/configs/';

const DEFAULT_UTILITY_PRICES = {
  pricePerKwh: 0.15,
  pricePerLiterWater: 0.01,
  pricePerGramNutrients: 0.1,
};

type BlueprintWithId = { id: string };

type BlueprintMap<T extends BlueprintWithId> = Record<string, T>;

type BlueprintSchema<T extends BlueprintWithId> = ZodType<T>;

function loadBlueprintCollection<T extends BlueprintWithId>(
  basePath: string,
  fileNames: string[] | undefined,
  schema: BlueprintSchema<T>,
  errors: string[],
): BlueprintMap<T> {
  const collection: BlueprintMap<T> = {};
  if (!fileNames || fileNames.length === 0) {
    return collection;
  }

  const idSources = new Map<string, string>();

  fileNames.forEach((fileName) => {
    const filePath = `${basePath}${fileName}`;
    const blueprint = tryParseJsonFile(filePath, schema, errors);
    if (!blueprint) {
      return;
    }

    const existingSource = idSources.get(blueprint.id);
    if (existingSource) {
      errors.push(`${filePath} → id → duplicate id '${blueprint.id}' also used in ${existingSource}`);
      return;
    }

    idSources.set(blueprint.id, filePath);
    collection[blueprint.id] = blueprint;
  });

  return collection;
}

function loadPersonnelData(fileNames: string[] | undefined, errors: string[]): PersonnelData {
  const personnel: PersonnelData = {
    firstNames: [],
    lastNames: [],
    traits: [],
  };

  if (!fileNames || fileNames.length === 0) {
    return personnel;
  }

  fileNames.forEach((fileName) => {
    const filePath = `${PERSONNEL_BASE_PATH}${fileName}`;
    const normalized = fileName.toLowerCase();

    if (normalized.includes('firstname')) {
      const names = tryParseJsonFile(filePath, NameListSchema, errors);
      if (names) {
        personnel.firstNames = names;
      }
      return;
    }

    if (normalized.includes('lastname')) {
      const names = tryParseJsonFile(filePath, NameListSchema, errors);
      if (names) {
        personnel.lastNames = names;
      }
      return;
    }

    if (normalized.includes('trait')) {
      const traits = tryParseJsonFile(filePath, TraitListSchema, errors);
      if (traits) {
        personnel.traits = traits;
      }
      return;
    }

    errors.push(`${filePath} → <root> → unsupported personnel data file`);
  });

  try {
    return PersonnelDataSchema.parse(personnel);
  } catch (error) {
    if (error instanceof ZodError) {
      errors.push(...formatZodError('personnelData', error));
      return personnel;
    }
    throw error;
  }
}

let blueprintDB: BlueprintDB | null = null;
let blueprintPromise: Promise<BlueprintDB> | null = null;

export function getBlueprints(): BlueprintDB {
  if (!blueprintDB) {
    throw new Error('Blueprints must be loaded before they can be accessed. Ensure loadAllBlueprints() has resolved.');
  }
  return blueprintDB;
}

export function getAvailableStrains(company: Company): Record<string, StrainBlueprint> {
  const baseStrains = getBlueprints().strains;
  return {
    ...baseStrains,
    ...(company.customStrains || {}),
  };
}

export function loadAllBlueprints(): Promise<BlueprintDB> {
  if (blueprintPromise) {
    return blueprintPromise;
  }

  blueprintPromise = Promise.resolve()
    .then(() => {
      const manifest = parseJsonFile(`${BLUEPRINT_BASE_PATH}manifest.json`, BlueprintManifestSchema);
      const errors: string[] = [];

      const structures = loadBlueprintCollection<StructureBlueprint>(
        `${BLUEPRINT_BASE_PATH}structures/`,
        manifest.structures ?? [],
        StructureBlueprintSchema,
        errors,
      );

      const strains = loadBlueprintCollection<StrainBlueprint>(
        `${BLUEPRINT_BASE_PATH}strains/`,
        manifest.strains ?? [],
        StrainBlueprintSchema,
        errors,
      );

      const devices = loadBlueprintCollection<DeviceBlueprint>(
        `${BLUEPRINT_BASE_PATH}devices/`,
        manifest.devices ?? [],
        DeviceBlueprintSchema,
        errors,
      );

      const cultivationMethods = loadBlueprintCollection<CultivationMethodBlueprint>(
        `${BLUEPRINT_BASE_PATH}cultivationMethods/`,
        manifest.cultivationMethods ?? [],
        CultivationMethodBlueprintSchema,
        errors,
      );

      const personnelData = loadPersonnelData(manifest.personnel ?? [], errors);

      const devicePricesData = tryParseJsonFile(`${PRICES_BASE_PATH}devicePrices.json`, DevicePricesFileSchema, errors);
      const strainPricesData = tryParseJsonFile(`${PRICES_BASE_PATH}strainPrices.json`, StrainPricesFileSchema, errors);
      const utilityPrices = tryParseJsonFile(`${PRICES_BASE_PATH}utilityPrices.json`, UtilityPricesSchema, errors);
      const taskDefinitions = tryParseJsonFile(`${CONFIG_BASE_PATH}task_definitions.json`, TaskDefinitionsSchema, errors);

      if (errors.length > 0) {
        throw new Error(`Blueprint validation failed:\n${errors.join('\n')}`);
      }

      const db: BlueprintDB = {
        structures,
        strains,
        devices,
        cultivationMethods,
        devicePrices: devicePricesData?.devicePrices ?? {},
        strainPrices: strainPricesData?.strainPrices ?? {},
        utilityPrices: utilityPrices ?? DEFAULT_UTILITY_PRICES,
        personnelData,
        taskDefinitions: (taskDefinitions ?? {}) as Record<TaskType, TaskDefinition>,
      };

      blueprintDB = db;
      return db;
    })
    .catch((error) => {
      blueprintPromise = null;
      throw error;
    });

  return blueprintPromise;
}
