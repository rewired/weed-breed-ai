/**
 * Central copy of gameplay and balance constants used by the UI layer.
 * Values are sourced from the simulation's balance module to avoid drift.
 */

import { ALERT_COOLDOWN_TICKS } from '../../../game/constants/balance';

export * from '../../../game/constants/balance';

// The following values are currently only consumed on the client.
export const STRESS_IMPACT_FACTOR = 0.05;
export const RECOVERY_FACTOR = 0.003;
export const DISEASE_IMPACT = 0.1;
export const BASE_GROWTH_PER_TICK = 0.05;
export const TRANSITION_PROBABILITY_PER_DAY = 0.25;
export const TICKS_PER_MONTH = 30;

// Legacy alias maintained for compatibility with existing UI code.
export const COOLDOWN_TICKS = ALERT_COOLDOWN_TICKS;
