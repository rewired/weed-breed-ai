/**
 * @file Centralizes all game balance constants.
 * JSDoc comments use SI units where applicable.
 */

// --- HR & Employee ---

/** Multiplier for severance pay, in days of salary. */
export const SEVERANCE_PAY_DAYS = 7;

/** Morale drop for other employees in the same structure when someone is fired. */
export const FIRE_MORALE_DROP = 10;

/** Morale gain for accepting a raise request. */
export const RAISE_ACCEPT_MORALE_GAIN = 25;

/** Morale gain for offering a bonus instead of a raise. */
export const BONUS_OFFER_MORALE_GAIN = 15;

/** Morale drop for declining a raise request. */
export const RAISE_DECLINE_MORALE_DROP = 20;

/** Morale gain for successfully completing a work/rest cycle. */
export const CYCLE_COMPLETION_MORALE_GAIN = 2;

/** Ticks after which an employee might ask for a raise. (365 days) */
export const TICKS_BETWEEN_RAISE_REQUESTS = 365 * 24;

/** Chance per day for an employee with low morale to quit. */
export const LOW_MORALE_QUIT_CHANCE_PER_DAY = 0.05;


// --- Employee Energy ---

/** Energy consumed per tick (hour) while working. */
export const ENERGY_COST_PER_TICK_WORKING = 10.0;

/** Energy regenerated per tick (hour) while resting in a breakroom. */
export const ENERGY_REGEN_PER_TICK_RESTING = 10.0;

/** Energy regenerated per tick (hour) while idle. */
export const IDLE_ENERGY_REGEN_PER_TICK = 2.5;

/** Energy level below which an employee will seek rest. */
export const ENERGY_REST_THRESHOLD = 20;

/** Duration in ticks (hours) an employee is 'OffDuty' to recover. */
export const OFF_DUTY_DURATION_TICKS = 16;


// --- Skills & XP ---

/** Experience points required to advance one skill level. */
export const XP_PER_LEVEL = 100;

/** Experience points gained for completing a task. */
export const TASK_XP_REWARD = 10;

/** Daily XP gain in the employee's primary role skill. */
export const DAILY_ROLE_XP_GAIN = 2;

// --- Plant Growth & Health ---

/** Base stress impact factor on plant health per tick. */
export const PLANT_STRESS_IMPACT_FACTOR = 0.05;

/** Base health recovery factor per tick when conditions are good. */
export const PLANT_RECOVERY_FACTOR = 0.003;

/** Health lost when a plant is infected by a disease. */
export const PLANT_DISEASE_IMPACT = 0.1;

/** Base growth in biomass (g) per tick. */
export const PLANT_BASE_GROWTH_PER_TICK = 0.05;

/** Days a plant stays in the seedling stage. */
export const PLANT_SEEDLING_DAYS = 3;

/** Daily probability of a plant transitioning to the next growth stage after its minimum duration. */
export const PLANT_STAGE_TRANSITION_PROB_PER_DAY = 0.25;


// --- General Time ---

/** Number of game ticks that represent one month for recurring costs like rent. */
export const TICKS_PER_MONTH = 30;
