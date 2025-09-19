
import { Structure, StructureBlueprint, StrainBlueprint, Zone, Company as ICompany, FinancialLedger, ExpenseCategory, Plant, Planting, RevenueCategory, Alert, AlertType, Employee, SkillName, Skill, Trait, JobRole, Task, TaskType, TaskLocation, PlantingPlan, OvertimePolicy } from '../types';
import { getAvailableStrains, getBlueprints } from '../blueprints';
import { mulberry32 } from '../utils';
import { GrowthStage } from './Plant';

const ALL_SKILLS: SkillName[] = ['Gardening', 'Maintenance', 'Technical', 'Botanical', 'Cleanliness', 'Negotiation'];
const SKILL_TO_ROLE_MAP: Record<SkillName, JobRole> = {
    Gardening: 'Gardener',
    Maintenance: 'Technician',
    Technical: 'Technician',
    Cleanliness: 'Janitor',
    Botanical: 'Botanist',
    Negotiation: 'Salesperson',
};
const XP_PER_LEVEL = 100;
const TASK_XP_REWARD = 10;
const ENERGY_COST_PER_TICK_WORKING = 10.0;
const ENERGY_REGEN_PER_TICK_RESTING = 10; // Resting in breakroom
const IDLE_ENERGY_REGEN_PER_TICK = 2.5;
const ENERGY_REST_THRESHOLD = 20;
const OFF_DUTY_DURATION_TICKS = 16;


export class Company {
  id: string;
  name: string;
  capital: number;
  structures: Record<string, Structure>;
  customStrains: Record<string, StrainBlueprint>;
  employees: Record<string, Employee>;
  jobMarketCandidates: Employee[];
  ledger: FinancialLedger;
  cumulativeYield_g: number;
  alerts: Alert[];
  alertCooldowns: Record<string, number>; // Key: `${zoneId}-${type}`, Value: Expiry tick
  overtimePolicy: OvertimePolicy;
  actionRngNonce: number;

  constructor(data: any) {
    this.id = data.id;
    this.name = data.name;
    this.capital = data.capital;
    this.structures = {};
    if (data.structures) {
      for (const structId in data.structures) {
        if (data.structures[structId] instanceof Structure) {
            this.structures[structId] = data.structures[structId];
        } else {
            this.structures[structId] = new Structure(data.structures[structId]);
        }
      }
    }
    this.customStrains = data.customStrains || {};
    this.employees = data.employees || {};
    this.jobMarketCandidates = data.jobMarketCandidates || [];
    this.ledger = data.ledger || { revenue: { harvests: 0, other: 0 }, expenses: { rent: 0, maintenance: 0, power: 0, structures: 0, devices: 0, supplies: 0, seeds: 0, salaries: 0 } };
    this.cumulativeYield_g = data.cumulativeYield_g || 0;
    this.alerts = data.alerts || [];
    this.alertCooldowns = data.alertCooldowns || {};
    this.overtimePolicy = data.overtimePolicy || 'payout';
    this.actionRngNonce = data.actionRngNonce ?? 0;

    // --- MIGRATION: Handle old save format where revenue was a single number ---
    if (data.ledger && typeof data.ledger.revenue === 'number') {
        const oldRevenue = data.ledger.revenue as number;
        this.ledger.revenue = { harvests: oldRevenue, other: 0 };
    }
  }

  logExpense(category: ExpenseCategory, amount: number) {
    if (amount > 0) {
      this.ledger.expenses[category] = (this.ledger.expenses[category] || 0) + amount;
    }
  }

  logRevenue(category: RevenueCategory, amount: number) {
    if (amount > 0) {
      this.ledger.revenue[category] = (this.ledger.revenue[category] || 0) + amount;
      this.capital += amount;
    }
  }

  rentStructure(blueprint: StructureBlueprint): boolean {
    if (this.capital < blueprint.upfrontFee) {
      alert("Not enough capital for the upfront fee!");
      return false;
    }

    this.capital -= blueprint.upfrontFee;
    this.logExpense('structures', blueprint.upfrontFee);

    const newStructureId = `structure-${Date.now()}`;
    const newStructureData = {
      id: newStructureId,
      blueprintId: blueprint.id,
      name: `${blueprint.name} #${Object.keys(this.structures).length + 1}`,
      area_m2: blueprint.footprint.length_m * blueprint.footprint.width_m,
      height_m: blueprint.footprint.height_m,
      rooms: {},
      employeeIds: [],
    };
    this.structures[newStructureId] = new Structure(newStructureData);
    return true;
  }
  
