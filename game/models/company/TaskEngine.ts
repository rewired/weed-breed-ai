import type { Employee, Task } from '../../types';
import { getAvailableStrains, getBlueprints } from '../../blueprints';
import { GrowthStage } from '../Plant';
import {
  XP_PER_LEVEL,
  TASK_XP_REWARD,
  ENERGY_COST_PER_TICK_WORKING,
  ENERGY_REGEN_PER_TICK_RESTING,
  IDLE_ENERGY_REGEN_PER_TICK,
  ENERGY_REST_THRESHOLD,
  OFF_DUTY_DURATION_TICKS,
} from '../../constants/balance';
import type { Company } from '../Company';

export class TaskEngine {
  constructor(private readonly company: Company) {}

  resolveTask(employee: Employee, task: Task, ticks: number, rng: () => number) {
    const structure = this.company.structures[task.location.structureId];
    if (!structure) return;
    const room = structure.rooms[task.location.roomId];
    if (!room) return;
    const zone = room.zones[task.location.zoneId];
    if (!zone) return;

    switch (task.type) {
      case 'repair_device':
      case 'maintain_device': {
        const device = zone.devices[task.location.itemId];
        if (device) {
          device.durability = 1.0;
          if (device.status === 'broken') device.status = 'on';
        }
        break;
      }
      case 'harvest_plants': {
        const plantsToHarvest = zone.getHarvestablePlants();
        if (plantsToHarvest.length > 0) {
          const negotiationSkill = structure.getMaxSkill(this.company, 'Negotiation', 'Salesperson');
          const negotiationBonus = (negotiationSkill / 10) * 0.1;
          this.company.harvestPlants(plantsToHarvest, negotiationBonus);
          zone.cleanupEmptyPlantings();
          if (zone.getTotalPlantedCount() === 0) {
            zone.cyclesUsed = (zone.cyclesUsed || 0) + 1;
            zone.status = 'Harvested';
            this.company.alerts.push({
              id: `alert-${zone.id}-harvested-${ticks}`,
              type: 'zone_harvested',
              message: `Zone '${zone.name}' is harvested and needs cleaning.`,
              location: task.location,
              tickGenerated: ticks,
            });
          }
        }
        break;
      }
      case 'refill_supplies_water':
        this.company.purchaseSuppliesForZone(zone, 'water', 1000);
        break;
      case 'refill_supplies_nutrients':
        this.company.purchaseSuppliesForZone(zone, 'nutrients', 1000);
        break;
      case 'clean_zone':
        zone.status = 'Ready';
        this.company.alerts.push({
          id: `alert-${zone.id}-ready-${ticks}`,
          type: 'zone_ready',
          message: `Zone '${zone.name}' is clean and ready for planting.`,
          location: task.location,
          tickGenerated: ticks,
        });
        break;
      case 'overhaul_zone_substrate': {
        const method = getBlueprints().cultivationMethods[zone.cultivationMethodId];
        if (method) {
          const cost = (method.setupCost || 0) * zone.area_m2;
          if (this.company.spendCapital(cost)) {
            this.company.logExpense('supplies', cost);
            zone.cyclesUsed = 0;
            zone.status = 'Ready';
            this.company.alerts.push({
              id: `alert-${zone.id}-ready-${ticks}`,
              type: 'zone_ready',
              message: `Zone '${zone.name}' is overhauled and ready.`,
              location: task.location,
              tickGenerated: ticks,
            });
          }
        }
        break;
      }
      case 'reset_light_cycle': {
        const strainId = zone.plantingPlan?.strainId;
        const strain = strainId ? getAvailableStrains(this.company)[strainId] : null;
        if (strain) {
          const [on, off] = strain.environmentalPreferences.lightCycle.vegetation;
          zone.lightCycle = { on, off };
        } else {
          zone.lightCycle = { on: 18, off: 6 };
        }
        break;
      }
      case 'execute_planting_plan':
        if (zone.plantingPlan) {
          const { strainId, quantity } = zone.plantingPlan;
          if (this.company.purchaseSeeds(strainId, quantity)) {
            zone.plantStrain(strainId, quantity, this.company, rng);
            zone.status = 'Growing';
          }
        }
        break;
      case 'adjust_light_cycle': {
        const plantingToFlip = Object.values(zone.plantings).find(p => {
          const strain = getAvailableStrains(this.company)[p.strainId];
          if (!strain) return false;
          const vegDays = strain.photoperiod.vegetationDays;
          return p.plants.some(plant =>
            plant.growthStage === GrowthStage.Vegetative &&
            (plant.ageInTicks - plant.stageStartTick) / 24 >= vegDays - 2,
          );
        });
        if (plantingToFlip) {
          const strain = getAvailableStrains(this.company)[plantingToFlip.strainId];
          if (strain) {
            const [on, off] = strain.environmentalPreferences.lightCycle.flowering;
            zone.lightCycle = { on, off };
          }
        }
        break;
      }
    }

    const skill = employee.skills[task.requiredSkill];
    if (skill && skill.level < 10) {
      skill.xp += TASK_XP_REWARD;
      if (skill.xp >= XP_PER_LEVEL) {
        skill.level = Math.min(10, skill.level + 1);
        skill.xp = 0;
      }
    }
  }

