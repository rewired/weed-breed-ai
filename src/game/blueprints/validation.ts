import { z } from 'zod';
import type {
  CultivationMethodBlueprint,
  DeviceBlueprint,
  DevicePrice,
  PersonnelData,
  StrainBlueprint,
  StrainPrice,
  StructureBlueprint,
  TaskDefinition,
  Trait,
  UtilityPrices,
} from '@/game/types';
import type { JobRole, SkillName } from '@/game/types';

const StageRangeTupleSchema = z.tuple([z.number(), z.number()]);
const StageRangeRecordSchema = z.record(StageRangeTupleSchema);
const NutrientDemandSchema = z.record(z.record(z.number()));
const WaterDemandSchema = z.object({
  dailyWaterUsagePerSquareMeter: z.record(z.number()),
}).passthrough();

export const StructureBlueprintSchema: z.ZodType<StructureBlueprint> = z
  .object({
    id: z.string(),
    name: z.string(),
    footprint: z
      .object({
        length_m: z.number(),
        width_m: z.number(),
        height_m: z.number(),
      })
      .passthrough(),
    rentalCostPerSqmPerMonth: z.number(),
    upfrontFee: z.number(),
  })
  .passthrough();

export const StrainBlueprintSchema: z.ZodType<StrainBlueprint> = z
  .object({
    id: z.string(),
    slug: z.string(),
    name: z.string(),
    lineage: z
      .object({
        parents: z.array(z.string()),
      })
      .passthrough(),
    genotype: z
      .object({
        sativa: z.number(),
        indica: z.number(),
        ruderalis: z.number(),
      })
      .passthrough(),
    generalResilience: z.number(),
    germinationRate: z.number().optional(),
    chemotype: z
      .object({
        thcContent: z.number(),
        cbdContent: z.number(),
      })
      .passthrough(),
    morphology: z
      .object({
        growthRate: z.number(),
        yieldFactor: z.number(),
        leafAreaIndex: z.number(),
      })
      .passthrough(),
    growthModel: z.object({ maxBiomassDry_g: z.number() }).passthrough(),
    noise: z
      .object({
        enabled: z.boolean(),
        pct: z.number(),
      })
      .passthrough()
      .optional(),
    environmentalPreferences: z
      .object({
        idealTemperature: StageRangeRecordSchema,
        lightIntensity: StageRangeRecordSchema,
        idealHumidity: StageRangeRecordSchema,
        lightCycle: StageRangeRecordSchema,
      })
      .passthrough(),
    waterDemand: WaterDemandSchema,
    nutrientDemand: z
      .object({
        dailyNutrientDemand: NutrientDemandSchema,
      })
      .passthrough(),
    photoperiod: z
      .object({
        vegetationDays: z.number(),
        floweringDays: z.number(),
        transitionTriggerHours: z.number(),
      })
      .passthrough(),
    harvestWindowInDays: StageRangeTupleSchema,
    meta: z
      .object({
        description: z.string(),
        advantages: z.array(z.string()),
        disadvantages: z.array(z.string()),
        notes: z.string(),
      })
      .passthrough(),
  })
  .passthrough();

const DeviceSettingsSchema = z
  .object({
    coverageArea: z.number().optional(),
    ppfd: z.number().optional(),
    airflow: z.number().optional(),
  })
  .catchall(z.unknown());

export const DeviceBlueprintSchema: z.ZodType<DeviceBlueprint> = z
  .object({
    id: z.string(),
    name: z.string(),
    kind: z.string(),
    settings: DeviceSettingsSchema.optional(),
  })
  .passthrough();

const TraitBoundsSchema = z
  .object({
    min: z.number().optional(),
    max: z.number().optional(),
  })
  .partial();

const TraitCompatibilitySchema = z
  .object({
    preferred: z.record(TraitBoundsSchema).optional(),
    conflicting: z.record(TraitBoundsSchema).optional(),
  })
  .partial()
  .passthrough();

export const CultivationMethodBlueprintSchema: z.ZodType<CultivationMethodBlueprint> = z
  .object({
    id: z.string(),
    name: z.string(),
    kind: z.string(),
    areaPerPlant: z.number(),
    setupCost: z.number(),
    maxCycles: z.number(),
    strainTraitCompatibility: TraitCompatibilitySchema.optional(),
  })
  .passthrough();

export const DevicePriceSchema: z.ZodType<DevicePrice> = z
  .object({
    capitalExpenditure: z.number(),
    baseMaintenanceCostPerTick: z.number(),
    costIncreasePer1000Ticks: z.number(),
  })
  .strict();

export const DevicePricesFileSchema = z.object({
  devicePrices: z.record(DevicePriceSchema),
});

export const StrainPriceSchema: z.ZodType<StrainPrice> = z
  .object({
    seedPrice: z.number(),
    harvestPricePerGram: z.number(),
  })
  .strict();

export const StrainPricesFileSchema = z.object({
  strainPrices: z.record(StrainPriceSchema),
});

export const UtilityPricesSchema: z.ZodType<UtilityPrices> = z
  .object({
    pricePerKwh: z.number(),
    pricePerLiterWater: z.number(),
    pricePerGramNutrients: z.number(),
  })
  .strict();

export const TraitSchema: z.ZodType<Trait> = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    type: z.union([z.literal('positive'), z.literal('negative')]),
    effects: z.record(z.unknown()).optional(),
  })
  .passthrough();

export const TraitListSchema = z.array(TraitSchema);

export const PersonnelDataSchema: z.ZodType<PersonnelData> = z.object({
  firstNames: z.array(z.string()),
  lastNames: z.array(z.string()),
  traits: TraitListSchema,
});

export const BlueprintManifestSchema = z
  .object({
    structures: z.array(z.string()).optional(),
    strains: z.array(z.string()).optional(),
    devices: z.array(z.string()).optional(),
    cultivationMethods: z.array(z.string()).optional(),
    personnel: z.array(z.string()).optional(),
  })
  .passthrough();

const CostBasisSchema = z.enum(['perAction', 'perPlant', 'perSquareMeter']);

const JobRoleSchema: z.ZodType<JobRole> = z.enum([
  'Gardener',
  'Technician',
  'Janitor',
  'Botanist',
  'Salesperson',
  'Generalist',
] as const);

const SkillNameSchema: z.ZodType<SkillName> = z.enum([
  'Gardening',
  'Maintenance',
  'Technical',
  'Botanical',
  'Cleanliness',
  'Negotiation',
] as const);

export const TaskDefinitionSchema: z.ZodType<TaskDefinition> = z
  .object({
    costModel: z
      .object({
        basis: CostBasisSchema,
        laborMinutes: z.number(),
      })
      .passthrough(),
    priority: z.number(),
    requiredRole: JobRoleSchema,
    minSkillLevel: z.number(),
    requiredSkill: SkillNameSchema,
    description: z.string(),
  })
  .passthrough();

export const TaskDefinitionsSchema = z.record(TaskDefinitionSchema);

export const NameListSchema = z.array(z.string());
