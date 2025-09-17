import { Room } from './Room';
import { Zone } from './Zone';
import { RoomPurpose } from '../roomPurposes';
import { StructureBlueprint, Company, StrainBlueprint, Device, Employee, SkillName, JobRole, Task, TaskType } from '../types';
import { GrowthStage } from './Plant';
import { getBlueprints } from '../blueprints';

const TICKS_PER_MONTH = 30;

export class Structure {
  id: string;
  blueprintId: string;
  name: string;
  area_m2: number;
  height_m: number;
  rooms: Record<string, Room>;
  employeeIds: string[];
  tasks: Task[];

  constructor(data: any) {
    this.id = data.id;
    this.blueprintId = data.blueprintId;
    this.name = data.name;
    this.area_m2 = data.area_m2;
    this.height_m = data.height_m;
    this.employeeIds = data.employeeIds || [];
    this.tasks = data.tasks || [];
    this.rooms = {};
    if (data.rooms) {
      for (const roomId in data.rooms) {
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
  
  duplicateRoom(roomId: string, company: Company): Room | null {
    const originalRoom = this.rooms[roomId];
    if (!originalRoom) {
      console.error(`Room with id ${roomId} not found in structure ${this.id}`);
      alert("Error: Original room not found.");
      return null;
    }

    if (originalRoom.area_m2 > this.getAvailableArea()) {
      alert("Not enough space in the structure to duplicate this room.");
      return null;
    }
    
    let totalDeviceCost = 0;
    let totalSetupCost = 0;
    for (const zoneId in originalRoom.zones) {
      const zone = originalRoom.zones[zoneId];
      const costDetails = zone.calculateDuplicationCost();
      totalDeviceCost += costDetails.deviceCost;
      totalSetupCost += costDetails.setupCost;
    }
    const totalCost = totalDeviceCost + totalSetupCost;
    
    if (!company.spendCapital(totalCost)) {
      return null;
    }
    
    company.logExpense('devices', totalDeviceCost);
    company.logExpense('supplies', totalSetupCost);

    const newRoomData = originalRoom.toJSON();
    newRoomData.id = `room-${Date.now()}`;
    newRoomData.name = `${originalRoom.name} (Copy)`;
    newRoomData.zones = {}; 
    const newRoom = new Room(newRoomData);

    for (const zoneId in originalRoom.zones) {
      const originalZone = originalRoom.zones[zoneId];
      const newZoneData = originalZone.toJSON();
      newZoneData.id = `zone-${Date.now()}-${Math.random()}`;
      newZoneData.plantings = {};
      newZoneData.waterLevel_L = 0;
      newZoneData.nutrientLevel_g = 0;

      const newDevices: Record<string, any> = {};
      for (const deviceId in newZoneData.devices) {
        const oldDevice = newZoneData.devices[deviceId];
        const newDeviceId = `device-${Date.now()}-${Math.random()}`;
        newDevices[newDeviceId] = {
          ...oldDevice,
          id: newDeviceId,
          durability: 1.0,
        };
      }
      newZoneData.devices = newDevices;
      
      newRoom.zones[newZoneData.id] = new Zone(newZoneData);
    }

    this.rooms[newRoom.id] = newRoom;
    return newRoom;
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

  getTotalExpectedYield(allStrains: Record<string, StrainBlueprint>): number {
    return Object.values(this.rooms).reduce((total, room) => {
        return total + room.getTotalExpectedYield(allStrains);
    }, 0);
  }

  getEmployees(company: Company, role?: JobRole): Employee[] {
    let employees = this.employeeIds.map(id => company.employees[id]).filter(Boolean);
    if (role) {
        employees = employees.filter(emp => emp.role === role);
    }
    return employees;
  }
  
  getAverageSkill(company: Company, skillName: SkillName, role?: JobRole): number {
      const employees = this.getEmployees(company, role);
      if (employees.length === 0) {
          return 1;
      }
      const totalSkill = employees.reduce((sum, emp) => sum + emp.skills[skillName].level, 0);
      return totalSkill / employees.length;
  }
  
  getMaxSkill(company: Company, skillName: SkillName, role?: JobRole): number {
      const employees = this.getEmployees(company, role);
      if (employees.length === 0) {
          return 0;
      }
      return Math.max(...employees.map(emp => emp.skills[skillName].level));
  }
  
  generateTasks(company: Company) {
      const newTasks: Task[] = [];
      const existingTaskKeys = new Set(this.tasks.map(t => `${t.type}-${t.location.itemId}`));

      const createTask = (type: TaskType, priority: number, requiredRole: JobRole, requiredSkill: SkillName, minSkillLevel: number, location: { roomId: string; zoneId: string; itemId: string; }, description: string) => {
          const key = `${type}-${location.itemId}`;
          if (existingTaskKeys.has(key)) return;

          newTasks.push({
              id: `task-${key}-${Date.now()}`,
              type,
              priority,
              requiredRole,
              requiredSkill,
              minSkillLevel,
              location: { structureId: this.id, ...location },
              description
          });
      };

      for(const room of Object.values(this.rooms)) {
          for(const zone of Object.values(room.zones)) {
              const location = { roomId: room.id, zoneId: zone.id, itemId: '' };

              // Device tasks
              for(const device of Object.values(zone.devices)) {
                  const deviceLocation = { ...location, itemId: device.id };
                  if (device.status === 'broken') {
                      createTask('repair_device', 10, 'Technician', 'Maintenance', 0, deviceLocation, `Repair ${device.name} in ${zone.name}`);
                  } else if (device.durability < 0.8) {
                      createTask('maintain_device', 3, 'Technician', 'Maintenance', 4, deviceLocation, `Maintain ${device.name} in ${zone.name}`);
                  }
              }

              // Harvest task
              if (zone.getHarvestablePlants().length > 0) {
                  createTask('harvest_plants', 9, 'Gardener', 'Gardening', 0, {...location, itemId: zone.id}, `Harvest plants in ${zone.name}`);
              }
              
              // Supply tasks
              const consumption = zone.getSupplyConsumptionRates(company);
              const waterDaysLeft = consumption.waterPerDay > 0 ? (zone.waterLevel_L / consumption.waterPerDay) : Infinity;
              const nutrientDaysLeft = consumption.nutrientsPerDay > 0 ? (zone.nutrientLevel_g / consumption.nutrientsPerDay) : Infinity;
              if (waterDaysLeft < 1.0) {
                  createTask('refill_supplies_water', 8, 'Gardener', 'Gardening', 0, {...location, itemId: zone.id + '-water'}, `Refill water in ${zone.name}`);
              }
              if (nutrientDaysLeft < 1.0) {
                  createTask('refill_supplies_nutrients', 8, 'Gardener', 'Gardening', 0, {...location, itemId: zone.id + '-nutrients'}, `Refill nutrients in ${zone.name}`);
              }
              
              // Overhaul task
              const method = getBlueprints().cultivationMethods[zone.cultivationMethodId];
              if (method && (zone.cyclesUsed || 0) >= method.maxCycles && zone.getTotalPlantedCount() === 0) {
                   createTask('overhaul_zone', 7, 'Janitor', 'Cleanliness', 0, {...location, itemId: zone.id}, `Overhaul substrate in ${zone.name}`);
              }
          }
      }
      this.tasks = newTasks;
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
      employeeIds: this.employeeIds,
      tasks: this.tasks,
    };
  }
}