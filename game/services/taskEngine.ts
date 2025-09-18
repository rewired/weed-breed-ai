import { Company, Employee, Task, TaskType } from '../types';
import { getAvailableStrains, getBlueprints } from '../blueprints';
import { GrowthStage } from '../models/Plant';
import { TASK_XP_REWARD, XP_PER_LEVEL } from '../constants/balance';

export function generateTasks(company: Company) {
    const definitions = getBlueprints().taskDefinitions;
    const allStrains = getAvailableStrains(company);
    
    for (const structure of Object.values(company.structures)) {
        const newTasks: Task[] = [];
        
        for (const room of Object.values(structure.rooms)) {
            for (const zone of Object.values(room.zones)) {
                
                const generateTask = (type: TaskType, itemId: string) => {
                    const def = definitions[type];
                    if (!def) return;

                    let scaleFactor = 1;
                    let description = def.description.replace('{zoneName}', zone.name);

                    switch (def.costModel.basis) {
                        case 'perSquareMeter':
                            scaleFactor = zone.area_m2;
                            description = description.replace('{area}', zone.area_m2.toFixed(0));
                            break;
                        case 'perPlant':
                            if (type === 'harvest_plants') {
                                const plantCount = zone.getHarvestablePlants().length;
                                if (plantCount === 0) return;
                                scaleFactor = plantCount;
                                description = description.replace('{plantCount}', plantCount.toString());
                            } else if (type === 'execute_planting_plan' && zone.plantingPlan) {
                                const plantCount = zone.plantingPlan.quantity;
                                if (plantCount === 0) return;
                                scaleFactor = plantCount;
                                description = description.replace('{plantCount}', plantCount.toString());
                            } else {
                                return;
                            }
                            break;
                         case 'perAction':
                             if (type === 'repair_device' || type === 'maintain_device') {
                                 const device = zone.devices[itemId];
                                 if (device) description = description.replace('{deviceName}', device.name);
                             }
                             break;
                    }
                    
                    const totalMinutes = def.costModel.laborMinutes * scaleFactor;
                    if (totalMinutes > 0) {
                        newTasks.push({
                            id: `task-${structure.id}-${type}-${itemId}`,
                            type,
                            location: { structureId: structure.id, roomId: room.id, zoneId: zone.id, itemId: itemId },
                            description,
                            priority: def.priority,
                            requiredRole: def.requiredRole,
                            requiredSkill: def.requiredSkill,
                            minSkillLevel: def.minSkillLevel,
                            durationTicks: totalMinutes / 60,
                            progressTicks: 0,
                        });
                    }
                };

                switch (zone.status) {
                    case 'Growing':
                        for (const device of Object.values(zone.devices)) {
                            if (device.status === 'broken') {
                                generateTask('repair_device', device.id);
                            } else if (device.durability < 0.8) {
                                generateTask('maintain_device', device.id);
                            }
                        }

                        generateTask('harvest_plants', zone.id);
                        
                        const consumption = zone.getSupplyConsumptionRates(company);
                        if (consumption.waterPerDay > 0 && zone.waterLevel_L / consumption.waterPerDay < 1.0) {
                            generateTask('refill_supplies_water', zone.id + '-water');
                        }
                        if (consumption.nutrientsPerDay > 0 && zone.nutrientLevel_g / consumption.nutrientsPerDay < 1.0) {
                            generateTask('refill_supplies_nutrients', zone.id + '-nutrients');
                        }
                        
                        const needsFlip = Object.values(zone.plantings).some(p => {
                            const strain = allStrains[p.strainId];
                            if (!strain) return false;
                            const idealVegCycle = strain.environmentalPreferences.lightCycle.vegetation;
                            if (zone.lightCycle.on !== idealVegCycle[0]) return false;
                            const vegDays = strain.photoperiod.vegetationDays;
                            const ticksInVeg = (plant) => (plant.ageInTicks - plant.stageStartTick);
                            return p.plants.some(plant => plant.growthStage === GrowthStage.Vegetative && (ticksInVeg(plant) / 24) >= (vegDays - 2));
                        });
                        if (needsFlip) {
                            generateTask('adjust_light_cycle', zone.id);
                        }
                        break;

                    case 'Harvested':
                        const method = getBlueprints().cultivationMethods[zone.cultivationMethodId];
                        if (method && (zone.cyclesUsed || 0) >= method.maxCycles) {
                            generateTask('overhaul_zone_substrate', zone.id);
                        } else {
                            generateTask('clean_zone', zone.id);
                        }
                        break;

                    case 'Ready':
                        generateTask('reset_light_cycle', zone.id);
                        if (zone.plantingPlan?.autoReplant) {
                            generateTask('execute_planting_plan', zone.id);
                        }
                        break;
                }
            }
        }
        structure.tasks = newTasks;
    }
}


