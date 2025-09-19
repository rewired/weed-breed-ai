import { z } from 'zod';
import type {
  DiseaseBalancingConfig,
  DiseaseDefinition,
  DiseaseTreatmentEfficacy,
  PestBalancingConfig,
  PestDefinition,
  PestTreatmentEfficacy,
  TreatmentCatalog,
  TreatmentOption,
} from './types';

const NumericTupleSchema = z.tuple([z.number(), z.number()]);
const RangeDescriptorSchema = z.object({ min: z.number(), max: z.number() }).strict();

export const DiseaseTreatmentEfficacySchema: z.ZodType<DiseaseTreatmentEfficacy> = z
  .object({
    infectionMultiplier: z.number().optional(),
    degenerationMultiplier: z.number().optional(),
    recoveryMultiplier: z.number().optional(),
  })
  .passthrough();

export const PestTreatmentEfficacySchema: z.ZodType<PestTreatmentEfficacy> = z
  .object({
    reproductionMultiplier: z.number().optional(),
    mortalityMultiplier: z.number().optional(),
    damageMultiplier: z.number().optional(),
  })
  .passthrough();

const TreatmentCostsSchema = z
  .object({
    laborMinutes: z.number().optional(),
    materialsCost: z.number().optional(),
    energyPerHourKWh: z.number().optional(),
    equipmentRentalEUR: z.number().optional(),
  })
  .catchall(z.number().optional());

const TreatmentRisksSchema = z.record(z.union([z.string(), z.boolean(), z.number()])).optional();

const TreatmentEfficacySchema = z
  .object({
    disease: DiseaseTreatmentEfficacySchema.optional(),
    pest: PestTreatmentEfficacySchema.optional(),
  })
  .catchall(z.union([DiseaseTreatmentEfficacySchema, PestTreatmentEfficacySchema]));

const TreatmentStackingRulesSchema = z
  .object({
    maxConcurrentTreatmentsPerZone: z.number(),
    mechanicalAlwaysStacks: z.boolean(),
    chemicalAndBiologicalCantShareSameMoAWithin7Days: z.boolean(),
    cooldownDaysDefault: z.number(),
  })
  .passthrough();

const TreatmentSideEffectsSchema = z
  .object({
    phytotoxicityRiskKeys: z.array(z.string()),
    beneficialsHarmRiskKeys: z.array(z.string()),
  })
  .catchall(z.array(z.string()).optional());

const TreatmentCostBasisDescriptionsSchema = z
  .object({
    perZone: z.string().optional(),
    perPlant: z.string().optional(),
    perSquareMeter: z.string().optional(),
  })
  .catchall(z.string().optional());

const TreatmentCostModelInfoSchema = z
  .object({
    costBasis: TreatmentCostBasisDescriptionsSchema,
    totalCostFormula: z.string(),
  })
  .passthrough();

const TreatmentGlobalConfigSchema = z
  .object({
    stackingRules: TreatmentStackingRulesSchema,
    sideEffects: TreatmentSideEffectsSchema,
    costModel: TreatmentCostModelInfoSchema,
  })
  .passthrough();

export const TreatmentOptionSchema: z.ZodType<TreatmentOption> = z
  .object({
    id: z.string(),
    name: z.string(),
    category: z.string(),
    targets: z.array(z.string()),
    applicability: z.array(z.string()),
    efficacy: TreatmentEfficacySchema,
    costs: TreatmentCostsSchema,
    cooldownDays: z.number(),
    notes: z.string().optional(),
    costBasis: z.string(),
    risks: TreatmentRisksSchema,
  })
  .passthrough();

export const TreatmentCatalogSchema: z.ZodType<TreatmentCatalog> = z
  .object({
    kind: z.string(),
    version: z.string(),
    notes: z.string().optional(),
    global: TreatmentGlobalConfigSchema,
    options: z.array(TreatmentOptionSchema),
  })
  .passthrough();

const DiseaseBalancingGlobalConfigSchema = z
  .object({
    baseDailyInfectionMultiplier: z.number(),
    baseRecoveryMultiplier: z.number(),
    maxConcurrentDiseases: z.number(),
    symptomDelayDays: RangeDescriptorSchema,
    eventWeights: z.record(z.number()),
  })
  .passthrough();

const DiseasePhaseMultipliersSchema = z
  .object({
    infection: z.number().optional(),
    degeneration: z.number().optional(),
    recovery: z.number().optional(),
  })
  .passthrough();

const DiseaseEnvironmentModifierSchema = z.record(
  z.union([NumericTupleSchema, z.number(), z.boolean(), z.string()]),
);

const DiseaseStrainResistanceWeightsSchema = z
  .object({
    generalResilienceWeight: z.number().optional(),
    specificResistanceWeight: z.number().optional(),
  })
  .catchall(z.number().optional());

const DiseaseCapsSchema = z
  .object({
    minDailyDegeneration: z.number(),
    maxDailyDegeneration: z.number(),
    minDailyRecovery: z.number(),
    maxDailyRecovery: z.number(),
  })
  .catchall(z.number());

