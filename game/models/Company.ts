import { Structure, StructureBlueprint, StrainBlueprint, Zone, Company as ICompany, FinancialLedger, ExpenseCategory, Plant, Planting, RevenueCategory, Alert, AlertType, Employee, SkillName, Skill, Trait, JobRole, Task, TaskType, TaskLocation } from '../types';
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
const ENERGY_COST_PER_TASK = 15;
const ENERGY_REGEN_PER_TICK = 0.5;


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

  purchaseDevicesForZone(blueprintId: string, zone: Zone, quantity: number): boolean {
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
        zone.addDevice(blueprintId);
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
  
  breedStrain(parentA: StrainBlueprint, parentB: StrainBlueprint, newName: string): StrainBlueprint | null {
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
      const mutate = (val: number) => val * (1 + (Math.random() - 0.5) * MUTATION_FACTOR);
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

    const previousAlertsMap = new Map(this.alerts.map(a => [`${a.location.zoneId}-${a.type}`, a]));

    for (const key in this.alertCooldowns) {
        if (ticks >= this.alertCooldowns[key]) {
            delete this.alertCooldowns[key];
        }
    }

    const createAlert = (zoneId: string, type: AlertType, message: string, location: { structureId: string, roomId: string, zoneId: string }) => {
        const key = `${zoneId}-${type}`;

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
            });
            newAlertKeys.add(key);
        }
    };

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
                    createAlert(zone.id, 'low_supply', `Low water in Zone '${zone.name}'.`, location);
                }
                if (ticksOfNutrientsLeft < 24 && zone.getTotalPlantedCount() > 0) {
                    createAlert(zone.id, 'low_supply', `Low nutrients in Zone '${zone.name}'.`, location);
                }

                if (zone.getHarvestablePlants().length > 0) {
                    createAlert(zone.id, 'harvest_ready', `Plants are ready for harvest in Zone '${zone.name}'.`, location);
                }
                
                for(const planting of Object.values(zone.plantings)) {
                    for(const plant of planting.plants) {
                        if (plant.health < 0.6) {
                            createAlert(zone.id, 'sick_plant', `Sick plants detected in Zone '${zone.name}'.`, location);
                        }
                        if (plant.stress > 0.4) {
                            createAlert(zone.id, 'plant_stress', `Stressed plants detected in Zone '${zone.name}'.`, location);
                        }
                    }
                }
            }
        }
    }

    for (const [prevKey] of previousAlertsMap) {
        if (!newAlertKeys.has(prevKey)) {
            this.alertCooldowns[prevKey] = ticks + COOLDOWN_TICKS;
        }
    }

    this.alerts = newAlerts;
  }
  
  hireEmployee(employee: Employee, structureId: string): boolean {
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
    this.employees[employee.id] = employee;
    this.structures[structureId].employeeIds.push(employee.id);

    this.jobMarketCandidates = this.jobMarketCandidates.filter(c => c.id !== employee.id);
    return true;
  }

  async updateJobMarket(rng: () => number) {
      const { personnelData } = getBlueprints();
      const { traits } = personnelData;
      let names: { firstName: string, lastName: string }[] = [];

      // API First Approach
      try {
          const response = await fetch('https://randomuser.me/api/?results=12&inc=name');
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
          const salary = baseSalary + (totalSkillPoints * salaryPerSkillPoint);

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
          };
      });

      this.jobMarketCandidates = newCandidates;
  }

  resolveTask(employee: Employee, task: Task) {
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
                }
            }
            break;
        case 'refill_supplies_water':
            this.purchaseSuppliesForZone(zone, 'water', 1000); // Refill 1000L
            break;
        case 'refill_supplies_nutrients':
            this.purchaseSuppliesForZone(zone, 'nutrients', 1000); // Refill 1000g
            break;
        case 'overhaul_zone':
            const method = getBlueprints().cultivationMethods[zone.cultivationMethodId];
            if (method) {
                const cost = (method.setupCost || 0) * zone.area_m2;
                if (this.spendCapital(cost)) {
                    this.logExpense('supplies', cost);
                    zone.cyclesUsed = 0;
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

  updateEmployeesAI() {
      const tasksInProgress = new Set<string>();
      Object.values(this.employees).forEach(emp => {
          if (emp.status === 'Working' && emp.currentTask) {
              tasksInProgress.add(emp.currentTask.id);
          }
      });

      for(const employee of Object.values(this.employees)) {
          switch(employee.status) {
              case 'Working':
                  const task = employee.currentTask;
                  if (task) {
                      this.resolveTask(employee, task);
                      employee.energy -= ENERGY_COST_PER_TASK;
                  }
                  
                  employee.currentTask = null;
                  employee.status = employee.energy <= 0 ? 'Resting' : 'Idle';
                  break;

              case 'Resting':
                  employee.energy += ENERGY_REGEN_PER_TICK;
                  if (employee.energy >= 100) {
                      employee.energy = 100;
                      employee.status = 'Idle';
                  }
                  break;

              case 'Idle':
                  if (!employee.structureId) continue;
                  const assignedStructure = this.structures[employee.structureId];
                  if (!assignedStructure) continue;

                  const tasks = [...assignedStructure.tasks].sort((a, b) => b.priority - a.priority);
                  const suitableTask = tasks.find(task => 
                      !tasksInProgress.has(task.id) &&
                      task.requiredRole === employee.role &&
                      employee.skills[task.requiredSkill].level >= task.minSkillLevel
                  );

                  if (suitableTask) {
                      employee.status = 'Working';
                      employee.currentTask = suitableTask;
                      tasksInProgress.add(suitableTask.id);
                  }
                  break;
          }
      }
  }

  update(rng: () => number, ticks: number) {
    this.checkForAlerts(ticks);

    if (ticks > 0 && ticks % (24 * 7) === 0) { // Every 7 days
      this.updateJobMarket(rng);
    }

    // Daily updates (Salaries, Learning by Doing)
    if (ticks > 0 && ticks % 24 === 0) {
        let totalSalaries = 0;
        Object.values(this.employees).forEach(emp => {
            totalSalaries += emp.salaryPerDay;

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
        
        this.logExpense('salaries', totalSalaries);
        this.capital -= totalSalaries;
    }

    // Generate tasks and run AI before structure updates
    for (const structure of Object.values(this.structures)) {
        structure.generateTasks(this);
    }
    this.updateEmployeesAI();

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
    };
  }
}