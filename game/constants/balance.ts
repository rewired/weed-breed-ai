/**
 * Gameplay and economic tuning constants.
 * Units follow SI where applicable; ticks represent one simulation hour.
 */

/** XP required to advance one skill level (dimensionless). */
export const XP_PER_LEVEL = 100;

/** Flat XP gained when completing a standard task (dimensionless). */
export const TASK_XP_REWARD = 10;

/** Energy expenditure while working, in energy points per tick. */
export const ENERGY_COST_PER_TICK_WORKING = 10.0;

/** Energy recovered when resting in break rooms, in energy points per tick. */
export const ENERGY_REGEN_PER_TICK_RESTING = 10;

/** Passive energy recovery while idle on duty, in energy points per tick. */
export const IDLE_ENERGY_REGEN_PER_TICK = 2.5;

/** Energy threshold that sends an employee off duty, in energy points. */
export const ENERGY_REST_THRESHOLD = 20;

/** Duration of mandatory rest once exhausted, in ticks. */
export const OFF_DUTY_DURATION_TICKS = 16;

/** Mutation amplitude applied during custom strain breeding (fraction). */
export const MUTATION_FACTOR = 0.1;

/** Cooldown for repeating identical alerts, in ticks. */
export const ALERT_COOLDOWN_TICKS = 2 * 24;

/** Baseline device wear, expressed as durability fraction lost per tick. */
export const BASE_DURABILITY_DECAY_PER_TICK = 0.00002;

/** Baseline disease probability for plants per tick (dimensionless). */
export const BASE_DISEASE_CHANCE_PER_TICK = 0.0001;