  updateEmployeesAI(ticks: number, rng: () => number) {
    const tasksInProgress = new Set<string>();
    Object.values(this.company.employees).forEach(emp => {
      if (emp.status === 'Working' && emp.currentTask) {
        tasksInProgress.add(emp.currentTask.id);
      }
    });

    for (const employee of Object.values(this.company.employees)) {
      if (!employee.structureId) continue;
      const structure = this.company.structures[employee.structureId];
      if (!structure) continue;

      switch (employee.status) {
        case 'OffDuty':
          if (ticks >= (employee.offDutyUntilTick || 0)) {
            employee.status = 'Idle';
            employee.energy = 100;
            employee.offDutyUntilTick = undefined;
            employee.morale = Math.min(100, employee.morale + 2);
          }
          break;

        case 'Working': {
          const task = employee.currentTask;
          if (!task) {
            employee.status = 'Idle';
            break;
          }

          employee.energy -= ENERGY_COST_PER_TICK_WORKING;
          task.progressTicks = (task.progressTicks || 0) + 1;

          if (task.progressTicks >= task.durationTicks) {
            this.resolveTask(employee, task, ticks, rng);
            employee.currentTask = null;

            if (employee.energy < 0) {
              const overtimeHours = -employee.energy / ENERGY_COST_PER_TICK_WORKING;
              if (this.company.overtimePolicy === 'timeOff') {
                employee.leaveHours = (employee.leaveHours || 0) + overtimeHours;
              } else {
                const hourlyRate = employee.salaryPerDay / 8;
                const overtimePay = overtimeHours * hourlyRate * 1.5;
                if (this.company.capital >= overtimePay) {
                  this.company.capital -= overtimePay;
                  this.company.logExpense('salaries', overtimePay);
                }
              }
            }

            if (employee.energy < ENERGY_REST_THRESHOLD) {
              employee.energy = 0;
              employee.status = 'OffDuty';
              employee.offDutyUntilTick = ticks + OFF_DUTY_DURATION_TICKS;
            } else {
              employee.status = 'Idle';
            }
          }
          break;
        }

        case 'Resting':
          employee.energy += ENERGY_REGEN_PER_TICK_RESTING;
          if (employee.energy >= 100) {
            employee.energy = 100;
            employee.status = 'Idle';
          }
          break;

        case 'Idle':
          if (employee.offDutyUntilTick && ticks < employee.offDutyUntilTick) {
            employee.status = 'OffDuty';
            break;
          }

          if (employee.energy < ENERGY_REST_THRESHOLD) {
            if (structure.getRestingEmployeeCount(this.company) < structure.getBreakroomCapacity()) {
              employee.status = 'Resting';
              break;
            }
          }

          const tasks = [...structure.tasks].sort((a, b) => b.priority - a.priority);
          const suitableTask = tasks.find(task =>
            !tasksInProgress.has(task.id) &&
            task.requiredRole === employee.role &&
            employee.skills[task.requiredSkill].level >= task.minSkillLevel,
          );

          if (suitableTask) {
            employee.status = 'Working';
            employee.currentTask = suitableTask;
            tasksInProgress.add(suitableTask.id);
          } else {
            employee.energy = Math.min(100, employee.energy + IDLE_ENERGY_REGEN_PER_TICK);
          }
          break;
      }
    }
  }
}