export function resolveTask(company: Company, employee: Employee, task: Task, ticks: number, rng: () => number) {
    const structure = company.structures[task.location.structureId];
    if (!structure) return;
    const room = structure.rooms[task.location.roomId];
    if (!room) return;
    const zone = room.zones[task.location.zoneId];
    if (!zone) return;

    switch (task.type) {
        case 'repair_device':
        case 'maintain_device':
            const device = zone.devices[task.location.itemId];
            if (device) {
                device.durability = 1.0;
                if (device.status === 'broken') device.status = 'on';
            }
            break;
        case 'harvest_plants':
            const plantsToHarvest = zone.getHarvestablePlants();
            if (plantsToHarvest.length > 0) {
                const negotiationSkill = structure.getMaxSkill(company, 'Negotiation', 'Salesperson');
                const negotiationBonus = (negotiationSkill / 10) * 0.10;
                company.harvestPlants(plantsToHarvest, negotiationBonus);
                zone.cleanupEmptyPlantings();
                if (zone.getTotalPlantedCount() === 0) {
                    zone.cyclesUsed = (zone.cyclesUsed || 0) + 1;
                    zone.status = 'Harvested';
                    company.alerts.push({ id: `alert-${zone.id}-harvested-${ticks}`, type: 'zone_harvested', message: `Zone '${zone.name}' is harvested and needs cleaning.`, location: task.location, tickGenerated: ticks });
                }
            }
            break;
        case 'refill_supplies_water':
            company.purchaseSuppliesForZone(zone, 'water', 1000);
            break;
        case 'refill_supplies_nutrients':
            company.purchaseSuppliesForZone(zone, 'nutrients', 1000);
            break;
        case 'clean_zone':
            zone.status = 'Ready';
            company.alerts.push({ id: `alert-${zone.id}-ready-${ticks}`, type: 'zone_ready', message: `Zone '${zone.name}' is clean and ready for planting.`, location: task.location, tickGenerated: ticks });
            break;
        case 'overhaul_zone_substrate':
            const method = getBlueprints().cultivationMethods[zone.cultivationMethodId];
            if (method) {
                const cost = (method.setupCost || 0) * zone.area_m2;
                if (company.spendCapital(cost)) {
                    company.logExpense('supplies', cost);
                    zone.cyclesUsed = 0;
                    zone.status = 'Ready';
                    company.alerts.push({ id: `alert-${zone.id}-ready-${ticks}`, type: 'zone_ready', message: `Zone '${zone.name}' is overhauled and ready.`, location: task.location, tickGenerated: ticks });
                }
            }
            break;
        case 'reset_light_cycle':
            const strainId = zone.plantingPlan?.strainId;
            const strain = strainId ? getAvailableStrains(company)[strainId] : null;
            if (strain) {
                const [on, off] = strain.environmentalPreferences.lightCycle.vegetation;
                zone.lightCycle = { on, off };
            } else {
                zone.lightCycle = { on: 18, off: 6 };
            }
            break;
        case 'execute_planting_plan':
            if (zone.plantingPlan) {
                const { strainId, quantity } = zone.plantingPlan;
                if (company.purchaseSeeds(strainId, quantity)) {
                    zone.plantStrain(strainId, quantity, company, rng);
                    zone.status = 'Growing';
                }
            }
            break;
        case 'adjust_light_cycle':
            const plantingToFlip = Object.values(zone.plantings).find(p => {
                const strain = getAvailableStrains(company)[p.strainId];
                if (!strain) return false;
                const vegDays = strain.photoperiod.vegetationDays;
                return p.plants.some(plant => 
                    plant.growthStage === GrowthStage.Vegetative &&
                    ((plant.ageInTicks - plant.stageStartTick) / 24) >= (vegDays - 2)
                );
            });
            if (plantingToFlip) {
                const strain = getAvailableStrains(company)[plantingToFlip.strainId];
                if (strain) {
                    const [on, off] = strain.environmentalPreferences.lightCycle.flowering;
                    zone.lightCycle = { on, off };
                }
            }
            break;
    }
    
    const skill = employee.skills[task.requiredSkill];
    if (skill && skill.level < 10) {
        skill.xp += TASK_XP_REWARD;
        if (skill.xp >= XP_PER_LEVEL) {
            skill.level = Math.min(10, skill.level + 1);
            skill.xp = 0;
        }
    }
}