  deleteStructure(structureId: string): void {
    delete this.structures[structureId];
  }

  spendCapital(amount: number): boolean {
    if (this.capital < amount) {
      alert("Not enough capital for this purchase!");
      return false;
    }
    this.capital -= amount;
    return true;
  }

  purchaseDevicesForZone(blueprintId: string, zone: Zone, quantity: number, rng: () => number): boolean {
    const blueprints = getBlueprints();
    const priceInfo = blueprints.devicePrices[blueprintId];

    if (!priceInfo) {
      console.error(`No price info found for device blueprint ${blueprintId}`);
      alert("Could not purchase device: price information is missing.");
      return false;
    }

    const totalCost = priceInfo.capitalExpenditure * quantity;
    if (this.spendCapital(totalCost)) {
      this.logExpense('devices', totalCost);
      for (let i = 0; i < quantity; i++) {
        zone.addDevice(blueprintId, rng);
      }
      return true;
    }
    return false;
  }
  
  purchaseSuppliesForZone(zone: Zone, supplyType: 'water' | 'nutrients', quantity: number): boolean {
    const prices = getBlueprints().utilityPrices;
    let cost = 0;
    
    if (supplyType === 'water') {
        cost = prices.pricePerLiterWater * quantity;
    } else {
        cost = prices.pricePerGramNutrients * quantity;
    }

    if (this.spendCapital(cost)) {
        this.logExpense('supplies', cost);
        if (supplyType === 'water') {
            zone.waterLevel_L = (zone.waterLevel_L || 0) + quantity;
        } else {
            zone.nutrientLevel_g = (zone.nutrientLevel_g || 0) + quantity;
        }
        return true;
    }
    return false;
  }

  purchaseSeeds(strainId: string, quantity: number): boolean {
    const blueprints = getBlueprints();
    const strainPriceInfo = blueprints.strainPrices[strainId];
    if (!strainPriceInfo) {
        console.error(`No price info for strain ${strainId}`);
        alert('Could not purchase seeds: price info missing.');
        return false;
    }
    const totalCost = strainPriceInfo.seedPrice * quantity;
    if (this.spendCapital(totalCost)) {
        this.logExpense('seeds', totalCost);
        return true;
    }
    return false;
  }
  
  breedStrain(parentA: StrainBlueprint, parentB: StrainBlueprint, newName: string, rng: () => number): StrainBlueprint | null {
      if (!parentA || !parentB) {
        console.error("Parent strains not found for breeding.");
        return null;
      }
      
      const newStrain: StrainBlueprint = JSON.parse(JSON.stringify(parentA));

      // --- Core Details ---
      newStrain.id = `custom-${Date.now()}`;
      newStrain.name = newName;
      newStrain.slug = newName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      newStrain.lineage.parents = [parentA.name, parentB.name];

      // --- Breeding Logic ---
      const MUTATION_FACTOR = 0.1; // +/- 5% mutation
      const mutate = (val: number) => val * (1 + (rng() - 0.5) * MUTATION_FACTOR);
      const avg = (a: number, b: number) => (a + b) / 2;
      
      // Genotype (normalized)
      const avgSativa = avg(parentA.genotype.sativa, parentB.genotype.sativa);
      const avgIndica = avg(parentA.genotype.indica, parentB.genotype.indica);
      const avgRuderalis = avg(parentA.genotype.ruderalis, parentB.genotype.ruderalis);
      const totalAvg = avgSativa + avgIndica + avgRuderalis;
      if (totalAvg > 0) {
        newStrain.genotype.sativa = avgSativa / totalAvg;
        newStrain.genotype.indica = avgIndica / totalAvg;
        newStrain.genotype.ruderalis = avgRuderalis / totalAvg;
      }

      // Chemotype
      newStrain.chemotype.thcContent = mutate(avg(parentA.chemotype.thcContent, parentB.chemotype.thcContent));
      newStrain.chemotype.cbdContent = mutate(avg(parentA.chemotype.cbdContent, parentB.chemotype.cbdContent));
      
      // Photoperiod
      newStrain.photoperiod.vegetationDays = Math.round(mutate(avg(parentA.photoperiod.vegetationDays, parentB.photoperiod.vegetationDays)));
      newStrain.photoperiod.floweringDays = Math.round(mutate(avg(parentA.photoperiod.floweringDays, parentB.photoperiod.floweringDays)));

      // Meta
      newStrain.meta.description = `A custom-bred hybrid of ${parentA.name} and ${parentB.name}.`;
      
      this.customStrains[newStrain.id] = newStrain;
      return newStrain;
  }

