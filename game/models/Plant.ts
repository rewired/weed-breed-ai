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

  update(strain: StrainBlueprint, environment: Environment) {
    this.ageInTicks++;

    // 1. Calculate Environmental Stress
    this.calculateStress(strain, environment);
    
    // 2. Update Health
    this.updateHealth();

    // 3. Update Biomass (Growth)
    this.grow(strain);

    // 4. Update Growth Stage
    this.updateStage(strain);

    if (this.health <= 0) {
        this.growthStage = GrowthStage.Dead;
    }
  }

  private calculateStress(strain: StrainBlueprint, environment: Environment) {
      let currentStress = 0;
      const idealTempRange = this.growthStage === GrowthStage.Flowering
        ? strain.environmentalPreferences.idealTemperature.flowering
        : strain.environmentalPreferences.idealTemperature.vegetation;
      
      const tempDelta = Math.max(0, idealTempRange[0] - environment.temperature_C, environment.temperature_C - idealTempRange[1]);
      
      // Simple stress model: stress increases quadratically with temperature deviation
      if (tempDelta > 0) {
          currentStress += Math.pow(tempDelta / 5, 2) * 0.1; // /5 means 5 degrees off is significant
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

  private grow(strain: StrainBlueprint) {
      if (this.health <= 0) return;
      
      const BASE_GROWTH_PER_TICK = 0.05; // Base biomass gain per tick under ideal conditions
      const growthRateModifier = strain.morphology.growthRate;
      
      // Growth is affected by health and negatively by stress
      const potentialGrowth = BASE_GROWTH_PER_TICK * growthRateModifier * this.health * (1 - this.stress * 0.5);
      
      this.biomass += potentialGrowth;
  }

  private updateStage(strain: StrainBlueprint) {
      // Assuming 1 tick = 1 day for simplicity
      const ageInDays = this.ageInTicks;
      
      const vegDays = strain.photoperiod.vegetationDays;
      const flowerDays = strain.photoperiod.floweringDays;
      
      if (ageInDays > vegDays + flowerDays) {
          this.growthStage = GrowthStage.Harvestable;
      } else if (ageInDays > vegDays) {
          this.growthStage = GrowthStage.Flowering;
      } else if (ageInDays > 3) { // Seedling for 3 days
          this.growthStage = GrowthStage.Vegetative;
      } else {
          this.growthStage = GrowthStage.Seedling;
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
