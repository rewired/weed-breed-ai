import { Device, Company, StrainBlueprint, CultivationMethodBlueprint, DeviceBlueprint, GroupedDeviceInfo, Structure } from '../types';
import { getBlueprints } from '../blueprints';
import { Planting } from './Planting';
import { Plant, GrowthStage } from './Plant';

// --- Constants for Environmental Calculations ---
const RECOMMENDED_ACH = 5; // Air Changes per Hour for climate control
const BASE_DEHUMIDIFICATION_LOAD_PER_M2_PER_H = 0.02; // kg of water vapor produced by plants per m^2 per hour
const BASE_CO2_INJECTION_PPM_PER_TICK_PER_M2 = 5; // Required CO2 injection rate to counteract consumption and leakage

// --- Constants for Simulation ---
const AMBIENT_TEMP_C = 20;
const AMBIENT_HUMIDITY_RH = 0.50; // 50%
const AMBIENT_CO2_PPM = 400;

// Rate at which the zone normalizes to ambient conditions per tick (e.g., 10% of the difference)
const TEMP_NORMALIZATION_FACTOR = 0.1;
const HUMIDITY_NORMALIZATION_FACTOR = 0.05;
const CO2_NORMALIZATION_FACTOR = 0.1;

// Magic numbers for device/plant effects
const LAMP_HEAT_FACTOR = 0.5; // kW of power -> degrees C per tick
const COOLING_CAPACITY_FACTOR = 0.8; // kW of cooling -> degrees C per tick
const DEHUMIDIFIER_HEAT_FACTOR = 0.2; // kW of power -> degrees C per tick
const PLANT_TRANSPIRATION_RH_PER_PLANT = 0.00005; // RH increase per plant per tick
const PLANT_CO2_CONSUMPTION_PPM_PER_PLANT = 0.2;

export class Zone {
  id: string;
  name: string;
  area_m2: number;
  cultivationMethodId: string;
  devices: Record<string, Device>;
  plantings: Record<string, Planting>;
  deviceGroupSettings: Record<string, any>;
  lightCycle: { on: number; off: number };
  waterLevel_L: number;
  nutrientLevel_g: number;
  currentEnvironment: {
    temperature_C: number;
    humidity_rh: number; // 0-1
    co2_ppm: number;
  };

  constructor(data: any) {
    if (!data.cultivationMethodId) {
        throw new Error("A zone must be created with a cultivationMethodId.");
    }
    this.id = data.id;
    this.name = data.name;
    this.area_m2 = data.area_m2;
    this.cultivationMethodId = data.cultivationMethodId;
    this.devices = data.devices || {};
    this.deviceGroupSettings = data.deviceGroupSettings || {};
    this.lightCycle = data.lightCycle || { on: 18, off: 6 };
    this.waterLevel_L = data.waterLevel_L || 0;
    this.nutrientLevel_g = data.nutrientLevel_g || 0;
    
    // --- MIGRATION & INITIALIZATION LOGIC ---
    const blueprints = getBlueprints();
    const uniqueBlueprintIds = new Set(Object.values(this.devices).map(d => d.blueprintId));

    uniqueBlueprintIds.forEach(blueprintId => {
        // If settings for this group don't exist, create them.
        if (!this.deviceGroupSettings[blueprintId]) {
            // Find a device of this type to potentially migrate settings from.
            const deviceToMigrateFrom = Object.values(this.devices).find(d => d.blueprintId === blueprintId);
            
            // Check if old settings exist on the device instance itself (old save format)
            if (deviceToMigrateFrom && (deviceToMigrateFrom as any).settings) {
                this.deviceGroupSettings[blueprintId] = { ...((deviceToMigrateFrom as any).settings) };
            } else {
                // Otherwise, fall back to blueprint defaults
                const blueprint = blueprints.devices[blueprintId];
                if (blueprint && blueprint.settings) {
                    this.deviceGroupSettings[blueprintId] = { ...blueprint.settings };
                }
            }
        }
    });

    // Clean up old settings from individual devices after migration.
    Object.values(this.devices).forEach(device => {
        if ((device as any).settings) {
            delete (device as any).settings;
        }
    });
    
    this.plantings = {};
    if (data.plantings) {
        for (const plantingId in data.plantings) {
            this.plantings[plantingId] = new Planting(data.plantings[plantingId]);
        }
    }
    
    const defaults = {
        temperature_C: 22,
        humidity_rh: 0.60,
        co2_ppm: 400,
    };

    const loadedEnv = data.currentEnvironment || {};

    this.currentEnvironment = {
        temperature_C: typeof loadedEnv.temperature_C === 'number' && !isNaN(loadedEnv.temperature_C) ? loadedEnv.temperature_C : defaults.temperature_C,
        humidity_rh: typeof loadedEnv.humidity_rh === 'number' && !isNaN(loadedEnv.humidity_rh) ? loadedEnv.humidity_rh : defaults.humidity_rh,
        co2_ppm: typeof loadedEnv.co2_ppm === 'number' && !isNaN(loadedEnv.co2_ppm) ? loadedEnv.co2_ppm : defaults.co2_ppm,
    };
  }
  
