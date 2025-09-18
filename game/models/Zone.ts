import { Device, Company, StrainBlueprint, CultivationMethodBlueprint, DeviceBlueprint, GroupedDeviceInfo, Structure, Planting as IPlanting, ZoneStatus, PlantingPlan as IPlantingPlan } from '../types';
import { getBlueprints, getAvailableStrains } from '../blueprints';
import { Planting } from './Planting';
import { Plant, GrowthStage } from './Plant';
import * as ENV from '../constants/environment';

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
  cyclesUsed: number;
  status: ZoneStatus;
  plantingPlan: IPlantingPlan | null;
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
    this.cyclesUsed = data.cyclesUsed || 0;
    this.status = data.status || 'Ready';
    this.plantingPlan = data.plantingPlan || null;
    
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
            if (data.plantings[plantingId] instanceof Planting) {
                this.plantings[plantingId] = data.plantings[plantingId];
            } else {
                this.plantings[plantingId] = new Planting(data.plantings[plantingId]);
            }
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
  
  setPlantingPlan(plan: IPlantingPlan | null) {
    this.plantingPlan = plan;
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
        const offCount = group.statuses.filter(s => s === 'off').length;
        const brokenCount = group.statuses.filter(s => s === 'broken').length;
        
        let status: 'on' | 'off' | 'mixed' | 'broken' = 'off';
        if (brokenCount === group.statuses.length) {
            status = 'broken';
        } else if (onCount > 0 && offCount > 0) {
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
    const requiredAirflow = zoneVolume * ENV.RECOMMENDED_ACH;

    let actualAirflow = 0;
    const blueprints = getBlueprints();

    for (const deviceId in this.devices) {
        const device = this.devices[deviceId];
        if (device.status !== 'on') continue;

        const blueprint = blueprints.devices[device.blueprintId] as DeviceBlueprint;
        if ((blueprint?.kind === 'ClimateUnit' || blueprint?.kind === 'Ventilation') && blueprint.settings?.airflow) {
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
    const requiredDehumidification = this.area_m2 * ENV.BASE_DEHUMIDIFICATION_LOAD_PER_M2_PER_H;
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
    const requiredInjectionRate = this.area_m2 * ENV.BASE_CO2_INJECTION_PPM_PER_TICK_PER_M2;
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

  plantStrain(strainId: string, quantity: number, company: Company, rng: () => number): { germinatedCount: number } {
    const capacity = this.getPlantCapacity();
    const currentCount = this.getTotalPlantedCount();

    if (currentCount + quantity > capacity) {
        alert(`Planting failed: Not enough space. This zone has ${capacity - currentCount} available plant slots, but you tried to plant ${quantity}.`);
        return { germinatedCount: 0 };
    }

    const allStrains = { ...getBlueprints().strains, ...company.customStrains };
    const strainBlueprint = allStrains[strainId];
    if (!strainBlueprint) {
        console.error(`No strain blueprint found for id ${strainId}`);
        alert('Could not plant strain: blueprint missing.');
        return { germinatedCount: 0 };
    }
    
    const germinationRate = strainBlueprint.germinationRate ?? 1.0;
    const germinatedPlants: Plant[] = [];
    for (let i = 0; i < quantity; i++) {
        if (rng() <= germinationRate) {
            germinatedPlants.push(new Plant(strainId));
        }
    }

    if (germinatedPlants.length > 0) {
        const newPlantingId = `planting-${Date.now()}`;
        const newPlanting = new Planting({
            id: newPlantingId,
            strainId,
            quantity: germinatedPlants.length,
            plants: germinatedPlants,
        });
        
        this.plantings[newPlantingId] = newPlanting;
        this.status = 'Growing';
    }

    return { germinatedCount: germinatedPlants.length };
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

  getTotalExpectedYield(allStrains: Record<string, StrainBlueprint>): number {
    return Object.values(this.plantings).reduce((total, planting) => {
        const strain = allStrains[planting.strainId];
        if (strain) {
            const plantingYield = planting.plants.reduce((sum, plant) => sum + plant.getExpectedYield(strain), 0);
            return total + plantingYield;
        }
        return total;
    }, 0);
  }

  getHarvestablePlants(): { plant: Plant, planting: Planting }[] {
    const harvestable: { plant: Plant, planting: Planting }[] = [];
    for (const plantingId in this.plantings) {
        const planting = this.plantings[plantingId];
        for (const plant of planting.plants) {
            if (plant.growthStage === GrowthStage.Harvestable) {
                harvestable.push({ plant, planting });
            }
        }
    }
    return harvestable;
  }
  
  cleanupEmptyPlantings() {
      for (const plantingId in this.plantings) {
          if (this.plantings[plantingId].quantity <= 0) {
              delete this.plantings[plantingId];
          }
      }
  }

  calculateDuplicationCost(): { deviceCost: number, setupCost: number, total: number } {
    const blueprints = getBlueprints();
    let deviceCost = 0;
    let setupCost = 0;

    // Device costs
    for (const deviceId in this.devices) {
      const device = this.devices[deviceId];
      const priceInfo = blueprints.devicePrices[device.blueprintId];
      if (priceInfo) {
        deviceCost += priceInfo.capitalExpenditure;
      }
    }

    // Cultivation method setup cost
    const cultivationMethod = blueprints.cultivationMethods[this.cultivationMethodId];
    if (cultivationMethod) {
      setupCost = (cultivationMethod.setupCost || 0) * this.area_m2;
    }
    
    return {
        deviceCost,
        setupCost,
        total: deviceCost + setupCost,
    };
  }

  getSupplyConsumptionRates(company: Company): { waterPerDay: number; nutrientsPerDay: number } {
    let waterPerTick = 0;
    let nutrientsPerTick = 0;
    const allStrains = getAvailableStrains(company);
    const cultivationMethod = getBlueprints().cultivationMethods[this.cultivationMethodId];
    if (!cultivationMethod || !cultivationMethod.areaPerPlant) {
      return { waterPerDay: 0, nutrientsPerDay: 0 };
    }

    const areaPerPlant = cultivationMethod.areaPerPlant;

    for (const planting of Object.values(this.plantings)) {
      const strain = allStrains[planting.strainId];
      if (!strain) continue;

      nutrientsPerTick += planting.getTotalNutrientDemandPerTick(strain);

      if (strain.waterDemand?.dailyWaterUsagePerSquareMeter) {
        for (const plant of planting.plants) {
          let stage = plant.growthStage;
          if (stage === GrowthStage.Dead) continue;
          if (stage === GrowthStage.Harvestable) stage = GrowthStage.Flowering;

          const waterUsagePerSqmPerDay = strain.waterDemand.dailyWaterUsagePerSquareMeter[stage];
          if (waterUsagePerSqmPerDay) {
            const waterUsagePerPlantPerDay = waterUsagePerSqmPerDay * areaPerPlant;
            waterPerTick += waterUsagePerPlantPerDay / 24;
          }
        }
      }
    }
    return {
      waterPerDay: waterPerTick * 24,
      nutrientsPerDay: nutrientsPerTick * 24,
    };
  }

  updateEnvironment(structure: Structure, isLightOn: boolean) {
    let tempDelta = 0;
    let humidityDelta = 0;
    let co2Delta = 0;

    const blueprints = getBlueprints();
    const zoneVolume = this.area_m2 * structure.height_m;
    if (zoneVolume <= 0) return;

    let totalAirflow = 0;
    for (const deviceId in this.devices) {
        const device = this.devices[deviceId];
        if (device.status !== 'on') continue;
        const blueprint = blueprints.devices[device.blueprintId];
        if (blueprint?.settings?.airflow && (blueprint.kind === 'Ventilation' || blueprint.kind === 'ClimateUnit')) {
            totalAirflow += blueprint.settings.airflow;
        }
    }
    const airChangesPerTick = zoneVolume > 0 ? totalAirflow / zoneVolume : 0;
    const airExchangeMultiplier = 1.0 + (airChangesPerTick / ENV.RECOMMENDED_ACH);

    for (const deviceId in this.devices) {
        const device = this.devices[deviceId];
        if (device.status !== 'on') continue;

        const blueprint = blueprints.devices[device.blueprintId];
        if (!blueprint) continue;
        
        const settings = this.deviceGroupSettings[device.blueprintId] || blueprint.settings || {};

        switch(blueprint.kind) {
            case 'Lamp':
                if (isLightOn && settings.power && settings.heatFraction) {
                    tempDelta += (settings.power * settings.heatFraction) * ENV.LAMP_HEAT_FACTOR;
                }
                break;
            case 'ClimateUnit':
                 if (settings.coolingCapacity && this.currentEnvironment.temperature_C > settings.targetTemperature) {
                    const tempDiff = this.currentEnvironment.temperature_C - settings.targetTemperature;
                    const coolingEffect = Math.min(1, tempDiff / (settings.fullPowerAtDeltaK || 2)) * settings.coolingCapacity;
                    tempDelta -= coolingEffect * ENV.COOLING_CAPACITY_FACTOR;
                }
                break;
            case 'Dehumidifier':
                if (settings.latentRemovalKgPerTick && settings.power) {
                    const airMass = zoneVolume * 1.225;
                    humidityDelta -= (settings.latentRemovalKgPerTick / airMass);
                    tempDelta += settings.power * ENV.DEHUMIDIFIER_HEAT_FACTOR;
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

    const totalPlantCount = this.getTotalPlantedCount();
    if (totalPlantCount > 0) {
        humidityDelta += totalPlantCount * ENV.PLANT_TRANSPIRATION_RH_PER_PLANT;
        co2Delta -= totalPlantCount * ENV.PLANT_CO2_CONSUMPTION_PPM_PER_PLANT;
    }

    tempDelta += (ENV.AMBIENT_TEMP_C - this.currentEnvironment.temperature_C) * ENV.TEMP_NORMALIZATION_FACTOR * airExchangeMultiplier;
    humidityDelta += (ENV.AMBIENT_HUMIDITY_RH - this.currentEnvironment.humidity_rh) * ENV.HUMIDITY_NORMALIZATION_FACTOR * airExchangeMultiplier;
    co2Delta += (ENV.AMBIENT_CO2_PPM - this.currentEnvironment.co2_ppm) * ENV.CO2_NORMALIZATION_FACTOR * airExchangeMultiplier;

    this.currentEnvironment.temperature_C += tempDelta;
    this.currentEnvironment.humidity_rh += humidityDelta;
    this.currentEnvironment.co2_ppm += co2Delta;

    this.currentEnvironment.humidity_rh = Math.max(0, Math.min(1, this.currentEnvironment.humidity_rh));
    this.currentEnvironment.co2_ppm = Math.max(0, this.currentEnvironment.co2_ppm);
  }

  update(company: Company, structure: Structure, rng: () => number, ticks: number) {
      if (this.status !== 'Growing') {
        return;
      }

      const hourOfDay = ticks % 24;
      const isLightOn = hourOfDay < this.lightCycle.on;

      this.updateEnvironment(structure, isLightOn);
      
      const allStrains = getAvailableStrains(company);
      
      for (const plantingId in this.plantings) {
        const planting = this.plantings[plantingId];
        const strain = allStrains[planting.strainId];
        if (strain) {
            const hasWater = this.waterLevel_L > 0;
            const hasNutrients = this.nutrientLevel_g > 0;
            const lightingDetails = this.getLightingDetails();
            const environment = {
                temperature_C: this.currentEnvironment.temperature_C,
                averagePPFD: lightingDetails.averagePPFD,
            };
            
            planting.update(strain, environment, rng, isLightOn, hasWater, hasNutrients, this.lightCycle.on, ENV.BASE_DISEASE_CHANCE_PER_TICK);
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
      plantings: Object.fromEntries(Object.entries(this.plantings).map(([id, planting]) => [id, planting.toJSON()])),
      deviceGroupSettings: this.deviceGroupSettings,
      lightCycle: this.lightCycle,
      waterLevel_L: this.waterLevel_L,
      nutrientLevel_g: this.nutrientLevel_g,
      cyclesUsed: this.cyclesUsed,
      status: this.status,
      plantingPlan: this.plantingPlan,
      currentEnvironment: this.currentEnvironment,
    };
  }
}