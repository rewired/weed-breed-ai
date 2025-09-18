

import { Structure, StructureBlueprint, StrainBlueprint, Zone, Company as ICompany, FinancialLedger, ExpenseCategory, Plant, Planting, RevenueCategory, Alert, AlertType, Employee, SkillName, Skill, Trait, JobRole, Task, TaskType, TaskLocation, PlantingPlan, OvertimePolicy } from '../types';
import { getAvailableStrains, getBlueprints } from '../blueprints';
import { yieldToMainThread, RandomAdapter } from '../utils';
import * as finance from '../services/finance';
import * as hr from '../services/hr';
import * as market from '../services/market';
import * as taskEngine from '../services/taskEngine';


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
  alertCooldowns: Record<string, number>;
  overtimePolicy: OvertimePolicy;

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

    if (data.ledger && typeof data.ledger.revenue === 'number') {
        const oldRevenue = data.ledger.revenue as number;
        this.ledger.revenue = { harvests: oldRevenue, other: 0 };
    }
  }

  logExpense(category: ExpenseCategory, amount: number) {
    finance.logExpense(this, category, amount);
  }

  logRevenue(category: RevenueCategory, amount: number) {
    finance.logRevenue(this, category, amount);
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
    return finance.spendCapital(this, amount);
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
  
  // FIX: Add missing wrapper methods to fix calls from game/api.ts. These delegate to service functions.
  hireEmployee(employee: Employee, structureId: string, ticks: number): boolean {
    return hr.hireEmployee(this, employee, structureId, ticks);
  }

  fireEmployee(employeeId: string): Employee | null {
    return hr.fireEmployee(this, employeeId);
  }

  acceptRaise(employeeId: string, newSalary: number, ticks: number): void {
    hr.acceptRaise(this, employeeId, newSalary, ticks);
  }

  offerBonus(employeeId: string, bonus: number, ticks: number): void {
    hr.offerBonus(this, employeeId, bonus, ticks);
  }

  declineRaise(employeeId: string): void {
    hr.declineRaise(this, employeeId);
  }
  
  async updateJobMarket(rng: () => number, ticks: number, seed: number): Promise<void> {
    await market.updateJobMarket(this, rng, ticks, seed);
  }

  breedStrain(parentA: StrainBlueprint, parentB: StrainBlueprint, newName: string, rng: () => number): StrainBlueprint | null {
      if (!parentA || !parentB) {
        console.error("Parent strains not found for breeding.");
        return null;
      }
      
      const random = new RandomAdapter(rng);
      const newStrain: StrainBlueprint = JSON.parse(JSON.stringify(parentA));

      newStrain.id = `custom-${Date.now()}-${rng()}`;
      newStrain.name = newName;
      newStrain.slug = newName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      newStrain.lineage.parents = [parentA.name, parentB.name];

      const MUTATION_FACTOR = 0.1;
      const mutate = (val: number) => val * (1 + (random.float() - 0.5) * MUTATION_FACTOR);
      const avg = (a: number, b: number) => (a + b) / 2;
      
      const avgSativa = avg(parentA.genotype.sativa, parentB.genotype.sativa);
      const avgIndica = avg(parentA.genotype.indica, parentB.genotype.indica);
      const avgRuderalis = avg(parentA.genotype.ruderalis, parentB.genotype.ruderalis);
      const totalAvg = avgSativa + avgIndica + avgRuderalis;
      if (totalAvg > 0) {
        newStrain.genotype.sativa = avgSativa / totalAvg;
        newStrain.genotype.indica = avgIndica / totalAvg;
        newStrain.genotype.ruderalis = avgRuderalis / totalAvg;
      }

      newStrain.chemotype.thcContent = mutate(avg(parentA.chemotype.thcContent, parentB.chemotype.thcContent));
      newStrain.chemotype.cbdContent = mutate(avg(parentA.chemotype.cbdContent, parentB.chemotype.cbdContent));
      
      newStrain.photoperiod.vegetationDays = Math.round(mutate(avg(parentA.photoperiod.vegetationDays, parentB.photoperiod.vegetationDays)));
      newStrain.photoperiod.floweringDays = Math.round(mutate(avg(parentA.photoperiod.floweringDays, parentB.photoperiod.floweringDays)));

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
    
    this.alerts = newAlerts.filter(a => {
        const key = `${a.location.zoneId || a.context?.employeeId}-${a.type}`;
        if (!newAlertKeys.has(key) && a.isAcknowledged) {
            return false;
        }
        return true;
    });
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

    async update(rng: () => number, ticks: number, seed: number) {
        this.checkForAlerts(ticks);

        if (ticks > 0 && ticks % (24 * 7) === 0) {
            await market.updateJobMarket(this, rng, ticks, seed);
        }

        if (ticks > 0 && ticks % 24 === 0) {
            hr.processDailyUpdates(this, ticks, rng);
        }
        await yieldToMainThread();

        taskEngine.generateTasks(this);
        hr.updateEmployeesAI(this, ticks, rng);
        await yieldToMainThread();

        for (const structureId in this.structures) {
            await this.structures[structureId].update(this, rng, ticks);
        }
        await yieldToMainThread();

        finance.processTickCosts(this, ticks);
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
    };
  }
}