  toggleDeviceGroupStatus(blueprintId: string): void {
    const devicesInGroup = Object.values(this.devices).filter(d => d.blueprintId === blueprintId && d.status !== 'broken');
    if (devicesInGroup.length === 0) return;

    const shouldTurnOn = devicesInGroup.every(d => d.status === 'off');
    const newStatus = shouldTurnOn ? 'on' : 'off';

    devicesInGroup.forEach(device => {
        device.status = newStatus;
    });
  }

  getGroupedDevices(): GroupedDeviceInfo[] {
    const grouped: Record<string, { name: string; blueprintId: string; statuses: ('on' | 'off' | 'broken')[] }> = {};

    for (const deviceId in this.devices) {
        const device = this.devices[deviceId];
        if (!grouped[device.blueprintId]) {
            grouped[device.blueprintId] = {
                name: device.name,
                blueprintId: device.blueprintId,
                statuses: [],
            };
        }
        grouped[device.blueprintId].statuses.push(device.status);
    }

    return Object.values(grouped).map(group => {
        const onCount = group.statuses.filter(s => s === 'on').length;
        const offCount = group.statuses.filter(s => s === 'off' || s === 'broken').length;
        
        let status: 'on' | 'off' | 'mixed' = 'off';
        if (onCount > 0 && offCount > 0) {
            status = 'mixed';
        } else if (onCount > 0) {
            status = 'on';
        }

        return {
            blueprintId: group.blueprintId,
            name: group.name,
            count: group.statuses.length,
            status: status,
        };
    });
  }

  addDevice(blueprintId: string): void {
    const blueprints = getBlueprints();
    const blueprint = blueprints.devices[blueprintId];
    if (!blueprint) {
        console.error(`Cannot add device. Blueprint not found for id: ${blueprintId}`);
        return;
    }
    
    const priceInfo = blueprints.devicePrices[blueprintId];

    const newDeviceId = `device-${Date.now()}-${Math.random()}`;
    const newDevice: Device = {
      id: newDeviceId,
      blueprintId: blueprintId,
      name: blueprint.name,
      status: 'on',
      durability: 1.0,
      maintenanceCostPerTick: priceInfo?.baseMaintenanceCostPerTick || 0,
    };

    this.devices[newDeviceId] = newDevice;

    // Initialize group settings if they don't exist
    if (!this.deviceGroupSettings[blueprintId] && blueprint.settings) {
      this.deviceGroupSettings[blueprintId] = { ...blueprint.settings };
    }
  }
  
  removeDevice(deviceId: string): void {
    delete this.devices[deviceId];
  }

  removePlanting(plantingId: string): void {
    delete this.plantings[plantingId];
  }

  getPlantCapacity(): number {
    const cultivationMethod = getBlueprints().cultivationMethods[this.cultivationMethodId] as CultivationMethodBlueprint;
    if (!cultivationMethod || !cultivationMethod.areaPerPlant || cultivationMethod.areaPerPlant <= 0) {
      return 0;
    }
    return Math.floor(this.area_m2 / cultivationMethod.areaPerPlant);
  }