  harvestPlants(plantsToHarvest: {plant: Plant, planting: Planting}[], negotiationBonus: number = 0): { totalRevenue: number, totalYield: number, count: number } {
    const blueprints = getBlueprints();
    let totalRevenue = 0;
    let totalYield = 0;

    for (const { plant } of plantsToHarvest) {
      const strainPriceInfo = blueprints.strainPrices[plant.strainId];
      if (!strainPriceInfo) {
        console.error(`No price info for strain ${plant.strainId}`);
        continue;
      }
      const plantYield = plant.biomass * plant.health;
      let revenue = plantYield * strainPriceInfo.harvestPricePerGram;
      
      if (negotiationBonus > 0) {
        revenue *= (1 + negotiationBonus);
      }

      totalYield += plantYield;
      totalRevenue += revenue;
    }

    this.logRevenue('harvests', totalRevenue);
    this.cumulativeYield_g = (this.cumulativeYield_g || 0) + totalYield;

    for (const { plant, planting } of plantsToHarvest) {
      planting.removePlant(plant.id);
    }
    
    return { totalRevenue, totalYield, count: plantsToHarvest.length };
  }
  
  checkForAlerts(ticks: number) {
    const newAlerts: Alert[] = [];
    const newAlertKeys = new Set<string>();
    const COOLDOWN_TICKS = 2 * 24; 

    const previousAlertsMap = new Map(this.alerts.map(a => [`${a.location.zoneId || a.context?.employeeId}-${a.type}`, a]));

    for (const key in this.alertCooldowns) {
        if (ticks >= this.alertCooldowns[key]) {
            delete this.alertCooldowns[key];
        }
    }

    const createAlert = (key: string, type: AlertType, message: string, location: any, context?: any) => {
        if (this.alertCooldowns[key] && ticks < this.alertCooldowns[key]) {
            return;
        }

        if (!newAlertKeys.has(key)) {
            const existingAlert = previousAlertsMap.get(key);
            newAlerts.push({
                id: `alert-${key}-${ticks}`,
                type,
                message,
                location,
                tickGenerated: ticks,
                isAcknowledged: existingAlert?.isAcknowledged || false,
                context,
            });
            newAlertKeys.add(key);
        }
    };

    // --- Employee Alerts ---
    Object.values(this.employees).forEach(emp => {
        // Employee Quit Alert (handled in daily update)
        // Raise Request Alert (handled in daily update)
    });


    // --- Zone-based Alerts ---
    for (const structureId in this.structures) {
        const structure = this.structures[structureId];
        for (const roomId in structure.rooms) {
            const room = structure.rooms[roomId];
            for (const zoneId in room.zones) {
                const zone = room.zones[zoneId];
                const location = { structureId, roomId, zoneId };
                const consumption = zone.getSupplyConsumptionRates(this);
                const ticksOfWaterLeft = consumption.waterPerDay > 0 ? (zone.waterLevel_L / (consumption.waterPerDay / 24)) : Infinity;
                const ticksOfNutrientsLeft = consumption.nutrientsPerDay > 0 ? (zone.nutrientLevel_g / (consumption.nutrientsPerDay / 24)) : Infinity;
                
                if (ticksOfWaterLeft < 24 && zone.getTotalPlantedCount() > 0) {
                    createAlert(`${zone.id}-low_supply`, 'low_supply', `Low water in Zone '${zone.name}'.`, location);
                }
                if (ticksOfNutrientsLeft < 24 && zone.getTotalPlantedCount() > 0) {
                    createAlert(`${zone.id}-low_supply`, 'low_supply', `Low nutrients in Zone '${zone.name}'.`, location);
                }

                const harvestablePlants = zone.getHarvestablePlants();
                if (harvestablePlants.length > 0) {
                    // Only trigger alert if plants have been waiting for 12 hours
                    const isOverdue = harvestablePlants.some(({ plant }) => (ticks - plant.stageStartTick) > 12);
                    if (isOverdue) {
                        createAlert(`${zone.id}-harvest_ready`, 'harvest_ready', `Plants are ready for harvest in Zone '${zone.name}'.`, location);
                    }
                }
                
                for(const planting of Object.values(zone.plantings)) {
                    for(const plant of planting.plants) {
                        if (plant.health < 0.6) {
                            createAlert(`${zone.id}-sick_plant`, 'sick_plant', `Sick plants detected in Zone '${zone.name}'.`, location);
                        }
                        if (plant.stress > 0.4) {
                            createAlert(`${zone.id}-plant_stress`, 'plant_stress', `Stressed plants detected in Zone '${zone.name}'.`, location);
                        }
                    }
                }
            }
        }
    }

    // Combine existing non-zone alerts
    this.alerts.forEach(alert => {
        if (alert.type === 'raise_request' || alert.type === 'employee_quit' || alert.type === 'zone_harvested' || alert.type === 'zone_ready') {
            const key = `${alert.location.zoneId || alert.context?.employeeId}-${alert.type}`;
            if(!newAlertKeys.has(key)) {
                newAlerts.push(alert);
                newAlertKeys.add(key);
            }
        }
    });


    for (const [prevKey] of previousAlertsMap) {
        if (!newAlertKeys.has(prevKey)) {
            this.alertCooldowns[prevKey] = ticks + COOLDOWN_TICKS;
        }
    }
    
    // Filter out acknowledged old alerts that are no longer active
    this.alerts = newAlerts.filter(a => {
        const key = `${a.location.zoneId || a.context?.employeeId}-${a.type}`;
        if (!newAlertKeys.has(key) && a.isAcknowledged) {
            return false;
        }
        return true;
    });
  }
  
