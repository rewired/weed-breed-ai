import type { ExpenseCategory, RevenueCategory, BlueprintDB } from '../../types';
import type { Structure } from '../Structure';
import { getBlueprints } from '../../blueprints';

import type { Company } from '../Company';

export class FinanceService {
  constructor(private readonly company: Company) {}

  logExpense(category: ExpenseCategory, amount: number) {
    if (amount > 0) {
      this.company.ledger.expenses[category] = (this.company.ledger.expenses[category] || 0) + amount;
    }
  }

  logRevenue(category: RevenueCategory, amount: number) {
    if (amount > 0) {
      this.company.ledger.revenue[category] = (this.company.ledger.revenue[category] || 0) + amount;
      this.company.capital += amount;
    }
  }

  spendCapital(amount: number): boolean {
    if (this.company.capital < amount) {
      alert('Not enough capital for this purchase!');
      return false;
    }
    this.company.capital -= amount;
    return true;
  }

  recordSalaries(amount: number) {
    if (amount <= 0) return;
    this.logExpense('salaries', amount);
    this.company.capital -= amount;
  }

  applyOperatingCosts(structures: Record<string, Structure>, ticks: number) {
    const blueprints: BlueprintDB = getBlueprints();
    let totalRent = 0;
    let totalMaintenance = 0;
    let totalPower = 0;

    const pricePerKwh = blueprints.utilityPrices.pricePerKwh;

    for (const structureId in structures) {
      const structure = structures[structureId];
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

    this.company.capital -= totalRent + totalMaintenance + totalPower;
  }
}
