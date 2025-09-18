/**
 * Central copy of gameplay and balance constants.
 * These mirror the values currently hard-coded throughout the simulation layer.
 * Call sites will be migrated in a later step.
 */

// Zone balance factors
export const BASE_DURABILITY_DECAY_PER_TICK = 0.00002;
export const BASE_DISEASE_CHANCE_PER_TICK = 0.0001;

// Plant lifecycle tuning
export const STRESS_IMPACT_FACTOR = 0.05;
export const RECOVERY_FACTOR = 0.003;
export const DISEASE_IMPACT = 0.1;
export const BASE_GROWTH_PER_TICK = 0.05;
export const TRANSITION_PROBABILITY_PER_DAY = 0.25;

// Economic pacing
export const TICKS_PER_MONTH = 30;

// Employee progression and energy management
export const XP_PER_LEVEL = 100;
export const TASK_XP_REWARD = 10;
export const ENERGY_COST_PER_TICK_WORKING = 10.0;
export const ENERGY_REGEN_PER_TICK_RESTING = 10;
export const IDLE_ENERGY_REGEN_PER_TICK = 2.5;
export const ENERGY_REST_THRESHOLD = 20;
export const OFF_DUTY_DURATION_TICKS = 16;

// Genetics & alert systems
export const MUTATION_FACTOR = 0.1;
export const COOLDOWN_TICKS = 2 * 24;
