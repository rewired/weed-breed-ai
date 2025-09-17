import { Structure, StructureBlueprint, StrainBlueprint, Zone, Company as ICompany } from '../types';
import { getBlueprints } from '../blueprints';

export class Company {
  id: string;
  name: string;
  capital: number;
  structures: Record<string, Structure>;
  customStrains: Record<string, StrainBlueprint>;

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
  }

  rentStructure(blueprint: StructureBlueprint): boolean {
    if (this.capital < blueprint.upfrontFee) {
      alert("Not enough capital for the upfront fee!");
      return false;
    }

    this.capital -= blueprint.upfrontFee;

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
        if (supplyType === 'water') {
            zone.waterLevel_L = (zone.waterLevel_L || 0) + quantity;
        } else {
            zone.nutrientLevel_g = (zone.nutrientLevel_g || 0) + quantity;
        }
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

  update(rng: () => number, ticks: number) {
    // 1. Run simulation updates first
    for (const structureId in this.structures) {
        this.structures[structureId].update(this, rng, ticks);
    }

    // 2. Then calculate tick-based expenses
    let totalExpenses = 0;
    const blueprints = getBlueprints();
    const pricePerKwh = blueprints.utilityPrices.pricePerKwh;

    for (const structureId in this.structures) {
        const structure = this.structures[structureId];
        const structureBlueprint = blueprints.structures[structure.blueprintId];
        
        // Rent
        if (structureBlueprint) {
            totalExpenses += structure.getRentalCostPerTick(structureBlueprint);
        }

        // Device Costs (Maintenance & Electricity)
        for (const roomId in structure.rooms) {
            const room = structure.rooms[roomId];
            for (const zoneId in room.zones) {
                const zone = room.zones[zoneId];
                
                // Determine if lights should be on in this zone for this tick
                const hourOfDay = ticks % 24;
                const isLightOnInZone = hourOfDay < zone.lightCycle.on;

                for (const deviceId in zone.devices) {
                    const device = zone.devices[deviceId];
                    
                    // Maintenance Cost (applies to all devices)
                    const devicePrice = blueprints.devicePrices[device.blueprintId];
                    if (devicePrice) {
                        totalExpenses += devicePrice.baseMaintenanceCostPerTick;
                    }
                    
                    // Electricity Cost (only for 'on' devices)
                    if (device.status === 'on') {
                        const deviceBlueprint = blueprints.devices[device.blueprintId];
                        const powerKw = deviceBlueprint?.settings?.power;
                        
                        if (powerKw) {
                            let shouldIncurPowerCost = true;
                            // **FIX**: Lamps only incur cost if the light cycle says they are on.
                            if (deviceBlueprint.kind === 'Lamp') {
                                shouldIncurPowerCost = isLightOnInZone;
                            }
                            
                            if (shouldIncurPowerCost) {
                                // 1 tick = 1 hour, so kWh = kW * 1h
                                totalExpenses += powerKw * pricePerKwh;
                            }
                        }
                    }
                }
            }
        }
    }

    this.capital -= totalExpenses;
  }
  
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      capital: this.capital,
      structures: Object.fromEntries(Object.entries(this.structures).map(([id, struct]) => [id, struct.toJSON()])),
      customStrains: this.customStrains,
    };
  }
}