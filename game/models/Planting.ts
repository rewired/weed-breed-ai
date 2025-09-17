import { Plant, GrowthStage } from './Plant';
import { StrainBlueprint } from '../types';

interface Environment {
    temperature_C: number;
    averagePPFD: number;
}

export class Planting {
    id: string;
    strainId: string;
    quantity: number;
    plants: Plant[];

    constructor(data: any) {
        this.id = data.id;
        this.strainId = data.strainId;
        this.quantity = data.quantity;
        
        // If loading from save, data.plants will be an array of plain objects
        if (data.plants && data.plants.length > 0 && !(data.plants[0] instanceof Plant)) {
            this.plants = data.plants.map((plantData: any) => {
                const plant = new Plant(plantData.strainId);
                Object.assign(plant, plantData); // Re-hydrate instance
                return plant;
            });
        } 
        // If creating a new planting from scratch
        else if (!data.plants) {
            this.plants = [];
            for (let i = 0; i < this.quantity; i++) {
                this.plants.push(new Plant(this.strainId));
            }
        } 
        // If it's already an array of Plant instances (e.g., from a previous session in memory)
        else {
             this.plants = data.plants;
        }
    }

    update(strain: StrainBlueprint, environment: Environment, rng: () => number, isLightOn: boolean, hasWater: boolean, hasNutrients: boolean) {
        this.plants.forEach(plant => {
            if (plant.growthStage !== GrowthStage.Dead) {
                plant.update(strain, environment, rng, isLightOn, hasWater, hasNutrients);
            }
        });
    }

    removePlant(plantId: string) {
        this.plants = this.plants.filter(p => p.id !== plantId);
        this.quantity = this.plants.length;
    }

    getAverageHealth(): number {
        if (this.plants.length === 0) return 0;
        const totalHealth = this.plants.reduce((sum, plant) => sum + plant.health, 0);
        return totalHealth / this.plants.length;
    }

    getGrowthStage(): GrowthStage {
        if (this.plants.length === 0) return GrowthStage.Seedling;
        
        const distribution = this.getStageDistribution();
        
        let dominantStage: GrowthStage | null = null;
        let maxCount = 0;

        // Find the stage with the most plants
        for (const stage in distribution) {
            if (distribution[stage] > maxCount) {
                maxCount = distribution[stage];
                dominantStage = stage as GrowthStage;
            }
        }
        // Fallback to first plant only if something goes wrong, which it shouldn't.
        return dominantStage || this.plants[0].growthStage;
    }

    getStageDistribution(): Record<string, number> {
        const distribution: Record<string, number> = {};
        for (const plant of this.plants) {
            const stage = plant.growthStage;
            if (!distribution[stage]) {
                distribution[stage] = 0;
            }
            distribution[stage]++;
        }
        return distribution;
    }

    getDominantStageInfo(strain: StrainBlueprint): { stage: GrowthStage, progress: number } | null {
        if (this.plants.length === 0) return null;

        const distribution = this.getStageDistribution();
        
        let dominantStage: GrowthStage | null = null;
        let maxCount = 0;

        for (const stage in distribution) {
            if (distribution[stage] > maxCount) {
                maxCount = distribution[stage];
                dominantStage = stage as GrowthStage;
            }
        }

        if (!dominantStage) return null;

        const plantsInDominantStage = this.plants.filter(p => p.growthStage === dominantStage);
        const totalProgress = plantsInDominantStage.reduce((sum, plant) => sum + plant.getStageProgress(strain), 0);
        const averageProgress = totalProgress / plantsInDominantStage.length;

        return {
            stage: dominantStage,
            progress: averageProgress,
        };
    }
    
    public getTotalNutrientDemandPerTick(strain: StrainBlueprint): number {
        if (this.plants.length === 0) return 0;

        let totalTickDemand = 0;
        
        // Calculate demand for each plant individually based on its own stage
        for (const plant of this.plants) {
            let stage = plant.growthStage;
            
            if (stage === GrowthStage.Dead) {
                continue; // Dead plants consume nothing
            }
            if (stage === GrowthStage.Harvestable) {
                stage = GrowthStage.Flowering; // Harvestable plants consume at flowering rate
            }
            
            const dailyDemandPerPlant = strain.nutrientDemand.dailyNutrientDemand[stage];

            if (dailyDemandPerPlant) {
                const totalDailyDemand =
                    (dailyDemandPerPlant.nitrogen || 0) +
                    (dailyDemandPerPlant.phosphorus || 0) +
                    (dailyDemandPerPlant.potassium || 0);
                
                totalTickDemand += totalDailyDemand / 24;
            }
        }

        return totalTickDemand;
    }

    toJSON() {
        return {
            id: this.id,
            strainId: this.strainId,
            quantity: this.quantity,
            plants: this.plants.map(p => p.toJSON()),
        };
    }
}