import { StrainBlueprint } from '../types';

export enum GrowthStage {
  Seedling = 'seedling',
  Vegetative = 'vegetative',
  Flowering = 'flowering',
  Harvestable = 'harvestable',
  Dead = 'dead',
}

interface Environment {
    temperature_C: number;
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
    this.updateHealth();

    // 3. Update Biomass (Growth)
    this.grow(strain, rng, isLightOn);

    // 4. Update Growth Stage
    this.updateStage(strain);

    if (this.health <= 0) {
        this.growthStage = GrowthStage.Dead;
    }
  }

  private calculateStress(strain: StrainBlueprint, environment: Environment, hasWater: boolean, hasNutrients: boolean) {
      let currentStress = 0;
      const idealTempRange = this.growthStage === GrowthStage.Flowering
        ? strain.environmentalPreferences.idealTemperature.flowering
        : strain.environmentalPreferences.idealTemperature.vegetation;
      
      const tempDelta = Math.max(0, idealTempRange[0] - environment.temperature_C, environment.temperature_C - idealTempRange[1]);
      
      // Simple stress model: stress increases quadratically with temperature deviation
      if (tempDelta > 0) {
          currentStress += Math.pow(tempDelta / 5, 2) * 0.1; // /5 means 5 degrees off is significant
      }
      
      // Add stress for lack of supplies
      if (!hasWater) {
        currentStress += 0.3; // Significant stress from dehydration
      }
      if (!hasNutrients) {
        currentStress += 0.2; // Significant stress from nutrient deficiency
      }

      // Clamp stress between 0 and 1
      this.stress = Math.max(0, Math.min(1, currentStress));
  }

  private updateHealth() {
      const STRESS_IMPACT_FACTOR = 0.05;
      const RECOVERY_FACTOR = 0.02;

      if (this.stress > 0.1) {
          // Health decreases based on stress level
          this.health -= this.stress * STRESS_IMPACT_FACTOR;
      } else {
          // Health recovers if stress is low
          this.health += RECOVERY_FACTOR;
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

  private updateStage(strain: StrainBlueprint) {
      // 1 tick = 1 hour, so 24 ticks = 1 day.
      const ageInDays = this.ageInTicks / 24;
      
      const vegDays = strain.photoperiod.vegetationDays;
      const flowerDays = strain.photoperiod.floweringDays;
      const seedlingDays = 3; // First 3 days are seedling stage.
      
      if (ageInDays > vegDays + flowerDays) {
          this.growthStage = GrowthStage.Harvestable;
      } else if (ageInDays > vegDays) {
          this.growthStage = GrowthStage.Flowering;
      } else if (ageInDays > seedlingDays) { 
          this.growthStage = GrowthStage.Vegetative;
      } else {
          this.growthStage = GrowthStage.Seedling;
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