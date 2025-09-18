import { Company, ExpenseCategory, RevenueCategory } from '../types';
import { getBlueprints } from '../blueprints';

export function logExpense(company: Company, category: ExpenseCategory, amount: number) {
  if (amount > 0) {
    company.ledger.expenses[category] = (company.ledger.expenses[category] || 0) + amount;
  }
}

export function logRevenue(company: Company, category: RevenueCategory, amount: number) {
  if (amount > 0) {
    company.ledger.revenue[category] = (company.ledger.revenue[category] || 0) + amount;
    company.capital += amount;
  }
}

export function spendCapital(company: Company, amount: number): boolean {
  if (company.capital < amount) {
    alert("Not enough capital for this purchase!");
    return false;
  }
  company.capital -= amount;
  return true;
}

export function processTickCosts(company: Company, ticks: number) {
    let totalRent = 0;
    let totalMaintenance = 0;
    let totalPower = 0;
    
    const blueprints = getBlueprints();
    const pricePerKwh = blueprints.utilityPrices.pricePerKwh;

    for (const structureId in company.structures) {
        const structure = company.structures[structureId];
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
    
    logExpense(company, 'rent', totalRent);
    logExpense(company, 'maintenance', totalMaintenance);
    logExpense(company, 'power', totalPower);
    
    company.capital -= (totalRent + totalMaintenance + totalPower);
}