  getTotalPlantedCount(): number {
    return Object.values(this.plantings).reduce((sum, planting) => sum + planting.quantity, 0);
  }

  getClimateControlDetails(structureHeight: number) {
    const zoneVolume = this.area_m2 * structureHeight;
    const requiredAirflow = zoneVolume * RECOMMENDED_ACH;

    let actualAirflow = 0;
    const blueprints = getBlueprints();

    for (const deviceId in this.devices) {
        const device = this.devices[deviceId];
        if (device.status !== 'on') continue;

        const blueprint = blueprints.devices[device.blueprintId] as DeviceBlueprint;
        if (blueprint?.kind === 'ClimateUnit' && blueprint.settings?.airflow) {
            actualAirflow += blueprint.settings.airflow;
        }
    }
    
    return {
        requiredAirflow,
        actualAirflow,
        isSufficient: actualAirflow >= requiredAirflow,
    };
  }
  
  getHumidityControlDetails() {
    // Assuming 1 tick = 1 hour for this calculation's purpose
    const requiredDehumidification = this.area_m2 * BASE_DEHUMIDIFICATION_LOAD_PER_M2_PER_H;
    let actualDehumidification = 0;
    const blueprints = getBlueprints();

    for (const deviceId in this.devices) {
        const device = this.devices[deviceId];
        if (device.status !== 'on') continue;

        const blueprint = blueprints.devices[device.blueprintId] as DeviceBlueprint;
        if (blueprint?.kind === 'Dehumidifier' && blueprint.settings?.latentRemovalKgPerTick) {
            actualDehumidification += blueprint.settings.latentRemovalKgPerTick;
        }
        if (blueprint?.kind === 'HumidityControlUnit' && blueprint.settings?.dehumidifyRateKgPerTick) {
            actualDehumidification += blueprint.settings.dehumidifyRateKgPerTick;
        }
    }

    return {
        requiredDehumidification,
        actualDehumidification,
        isSufficient: actualDehumidification >= requiredDehumidification,
    };
  }

  getCO2Details() {
    const requiredInjectionRate = this.area_m2 * BASE_CO2_INJECTION_PPM_PER_TICK_PER_M2;
    let actualInjectionRate = 0;
    const blueprints = getBlueprints();
    
    for (const deviceId in this.devices) {
        const device = this.devices[deviceId];
        if (device.status !== 'on') continue;

        const blueprint = blueprints.devices[device.blueprintId] as DeviceBlueprint;
        if (blueprint?.kind === 'CO2Injector' && blueprint.settings?.pulsePpmPerTick) {
            actualInjectionRate += blueprint.settings.pulsePpmPerTick;
        }
    }

    return {
        requiredInjectionRate,
        actualInjectionRate,
        isSufficient: actualInjectionRate >= requiredInjectionRate,
    };
  }

  getLightingDetails() {
    const blueprints = getBlueprints();
    let totalCoverage = 0;
    let totalWeightedPPFD = 0; // sum of (ppfd * coverageArea)
    const photoperiodHours = this.lightCycle.on;

    for (const deviceId in this.devices) {
        const device = this.devices[deviceId];
        if (device.status !== 'on') {
            continue;
        }

        const blueprint = blueprints.devices[device.blueprintId] as DeviceBlueprint;
        if (blueprint?.kind === 'Lamp' && blueprint.settings?.coverageArea && blueprint.settings?.ppfd) {
            const coverage = blueprint.settings.coverageArea;
            const ppfd = blueprint.settings.ppfd;
            totalCoverage += coverage;
            totalWeightedPPFD += ppfd * coverage;
        }
    }
    
    const averagePPFD = totalCoverage > 0 ? totalWeightedPPFD / totalCoverage : 0;
    const dli = (averagePPFD * photoperiodHours * 3600) / 1_000_000;

    return {
        coverage: totalCoverage,
        averagePPFD,
        dli,
    };
  }

