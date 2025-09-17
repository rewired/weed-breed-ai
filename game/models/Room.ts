import { Zone } from './Zone';
import { RoomPurpose } from '../roomPurposes';
import { Company, StrainBlueprint, Structure } from '../types';
import { GrowthStage } from './Plant';

export class Room {
  id: string;
  name: string;
  area_m2: number;
  purpose: RoomPurpose;
  zones: Record<string, Zone>;

  constructor(data: any) {
    this.id = data.id;
    this.name = data.name;
    this.area_m2 = data.area_m2;
    this.purpose = data.purpose || 'growroom';
    this.zones = {};
    if (data.zones) {
      for (const zoneId in data.zones) {
        // FIX: Check if the data is already an instance to prevent re-hydration issues.
        if (data.zones[zoneId] instanceof Zone) {
            this.zones[zoneId] = data.zones[zoneId];
        } else {
            this.zones[zoneId] = new Zone(data.zones[zoneId]);
        }
      }
    }
  }
  
  getUsedArea(): number {
    return Object.values(this.zones).reduce((sum, zone) => sum + zone.area_m2, 0);
  }
  
  getAvailableArea(): number {
    return this.area_m2 - this.getUsedArea();
  }
  
  addZone(name: string, area: number, cultivationMethodId: string): boolean {
    if (area > this.getAvailableArea()) {
      alert("Not enough space in the room!");
      return false;
    }
    
    const newZoneId = `zone-${Date.now()}`;
    const newZone = new Zone({
      id: newZoneId,
      name: name,
      area_m2: area,
      cultivationMethodId: cultivationMethodId,
      plants: {},
      devices: {},
    });
    
    this.zones[newZoneId] = newZone;
    return true;
  }
  
  deleteZone(zoneId: string): void {
    delete this.zones[zoneId];
  }

  getRoomPlantSummary(allStrains: Record<string, StrainBlueprint>): { count: number, capacity: number, dominantStage: GrowthStage | null, progress: number } {
    let totalCount = 0;
    let totalCapacity = 0;
    const stageDistribution: Record<string, { count: number, totalProgress: number }> = {};

    for (const zoneId in this.zones) {
      const zone = this.zones[zoneId];
      totalCount += zone.getTotalPlantedCount();
      totalCapacity += zone.getPlantCapacity();

      for (const plantingId in zone.plantings) {
        const planting = zone.plantings[plantingId];
        const strain = allStrains[planting.strainId];
        if (strain) {
            const plantingDistribution = planting.getStageDistribution();
            for (const stage in plantingDistribution) {
                if (!stageDistribution[stage]) {
                    stageDistribution[stage] = { count: 0, totalProgress: 0 };
                }
                const plantsInStage = planting.plants.filter(p => p.growthStage === stage);
                const progressSum = plantsInStage.reduce((sum, p) => sum + p.getStageProgress(strain), 0);
                
                stageDistribution[stage].count += plantingDistribution[stage];
                stageDistribution[stage].totalProgress += progressSum;
            }
        }
      }
    }

    if (totalCount === 0) {
      return { count: 0, capacity: totalCapacity, dominantStage: null, progress: 0 };
    }

    let dominantStage: GrowthStage | null = null;
    let maxCount = -1;

    for (const stage in stageDistribution) {
      if (stageDistribution[stage].count > maxCount) {
        maxCount = stageDistribution[stage].count;
        dominantStage = stage as GrowthStage;
      }
    }

    if (!dominantStage || maxCount <= 0) {
      return { count: totalCount, capacity: totalCapacity, dominantStage: null, progress: 0 };
    }

    const avgProgress = stageDistribution[dominantStage].totalProgress / stageDistribution[dominantStage].count;

    return {
      count: totalCount,
      capacity: totalCapacity,
      dominantStage: dominantStage,
      progress: avgProgress,
    };
  }

  update(company: Company, structure: Structure, rng: () => number, ticks: number) {
    for (const zoneId in this.zones) {
      this.zones[zoneId].update(company, structure, rng, ticks);
    }
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      area_m2: this.area_m2,
      purpose: this.purpose,
      zones: Object.fromEntries(Object.entries(this.zones).map(([id, zone]) => [id, zone.toJSON()])),
    };
  }
}