import { Zone } from './Zone';
import { RoomPurpose } from '../roomPurposes';
import { Company, StrainBlueprint, Structure, Device } from '../types';
import { GrowthStage } from './Plant';
import { RandomGenerator } from '../utils';

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

  duplicateZone(zoneId: string, company: Company, rng: RandomGenerator): Zone | null {
    const originalZone = this.zones[zoneId];
    if (!originalZone) {
      console.error(`Zone with id ${zoneId} not found in room ${this.id}`);
      alert("Error: Original zone not found.");
      return null;
    }

    if (originalZone.area_m2 > this.getAvailableArea()) {
      alert("Not enough space in the room to duplicate this zone.");
      return null;
    }

    const costDetails = originalZone.calculateDuplicationCost();
    if (!company.spendCapital(costDetails.total)) {
      // spendCapital already shows an alert
      return null;
    }
    
    // Log expenses
    company.logExpense('devices', costDetails.deviceCost);
    company.logExpense('supplies', costDetails.setupCost); // Assuming setup cost is a 'supply'

    // Create the copy
    const newZoneData = originalZone.toJSON(); // Get a clean data object
    newZoneData.id = `zone-${Date.now()}`;
    newZoneData.name = `${originalZone.name} (Copy)`;
    newZoneData.plantings = {}; // CRITICAL: Do not copy plants
    newZoneData.waterLevel_L = 0;
    newZoneData.nutrientLevel_g = 0;
    
    // Create new unique IDs for devices
    const newDevices: Record<string, Device> = {};
    for (const deviceId in newZoneData.devices) {
      const oldDevice = newZoneData.devices[deviceId];
      const newDeviceId = `device-${Date.now()}-${rng.float()}`;
      newDevices[newDeviceId] = {
        ...oldDevice,
        id: newDeviceId,
        durability: 1.0, // New devices are at full durability
      };
    }
    newZoneData.devices = newDevices;

    const newZone = new Zone(newZoneData);
    this.zones[newZone.id] = newZone;

    return newZone;
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

  getTotalExpectedYield(allStrains: Record<string, StrainBlueprint>): number {
    return Object.values(this.zones).reduce((total, zone) => {
        return total + zone.getTotalExpectedYield(allStrains);
    }, 0);
  }

  update(company: Company, structure: Structure, rng: RandomGenerator, ticks: number) {
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