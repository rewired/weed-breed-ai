
import { BlueprintDB, StructureBlueprint, StrainBlueprint, DeviceBlueprint, CultivationMethodBlueprint, DevicePrice, Company, StrainPrice, UtilityPrices, PersonnelData, Trait, TaskDefinition, TaskType } from './types';

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


async function fetchAndStore<T extends BlueprintWithId>(basePath: string, files: string[], store: Record<string, T>): Promise<void> {
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
      const bp = await response.json() as T;
      if (typeof bp.id !== 'string') {
        throw new Error(`Blueprint at ${file} is missing a string 'id' property.`);
      }
      store[bp.id] = bp;
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
      .then(res => res.json())
      .then((data: DevicePricesFile) => {
        db.devicePrices = data.devicePrices;
      }).catch(e => {
        console.error("Failed to load device prices", e);
        throw e;
      });
      
    const strainPricesPromise = fetch('/data/prices/strainPrices.json')
      .then(res => res.json())
      .then((data: StrainPricesFile) => {
        db.strainPrices = data.strainPrices;
      }).catch(e => {
        console.error("Failed to load strain prices", e);
        throw e;
      });

    const utilityPricesPromise = fetch('/data/prices/utilityPrices.json')
      .then(res => res.json())
      .then((data: UtilityPrices) => {
        db.utilityPrices = data;
      }).catch(e => {
        console.error("Failed to load utility prices", e);
        throw e;
      });

    const taskDefinitionsPromise = fetch(`${CONFIG_BASE_PATH}task_definitions.json`)
        .then(res => res.json())
        .then((data: Record<TaskType, TaskDefinition>) => {
            db.taskDefinitions = data;
        }).catch(e => {
            console.error("Failed to load task definitions", e);
            throw e;
        });

    // Load personnel data
    const personnelPromises = Object.entries(personnelFiles).map(async ([key, fileName]) => {
        try {
            const response = await fetch(`${PERSONNEL_BASE_PATH}${fileName}`);
            const data = await response.json();
            const dataKey = (fileName as string).replace('.json', ''); // e.g., 'firstNames'
            if (db.personnelData[dataKey as keyof PersonnelData]) {
                (db.personnelData[dataKey as keyof PersonnelData] as any) = data;
            }
        } catch(e) {
            console.error(`Failed to load personnel data: ${fileName}`, e);
            throw e;
        }
    });

    // Load all blueprints based on the manifest
    await Promise.all([
      fetchAndStore<StructureBlueprint>(`${BLUEPRINT_BASE_PATH}structures/`, structureFiles, db.structures),
      fetchAndStore<StrainBlueprint>(`${BLUEPRINT_BASE_PATH}strains/`, strainFiles, db.strains),
      fetchAndStore<DeviceBlueprint>(`${BLUEPRINT_BASE_PATH}devices/`, deviceFiles, db.devices),
      fetchAndStore<CultivationMethodBlueprint>(`${BLUEPRINT_BASE_PATH}cultivationMethods/`, cultivationMethodFiles, db.cultivationMethods),
      devicePricesPromise,
      strainPricesPromise,
      utilityPricesPromise,
      taskDefinitionsPromise,
      ...personnelPromises,
    ]);
    
    blueprintDB = db;
    return db;
  })();

  return blueprintPromise;
}
