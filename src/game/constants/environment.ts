/**
 * Central copy of environmental simulation constants.
 * Mirrors the values currently embedded in the zone/environment logic.
 * Call sites will adopt these exports in a later refactor.
 */

export const RECOMMENDED_ACH = 5;
export const BASE_DEHUMIDIFICATION_LOAD_PER_M2_PER_H = 0.02;
export const BASE_CO2_INJECTION_PPM_PER_TICK_PER_M2 = 5;

export const AMBIENT_TEMP_C = 20;
export const AMBIENT_HUMIDITY_RH = 0.5;
export const AMBIENT_CO2_PPM = 400;

export const TEMP_NORMALIZATION_FACTOR = 0.1;
export const HUMIDITY_NORMALIZATION_FACTOR = 0.05;
export const CO2_NORMALIZATION_FACTOR = 0.1;

export const LAMP_HEAT_FACTOR = 0.5;
export const COOLING_CAPACITY_FACTOR = 0.8;
export const DEHUMIDIFIER_HEAT_FACTOR = 0.2;

export const PLANT_TRANSPIRATION_RH_PER_PLANT = 0.00005;
export const PLANT_CO2_CONSUMPTION_PPM_PER_PLANT = 0.2;
