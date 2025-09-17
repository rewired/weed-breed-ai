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
  growthStage: GrowthStage = GrowthStage.Seedling;
  biomass: number = 0.1; // Starting biomass in grams
  health: number = 1.0; // 0 to 1
  stress: number = 0.0; // 0 to 1

  constructor(strainId: string) {
    this.id = `plant-${Date.now()}-${Math.random()}`;
    this.strainId = strainId;
  }

  update(strain: StrainBlueprint, environment: Environment, rng: () => number, isLightOn: boolean, hasWater: boolean, hasNutrients: boolean) {
    this.ageInTicks++;

    // 1. Calculate Environmental Stress
    this.calculateStress(strain, environment, hasWater, hasNutrients);
    
    // 2. Update Health
    this.updateHealth(strain);

    // 3. Update Biomass (Growth)
    this.grow(strain, rng, isLightOn);

    // 4. Update Growth Stage
    this.updateStage(strain, rng);

    if (this.health <= 0) {
        this.growthStage = GrowthStage.Dead;
    }
  }

  private calculateStress(strain: StrainBlueprint, environment: Environment, hasWater: boolean, hasNutrients: boolean) {
      let currentStress = 0;
      
      // Temperature Stress
      const idealTempRange = this.growthStage === GrowthStage.Flowering
        ? strain.environmentalPreferences.idealTemperature.flowering
        : strain.environmentalPreferences.idealTemperature.vegetation;
      
      const tempDelta = Math.max(0, idealTempRange[0] - environment.temperature_C, environment.temperature_C - idealTempRange[1]);
      
      if (tempDelta > 0) {
          currentStress += Math.pow(tempDelta / 5, 2) * 0.1;
      }

      // Light Stress
      const idealLightRange = this.growthStage === GrowthStage.Flowering
        ? strain.environmentalPreferences.lightIntensity.flowering
        : strain.environmentalPreferences.lightIntensity.vegetation;

      if (environment.averagePPFD < idealLightRange[0]) {
          const lightDeficit = idealLightRange[0] - environment.averagePPFD;
          // Add stress based on how far below the minimum it is.
          // e.g., if deficit is half the minimum, stress is 0.15
          currentStress += (lightDeficit / idealLightRange[0]) * 0.3; 
      }
      
      // Supply Stress
      if (!hasWater) {
        currentStress += 0.3; // Significant stress from dehydration
      }
      if (!hasNutrients) {
        currentStress += 0.2; // Significant stress from nutrient deficiency
      }
      
      // Resilience acts as a buffer against all environmental stress
      const resilienceFactor = strain.generalResilience || 0;
      currentStress *= (1 - (resilienceFactor * 0.5)); // e.g., 0.7 resilience reduces stress by 35%

      // Clamp stress between 0 and 1
      this.stress = Math.max(0, Math.min(1, currentStress));
  }

  private updateHealth(strain: StrainBlueprint) {
      const STRESS_IMPACT_FACTOR = 0.05;
      const RECOVERY_FACTOR = 0.02;
      
      const resilienceFactor = strain.generalResilience || 0;
      const modifiedRecoveryFactor = RECOVERY_FACTOR * (1 + resilienceFactor * 0.5); // e.g., 0.7 resilience recovers 35% faster

      if (this.stress > 0.1) {
          // Health decreases based on stress level
          this.health -= this.stress * STRESS_IMPACT_FACTOR;
      } else {
          // Health recovers if stress is low
          this.health += modifiedRecoveryFactor;
      }
      this.health = Math.max(0, Math.min(1, this.health));
  }

  private grow(strain: StrainBlueprint, rng: () => number, isLightOn: boolean) {
      if (this.health <= 0 || !isLightOn) return;
      
      const BASE_GROWTH_PER_TICK = 0.05; // Base biomass gain per tick under ideal conditions
      const growthRateModifier = strain.morphology.growthRate;
      
      let noiseModifier = 1.0;
      if (strain.noise?.enabled && strain.noise.pct > 0) {
          // rng() gives [0, 1), so (rng() * 2 - 1) gives [-1, 1)
          const noiseValue = (rng() * 2 - 1) * strain.noise.pct;
          noiseModifier += noiseValue;
      }

      // Growth is affected by health and negatively by stress
      const potentialGrowth = BASE_GROWTH_PER_TICK * growthRateModifier * this.health * (1 - this.stress * 0.5);
      
      this.biomass += potentialGrowth * noiseModifier;
  }

  private updateStage(strain: StrainBlueprint, rng: () => number) {
    // Only check for stage changes once per "day" (every 24 ticks)
    if (this.ageInTicks % 24 !== 0) {
        return;
    }

    const ageInDays = Math.floor(this.ageInTicks / 24);
    const vegDays = strain.photoperiod.vegetationDays;
    const flowerDays = strain.photoperiod.floweringDays;
    const seedlingDays = 3;

    // The chance to transition to the next stage each day after the minimum time has been met.
    const TRANSITION_PROBABILITY_PER_DAY = 0.25;

    switch (this.growthStage) {
        case GrowthStage.Seedling:
            // Seedling to Veg is a hard transition based on age.
            if (ageInDays >= seedlingDays) {
                this.growthStage = GrowthStage.Vegetative;
            }
            break;

        case GrowthStage.Vegetative:
            // Check if minimum veg time is met
            if (ageInDays >= vegDays) {
                // After minimum time, check probabilistically each day
                if (rng() < TRANSITION_PROBABILITY_PER_DAY) {
                    this.growthStage = GrowthStage.Flowering;
                }
            }
            break;

        case GrowthStage.Flowering:
            // Check if minimum total time is met for harvestability
            if (ageInDays >= vegDays + flowerDays) {
                if (rng() < TRANSITION_PROBABILITY_PER_DAY) {
                    this.growthStage = GrowthStage.Harvestable;
                }
            }
            break;

        case GrowthStage.Harvestable:
        case GrowthStage.Dead:
            // No further transitions from these states
            break;
    }
  }

  getStageProgress(strain: StrainBlueprint): number {
    const ageInDays = this.ageInTicks / 24;
    const seedlingDays = 3;
    const vegDays = strain.photoperiod.vegetationDays;
    const flowerDays = strain.photoperiod.floweringDays;

    switch (this.growthStage) {
      case GrowthStage.Seedling:
        return Math.min(100, (ageInDays / seedlingDays) * 100);
      case GrowthStage.Vegetative:
        const daysIntoVeg = ageInDays - seedlingDays;
        return Math.min(100, (daysIntoVeg / vegDays) * 100);
      case GrowthStage.Flowering:
        const daysIntoFlower = ageInDays - seedlingDays - vegDays;
        return Math.min(100, (daysIntoFlower / flowerDays) * 100);
      case GrowthStage.Harvestable:
        return 100;
      case GrowthStage.Dead:
        return 0;
      default:
        return 0;
    }
  }
  
  toJSON() {
      return {
        id: this.id,
        strainId: this.strainId,
        ageInTicks: this.ageInTicks,
        growthStage: this.growthStage,
        biomass: this.biomass,
        health: this.health,
        stress: this.stress,
      };
  }
}