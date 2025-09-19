const VALIDATION_PREFIX = '[Blueprint validation]';

function describeValue(value: unknown): string {
  if (value === null) {
    return 'null';
  }
  if (Array.isArray(value)) {
    return 'array';
  }
  return typeof value;
}

function warn(context: string, message: string): void {
  console.warn(`${VALIDATION_PREFIX} ${context}: ${message}`);
}

export function assertObject(value: unknown, context: string): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    warn(context, `Expected an object but received ${describeValue(value)}.`);
    return false;
  }
  return true;
}

export function assertArray(value: unknown, context: string): value is unknown[] {
  if (!Array.isArray(value)) {
    warn(context, `Expected an array but received ${describeValue(value)}.`);
    return false;
  }
  return true;
}

export function assertStringArray(value: unknown, context: string): value is string[] {
  if (!assertArray(value, context)) {
    return false;
  }
  let valid = true;
  value.forEach((entry, index) => {
    if (typeof entry !== 'string') {
      warn(`${context}[${index}]`, `Expected a string but received ${describeValue(entry)}.`);
      valid = false;
    }
  });
  return valid;
}

export function assertNumberTuple(value: unknown, length: number, context: string): value is number[] {
  if (!assertArray(value, context)) {
    return false;
  }
  if (value.length !== length) {
    warn(context, `Expected an array of length ${length} but received ${value.length}.`);
  }
  let valid = true;
  value.forEach((entry, index) => {
    if (typeof entry !== 'number' || Number.isNaN(entry)) {
      warn(`${context}[${index}]`, `Expected a finite number but received ${describeValue(entry)}.`);
      valid = false;
    }
  });
  return valid;
}

export function assertHasString<T extends Record<string, unknown>, K extends string>(
  obj: T,
  field: K,
  context: string,
): obj is T & Record<K, string> {
  const value = obj[field];
  if (typeof value !== 'string') {
    warn(context, `Expected '${field}' to be a string but received ${describeValue(value)}.`);
    return false;
  }
  return true;
}

export function assertHasNumber<T extends Record<string, unknown>, K extends string>(
  obj: T,
  field: K,
  context: string,
): obj is T & Record<K, number> {
  const value = obj[field];
  if (typeof value !== 'number' || Number.isNaN(value)) {
    warn(context, `Expected '${field}' to be a finite number but received ${describeValue(value)}.`);
    return false;
  }
  return true;
}

export function assertOptionalNumber<T extends Record<string, unknown>, K extends string>(
  obj: T,
  field: K,
  context: string,
): boolean {
  if (obj[field] === undefined) {
    return true;
  }
  return assertHasNumber(obj, field, context);
}

export function assertBoolean(value: unknown, context: string): value is boolean {
  if (typeof value !== 'boolean') {
    warn(context, `Expected a boolean but received ${describeValue(value)}.`);
    return false;
  }
  return true;
}

export function assertUniqueId<T>(store: Record<string, T>, id: string, context: string): boolean {
  if (store[id]) {
    warn(context, `Duplicate id '${id}' encountered. Keeping the first occurrence.`);
    return false;
  }
  return true;
}

const STAGE_KEYS = ['vegetation', 'flowering'] as const;

function validateStageRanges(value: unknown, context: string): void {
  if (!assertObject(value, context)) {
    return;
  }
  STAGE_KEYS.forEach((stage) => {
    assertNumberTuple(value[stage], 2, `${context}.${stage}`);
  });
}

export function validateStructureBlueprint(blueprint: Record<string, unknown>, context: string): void {
  assertHasString(blueprint, 'name', `${context}.name`);
  assertHasNumber(blueprint, 'rentalCostPerSqmPerMonth', `${context}.rentalCostPerSqmPerMonth`);
  assertHasNumber(blueprint, 'upfrontFee', `${context}.upfrontFee`);

  if (assertObject(blueprint.footprint, `${context}.footprint`)) {
    assertHasNumber(blueprint.footprint, 'length_m', `${context}.footprint.length_m`);
    assertHasNumber(blueprint.footprint, 'width_m', `${context}.footprint.width_m`);
    assertHasNumber(blueprint.footprint, 'height_m', `${context}.footprint.height_m`);
  }
}

