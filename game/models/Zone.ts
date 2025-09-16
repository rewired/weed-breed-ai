import { Plant, Device } from '../types';
import { getBlueprints } from '../blueprints';

export class Zone {
  id: string;
  name: string;
  area_m2: number;
  cultivationMethodId: string;
  plants: Record<string, Plant>;
  devices: Record<string, Device>;
  currentEnvironment: Record<string, any>; // Simplified

  constructor(data: any) {
    if (!data.cultivationMethodId) {
        throw new Error("A zone must be created with a cultivationMethodId.");
    }
    this.id = data.id;
    this.name = data.name;
    this.area_m2 = data.area_m2;
    this.cultivationMethodId = data.cultivationMethodId;
    this.plants = data.plants || {};
    this.devices = data.devices || {};
    this.currentEnvironment = data.currentEnvironment || {};
  }
  
  addDevice(blueprintId: string): void {
    const blueprints = getBlueprints();
    const blueprint = blueprints.devices[blueprintId];
    if (!blueprint) {
        console.error(`Cannot add device. Blueprint not found for id: ${blueprintId}`);
        return;
    }
    
    const priceInfo = blueprints.devicePrices[blueprintId];

    const newDeviceId = `device-${Date.now()}`;
    const newDevice: Device = {
      id: newDeviceId,
      blueprintId: blueprintId,
      name: blueprint.name,
      status: 'off',
      durability: 1.0,
      maintenanceCostPerTick: priceInfo?.baseMaintenanceCostPerTick || 0,
    };

    this.devices[newDeviceId] = newDevice;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      area_m2: this.area_m2,
      cultivationMethodId: this.cultivationMethodId,
      plants: this.plants,
      devices: this.devices,
      currentEnvironment: this.currentEnvironment,
    };
  }
}