  plantStrain(strainId: string, quantity: number, company: Company): boolean {
    const capacity = this.getPlantCapacity();
    const currentCount = this.getTotalPlantedCount();

    if (currentCount + quantity > capacity) {
        alert(`Planting failed: Not enough space. This zone has ${capacity - currentCount} available plant slots, but you tried to plant ${quantity}.`);
        return false;
    }

    const strainPriceInfo = getBlueprints().strainPrices[strainId] || getBlueprints().strainPrices[Object.values(getBlueprints().strains).find(s => s.id === strainId)?.id || ''];

    if (!strainPriceInfo) {
        console.error(`No price info for strain ${strainId}`);
        alert('Could not plant strain: price info missing.');
        return false;
    }
    const totalCost = strainPriceInfo.seedPrice * quantity;
    
    if (!company.spendCapital(totalCost)) {
        return false; // spendCapital already shows an alert
    }
    
    const newPlantingId = `planting-${Date.now()}`;
    const newPlanting = new Planting({
        id: newPlantingId,
        strainId,
        quantity,
    });
    
    this.plantings[newPlantingId] = newPlanting;
    return true;
  }

  getDominantPlantingInfo(allStrains: Record<string, StrainBlueprint>): { stage: GrowthStage, progress: number } | null {
    if (Object.keys(this.plantings).length === 0) return null;

    let largestPlanting: Planting | null = null;
    let maxQuantity = 0;
    for (const plantingId in this.plantings) {
        const planting = this.plantings[plantingId];
        if (planting.quantity > maxQuantity) {
            maxQuantity = planting.quantity;
            largestPlanting = planting;
        }
    }

    if (!largestPlanting) return null;
    
    const strain = allStrains[largestPlanting.strainId];
    if (!strain) return null;

    return largestPlanting.getDominantStageInfo(strain);
  }

  updateEnvironment(structure: Structure, isLightOn: boolean) {
    let tempDelta = 0;
    let humidityDelta = 0;
    let co2Delta = 0;

    const blueprints = getBlueprints();
    const zoneVolume = this.area_m2 * structure.height_m;
    if (zoneVolume <= 0) return;

    // 1. Device Effects
    for (const deviceId in this.devices) {
        const device = this.devices[deviceId];
        if (device.status !== 'on') continue;

        const blueprint = blueprints.devices[device.blueprintId];
        if (!blueprint) continue;
        
        const settings = this.deviceGroupSettings[device.blueprintId] || blueprint.settings || {};

        switch(blueprint.kind) {
            case 'Lamp':
                if (isLightOn && settings.power && settings.heatFraction) {
                    tempDelta += (settings.power * settings.heatFraction) * LAMP_HEAT_FACTOR;
                }
                break;
            case 'ClimateUnit':
                 if (settings.coolingCapacity && this.currentEnvironment.temperature_C > settings.targetTemperature) {
                    const tempDiff = this.currentEnvironment.temperature_C - settings.targetTemperature;
                    const coolingEffect = Math.min(1, tempDiff / (settings.fullPowerAtDeltaK || 2)) * settings.coolingCapacity;
                    tempDelta -= coolingEffect * COOLING_CAPACITY_FACTOR;
                }
                break;
            case 'Dehumidifier':
                if (settings.latentRemovalKgPerTick && settings.power) {
                    const airMass = zoneVolume * 1.225; // kg of air
                    humidityDelta -= (settings.latentRemovalKgPerTick / airMass);
                    tempDelta += settings.power * DEHUMIDIFIER_HEAT_FACTOR;
                }
                break;
            case 'HumidityControlUnit':
                const airMass = zoneVolume * 1.225;
                if (settings.dehumidifyRateKgPerTick && this.currentEnvironment.humidity_rh > (settings.targetHumidity + settings.hysteresis)) {
                    humidityDelta -= (settings.dehumidifyRateKgPerTick / airMass);
                } else if (settings.humidifyRateKgPerTick && this.currentEnvironment.humidity_rh < (settings.targetHumidity - settings.hysteresis)) {
                     humidityDelta += (settings.humidifyRateKgPerTick / airMass);
                }
                break;
            case 'CO2Injector':
                if (settings.pulsePpmPerTick && this.currentEnvironment.co2_ppm < settings.targetCO2) {
                    co2Delta += settings.pulsePpmPerTick;
                }
                break;
        }
    }

    // 2. Plant Effects
    const totalPlantCount = this.getTotalPlantedCount();
    if (totalPlantCount > 0) {
        humidityDelta += totalPlantCount * PLANT_TRANSPIRATION_RH_PER_PLANT;
        co2Delta -= totalPlantCount * PLANT_CO2_CONSUMPTION_PPM_PER_PLANT;
    }

    // 3. Normalization towards Ambient
    tempDelta += (AMBIENT_TEMP_C - this.currentEnvironment.temperature_C) * TEMP_NORMALIZATION_FACTOR;
    humidityDelta += (AMBIENT_HUMIDITY_RH - this.currentEnvironment.humidity_rh) * HUMIDITY_NORMALIZATION_FACTOR;
    co2Delta += (AMBIENT_CO2_PPM - this.currentEnvironment.co2_ppm) * CO2_NORMALIZATION_FACTOR;

    // 4. Apply Deltas
    this.currentEnvironment.temperature_C += tempDelta;
    this.currentEnvironment.humidity_rh += humidityDelta;
    this.currentEnvironment.co2_ppm += co2Delta;

    // 5. Clamp values
    this.currentEnvironment.humidity_rh = Math.max(0, Math.min(1, this.currentEnvironment.humidity_rh));
    this.currentEnvironment.co2_ppm = Math.max(0, this.currentEnvironment.co2_ppm);
  }