export function validateStrainBlueprint(blueprint: Record<string, unknown>, context: string): void {
  assertHasString(blueprint, 'slug', `${context}.slug`);
  assertHasString(blueprint, 'name', `${context}.name`);
  assertHasNumber(blueprint, 'generalResilience', `${context}.generalResilience`);
  assertOptionalNumber(blueprint, 'germinationRate', `${context}.germinationRate`);

  if (assertObject(blueprint.lineage, `${context}.lineage`)) {
    assertStringArray(blueprint.lineage.parents, `${context}.lineage.parents`);
  }

  if (assertObject(blueprint.genotype, `${context}.genotype`)) {
    assertHasNumber(blueprint.genotype, 'sativa', `${context}.genotype.sativa`);
    assertHasNumber(blueprint.genotype, 'indica', `${context}.genotype.indica`);
    assertHasNumber(blueprint.genotype, 'ruderalis', `${context}.genotype.ruderalis`);
  }

  if (assertObject(blueprint.chemotype, `${context}.chemotype`)) {
    assertHasNumber(blueprint.chemotype, 'thcContent', `${context}.chemotype.thcContent`);
    assertHasNumber(blueprint.chemotype, 'cbdContent', `${context}.chemotype.cbdContent`);
  }

  if (assertObject(blueprint.morphology, `${context}.morphology`)) {
    assertHasNumber(blueprint.morphology, 'growthRate', `${context}.morphology.growthRate`);
    assertHasNumber(blueprint.morphology, 'yieldFactor', `${context}.morphology.yieldFactor`);
    assertHasNumber(blueprint.morphology, 'leafAreaIndex', `${context}.morphology.leafAreaIndex`);
  }

  if (assertObject(blueprint.growthModel, `${context}.growthModel`)) {
    assertHasNumber(blueprint.growthModel, 'maxBiomassDry_g', `${context}.growthModel.maxBiomassDry_g`);
  }

  if (assertObject(blueprint.environmentalPreferences, `${context}.environmentalPreferences`)) {
    validateStageRanges(blueprint.environmentalPreferences.idealTemperature, `${context}.environmentalPreferences.idealTemperature`);
    validateStageRanges(blueprint.environmentalPreferences.lightIntensity, `${context}.environmentalPreferences.lightIntensity`);
    validateStageRanges(blueprint.environmentalPreferences.idealHumidity, `${context}.environmentalPreferences.idealHumidity`);
    validateStageRanges(blueprint.environmentalPreferences.lightCycle, `${context}.environmentalPreferences.lightCycle`);
  }

  if (assertObject(blueprint.waterDemand, `${context}.waterDemand`)) {
    if (assertObject(blueprint.waterDemand.dailyWaterUsagePerSquareMeter, `${context}.waterDemand.dailyWaterUsagePerSquareMeter`)) {
      Object.entries(blueprint.waterDemand.dailyWaterUsagePerSquareMeter).forEach(([stage, amount]) => {
        if (typeof amount !== 'number' || Number.isNaN(amount)) {
          warn(`${context}.waterDemand.dailyWaterUsagePerSquareMeter.${stage}`, `Expected a finite number but received ${describeValue(amount)}.`);
        }
      });
    }
  }

  if (assertObject(blueprint.nutrientDemand, `${context}.nutrientDemand`)) {
    if (assertObject(blueprint.nutrientDemand.dailyNutrientDemand, `${context}.nutrientDemand.dailyNutrientDemand`)) {
      Object.entries(blueprint.nutrientDemand.dailyNutrientDemand).forEach(([stage, nutrients]) => {
        if (assertObject(nutrients, `${context}.nutrientDemand.dailyNutrientDemand.${stage}`)) {
          Object.entries(nutrients).forEach(([nutrient, amount]) => {
            if (typeof amount !== 'number' || Number.isNaN(amount)) {
              warn(`${context}.nutrientDemand.dailyNutrientDemand.${stage}.${nutrient}`, `Expected a finite number but received ${describeValue(amount)}.`);
            }
          });
        }
      });
    }
  }

  if (assertObject(blueprint.photoperiod, `${context}.photoperiod`)) {
    assertHasNumber(blueprint.photoperiod, 'vegetationDays', `${context}.photoperiod.vegetationDays`);
    assertHasNumber(blueprint.photoperiod, 'floweringDays', `${context}.photoperiod.floweringDays`);
    assertHasNumber(blueprint.photoperiod, 'transitionTriggerHours', `${context}.photoperiod.transitionTriggerHours`);
  }

  assertNumberTuple(blueprint.harvestWindowInDays, 2, `${context}.harvestWindowInDays`);

  if (assertObject(blueprint.meta, `${context}.meta`)) {
    assertHasString(blueprint.meta, 'description', `${context}.meta.description`);
    if (assertArray(blueprint.meta.advantages, `${context}.meta.advantages`)) {
      blueprint.meta.advantages.forEach((entry, index) => {
        if (typeof entry !== 'string') {
          warn(`${context}.meta.advantages[${index}]`, `Expected a string but received ${describeValue(entry)}.`);
        }
      });
    }
    if (assertArray(blueprint.meta.disadvantages, `${context}.meta.disadvantages`)) {
      blueprint.meta.disadvantages.forEach((entry, index) => {
        if (typeof entry !== 'string') {
          warn(`${context}.meta.disadvantages[${index}]`, `Expected a string but received ${describeValue(entry)}.`);
        }
      });
    }
    assertHasString(blueprint.meta, 'notes', `${context}.meta.notes`);
  }

  if (blueprint.noise !== undefined && blueprint.noise !== null) {
    if (assertObject(blueprint.noise, `${context}.noise`)) {
      const enabled = blueprint.noise.enabled;
      if (enabled !== undefined) {
        assertBoolean(enabled, `${context}.noise.enabled`);
      }
      assertOptionalNumber(blueprint.noise, 'pct', `${context}.noise.pct`);
    }
  }
}