  hireEmployee(employee: Employee, structureId: string, ticks: number): boolean {
    if (this.employees[employee.id]) {
        alert("This employee is already hired.");
        return false;
    }
    const salaryCost = employee.salaryPerDay;
    if (this.capital < salaryCost * 7) { // Ensure at least a week's salary
        alert("Not enough capital to securely hire this employee.");
        return false;
    }
    
    employee.structureId = structureId;
    employee.status = 'Idle';
    employee.lastRaiseTick = ticks;
    this.employees[employee.id] = employee;
    this.structures[structureId].employeeIds.push(employee.id);

    this.jobMarketCandidates = this.jobMarketCandidates.filter(c => c.id !== employee.id);
    return true;
  }
  
    fireEmployee(employeeId: string): Employee | null {
        const employee = this.employees[employeeId];
        if (!employee) return null;

        const severance = employee.salaryPerDay * 7;
        if (this.capital < severance) {
            alert("Not enough capital to pay severance.");
            return null;
        }

        this.capital -= severance;
        this.logExpense('salaries', severance);

        // Morale penalty
        if (employee.structureId) {
            const structure = this.structures[employee.structureId];
            if (structure) {
                structure.employeeIds
                    .filter(id => id !== employeeId)
                    .forEach(id => {
                        const otherEmployee = this.employees[id];
                        if (otherEmployee) {
                            otherEmployee.morale = Math.max(0, otherEmployee.morale - 10);
                        }
                    });
                structure.employeeIds = structure.employeeIds.filter(id => id !== employeeId);
            }
        }

        delete this.employees[employeeId];
        
        // Return to job market
        employee.structureId = null;
        employee.status = 'Idle';
        this.jobMarketCandidates.unshift(employee);

        return employee;
    }

    acceptRaise(employeeId: string, newSalary: number, ticks: number) {
        const employee = this.employees[employeeId];
        if (employee) {
            employee.salaryPerDay = newSalary;
            employee.morale = Math.min(100, employee.morale + 25);
            employee.lastRaiseTick = ticks;
            this.alerts = this.alerts.filter(a => !(a.type === 'raise_request' && a.context?.employeeId === employeeId));
        }
    }

    offerBonus(employeeId: string, bonus: number, ticks: number) {
        const employee = this.employees[employeeId];
        if (employee && this.capital >= bonus) {
            this.capital -= bonus;
            this.logExpense('salaries', bonus);
            employee.morale = Math.min(100, employee.morale + 15);
            employee.lastRaiseTick = ticks;
            this.alerts = this.alerts.filter(a => !(a.type === 'raise_request' && a.context?.employeeId === employeeId));
        }
    }

    declineRaise(employeeId: string) {
        const employee = this.employees[employeeId];
        if (employee) {
            employee.morale = Math.max(0, employee.morale - 20);
            this.alerts = this.alerts.filter(a => !(a.type === 'raise_request' && a.context?.employeeId === employeeId));
        }
    }

