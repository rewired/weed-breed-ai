/**
 * @file Centralizes all environment simulation constants.
 * JSDoc comments use SI units where applicable.
 */

// --- Zone Sufficiency & Climate Control ---

/** Recommended air changes per hour for optimal climate control. */
export const RECOMMENDED_ACH = 5;

/** Base dehumidification load (kg of water vapor) produced by plants per m^2 per hour. */
export const BASE_DEHUMIDIFICATION_LOAD_PER_M2_PER_H = 0.02;

/** Required CO2 injection rate (ppm) per tick per m^2 to counteract consumption and leakage. */
export const BASE_CO2_INJECTION_PPM_PER_TICK_PER_M2 = 5;


// --- Ambient (External) Environment Conditions ---

/** The ambient temperature outside of controlled structures, in degrees Celsius. */
export const AMBIENT_TEMP_C = 20;

/** The ambient relative humidity outside, as a fraction (0-1). */
export const AMBIENT_HUMIDITY_RH = 0.50;

/** The ambient CO2 concentration outside, in parts per million. */
export const AMBIENT_CO2_PPM = 400;


// --- Normalization & Physics Factors ---

/** Rate at which zone temperature normalizes to ambient per tick. */
export const TEMP_NORMALIZATION_FACTOR = 0.1;

/** Rate at which zone humidity normalizes to ambient per tick. */
export const HUMIDITY_NORMALIZATION_FACTOR = 0.05;

/** Rate at which zone CO2 normalizes to ambient per tick. */
export const CO2_NORMALIZATION_FACTOR = 0.1;


// --- Device & Plant Effect Factors ---

/** Conversion factor from lamp power (kW) to temperature increase (°C) per tick. */
export const LAMP_HEAT_FACTOR = 0.5;

/** Conversion factor from cooling capacity (kW) to temperature decrease (°C) per tick. */
export const COOLING_CAPACITY_FACTOR = 0.8;

/** Conversion factor from dehumidifier power (kW) to temperature increase (°C) per tick. */
export const DEHUMIDIFIER_HEAT_FACTOR = 0.2;

/** Relative humidity increase per plant per tick due to transpiration. */
export const PLANT_TRANSPIRATION_RH_PER_PLANT = 0.00005;

/** CO2 consumption (ppm) per plant per tick. */
export const PLANT_CO2_CONSUMPTION_PPM_PER_PLANT = 0.2;


// --- Durability & Disease ---

/** Base durability decay per tick for all active devices. */
export const BASE_DURABILITY_DECAY_PER_TICK = 0.00002;

/** Base probability of a plant contracting a disease per tick. */
export const BASE_DISEASE_CHANCE_PER_TICK = 0.0001;