export function validateDeviceBlueprint(blueprint: Record<string, unknown>, context: string): void {
  assertHasString(blueprint, 'name', `${context}.name`);
  assertHasString(blueprint, 'kind', `${context}.kind`);

  if (blueprint.settings !== undefined && blueprint.settings !== null) {
    if (assertObject(blueprint.settings, `${context}.settings`)) {
      ['coverageArea', 'ppfd', 'airflow'].forEach((field) => {
        assertOptionalNumber(blueprint.settings, field, `${context}.settings.${field}`);
      });
    }
  }
}

export function validateCultivationMethodBlueprint(blueprint: Record<string, unknown>, context: string): void {
  assertHasString(blueprint, 'name', `${context}.name`);
  assertHasString(blueprint, 'kind', `${context}.kind`);
  assertHasNumber(blueprint, 'areaPerPlant', `${context}.areaPerPlant`);
  assertHasNumber(blueprint, 'setupCost', `${context}.setupCost`);
  assertHasNumber(blueprint, 'maxCycles', `${context}.maxCycles`);

  if (blueprint.strainTraitCompatibility !== undefined && blueprint.strainTraitCompatibility !== null) {
    if (assertObject(blueprint.strainTraitCompatibility, `${context}.strainTraitCompatibility`)) {
      ['preferred', 'conflicting'].forEach((section) => {
        const value = blueprint.strainTraitCompatibility?.[section as 'preferred' | 'conflicting'];
        if (value !== undefined) {
          if (assertObject(value, `${context}.strainTraitCompatibility.${section}`)) {
            Object.entries(value).forEach(([trait, bounds]) => {
              if (bounds !== undefined && bounds !== null && assertObject(bounds, `${context}.strainTraitCompatibility.${section}.${trait}`)) {
                assertOptionalNumber(bounds, 'min', `${context}.strainTraitCompatibility.${section}.${trait}.min`);
                assertOptionalNumber(bounds, 'max', `${context}.strainTraitCompatibility.${section}.${trait}.max`);
              }
            });
          }
        }
      });
    }
  }
}

