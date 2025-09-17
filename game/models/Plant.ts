import { StrainBlueprint } from '../types';

export enum GrowthStage {
  Seedling = 'seedling',
  Vegetative = 'vegetation',
  Flowering = 'flowering',
  Harvestable = 'harvestable',
  Dead = 'dead',
}

interface Environment {
    temperature_C: number;
    averagePPFD: number;
}

export class Plant {
  id: string;
  strainId: string;
  ageInTicks: number = 0;
  stageStartTick: number = 0;
  growthStage: GrowthStage = GrowthStage.Seedling;
  biomass: number = 0.1; // Starting biomass in grams
  health: number = 1.0; // 0 to 1
  stress: number = 0.0; // 0 to 1

  constructor(strainId: string) {
    this.id = `plant-${Date.now()}-${Math.random()}`;
    this.strainId = strainId;
    this.stageStartTick = 0;
  }

  update(strain: StrainBlueprint, environment: Environment, rng: () => number, isLightOn: boolean, hasWater: boolean, hasNutrients: boolean, lightOnHours: number) {
    this.ageInTicks++;

    // 1. Calculate Environmental Stress
    this.calculateStress(strain, environment, hasWater, hasNutrients, lightOnHours);
    
    // 2. Update Health
    this.updateHealth(strain, isLightOn);

    // 3. Update Biomass (Growth)
    this.grow(strain, rng, isLightOn);

    // 4. Update Growth Stage
    this.updateStage(strain, rng);

    if (this.health <= 0) {
        this.growthStage = GrowthStage.Dead;
    }
  }

  private calculateStress(strain: StrainBlueprint, environment: Environment, hasWater: boolean, hasNutrients: boolean, lightOnHours: number) {
      let currentStress = 0;
      
      // Temperature Stress
      const idealTempRange = this.growthStage === GrowthStage.Flowering
        ? strain.environmentalPreferences.idealTemperature.flowering
        : strain.environmentalPreferences.idealTemperature.vegetation;
      
      const tempDelta = Math.max(0, idealTempRange[0] - environment.temperature_C, environment.temperature_C - idealTempRange[1]);
      
      if (tempDelta > 0) {
          currentStress += Math.pow(tempDelta / 5, 2) * 0.1;
      }
      
      // Light Cycle Stress
      if (this.growthStage === GrowthStage.Flowering || this.growthStage === GrowthStage.Harvestable) {
          const idealLightOnHours = strain.environmentalPreferences.lightCycle.flowering[0];
          if (lightOnHours > idealLightOnHours) {
              const excessHours = lightOnHours - idealLightOnHours;
              // Add significant stress for incorrect photoperiod during flowering.
              currentStress += (excessHours / 12) * 0.4;
          }
      } else if (this.growthStage === GrowthStage.Vegetative) {
          const idealLightOnHours = strain.environmentalPreferences.lightCycle.vegetation[0];
          if (lightOnHours < idealLightOnHours) {
              const deficitHours = idealLightOnHours - lightOnHours;
              // Add moderate stress for insufficient light hours during veg.
              currentStress += (deficitHours / 18) * 0.2;
          }
      }

      // Light Intensity Stress
      const idealLightRange = this.growthStage === GrowthStage.Flowering
        ? strain.environmentalPreferences.lightIntensity.flowering
        : strain.environmentalPreferences.lightIntensity.vegetation;

      if (environment.averagePPFD < idealLightRange[0]) {
          const lightDeficit = idealLightRange[0] - environment.averagePPFD;
          const deficitRatio = lightDeficit / idealLightRange[0];
          currentStress += Math.pow(deficitRatio, 2) * 0.3; 
      }
      
      // Supply Stress
      if (!hasWater) {
        currentStress += 0.3;
      }
      if (!hasNutrients) {
        currentStress += 0.2;
      }
      
      const resilienceFactor = strain.generalResilience || 0;
      currentStress *= (1 - (resilienceFactor * 0.5));

      this.stress = Math.max(0, Math.min(1, currentStress));
  }

