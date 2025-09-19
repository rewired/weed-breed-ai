/**
 * Environmental assumptions for zone level simulations.
 * Values are expressed using SI units (or common derived forms) per tick.
 */

/** Recommended air changes for climate control, in h⁻¹. */
export const RECOMMENDED_AIR_CHANGES_PER_HOUR = 5;

/** Plant-driven humidity load, in kg·m⁻²·h⁻¹ of water vapor. */
export const BASE_DEHUMIDIFICATION_LOAD_KG_PER_M2_HOUR = 0.02;

/** Baseline CO₂ injection to offset uptake, in ppm·tick⁻¹·m⁻². */
export const BASE_CO2_INJECTION_PPM_PER_TICK_PER_M2 = 5;

/** Ambient dry-bulb temperature, in °C. */
export const AMBIENT_TEMPERATURE_C = 20;

/** Ambient relative humidity as a 0–1 fraction. */
export const AMBIENT_RELATIVE_HUMIDITY = 0.5;

/** Ambient CO₂ concentration, in ppm. */
export const AMBIENT_CO2_PPM = 400;

/** Thermal normalization gain applied each tick (dimensionless). */
export const TEMPERATURE_NORMALIZATION_FACTOR = 0.1;

/** Moisture normalization gain applied each tick (dimensionless). */
export const HUMIDITY_NORMALIZATION_FACTOR = 0.05;

/** CO₂ normalization gain applied each tick (dimensionless). */
export const CO2_NORMALIZATION_FACTOR = 0.1;

/** Heat added by lamps, in K·(kW·tick)⁻¹ when lights are on. */
export const LAMP_HEAT_GAIN_K_PER_KW_TICK = 0.5;

/** Cooling effectiveness, in K·(kW·tick)⁻¹ at full load. */
export const COOLING_CAPACITY_EFFECT_K_PER_KW_TICK = 0.8;

/** Heat added by dehumidifiers, in K·(kW·tick)⁻¹. */
export const DEHUMIDIFIER_HEAT_GAIN_K_PER_KW_TICK = 0.2;

/** Humidity increase per plant transpiring, in RH fraction per tick. */
export const PLANT_TRANSPIRATION_RH_PER_PLANT = 0.00005;

/** CO₂ consumption per plant, in ppm per tick. */
export const PLANT_CO2_CONSUMPTION_PPM_PER_PLANT = 0.2;

/** Dry air density at sea level, in kg·m⁻³. */
export const AIR_DENSITY_KG_PER_M3 = 1.225;