const DiseaseIntegrationHintsSchema = z
  .object({
    applyOrder: z.array(z.string()).optional(),
    mapToDiseaseModel: z.record(z.string()).optional(),
  })
  .passthrough();

export const DiseaseBalancingConfigSchema: z.ZodType<DiseaseBalancingConfig> = z
  .object({
    kind: z.string(),
    version: z.string(),
    notes: z.string().optional(),
    global: DiseaseBalancingGlobalConfigSchema,
    phaseMultipliers: z.record(DiseasePhaseMultipliersSchema),
    environmentModifiers: z.record(DiseaseEnvironmentModifierSchema),
    strainResistanceWeights: DiseaseStrainResistanceWeightsSchema,
    treatmentEfficacy: z.record(DiseaseTreatmentEfficacySchema),
    caps: DiseaseCapsSchema,
    integrationHints: DiseaseIntegrationHintsSchema.optional(),
  })
  .passthrough();

const PestBalancingGlobalConfigSchema = z
  .object({
    baseDailyReproductionMultiplier: z.number(),
    baseDailyMortalityMultiplier: z.number(),
    baseDamageMultiplier: z.number(),
    maxConcurrentPests: z.number(),
    economicThresholds: z.record(z.number()),
    eventWeights: z.record(z.number()),
  })
  .passthrough();

const PestPhaseMultipliersSchema = z
  .object({
    reproduction: z.number().optional(),
    damage: z.number().optional(),
    mortality: z.number().optional(),
  })
  .passthrough();

const PestEnvironmentModifierSchema = z.record(
  z.union([NumericTupleSchema, z.number(), z.boolean(), z.string()]),
);

const PestNaturalEnemiesConfigSchema = z
  .object({
    backgroundPredationPerDay: z.number(),
    enhancedPredationWithBiocontrol: z.number(),
  })
  .catchall(z.number());

const PestCapsSchema = z
  .object({
    minDailyReproduction: z.number(),
    maxDailyReproduction: z.number(),
    minDailyMortality: z.number(),
    maxDailyMortality: z.number(),
    minDailyDamage: z.number(),
    maxDailyDamage: z.number(),
  })
  .catchall(z.number());

const PestIntegrationHintsSchema = z
  .object({
    applyOrder: z.array(z.string()).optional(),
    mapToPestModel: z.record(z.string()).optional(),
  })
  .passthrough();

export const PestBalancingConfigSchema: z.ZodType<PestBalancingConfig> = z
  .object({
    kind: z.string(),
    version: z.string(),
    notes: z.string().optional(),
    global: PestBalancingGlobalConfigSchema,
    phaseMultipliers: z.record(PestPhaseMultipliersSchema),
    environmentModifiers: z.record(PestEnvironmentModifierSchema),
    naturalEnemies: PestNaturalEnemiesConfigSchema,
    controlEfficacy: z.record(PestTreatmentEfficacySchema),
    diseaseInteraction: z.record(z.number()),
    caps: PestCapsSchema,
    integrationHints: PestIntegrationHintsSchema.optional(),
  })
  .passthrough();

const DiseaseModelSchema = z
  .object({
    dailyInfectionIncrement: z.number(),
    infectionThreshold: z.number(),
    degenerationRate: z.number(),
    recoveryRate: z.number(),
    regenerationRate: z.number().optional(),
    fatalityThreshold: z.number(),
  })
  .catchall(z.number());

const DiseaseDetectionSchema = z
  .object({
    symptoms: z.array(z.string()).optional(),
    scoutingHints: z.array(z.string()).optional(),
  })
  .catchall(z.array(z.string()).optional());

export const DiseaseDefinitionSchema: z.ZodType<DiseaseDefinition> = z
  .object({
    id: z.string(),
    kind: z.string(),
    name: z.string(),
    pathogenType: z.string(),
    targets: z.array(z.string()),
    environmentalRisk: z.record(z.union([NumericTupleSchema, z.number(), z.boolean(), z.string()])),
    transmission: z.array(z.string()),
    contagious: z.boolean(),
    model: DiseaseModelSchema,
    detection: DiseaseDetectionSchema,
    treatments: z.record(z.array(z.string())).optional(),
  })
  .passthrough();

const PestDamageModelSchema = z.record(z.union([z.number(), z.boolean()]));

const PestDetectionSchema = z
  .object({
    symptoms: z.array(z.string()).optional(),
    monitoring: z.array(z.string()).optional(),
  })
  .catchall(z.array(z.string()).optional());

export const PestDefinitionSchema: z.ZodType<PestDefinition> = z
  .object({
    id: z.string(),
    kind: z.string(),
    name: z.string(),
    category: z.string(),
    targets: z.array(z.string()),
    environmentalRisk: z.record(z.union([NumericTupleSchema, z.number(), z.boolean(), z.string()])),
    populationDynamics: z.record(z.number()),
    damageModel: PestDamageModelSchema,
    detection: PestDetectionSchema,
    controlOptions: z.record(z.array(z.string())).optional(),
  })
  .passthrough();
