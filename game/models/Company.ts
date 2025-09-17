import { Structure, StructureBlueprint, StrainBlueprint, Zone, Company as ICompany, FinancialLedger, ExpenseCategory, Plant, Planting, RevenueCategory, Alert, AlertType } from '../types';
import { getBlueprints } from '../blueprints';

export class Company {
  id: string;
  name: string;
  capital: number;
  structures: Record<string, Structure>;
  customStrains: Record<string, StrainBlueprint>;
  ledger: FinancialLedger;
  cumulativeYield_g: number;
  alerts: Alert[];

  constructor(data: any) {
    this.id = data.id;
    this.name = data.name;
    this.capital = data.capital;
    this.structures = {};
    if (data.structures) {
      for (const structId in data.structures) {
        // FIX: Check if the data is already an instance to prevent re-hydration issues.
        if (data.structures[structId] instanceof Structure) {
            this.structures[structId] = data.structures[structId];
        } else {
            this.structures[structId] = new Structure(data.structures[structId]);
        }
      }
    }
    this.customStrains = data.customStrains || {};
    this.ledger = data.ledger || { revenue: { harvests: 0, other: 0 }, expenses: { rent: 0, maintenance: 0, power: 0, structures: 0, devices: 0, supplies: 0, seeds: 0 } };
    this.cumulativeYield_g = data.cumulativeYield_g || 0;
    this.alerts = data.alerts || [];

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

  harvestPlants(plantsToHarvest: {plant: Plant, planting: Planting}[]): { totalRevenue: number, totalYield: number, count: number } {
    const blueprints = getBlueprints();
    let totalRevenue = 0;
    let totalYield = 0;

    for (const { plant } of plantsToHarvest) {
      const strainPriceInfo = blueprints.strainPrices[plant.strainId];
      if (!strainPriceInfo) {
        console.error(`No price info for strain ${plant.strainId}`);
        continue;
      }
      // Yield is biomass multiplied by health (quality).
      const plantYield = plant.biomass * plant.health;
      const revenue = plantYield * strainPriceInfo.harvestPricePerGram;

      totalYield += plantYield;
      totalRevenue += revenue;
    }

    this.logRevenue('harvests', totalRevenue);
    this.cumulativeYield_g = (this.cumulativeYield_g || 0) + totalYield;


    // Now remove the plants after all calculations are done.
    for (const { plant, planting } of plantsToHarvest) {
      planting.removePlant(plant.id);
    }
    
    return { totalRevenue, totalYield, count: plantsToHarvest.length };
  }
  
  checkForAlerts(ticks: number) {
    const newAlerts: Alert[] = [];
    const alertKeys = new Set<string>(); // Prevents duplicate alerts for same condition in same zone

    const createAlert = (zoneId: string, type: AlertType, message: string, location: { structureId: string, roomId: string, zoneId: string }) => {
        const key = `${zoneId}-${type}`;
        if (!alertKeys.has(key)) {
            newAlerts.push({
                id: `alert-${key}-${ticks}`,
                type,
                message,
                location,
                tickGenerated: ticks,
            });
            alertKeys.add(key);
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
                
                // --- Check for Low Supplies ---
                if (ticksOfWaterLeft < 24 && zone.getTotalPlantedCount() > 0) {
                    createAlert(zone.id, 'low_supply', `Low water in Zone '${zone.name}'.`, location);
                }
                if (ticksOfNutrientsLeft < 24 && zone.getTotalPlantedCount() > 0) {
                    createAlert(zone.id, 'low_supply', `Low nutrients in Zone '${zone.name}'.`, location);
                }

                // --- Check for Harvestable Plants ---
                if (zone.getHarvestablePlants().length > 0) {
                    createAlert(zone.id, 'harvest_ready', `Plants are ready for harvest in Zone '${zone.name}'.`, location);
                }
                
                // --- Check for Sick Plants ---
                for(const planting of Object.values(zone.plantings)) {
                    for(const plant of planting.plants) {
                        if (plant.health < 0.6) {
                            createAlert(zone.id, 'sick_plant', `Sick plants detected in Zone '${zone.name}'.`, location);
                            break; // Only need one sick plant alert per zone
                        }
                    }
                }
            }
        }
    }

    this.alerts = newAlerts;
  }

  update(rng: () => number, ticks: number) {
    // 0. Check for alerts BEFORE updates, so we see the state that needs action
    this.checkForAlerts(ticks);

    // 1. Run simulation updates first
    for (const structureId in this.structures) {
        this.structures[structureId].update(this, rng, ticks);
    }

    // 2. Then calculate and log tick-based expenses
    let totalRent = 0;
    let totalMaintenance = 0;
    let totalPower = 0;
    
    const blueprints = getBlueprints();
    const pricePerKwh = blueprints.utilityPrices.pricePerKwh;

    for (const structureId in this.structures) {
        const structure = this.structures[structureId];
        const structureBlueprint = blueprints.structures[structure.blueprintId];
        
        // Rent
        if (structureBlueprint) {
            totalRent += structure.getRentalCostPerTick(structureBlueprint);
        }

        // Device Costs (Maintenance & Electricity)
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
      ledger: this.ledger,
      cumulativeYield_g: this.cumulativeYield_g,
      alerts: this.alerts,
    };
  }
}