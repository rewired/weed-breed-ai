import { Zone } from './Zone';
import { RoomPurpose } from '../roomPurposes';
import { Company, Structure } from '../types';

export class Room {
  id: string;
  name: string;
  area_m2: number;
  purpose: RoomPurpose;
  zones: Record<string, Zone>;

  constructor(data: any) {
    this.id = data.id;
    this.name = data.name;
    this.area_m2 = data.area_m2;
    this.purpose = data.purpose || 'growroom';
    this.zones = {};
    if (data.zones) {
      for (const zoneId in data.zones) {
        this.zones[zoneId] = new Zone(data.zones[zoneId]);
      }
    }
  }
  
  getUsedArea(): number {
    return Object.values(this.zones).reduce((sum, zone) => sum + zone.area_m2, 0);
  }
  
  getAvailableArea(): number {
    return this.area_m2 - this.getUsedArea();
  }
  
  addZone(name: string, area: number, cultivationMethodId: string): boolean {
    if (area > this.getAvailableArea()) {
      alert("Not enough space in the room!");
      return false;
    }
    
    const newZoneId = `zone-${Date.now()}`;
    const newZone = new Zone({
      id: newZoneId,
      name: name,
      area_m2: area,
      cultivationMethodId: cultivationMethodId,
      plants: {},
      devices: {},
    });
    
    this.zones[newZoneId] = newZone;
    return true;
  }
  
  deleteZone(zoneId: string): void {
    delete this.zones[zoneId];
  }

  update(company: Company, structure: Structure, rng: () => number) {
    for (const zoneId in this.zones) {
      this.zones[zoneId].update(company, structure, rng);
    }
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      area_m2: this.area_m2,
      purpose: this.purpose,
      zones: Object.fromEntries(Object.entries(this.zones).map(([id, zone]) => [id, zone.toJSON()])),
    };
  }
}
