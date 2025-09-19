import test from 'node:test';
import assert from 'node:assert/strict';

import { createSeededRandom, RandomGenerator } from '../utils';

type SimulatedEmployee = {
  id: string;
  morale: number;
  salaryPerDay: number;
  totalSkillPoints: number;
  lastRaiseTick: number;
};

function simulatePlantingPlan(rng: RandomGenerator, seedTimestamp: number, quantity: number, germinationRate: number) {
  const plantedIds: string[] = [];
  for (let i = 0; i < quantity; i++) {
    if (rng.chance(germinationRate)) {
      const suffix = Math.floor(rng.float() * 1_000_000);
      plantedIds.push(`plant-${seedTimestamp}-${suffix}`);
    }
  }
  return plantedIds;
}

function simulateHrCycle(rng: RandomGenerator, employees: SimulatedEmployee[], ticks: number) {
  const remaining: SimulatedEmployee[] = [];
  const quitIds: string[] = [];
  const salaryAlerts: Array<{ employeeId: string; proposedSalary: number }> = [];

  for (const employee of employees) {
    if (employee.morale < 20 && rng.chance(0.05)) {
      quitIds.push(employee.id);
      continue;
    }

    const ticksSinceRaise = ticks - employee.lastRaiseTick;
    if (ticksSinceRaise > 365 * 24) {
      const baseSalary = 50 + employee.totalSkillPoints * 8;
      if (baseSalary > employee.salaryPerDay * 1.05) {
        const modifier = 1 + (rng.float() - 0.5) * 0.1;
        salaryAlerts.push({ employeeId: employee.id, proposedSalary: baseSalary * modifier });
      }
    }

    remaining.push(employee);
  }

  return { remaining, quitIds, salaryAlerts };
}

test('planting simulation stays deterministic with identical seeds', () => {
  const seed = 1337;
  const timestamp = 1_700_000_000_000;
  const runA = simulatePlantingPlan(createSeededRandom(seed), timestamp, 12, 0.65);
  const runB = simulatePlantingPlan(createSeededRandom(seed), timestamp, 12, 0.65);
  assert.deepStrictEqual(runA, runB);

  const runC = simulatePlantingPlan(createSeededRandom(seed + 1), timestamp, 12, 0.65);
  assert.notDeepStrictEqual(runA, runC);
});

test('HR salary review and churn logic remain reproducible for equal seeds', () => {
  const employees: SimulatedEmployee[] = [
    { id: 'emp-1', morale: 18, salaryPerDay: 75, totalSkillPoints: 40, lastRaiseTick: 0 },
    { id: 'emp-2', morale: 45, salaryPerDay: 60, totalSkillPoints: 28, lastRaiseTick: 0 },
    { id: 'emp-3', morale: 90, salaryPerDay: 55, totalSkillPoints: 15, lastRaiseTick: 200 * 24 },
  ];

  const ticks = 400 * 24;
  const resultA = simulateHrCycle(createSeededRandom(2024), employees, ticks);
  const resultB = simulateHrCycle(createSeededRandom(2024), employees, ticks);
  assert.deepStrictEqual(resultA, resultB);

  const resultC = simulateHrCycle(createSeededRandom(2025), employees, ticks);
  assert.notDeepStrictEqual(resultA, resultC);
});