  private updateHealth(strain: StrainBlueprint, isLightOn: boolean) {
      const STRESS_IMPACT_FACTOR = 0.05;
      const RECOVERY_FACTOR = 0.003;
      
      const resilienceFactor = strain.generalResilience || 0;
      const modifiedRecoveryFactor = RECOVERY_FACTOR * (1 + resilienceFactor * 0.5);

      if (this.stress > 0.1) {
          this.health -= this.stress * STRESS_IMPACT_FACTOR;
      } else if (isLightOn) {
          this.health += modifiedRecoveryFactor;
      }
      this.health = Math.max(0, Math.min(1, this.health));
  }

  private grow(strain: StrainBlueprint, rng: () => number, isLightOn: boolean) {
      if (this.health <= 0 || !isLightOn) return;
      
      const BASE_GROWTH_PER_TICK = 0.05;
      const growthRateModifier = strain.morphology.growthRate;
      
      let noiseModifier = 1.0;
      if (strain.noise?.enabled && strain.noise.pct > 0) {
          const noiseValue = (rng() * 2 - 1) * strain.noise.pct;
          noiseModifier += noiseValue;
      }

      const potentialGrowth = BASE_GROWTH_PER_TICK * growthRateModifier * this.health * (1 - this.stress * 0.5);
      
      this.biomass += potentialGrowth * noiseModifier;
  }

  private updateStage(strain: StrainBlueprint, rng: () => number) {
    if (this.ageInTicks % 24 !== 0) {
        return;
    }

    const seedlingDays = 3;
    const vegDays = strain.photoperiod.vegetationDays;
    const flowerDays = strain.photoperiod.floweringDays;
    const TRANSITION_PROBABILITY_PER_DAY = 0.25;

    let stageChanged = false;
    let newStage = this.growthStage;
    const daysInCurrentStage = (this.ageInTicks - this.stageStartTick) / 24;
    const ageInDays = this.ageInTicks / 24;

    switch (this.growthStage) {
        case GrowthStage.Seedling:
            if (ageInDays >= seedlingDays) {
                newStage = GrowthStage.Vegetative;
                stageChanged = true;
            }
            break;
        case GrowthStage.Vegetative:
            if (daysInCurrentStage >= vegDays) {
                if (rng() < TRANSITION_PROBABILITY_PER_DAY) {
                    newStage = GrowthStage.Flowering;
                    stageChanged = true;
                }
            }
            break;
        case GrowthStage.Flowering:
            if (daysInCurrentStage >= flowerDays) {
                if (rng() < TRANSITION_PROBABILITY_PER_DAY) {
                    newStage = GrowthStage.Harvestable;
                    stageChanged = true;
                }
            }
            break;
        case GrowthStage.Harvestable:
        case GrowthStage.Dead:
            break;
    }

    if (stageChanged) {
        this.growthStage = newStage;
        this.stageStartTick = this.ageInTicks;
    }
  }

  getStageProgress(strain: StrainBlueprint): number {
    const ticksInStage = this.ageInTicks - this.stageStartTick;
    const daysInStage = ticksInStage / 24;

    const seedlingDays = 3;
    const vegDays = strain.photoperiod.vegetationDays;
    const flowerDays = strain.photoperiod.floweringDays;

    switch (this.growthStage) {
      case GrowthStage.Seedling:
        const ageInDays = this.ageInTicks / 24;
        return Math.min(100, (ageInDays / seedlingDays) * 100);
      case GrowthStage.Vegetative:
        return Math.min(100, (daysInStage / vegDays) * 100);
      case GrowthStage.Flowering:
        return Math.min(100, (daysInStage / flowerDays) * 100);
      case GrowthStage.Harvestable:
        return 100;
      case GrowthStage.Dead:
        return 0;
      default:
        return 0;
    }
  }

  getExpectedYield(strain: StrainBlueprint): number {
    // Expected yield is the genetic potential modified by current health.
    // Health acts as a quality/efficiency multiplier on the plant's ability to reach its max potential.
    const maxBiomass = strain.growthModel.maxBiomassDry_g || 0;
    return maxBiomass * this.health;
  }
  
  toJSON() {
      return {
        id: this.id,
        strainId: this.strainId,
        ageInTicks: this.ageInTicks,
        stageStartTick: this.stageStartTick,
        growthStage: this.growthStage,
        biomass: this.biomass,
        health: this.health,
        stress: this.stress,
      };
  }
}