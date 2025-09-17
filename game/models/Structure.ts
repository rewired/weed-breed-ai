import { Room } from './Room';
import { RoomPurpose } from '../roomPurposes';
import { StructureBlueprint, Company, StrainBlueprint } from '../types';
import { GrowthStage } from './Plant';

const TICKS_PER_MONTH = 30;

export class Structure {
  id: string;
  blueprintId: string;
  name: string;
  area_m2: number;
  height_m: number;
  rooms: Record<string, Room>;

  constructor(data: any) {
    this.id = data.id;
    this.blueprintId = data.blueprintId;
    this.name = data.name;
    this.area_m2 = data.area_m2;
    this.height_m = data.height_m;
    this.rooms = {};
    if (data.rooms) {
      for (const roomId in data.rooms) {
        // FIX: Check if the data is already an instance to prevent re-hydration issues.
        if (data.rooms[roomId] instanceof Room) {
            this.rooms[roomId] = data.rooms[roomId];
        } else {
            this.rooms[roomId] = new Room(data.rooms[roomId]);
        }
      }
    }
  }
  
  getUsedArea(): number {
    return Object.values(this.rooms).reduce((sum, room) => sum + room.area_m2, 0);
  }
  
  getAvailableArea(): number {
    return this.area_m2 - this.getUsedArea();
  }

  addRoom(name: string, area: number, purpose: RoomPurpose): boolean {
    if (area > this.getAvailableArea()) {
      alert("Not enough space in the structure!");
      return false;
    }
    
    const newRoomId = `room-${Date.now()}`;
    const newRoom = new Room({
      id: newRoomId,
      name: name,
      area_m2: area,
      purpose: purpose,
      zones: {},
    });
    
    this.rooms[newRoomId] = newRoom;
    return true;
  }

  deleteRoom(roomId: string): void {
    delete this.rooms[roomId];
  }

  getRentalCostPerTick(blueprint: StructureBlueprint): number {
    const monthlyCost = this.area_m2 * blueprint.rentalCostPerSqmPerMonth;
    return monthlyCost / TICKS_PER_MONTH;
  }

  getStructurePlantSummary(allStrains: Record<string, StrainBlueprint>): { count: number, capacity: number, dominantStage: GrowthStage | null, progress: number } {
    let totalCount = 0;
    let totalCapacity = 0;
    const stageDistribution: Record<string, { count: number, totalProgress: number }> = {};

    for (const roomId in this.rooms) {
      const room = this.rooms[roomId];
      for (const zoneId in room.zones) {
        const zone = room.zones[zoneId];
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

  update(company: Company, rng: () => number, ticks: number) {
    for (const roomId in this.rooms) {
      this.rooms[roomId].update(company, this, rng, ticks);
    }
  }
  
  toJSON() {
    return {
      id: this.id,
      blueprintId: this.blueprintId,
      name: this.name,
      area_m2: this.area_m2,
      height_m: this.height_m,
      rooms: Object.fromEntries(Object.entries(this.rooms).map(([id, room]) => [id, room.toJSON()])),
    };
  }
}