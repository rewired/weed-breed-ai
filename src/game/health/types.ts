export type PlantLifecycleStage =
  | 'seedling'
  | 'vegetation'
  | 'earlyFlower'
  | 'lateFlower'
  | 'ripening'
  | (string & {});

export type TreatmentTarget = 'disease' | 'pest' | (string & {});

export type TreatmentCategory =
  | 'cultural'
  | 'biological'
  | 'mechanical'
  | 'chemical'
  | 'physical'
  | (string & {});

export type TreatmentCostBasis = 'perZone' | 'perPlant' | 'perSquareMeter' | (string & {});

export interface DiseaseTreatmentEfficacy {
  infectionMultiplier?: number;
  degenerationMultiplier?: number;
  recoveryMultiplier?: number;
}

export interface PestTreatmentEfficacy {
  reproductionMultiplier?: number;
  mortalityMultiplier?: number;
  damageMultiplier?: number;
}

export interface TreatmentCosts {
  laborMinutes?: number;
  materialsCost?: number;
  energyPerHourKWh?: number;
  equipmentRentalEUR?: number;
  [key: string]: number | undefined;
}

export interface TreatmentRisks {
  [key: string]: string | boolean | number | undefined;
}

export interface TreatmentOption {
  id: string;
  name: string;
  category: TreatmentCategory;
  targets: TreatmentTarget[];
  applicability: PlantLifecycleStage[];
  efficacy: {
    disease?: DiseaseTreatmentEfficacy;
    pest?: PestTreatmentEfficacy;
    [key: string]: DiseaseTreatmentEfficacy | PestTreatmentEfficacy | undefined;
  };
  costs: TreatmentCosts;
  cooldownDays: number;
  notes?: string;
  costBasis: TreatmentCostBasis;
  risks?: TreatmentRisks;
}

export interface TreatmentStackingRules {
  maxConcurrentTreatmentsPerZone: number;
  mechanicalAlwaysStacks: boolean;
  chemicalAndBiologicalCantShareSameMoAWithin7Days: boolean;
  cooldownDaysDefault: number;
  [key: string]: number | boolean;
}

export interface TreatmentSideEffects {
  phytotoxicityRiskKeys: string[];
  beneficialsHarmRiskKeys: string[];
  [key: string]: string[] | undefined;
}

export interface TreatmentCostBasisDescriptions {
  perZone?: string;
  perPlant?: string;
  perSquareMeter?: string;
  [key: string]: string | undefined;
}

export interface TreatmentCostModelInfo {
  costBasis: TreatmentCostBasisDescriptions;
  totalCostFormula: string;
}

export interface TreatmentGlobalConfig {
  stackingRules: TreatmentStackingRules;
  sideEffects: TreatmentSideEffects;
  costModel: TreatmentCostModelInfo;
}

export interface TreatmentCatalog {
  kind: string;
  version: string;
  notes?: string;
  global: TreatmentGlobalConfig;
  options: TreatmentOption[];
}

export interface RangeDescriptor {
  min: number;
  max: number;
}

export type NumericTuple = [number, number];

export interface DiseaseBalancingGlobalConfig {
  baseDailyInfectionMultiplier: number;
  baseRecoveryMultiplier: number;
  maxConcurrentDiseases: number;
  symptomDelayDays: RangeDescriptor;
  eventWeights: Record<string, number>;
  [key: string]: number | RangeDescriptor | Record<string, number>;
}

export interface DiseasePhaseMultipliers {
  infection?: number;
  degeneration?: number;
  recovery?: number;
  [key: string]: number | undefined;
}

export type DiseasePhaseMultiplierMap = Record<string, DiseasePhaseMultipliers>;

export type DiseaseEnvironmentModifier = Record<string, number | NumericTuple | undefined>;

export type DiseaseEnvironmentModifiers = Record<string, DiseaseEnvironmentModifier | undefined>;

export interface DiseaseStrainResistanceWeights {
  generalResilienceWeight?: number;
  specificResistanceWeight?: number;
  [key: string]: number | undefined;
}

export type DiseaseTreatmentClassEfficacy = DiseaseTreatmentEfficacy;

export type DiseaseTreatmentEfficacyMap = Record<string, DiseaseTreatmentClassEfficacy>;

export interface DiseaseCaps {
  minDailyDegeneration: number;
  maxDailyDegeneration: number;
  minDailyRecovery: number;
  maxDailyRecovery: number;
  [key: string]: number;
}

export interface DiseaseIntegrationHints {
  applyOrder?: string[];
  mapToDiseaseModel?: Record<string, string>;
  [key: string]: unknown;
}

export interface DiseaseBalancingConfig {
  kind: string;
  version: string;
  notes?: string;
  global: DiseaseBalancingGlobalConfig;
  phaseMultipliers: DiseasePhaseMultiplierMap;
  environmentModifiers: DiseaseEnvironmentModifiers;
  strainResistanceWeights: DiseaseStrainResistanceWeights;
  treatmentEfficacy: DiseaseTreatmentEfficacyMap;
  caps: DiseaseCaps;
  integrationHints?: DiseaseIntegrationHints;
}

export interface PestEconomicThresholds {
  photosynthesisReductionAlert: number;
  rootUptakeReductionAlert: number;
  budLossAlert: number;
  [key: string]: number;
}

export interface PestBalancingGlobalConfig {
  baseDailyReproductionMultiplier: number;
  baseDailyMortalityMultiplier: number;
  baseDamageMultiplier: number;
  maxConcurrentPests: number;
  economicThresholds: PestEconomicThresholds;
  eventWeights: Record<string, number>;
  [key: string]: number | PestEconomicThresholds | Record<string, number>;
}

export interface PestPhaseMultipliers {
  reproduction?: number;
  damage?: number;
  mortality?: number;
  [key: string]: number | undefined;
}

export type PestPhaseMultiplierMap = Record<string, PestPhaseMultipliers>;

export type PestEnvironmentModifier = Record<string, number | NumericTuple | undefined>;

export type PestEnvironmentModifiers = Record<string, PestEnvironmentModifier | undefined>;

export interface PestNaturalEnemiesConfig {
  backgroundPredationPerDay: number;
  enhancedPredationWithBiocontrol: number;
  [key: string]: number;
}

export type PestControlEfficacyMap = Record<string, PestTreatmentEfficacy>;

export type PestDiseaseInteraction = Record<string, number>;

export interface PestCaps {
  minDailyReproduction: number;
  maxDailyReproduction: number;
  minDailyMortality: number;
  maxDailyMortality: number;
  minDailyDamage: number;
  maxDailyDamage: number;
  [key: string]: number;
}

export interface PestIntegrationHints {
  applyOrder?: string[];
  mapToPestModel?: Record<string, string>;
  [key: string]: unknown;
}

export interface PestBalancingConfig {
  kind: string;
  version: string;
  notes?: string;
  global: PestBalancingGlobalConfig;
  phaseMultipliers: PestPhaseMultiplierMap;
  environmentModifiers: PestEnvironmentModifiers;
  naturalEnemies: PestNaturalEnemiesConfig;
  controlEfficacy: PestControlEfficacyMap;
  diseaseInteraction: PestDiseaseInteraction;
  caps: PestCaps;
  integrationHints?: PestIntegrationHints;
}

export interface HealthDefinitionSummary {
  diseases: DiseaseBalancingConfig;
  pests: PestBalancingConfig;
}

export interface HealthDefinitionData {
  diseaseBalancing: DiseaseBalancingConfig;
  pestBalancing: PestBalancingConfig;
  treatmentCatalog: TreatmentCatalog;
}
