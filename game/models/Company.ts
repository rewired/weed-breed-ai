import { Structure, StructureBlueprint, BlueprintDB, Zone } from '../types';
import { getBlueprints } from '../blueprints';

export class Company {
  id: string;
  name: string;
  capital: number;
  structures: Record<string, Structure>;

  constructor(data: any) {
    this.id = data.id;
    this.name = data.name;
    this.capital = data.capital;
    this.structures = {};
    if (data.structures) {
      for (const structId in data.structures) {
        this.structures[structId] = new Structure(data.structures[structId]);
      }
    }
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

  // FIX: Added purchaseDeviceForZone method to encapsulate the logic for buying a device
  // and assigning it to a zone. This handles capital expenditure and then adds the device.
  purchaseDeviceForZone(blueprintId: string, zone: Zone): boolean {
    const blueprints = getBlueprints();
    const priceInfo = blueprints.devicePrices[blueprintId];

    if (!priceInfo) {
      console.error(`No price info found for device blueprint ${blueprintId}`);
      alert("Could not purchase device: price information is missing.");
      return false;
    }
    
    const cost = priceInfo.capitalExpenditure;
    if (this.spendCapital(cost)) {
        zone.addDevice(blueprintId);
        return true;
    }
    return false;
  }

  update() {
    let totalExpenses = 0;
    const structureBlueprints = getBlueprints().structures;

    for (const structureId in this.structures) {
      const structure = this.structures[structureId];
      const blueprint = structureBlueprints[structure.blueprintId];
      if (blueprint) {
        totalExpenses += structure.getRentalCostPerTick(blueprint);
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
    };
  }
}