  async updateJobMarket(rng: () => number, ticks: number, seed: number) {
      const { personnelData } = getBlueprints();
      const { traits } = personnelData;
      let names: { firstName: string, lastName: string }[] = [];

      // API First Approach
      try {
          const week = Math.floor(ticks / (24 * 7));
          const apiSeed = `weedbreed-${seed}-${week}`;
          const response = await fetch(`https://randomuser.me/api/?results=12&inc=name&seed=${apiSeed}`);
          if (!response.ok) throw new Error('API response not ok');
          const data = await response.json();
          names = data.results.map((r: any) => ({
              firstName: r.name.first,
              lastName: r.name.last
          }));
      } catch (error) {
          console.warn("Could not fetch names from randomuser.me API, using local fallback.", error);
          // Fallback to local files
          const { firstNames, lastNames } = personnelData;
          for (let i = 0; i < 12; i++) {
              const firstName = firstNames[Math.floor(rng() * firstNames.length)];
              const lastName = lastNames[Math.floor(rng() * lastNames.length)];
              names.push({ firstName, lastName });
          }
      }

      // Generate candidates from names
      const newCandidates: Employee[] = names.map(name => {
          const skills: Record<SkillName, Skill> = {} as any;
          let totalSkillPoints = 0;
          let highestSkill: SkillName = 'Gardening';
          let highestLevel = -1;

          ALL_SKILLS.forEach(skillName => {
              const level = rng() * 5; // New candidates are not experts
              skills[skillName] = { name: skillName, level, xp: 0 };
              totalSkillPoints += level;
              if (level > highestLevel) {
                  highestLevel = level;
                  highestSkill = skillName;
              }
          });

          const role = SKILL_TO_ROLE_MAP[highestSkill] || 'Generalist';

          const assignedTraits: Trait[] = [];
          const traitRoll = rng();
          if (traitRoll < 0.7) { // 70% chance to have at least one trait
              assignedTraits.push(traits[Math.floor(rng() * traits.length)]);
              if (rng() < 0.2) { // 20% of those have a second trait
                  assignedTraits.push(traits[Math.floor(rng() * traits.length)]);
              }
          }
          
          const baseSalary = 50;
          const salaryPerSkillPoint = 8;
          let salary = baseSalary + (totalSkillPoints * salaryPerSkillPoint);

          let salaryModifier = 1.0;
          if (assignedTraits.some(t => t.id === 'trait_frugal')) {
              salaryModifier -= 0.15; // 15% less for frugal
          }
          if (assignedTraits.some(t => t.id === 'trait_demanding')) {
              salaryModifier += 0.20; // 20% more for demanding
          }

          salary *= salaryModifier;

          return {
              id: `emp-${Date.now()}-${rng()}`,
              firstName: name.firstName,
              lastName: name.lastName,
              role,
              skills,
              traits: assignedTraits,
              salaryPerDay: salary,
              energy: 100,
              morale: 75,
              structureId: null,
              status: 'Idle',
              currentTask: null,
              leaveHours: 0,
          };
      });

      this.jobMarketCandidates = newCandidates;
  }

    setPlantingPlanForZone(zoneId: string, plan: PlantingPlan | null) {
        for (const structure of Object.values(this.structures)) {
            const zone = structure.rooms[Object.keys(structure.rooms).find(roomId => structure.rooms[roomId].zones[zoneId]) || '']?.zones[zoneId];
            if (zone) {
                zone.setPlantingPlan(plan);
                break;
            }
        }
    }

