
import { BlueprintDB, StructureBlueprint, StrainBlueprint, DeviceBlueprint, CultivationMethodBlueprint, DevicePrice, Company, StrainPrice, UtilityPrices, PersonnelData, Trait, TaskDefinition, TaskType } from './types';
import {
  assertHasString,
  assertObject,
  assertStringArray,
  assertUniqueId,
  validateCultivationMethodBlueprint,
  validateDeviceBlueprint,
  validateDevicePriceRecord,
  validatePersonnelData,
  validateStrainBlueprint,
  validateStrainPriceRecord,
  validateStructureBlueprint,
  validateTaskDefinitions,
  validateTraitList,
  validateUtilityPrices,
} from '../src/game/blueprints/validation';

const BLUEPRINT_BASE_PATH = '/data/blueprints/';
const PERSONNEL_BASE_PATH = '/data/personnel/';
const CONFIG_BASE_PATH = '/data/configs/';

type BlueprintWithId = { id: string };

// This type helps us model the structure of the JSON file.
interface DevicePricesFile {
  devicePrices: Record<string, DevicePrice>;
}

interface StrainPricesFile {
  strainPrices: Record<string, StrainPrice>;
}

type BlueprintValidator = (blueprint: Record<string, unknown>, context: string) => void;

async function fetchAndStore<T extends BlueprintWithId>(
  basePath: string,
  files: string[],
  store: Record<string, T>,
  validator?: BlueprintValidator,
): Promise<void> {
  if (!files || files.length === 0) {
    return;
  }
  const promises = files.map(async (fileName) => {
    const file = `${basePath}${fileName}`;
    try {
      const response = await fetch(file);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const json = await response.json();
      if (!assertObject(json, file)) {
        return;
      }
      if (!assertHasString(json, 'id', file)) {
        return;
      }
      const context = `${file} (id=${json.id})`;
      if (!assertUniqueId(store, json.id, context)) {
        return;
      }
      validator?.(json, context);
      store[json.id] = json as T;
    } catch (e) {
      console.error(`Failed to load blueprint: ${file}`, e);
      throw e;
    }
  });
  await Promise.all(promises);
}

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
    return {
        ...baseStrains,
        ...(company.customStrains || {}),
    };
}

export function loadAllBlueprints(): Promise<BlueprintDB> {
  if (blueprintPromise) {
    return blueprintPromise;
  }
  
  blueprintPromise = (async () => {
    // Fetch the central manifest file
    const manifestResponse = await fetch(`${BLUEPRINT_BASE_PATH}manifest.json`);
    if (!manifestResponse.ok) {
        throw new Error("Could not fetch the blueprint manifest file.");
    }
    const manifest = await manifestResponse.json();

    const structureFiles = manifest.structures || [];
    const strainFiles = manifest.strains || [];
    const deviceFiles = manifest.devices || [];
    const cultivationMethodFiles = manifest.cultivationMethods || [];
    const personnelFiles = manifest.personnel || {};

    const db: BlueprintDB = {
      structures: {},
      strains: {},
      devices: {},
      cultivationMethods: {},
      devicePrices: {},
      strainPrices: {},
      utilityPrices: { pricePerKwh: 0.15, pricePerLiterWater: 0.01, pricePerGramNutrients: 0.10 },
      personnelData: {
        firstNames: [],
        lastNames: [],
        traits: [],
      },
      taskDefinitions: {} as Record<TaskType, TaskDefinition>,
    };
    
    const devicePricesPromise = fetch('/data/prices/devicePrices.json')
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data: DevicePricesFile) => {
        const context = '/data/prices/devicePrices.json';
        if (!assertObject(data, context)) {
          return;
        }
        if (!assertObject(data.devicePrices, `${context}.devicePrices`)) {
          return;
        }
        validateDevicePriceRecord(data.devicePrices, `${context}.devicePrices`);
        db.devicePrices = data.devicePrices as Record<string, DevicePrice>;
      }).catch(e => {
        console.error("Failed to load device prices", e);
        throw e;
      });

    const strainPricesPromise = fetch('/data/prices/strainPrices.json')
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data: StrainPricesFile) => {
        const context = '/data/prices/strainPrices.json';
        if (!assertObject(data, context)) {
          return;
        }
        if (!assertObject(data.strainPrices, `${context}.strainPrices`)) {
          return;
        }
        validateStrainPriceRecord(data.strainPrices, `${context}.strainPrices`);
        db.strainPrices = data.strainPrices as Record<string, StrainPrice>;
      }).catch(e => {
        console.error("Failed to load strain prices", e);
        throw e;
      });

    const utilityPricesPromise = fetch('/data/prices/utilityPrices.json')
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data: UtilityPrices) => {
        const context = '/data/prices/utilityPrices.json';
        if (validateUtilityPrices(data, context)) {
          db.utilityPrices = data;
        }
      }).catch(e => {
        console.error("Failed to load utility prices", e);
        throw e;
      });

    const taskDefinitionsPromise = fetch(`${CONFIG_BASE_PATH}task_definitions.json`)
        .then((res) => {
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            return res.json();
        })
        .then((data: Record<TaskType, TaskDefinition>) => {
            const context = `${CONFIG_BASE_PATH}task_definitions.json`;
            validateTaskDefinitions(data, context);
            db.taskDefinitions = data;
        }).catch(e => {
            console.error("Failed to load task definitions", e);
            throw e;
        });

    // Load personnel data
    const personnelPromises = Object.entries(personnelFiles).map(async ([, fileName]) => {
        const filePath = `${PERSONNEL_BASE_PATH}${fileName}`;
        try {
            const response = await fetch(filePath);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            const dataKey = (fileName as string).replace('.json', '');
            if (dataKey === 'firstNames') {
                if (assertStringArray(data, filePath)) {
                    db.personnelData.firstNames = data;
                }
            } else if (dataKey === 'lastNames') {
                if (assertStringArray(data, filePath)) {
                    db.personnelData.lastNames = data;
                }
            } else if (dataKey === 'traits') {
                validateTraitList(data, filePath);
                if (Array.isArray(data)) {
                    db.personnelData.traits = data as Trait[];
                }
            }
        } catch(e) {
            console.error(`Failed to load personnel data: ${fileName}`, e);
            throw e;
        }
    });

    // Load all blueprints based on the manifest
    await Promise.all([
      fetchAndStore<StructureBlueprint>(`${BLUEPRINT_BASE_PATH}structures/`, structureFiles, db.structures, validateStructureBlueprint),
      fetchAndStore<StrainBlueprint>(`${BLUEPRINT_BASE_PATH}strains/`, strainFiles, db.strains, validateStrainBlueprint),
      fetchAndStore<DeviceBlueprint>(`${BLUEPRINT_BASE_PATH}devices/`, deviceFiles, db.devices, validateDeviceBlueprint),
      fetchAndStore<CultivationMethodBlueprint>(`${BLUEPRINT_BASE_PATH}cultivationMethods/`, cultivationMethodFiles, db.cultivationMethods, validateCultivationMethodBlueprint),
      devicePricesPromise,
      strainPricesPromise,
      utilityPricesPromise,
      taskDefinitionsPromise,
      ...personnelPromises,
    ]);
    
    validatePersonnelData(db.personnelData, 'personnelData');

    blueprintDB = db;
    return db;
  })();

  return blueprintPromise;
}