export function validateDevicePriceRecord(record: Record<string, unknown>, context: string): void {
  Object.entries(record).forEach(([deviceId, value]) => {
    if (!assertObject(value, `${context}.${deviceId}`)) {
      return;
    }
    assertHasNumber(value, 'capitalExpenditure', `${context}.${deviceId}.capitalExpenditure`);
    assertHasNumber(value, 'baseMaintenanceCostPerTick', `${context}.${deviceId}.baseMaintenanceCostPerTick`);
    assertHasNumber(value, 'costIncreasePer1000Ticks', `${context}.${deviceId}.costIncreasePer1000Ticks`);
  });
}

export function validateStrainPriceRecord(record: Record<string, unknown>, context: string): void {
  Object.entries(record).forEach(([strainId, value]) => {
    if (!assertObject(value, `${context}.${strainId}`)) {
      return;
    }
    assertHasNumber(value, 'seedPrice', `${context}.${strainId}.seedPrice`);
    assertHasNumber(value, 'harvestPricePerGram', `${context}.${strainId}.harvestPricePerGram`);
  });
}

export function validateUtilityPrices(value: unknown, context: string): value is Record<string, unknown> {
  if (!assertObject(value, context)) {
    return false;
  }
  assertHasNumber(value, 'pricePerKwh', `${context}.pricePerKwh`);
  assertHasNumber(value, 'pricePerLiterWater', `${context}.pricePerLiterWater`);
  assertHasNumber(value, 'pricePerGramNutrients', `${context}.pricePerGramNutrients`);
  return true;
}

export function validateTraitList(value: unknown, context: string): void {
  if (!assertArray(value, context)) {
    return;
  }
  value.forEach((trait, index) => {
    if (!assertObject(trait, `${context}[${index}]`)) {
      return;
    }
    assertHasString(trait, 'id', `${context}[${index}].id`);
    assertHasString(trait, 'name', `${context}[${index}].name`);
    assertHasString(trait, 'description', `${context}[${index}].description`);
    const type = trait.type;
    if (type !== undefined) {
      if (typeof type !== 'string') {
        warn(`${context}[${index}].type`, `Expected a string but received ${describeValue(type)}.`);
      } else if (type !== 'positive' && type !== 'negative') {
        warn(`${context}[${index}].type`, `Unexpected value '${type}'. Expected 'positive' or 'negative'.`);
      }
    }
  });
}

export function validatePersonnelData(value: unknown, context: string): void {
  if (!assertObject(value, context)) {
    return;
  }
  assertStringArray(value.firstNames, `${context}.firstNames`);
  assertStringArray(value.lastNames, `${context}.lastNames`);
  validateTraitList(value.traits, `${context}.traits`);
}

export function validateTaskDefinitions(record: unknown, context: string): void {
  if (!assertObject(record, context)) {
    return;
  }
  Object.entries(record).forEach(([taskType, definition]) => {
    if (!assertObject(definition, `${context}.${taskType}`)) {
      return;
    }
    if (assertObject(definition.costModel, `${context}.${taskType}.costModel`)) {
      assertHasString(definition.costModel, 'basis', `${context}.${taskType}.costModel.basis`);
      assertHasNumber(definition.costModel, 'laborMinutes', `${context}.${taskType}.costModel.laborMinutes`);
    }
    assertHasNumber(definition, 'priority', `${context}.${taskType}.priority`);
    assertHasString(definition, 'requiredRole', `${context}.${taskType}.requiredRole`);
    assertHasNumber(definition, 'minSkillLevel', `${context}.${taskType}.minSkillLevel`);
    assertHasString(definition, 'requiredSkill', `${context}.${taskType}.requiredSkill`);
    assertHasString(definition, 'description', `${context}.${taskType}.description`);
  });
}