  resolveTask(employee: Employee, task: Task, ticks: number, rng: () => number) {
    const structure = this.structures[task.location.structureId];
    if (!structure) return;
    const room = structure.rooms[task.location.roomId];
    if (!room) return;
    const zone = room.zones[task.location.zoneId];
    if (!zone) return;

    switch (task.type) {
        case 'repair_device':
        case 'maintain_device':
            const device = zone.devices[task.location.itemId];
            if (device) {
                device.durability = 1.0;
                if (device.status === 'broken') device.status = 'on';
            }
            break;
        case 'harvest_plants':
            const plantsToHarvest = zone.getHarvestablePlants();
            if (plantsToHarvest.length > 0) {
                const negotiationSkill = structure.getMaxSkill(this, 'Negotiation', 'Salesperson');
                const negotiationBonus = (negotiationSkill / 10) * 0.10;
                this.harvestPlants(plantsToHarvest, negotiationBonus);
                zone.cleanupEmptyPlantings();
                if (zone.getTotalPlantedCount() === 0) {
                    zone.cyclesUsed = (zone.cyclesUsed || 0) + 1;
                    zone.status = 'Harvested';
                    this.alerts.push({ id: `alert-${zone.id}-harvested-${ticks}`, type: 'zone_harvested', message: `Zone '${zone.name}' is harvested and needs cleaning.`, location: task.location, tickGenerated: ticks });
                }
            }
            break;
        case 'refill_supplies_water':
            this.purchaseSuppliesForZone(zone, 'water', 1000); // Refill 1000L
            break;
        case 'refill_supplies_nutrients':
            this.purchaseSuppliesForZone(zone, 'nutrients', 1000); // Refill 1000g
            break;
        case 'clean_zone':
            zone.status = 'Ready';
            this.alerts.push({ id: `alert-${zone.id}-ready-${ticks}`, type: 'zone_ready', message: `Zone '${zone.name}' is clean and ready for planting.`, location: task.location, tickGenerated: ticks });
            break;
        case 'overhaul_zone_substrate':
            const method = getBlueprints().cultivationMethods[zone.cultivationMethodId];
            if (method) {
                const cost = (method.setupCost || 0) * zone.area_m2;
                if (this.spendCapital(cost)) {
                    this.logExpense('supplies', cost);
                    zone.cyclesUsed = 0;
                    zone.status = 'Ready';
                    this.alerts.push({ id: `alert-${zone.id}-ready-${ticks}`, type: 'zone_ready', message: `Zone '${zone.name}' is overhauled and ready.`, location: task.location, tickGenerated: ticks });
                }
            }
            break;
        case 'reset_light_cycle':
            // Reset to a default veg cycle. If there's a planting plan, it might be more specific.
            const strainId = zone.plantingPlan?.strainId;
            const strain = strainId ? getAvailableStrains(this)[strainId] : null;
            if (strain) {
                const [on, off] = strain.environmentalPreferences.lightCycle.vegetation;
                zone.lightCycle = { on, off };
            } else {
                zone.lightCycle = { on: 18, off: 6 }; // Default
            }
            break;
        case 'execute_planting_plan':
            if (zone.plantingPlan) {
                const { strainId, quantity } = zone.plantingPlan;
                if (this.purchaseSeeds(strainId, quantity)) {
                    zone.plantStrain(strainId, quantity, this, rng);
                    zone.status = 'Growing';
                }
            }
            break;
        case 'adjust_light_cycle':
            const plantingToFlip = Object.values(zone.plantings).find(p => {
                const strain = getAvailableStrains(this)[p.strainId];
                if (!strain) return false;
                const vegDays = strain.photoperiod.vegetationDays;
                return p.plants.some(plant => 
                    plant.growthStage === GrowthStage.Vegetative &&
                    ((plant.ageInTicks - plant.stageStartTick) / 24) >= (vegDays - 2)
                );
            });
            if (plantingToFlip) {
                const strain = getAvailableStrains(this)[plantingToFlip.strainId];
                if (strain) {
                    const [on, off] = strain.environmentalPreferences.lightCycle.flowering;
                    zone.lightCycle = { on, off };
                }
            }
            break;
    }
    
    // Grant XP for completing task
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
      Object.values(this.employees).forEach(emp => {
          if (emp.status === 'Working' && emp.currentTask) {
              tasksInProgress.add(emp.currentTask.id);
          }
      });

      for(const employee of Object.values(this.employees)) {
          if (!employee.structureId) continue;
          const structure = this.structures[employee.structureId];
          if (!structure) continue;

          switch(employee.status) {
              case 'OffDuty':
                  if (ticks >= (employee.offDutyUntilTick || 0)) {
                      employee.status = 'Idle';
                      employee.energy = 100;
                      employee.offDutyUntilTick = undefined;
                      employee.morale = Math.min(100, employee.morale + 2); // Morale boost for a good rest
                  }
                  break;

              case 'Working':
                  const task = employee.currentTask;
                  if (!task) {
                      employee.status = 'Idle';
                      break;
                  }
                  
                  employee.energy -= ENERGY_COST_PER_TICK_WORKING; // Can go negative for overtime
                  task.progressTicks = (task.progressTicks || 0) + 1;

                  if (task.progressTicks >= task.durationTicks) {
                      this.resolveTask(employee, task, ticks, rng);
                      employee.currentTask = null;
                      
                      // Handle overtime if energy is negative
                      if (employee.energy < 0) {
                          const overtimeHours = -employee.energy / ENERGY_COST_PER_TICK_WORKING;
                          if (this.overtimePolicy === 'timeOff') {
                              employee.leaveHours = (employee.leaveHours || 0) + overtimeHours;
                          } else { // 'payout' policy
                              const hourlyRate = employee.salaryPerDay / 8; // Assume 8-hour day for rate calculation
                              const overtimePay = overtimeHours * hourlyRate * 1.5; // Time and a half
                              if (this.capital >= overtimePay) {
                                  this.capital -= overtimePay;
                                  this.logExpense('salaries', overtimePay);
                              }
                          }
                      }
                      
                      // After task, if energy is low, go off-duty. Otherwise, become idle.
                      if (employee.energy < ENERGY_REST_THRESHOLD) {
                        employee.energy = 0; // Reset energy for recovery
                        employee.status = 'OffDuty';
                        employee.offDutyUntilTick = ticks + OFF_DUTY_DURATION_TICKS;
                      } else {
                        employee.status = 'Idle';
                      }
                  }
                  break;

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

                  // If idle but energy is low, try to rest in a breakroom
                  if (employee.energy < ENERGY_REST_THRESHOLD) {
                      if (structure.getRestingEmployeeCount(this) < structure.getBreakroomCapacity()) {
                          employee.status = 'Resting';
                          break; // Skip task search for this tick
                      }
                  }
                  
                  const tasks = [...structure.tasks].sort((a, b) => b.priority - a.priority);
                  const suitableTask = tasks.find(task => 
                      !tasksInProgress.has(task.id) &&
                      task.requiredRole === employee.role &&
                      employee.skills[task.requiredSkill].level >= task.minSkillLevel
                  );

                  if (suitableTask) {
                      employee.status = 'Working';
                      employee.currentTask = suitableTask;
                      tasksInProgress.add(suitableTask.id);
                  } else {
                      // If idle with no tasks, regenerate a small amount of energy
                      employee.energy = Math.min(100, employee.energy + IDLE_ENERGY_REGEN_PER_TICK);
                  }
                  break;
          }
      }
  }