  update(company: Company, structure: Structure, rng: () => number, ticks: number) {
      const hourOfDay = ticks % 24;
      const isLightOn = hourOfDay < this.lightCycle.on;

      this.updateEnvironment(structure, isLightOn);

      const allStrains = { ...getBlueprints().strains, ...company.customStrains };
      
      // Calculate and consume supplies
      let totalWaterDemandL = 0;
      let totalNutrientDemandG = 0; // Assuming nutrients are measured in grams for now

      for (const plantingId in this.plantings) {
          const planting = this.plantings[plantingId];
          const strain = allStrains[planting.strainId];
          if (strain) {
              const stage = planting.getGrowthStage();
              const waterDemandPerPlant = (strain.waterDemand.dailyWaterUsagePerSquareMeter[stage] || 0) * this.area_m2 / this.getPlantCapacity() / 24;
              const nutrientDemandPerPlant = (strain.nutrientDemand.dailyNutrientDemand[stage]?.nitrogen || 0) / 24; // Simplified to nitrogen for now
              
              totalWaterDemandL += waterDemandPerPlant * planting.quantity;
              totalNutrientDemandG += nutrientDemandPerPlant * planting.quantity;
          }
      }
      
      const hasWater = this.waterLevel_L >= totalWaterDemandL;
      const hasNutrients = this.nutrientLevel_g >= totalNutrientDemandG;

      if(hasWater) this.waterLevel_L -= totalWaterDemandL;
      if(hasNutrients) this.nutrientLevel_g -= totalNutrientDemandG;


      for (const plantingId in this.plantings) {
          const planting = this.plantings[plantingId];
          const strain = allStrains[planting.strainId];
          if (strain) {
              planting.update(strain, this.currentEnvironment, rng, isLightOn, hasWater, hasNutrients);
          }
      }
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      area_m2: this.area_m2,
      cultivationMethodId: this.cultivationMethodId,
      devices: this.devices,
      deviceGroupSettings: this.deviceGroupSettings,
      plantings: Object.fromEntries(Object.entries(this.plantings).map(([id, p]) => [id, p.toJSON()])),
      currentEnvironment: this.currentEnvironment,
      lightCycle: this.lightCycle,
      waterLevel_L: this.waterLevel_L,
      nutrientLevel_g: this.nutrientLevel_g,
    };
  }
}