  update(rng: () => number, ticks: number, seed: number) {
    this.checkForAlerts(ticks);

    if (ticks > 0 && ticks % (24 * 7) === 0) { // Every 7 days
      this.updateJobMarket(rng, ticks, seed);
    }

    // Daily updates
    if (ticks > 0 && ticks % 24 === 0) {
        let totalSalaries = 0;
        const employeesToQuit: string[] = [];

        Object.values(this.employees).forEach(emp => {
            totalSalaries += emp.salaryPerDay;
            
            // Check for quitting
            if (emp.morale < 20 && rng() < 0.05) { // 5% chance to quit each day if morale is low
                employeesToQuit.push(emp.id);
            }

            // Check for raise request
            const ticksSinceRaise = ticks - (emp.lastRaiseTick || emp.timeOnMarket || 0);
            const hasExistingRequest = this.alerts.some(a => a.type === 'raise_request' && a.context?.employeeId === emp.id);

            if (!hasExistingRequest && ticksSinceRaise > 365 * 24) { // 1 year cooldown
                // Simple trigger: at least 1 full skill point gained since last raise
                const totalSkillPoints = Object.values(emp.skills).reduce((sum, s) => sum + s.level, 0);
                const baseSalary = 50 + (totalSkillPoints * 8);
                
                if (baseSalary > emp.salaryPerDay * 1.05) { // Only ask if new salary is at least 5% higher
                    const newSalary = baseSalary * (1 + (rng() - 0.5) * 0.1); // +/- 5% negotiation margin
                    const alertKey = `${emp.id}-raise_request`;
                    const existingAlert = this.alerts.find(a => a.id.startsWith(`alert-${alertKey}`));
                    if (!existingAlert) {
                        this.alerts.push({
                            id: `alert-${alertKey}-${ticks}`,
                            type: 'raise_request',
                            message: `${emp.firstName} ${emp.lastName} is requesting a salary review.`,
                            location: { structureId: emp.structureId || '', roomId: '', zoneId: '' },
                            tickGenerated: ticks,
                            context: { employeeId: emp.id, newSalary: newSalary }
                        });
                    }
                }
            }

            // Learning by Doing (Role-based general XP)
            const roleToSkillMap: Record<JobRole, SkillName> = {
                'Gardener': 'Gardening',
                'Technician': 'Maintenance',
                'Janitor': 'Cleanliness',
                'Botanist': 'Botanical',
                'Salesperson': 'Negotiation',
                'Generalist': 'Gardening',
            };
            const skillToLevel = roleToSkillMap[emp.role];
            if (skillToLevel) {
                const skill = emp.skills[skillToLevel];
                if (skill.level < 10) {
                    skill.xp += 2; // Reduced base XP per day
                    if (skill.xp >= XP_PER_LEVEL) {
                        skill.level = Math.min(10, skill.level + 1);
                        skill.xp = 0;
                    }
                }
            }
        });
        
        employeesToQuit.forEach(empId => {
            const emp = this.employees[empId];
            if (emp) {
                delete this.employees[empId];
                if (emp.structureId) {
                    this.structures[emp.structureId].employeeIds = this.structures[emp.structureId].employeeIds.filter(id => id !== empId);
                }
                emp.structureId = null;
                this.jobMarketCandidates.unshift(emp);
                this.alerts.push({
                    id: `alert-${emp.id}-employee_quit-${ticks}`,
                    type: 'employee_quit',
                    message: `${emp.firstName} ${emp.lastName} has quit due to low morale.`,
                    location: { structureId: '', roomId: '', zoneId: ''},
                    tickGenerated: ticks,
                    context: { employeeId: emp.id }
                });
            }
        });

        this.logExpense('salaries', totalSalaries);
        this.capital -= totalSalaries;
    }

    // Generate tasks and run AI before structure updates
    for (const structure of Object.values(this.structures)) {
        structure.generateTasks(this);
    }
    this.updateEmployeesAI(ticks, rng);

    for (const structureId in this.structures) {
        this.structures[structureId].update(this, rng, ticks);
    }

    let totalRent = 0;
    let totalMaintenance = 0;
    let totalPower = 0;
    
    const blueprints = getBlueprints();
    const pricePerKwh = blueprints.utilityPrices.pricePerKwh;

    for (const structureId in this.structures) {
        const structure = this.structures[structureId];
        const structureBlueprint = blueprints.structures[structure.blueprintId];
        
        if (structureBlueprint) {
            totalRent += structure.getRentalCostPerTick(structureBlueprint);
        }

        for (const roomId in structure.rooms) {
            const room = structure.rooms[roomId];
            for (const zoneId in room.zones) {
                const zone = room.zones[zoneId];
                
                const hourOfDay = ticks % 24;
                const isLightOnInZone = hourOfDay < zone.lightCycle.on;

                for (const deviceId in zone.devices) {
                    const device = zone.devices[deviceId];
                    
                    const devicePrice = blueprints.devicePrices[device.blueprintId];
                    if (devicePrice) {
                        totalMaintenance += devicePrice.baseMaintenanceCostPerTick;
                    }
                    
                    if (device.status === 'on') {
                        const deviceBlueprint = blueprints.devices[device.blueprintId];
                        const powerKw = deviceBlueprint?.settings?.power;
                        
                        if (powerKw) {
                            let shouldIncurPowerCost = true;
                            if (deviceBlueprint.kind === 'Lamp') {
                                shouldIncurPowerCost = isLightOnInZone;
                            }
                            
                            if (shouldIncurPowerCost) {
                                totalPower += powerKw * pricePerKwh;
                            }
                        }
                    }
                }
            }
        }
    }
    
    this.logExpense('rent', totalRent);
    this.logExpense('maintenance', totalMaintenance);
    this.logExpense('power', totalPower);
    
    this.capital -= (totalRent + totalMaintenance + totalPower);
  }
  
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      capital: this.capital,
      structures: Object.fromEntries(Object.entries(this.structures).map(([id, struct]) => [id, struct.toJSON()])),
      customStrains: this.customStrains,
      employees: this.employees,
      jobMarketCandidates: this.jobMarketCandidates,
      ledger: this.ledger,
      cumulativeYield_g: this.cumulativeYield_g,
      alerts: this.alerts,
      alertCooldowns: this.alertCooldowns,
      overtimePolicy: this.overtimePolicy,
      actionRngNonce: this.actionRngNonce,
    };
  }

  getActionRng(seed: number, ticks: number): () => number {
    const baseSeed = seed + ticks * 1000 + this.actionRngNonce;
    this.actionRngNonce += 1;
    return mulberry32(baseSeed);
  }
}
