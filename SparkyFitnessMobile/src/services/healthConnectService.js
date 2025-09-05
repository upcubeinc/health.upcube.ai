import {
  initialize,
  requestPermission,
  readRecords,
  // Add new record types as needed
  HeartRateRecord,
  WeightRecord,
  BloodPressureRecord,
  NutritionRecord,
  SleepSessionRecord,
  StepsRecord,
  ActiveCaloriesBurnedRecord,
  BasalBodyTemperatureRecord,
  BasalMetabolicRateRecord,
  BloodGlucoseRecord,
  BodyFatRecord,
  BodyTemperatureRecord,
  BoneMassRecord,
  CervicalMucusRecord,
  DistanceRecord,
  ElevationGainedRecord,
  ExerciseSessionRecord,
  FloorsClimbedRecord,
  HeightRecord,
  HydrationRecord,
  LeanBodyMassRecord,
  MenstruationFlowRecord,
  OvulationTestRecord,
  OxygenSaturationRecord,
  PowerRecord,
  RespiratoryRateRecord,
  RestingHeartRateRecord,
  SexualActivityRecord,
  SpeedRecord,
  Vo2MaxRecord,
  WheelchairPushesRecord,
  // Import all record types from react-native-health-connect
  // This ensures that the `readRecords` function can correctly identify and use them.
  // The error "Record type is not valid" suggests that the string name
  // passed to `readRecords` might not be correctly mapped internally
  // if the corresponding Record type class is not imported.
} from 'react-native-health-connect';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addLog } from './LogService';
import * as api from './api'; // Import the api service
import { HEALTH_METRICS } from '../constants/HealthMetrics'; // Import HEALTH_METRICS

const SYNC_DURATION_KEY = '@HealthConnect:syncDuration';

/**
 * Initializes the Health Connect client.
 * @returns {Promise<boolean>} True if initialization is successful, false otherwise.
 */
export const initHealthConnect = async () => {
  try {
    const isInitialized = await initialize();
    if (isInitialized) {
      // Removed getSdkStatus call as it's causing an error and is not critical for functionality.
      // try {
      //   const status = await getSdkStatus();
      //   addLog(`[HealthConnectService] Health Connect SDK Status: ${JSON.stringify(status)}`);
      // } catch (statusError) {
      //   addLog(`[HealthConnectService] Error getting SDK status: ${statusError.message}`, 'error', 'ERROR');
      // }
    }
    return isInitialized;
  } catch (error) {
    addLog(`[HealthConnectService] Failed to initialize Health Connect: ${error.message}`);
    console.error('Failed to initialize Health Connect', error);
    return false;
  }
};

/**
 * Requests permission to read step data.
 * @returns {Promise<boolean>} True if permission is granted, false otherwise.
 */
export const requestHealthPermissions = async (permissionsToRequest) => {
  try {
    addLog(`[HealthConnectService] Requesting permissions: ${JSON.stringify(permissionsToRequest)}`);
    const grantedPermissions = await requestPermission(permissionsToRequest);

    // Check if all requested permissions are present in the grantedPermissions array
    const allGranted = permissionsToRequest.every(requestedPerm =>
      grantedPermissions.some(grantedPerm =>
        grantedPerm.recordType === requestedPerm.recordType &&
        grantedPerm.accessType === requestedPerm.accessType
      )
    );

    if (allGranted) {
      addLog(`[HealthConnectService] All requested permissions granted.`);
      console.log('[HealthConnectService] All requested permissions granted.');
      return true;
    } else {
      addLog(`[HealthConnectService] Not all requested permissions granted. Requested: ${JSON.stringify(permissionsToRequest)}. Granted: ${JSON.stringify(grantedPermissions)}`);
      console.log('[HealthConnectService] Not all requested permissions granted.', { requested: permissionsToRequest, granted: grantedPermissions });
      return false;
    }
  } catch (error) {
    addLog(`[HealthConnectService] Failed to request health permissions: ${error.message}. Full error: ${JSON.stringify(error)}`);
    console.error('Failed to request health permissions', error);
    throw error; // Re-throw the error to be caught by the calling function (SettingsScreen)
  }
};

/**
 * Reads step records for a given date range.
 * @param {Date} startDate - The start date of the range.
 * @param {Date} endDate - The end date of the range.
 * @returns {Promise<Array>} An array of step records.
 */
/**
 * Reads health records for a given record type and date range.
 * @param {string} recordType - The type of record to read (e.g., 'Steps', 'HeartRate').
 * @param {Date} startDate - The start date of the range.
 * @param {Date} endDate - The end date of the range.
 * @returns {Promise<Array>} An array of health records.
 */
export const readHealthRecords = async (recordType, startDate, endDate) => {
  try {
    const startTime = startDate.toISOString();
    const endTime = endDate.toISOString();
    addLog(`[HealthConnectService] Reading ${recordType} records for timerange: ${startTime} to ${endTime}`);
    const result = await readRecords(recordType, {
      timeRangeFilter: {
        operator: 'between',
        startTime: startTime,
        endTime: endTime,
      },
    });
    addLog(`[HealthConnectService] Raw ${recordType} records from Health Connect: ${JSON.stringify(result.records)}`);
    return result.records;
  } catch (error) {
    addLog(`[HealthConnectService] Failed to read ${recordType} records: ${error.message}. Full error: ${JSON.stringify(error)}`);
    console.error(`Failed to read ${recordType} records`, error);
    return [];
  }
};

// Existing specific read functions can now call the generic one
export const readStepRecords = async (startDate, endDate) => readHealthRecords('Steps', startDate, endDate);

/**
 * Calculates the start date for data synchronization based on the selected duration.
 * @param {string} duration - The sync duration ('24h', '3d', '7d').
 * @returns {Date} The calculated start date.
 */
export const getSyncStartDate = (duration) => {
  const now = new Date();
  let startDate = new Date(now);

  switch (duration) {
    case '24h':
      startDate.setHours(now.getHours() - 24);
      break;
    case '3d':
      startDate.setDate(now.getDate() - 3);
      break;
    case '7d':
      startDate.setDate(now.getDate() - 7);
      break;
    case '30d': // Add case for 30 days
      startDate.setDate(now.getDate() - 30);
      break;
    default:
      startDate.setHours(now.getHours() - 24); // Default to 24 hours
      break;
  }
  startDate.setHours(0, 0, 0, 0); // Set time to 00:00:00.000
  return startDate;
};

/**
 * Reads active calories burned records for a given date range.
 * @param {Date} startDate - The start date of the range.
 * @param {Date} endDate - The end date of the range.
 * @returns {Promise<Array>} An array of active calories burned records.
 */
export const readActiveCaloriesRecords = async (startDate, endDate) => readHealthRecords('ActiveCaloriesBurned', startDate, endDate);

/**
 * Reads heart rate records for a given date range.
 * @param {Date} startDate - The start date of the range.
 * @param {Date} endDate - The end date of the range.
 * @returns {Promise<Array>} An array of heart rate records.
 */
export const readHeartRateRecords = async (startDate, endDate) => readHealthRecords('HeartRate', startDate, endDate);

/**
 * Aggregates heart rate records by date and calculates average heart rate.
 * @param {Array} records - An array of heart rate records from Health Connect.
 * @returns {Array} An array of objects, where each object has a date and the average heart rate for that date.
 */
export const aggregateHeartRateByDate = (records) => {
  if (!Array.isArray(records)) {
    addLog(`[HealthConnectService] aggregateHeartRateByDate received non-array records: ${JSON.stringify(records)}`);
    console.warn('aggregateHeartRateByDate received non-array records:', records);
    return [];
  }
  addLog(`[HealthConnectService] Input records for heart rate aggregation: ${JSON.stringify(records)}`);

  const aggregatedData = records.reduce((acc, record) => {
    const date = record.startTime.split('T')[0];
    const heartRate = (record.samples && record.samples.length > 0) ? record.samples.reduce((sum, sample) => sum + sample.beatsPerMinute, 0) / record.samples.length : 0;

    if (!acc[date]) {
      acc[date] = { total: 0, count: 0 };
    }
    acc[date].total += heartRate;
    acc[date].count++;

    return acc;
  }, {});
  addLog(`[HealthConnectService] Aggregated heart rate data: ${JSON.stringify(aggregatedData)}`);

  return Object.keys(aggregatedData).map(date => ({
    date,
    value: aggregatedData[date].count > 0 ? Math.round(aggregatedData[date].total / aggregatedData[date].count) : 0,
    type: 'heart_rate',
  }));
};


/**
 * Aggregates step records by date.
 * @param {Array} records - An array of step records from Health Connect.
 * @returns {Array} An array of objects, where each object has a date and the total steps for that date.
 */
export const aggregateStepsByDate = (records) => {
  if (!Array.isArray(records)) {
    addLog(`[HealthConnectService] aggregateStepsByDate received non-array records: ${JSON.stringify(records)}`);
    console.warn('aggregateStepsByDate received non-array records:', records);
    return [];
  }
  addLog(`[HealthConnectService] Input records for aggregation: ${JSON.stringify(records)}`);

  const aggregatedData = records.reduce((acc, record) => {
    const date = record.startTime.split('T')[0];
    const steps = typeof record.count === 'number' ? record.count : 0; // Ensure steps is a number

    if (!acc[date]) {
      acc[date] = 0;
    }
    acc[date] += steps;

    return acc;
  }, {});
  addLog(`[HealthConnectService] NEW CHANGE Aggregated data: ${JSON.stringify(aggregatedData)}`);

  return Object.keys(aggregatedData).map(date => ({
    date,
    value: aggregatedData[date],
    type: 'step',
  }));
};

/**
 * Aggregates active calories burned records by date.
 * @param {Array} records - An array of active calories burned records from Health Connect.
 * @returns {Array} An array of objects, where each object has a date and the total active calories for that date.
 */
export const aggregateActiveCaloriesByDate = (records) => {
  if (!Array.isArray(records)) {
    addLog(`[HealthConnectService] aggregateActiveCaloriesByDate received non-array records: ${JSON.stringify(records)}`);
    console.warn('aggregateActiveCaloriesByDate received non-array records:', records);
    return [];
  }
  addLog(`[HealthConnectService] Input records for active calories aggregation: ${JSON.stringify(records)}`);

  const aggregatedData = records.reduce((acc, record) => {
    const date = record.startTime.split('T')[0];
    const calories = (record.energy && typeof record.energy.inCalories === 'number') ? record.energy.inCalories : 0; // Ensure calories is a number

    if (!acc[date]) {
      acc[date] = 0;
    }
    acc[date] += calories;

    return acc;
  }, {});
  addLog(`[HealthConnectService] Aggregated active calories data: ${JSON.stringify(aggregatedData)}`);

  return Object.keys(aggregatedData).map(date => ({
    date,
    value: aggregatedData[date],
    type: 'active_calories',
  }));
};

/**
 * Transforms raw Health Connect records into a standardized format for the server.
 * This function handles various record types and extracts relevant numeric values.
 * @param {Array} records - An array of raw Health Connect records.
 * @param {object} metricConfig - The metric configuration from HEALTH_METRICS (id, label, recordType, unit).
 * @returns {Array} An array of objects in the format { id, label, value, unit, date }.
 */
export const transformHealthRecords = (records, metricConfig) => {
  if (!Array.isArray(records)) {
    addLog(`[HealthConnectService] transformHealthRecords received non-array records for ${metricConfig.recordType}: ${JSON.stringify(records)}`);
    console.warn(`transformHealthRecords received non-array records for ${metricConfig.recordType}:`, records);
    return [];
  }

  const transformedData = [];
  const { id, label, recordType, unit, type } = metricConfig; // Destructure 'type' from metricConfig

  records.forEach(record => {
    let value = null;
    let recordDate = null;

    // Handle aggregated records first
    if (['Steps', 'HeartRate', 'ActiveCaloriesBurned'].includes(recordType)) {
      value = record.value;
      recordDate = record.date;
    } else {
      // Existing logic for raw records
      switch (recordType) {
        case 'Weight':
          value = record.weight?.inKilograms;
          recordDate = record.time.split('T')[0];
          break;
        case 'BloodPressure':
          if (record.systolic?.inMillimetersOfMercury) {
            transformedData.push({
              value: parseFloat(record.systolic.inMillimetersOfMercury.toFixed(2)),
              unit: unit,
              date: record.time.split('T')[0],
              type: `${type}_systolic`,
            });
          }
          if (record.diastolic?.inMillimetersOfMercury) {
            transformedData.push({
              value: parseFloat(record.diastolic.inMillimetersOfMercury.toFixed(2)),
              unit: unit,
              date: record.time.split('T')[0],
              type: `${type}_diastolic`,
            });
          }
          break; // Change return to break
        case 'Nutrition':
          value = record.energy?.inCalories;
          recordDate = record.startTime.split('T')[0];
          break;
        case 'SleepSession':
          value = (new Date(record.endTime).getTime() - new Date(record.startTime).getTime()) / (1000 * 60);
          recordDate = record.startTime.split('T')[0];
          break;
        case 'BasalBodyTemperature':
          value = record.temperature?.inCelsius;
          recordDate = record.startTime.split('T')[0];
          break;
        case 'BasalMetabolicRate':
          value = record.basalMetabolicRate?.inCalories;
          recordDate = record.startTime.split('T')[0];
          break;
        case 'BloodGlucose':
          value = record.bloodGlucose?.inMillimolesPerLiter;
          recordDate = record.startTime.split('T')[0];
          break;
        case 'BodyFat':
          value = record.percentage?.inPercent;
          recordDate = record.startTime.split('T')[0];
          break;
        case 'BodyTemperature':
          value = record.temperature?.inCelsius;
          recordDate = record.startTime.split('T')[0];
          break;
        case 'BoneMass':
          value = record.mass?.inKilograms;
          recordDate = record.startTime.split('T')[0];
          break;
        case 'CervicalMucus':
          addLog(`[HealthConnectService] Skipping CervicalMucus record as it's qualitative: ${JSON.stringify(record)}`);
          return;
        case 'Distance':
          value = record.distance?.inMeters;
          recordDate = record.startTime.split('T')[0];
          break;
        case 'ElevationGained':
          value = record.elevation?.inMeters;
          recordDate = record.startTime.split('T')[0];
          break;
        case 'ExerciseSession':
          value = (new Date(record.endTime).getTime() - new Date(record.startTime).getTime()) / (1000 * 60);
          recordDate = record.startTime.split('T')[0];
          break;
        case 'FloorsClimbed':
          value = record.floors;
          recordDate = record.startTime.split('T')[0];
          break;
        case 'Height':
          value = record.height?.inMeters;
          recordDate = record.startTime.split('T')[0];
          break;
        case 'Hydration':
          value = record.volume?.inLiters;
          recordDate = record.startTime.split('T')[0];
          break;
        case 'LeanBodyMass':
          value = record.mass?.inKilograms;
          recordDate = record.startTime.split('T')[0];
          break;
        case 'MenstruationFlow':
          addLog(`[HealthConnectService] Skipping MenstruationFlow record as it's qualitative: ${JSON.stringify(record)}`);
          return;
        case 'OvulationTest':
          addLog(`[HealthConnectService] Skipping OvulationTest record as it's qualitative: ${JSON.stringify(record)}`);
          return;
        case 'OxygenSaturation':
          value = record.percentage?.inPercent;
          recordDate = record.startTime.split('T')[0];
          break;
        case 'Power':
          value = record.power?.inWatts;
          recordDate = record.startTime.split('T')[0];
          break;
        case 'RespiratoryRate':
          value = record.rate;
          recordDate = record.startTime.split('T')[0];
          break;
        case 'RestingHeartRate':
          value = record.beatsPerMinute;
          recordDate = record.startTime.split('T')[0];
          break;
        case 'SexualActivity':
          addLog(`[HealthConnectService] Skipping SexualActivity record as it's qualitative: ${JSON.stringify(record)}`);
          return;
        case 'Speed':
          value = record.speed?.inMetersPerSecond;
          recordDate = record.startTime.split('T')[0];
          break;
        case 'Vo2Max':
          value = record.vo2Max;
          recordDate = record.startTime.split('T')[0];
          break;
        case 'WheelchairPushes':
          value = record.count;
          recordDate = record.startTime.split('T')[0];
          break;
        default:
          addLog(`[HealthConnectService] Unhandled record type in transformation: ${recordType}. Record: ${JSON.stringify(record)}`);
          return;
      }
    }

    if (value !== null && value !== undefined && recordDate !== null) {
      transformedData.push({
        value: parseFloat(value.toFixed(2)),
        type: type,
        date: recordDate,
        unit: unit, // Keep unit for server-side validation if needed, though not explicitly in error
      });
    }
  });

  addLog(`[HealthConnectService] Transformed ${recordType} data: ${JSON.stringify(transformedData)}`);
  return transformedData;
};

/**
 * Saves a Health Connect preference to AsyncStorage.
 * This function is intended for boolean or object values that need JSON stringification.
 * @param {string} key - The key for the preference (e.g., 'syncStepsEnabled').
 * @param {any} value - The value of the preference.
 */
export const saveHealthPreference = async (key, value) => {
  try {
    await AsyncStorage.setItem(`@HealthConnect:${key}`, JSON.stringify(value));
    addLog(`[HealthConnectService] Saved preference ${key}: ${JSON.stringify(value)}`);
  } catch (error) {
    addLog(`[HealthConnectService] Failed to save preference ${key}: ${error.message}`);
    console.error(`Failed to save preference ${key}`, error);
  }
};

/**
 * Loads a Health Connect preference from AsyncStorage.
 * This function is intended for boolean or object values that need JSON parsing.
 * @param {string} key - The key for the preference.
 * @returns {Promise<any|null>} The parsed value of the preference, or null if not found.
 */
export const loadHealthPreference = async (key) => {
  try {
    const value = await AsyncStorage.getItem(`@HealthConnect:${key}`);
    if (value !== null) {
      addLog(`[HealthConnectService] Loaded preference ${key}: ${value}`);
      return JSON.parse(value);
    }
    addLog(`[HealthConnectService] Preference ${key} not found.`);
    return null;
  } catch (error) {
    addLog(`[HealthConnectService] Failed to load preference ${key}: ${error.message}`);
    console.error(`Failed to load preference ${key}`, error);
    return null;
  }
};

/**
 * Saves a string preference to AsyncStorage.
 * @param {string} key - The key for the preference.
 * @param {string} value - The string value of the preference.
 */
export const saveStringPreference = async (key, value) => {
  try {
    console.log(`[HealthConnectService] Attempting to save string preference: ${key} = ${value}`); // Added log
    await AsyncStorage.setItem(`@HealthConnect:${key}`, value);
    addLog(`[HealthConnectService] Successfully saved string preference ${key}: ${value}`); // Modified log
  } catch (error) {
    addLog(`[HealthConnectService] Failed to save string preference ${key}: ${error.message}`);
    console.error(`Failed to save string preference ${key}`, error);
  }
};

/**
 * Loads a string preference from AsyncStorage.
 * @param {string} key - The key for the preference.
 * @returns {Promise<string|null>} The string value of the preference, or null if not found.
 */
export const loadStringPreference = async (key) => {
  try {
    console.log(`[HealthConnectService] Attempting to load string preference: ${key}`); // Added log
    const value = await AsyncStorage.getItem(`@HealthConnect:${key}`);
    if (value !== null) {
      addLog(`[HealthConnectService] Successfully loaded string preference ${key}: ${value}`); // Modified log
      return value;
    }
    addLog(`[HealthConnectService] String preference ${key} not found.`);
    return null;
  } catch (error) {
    addLog(`[HealthConnectService] Failed to load string preference ${key}: ${error.message}`);
    console.error(`Failed to load string preference ${key}`, error);
    return null;
  }
};

/**
 * Saves the sync duration preference to AsyncStorage.
 * @param {string} value - The sync duration value (e.g., '24h', '3d', '7d').
 */
export const saveSyncDuration = async (value) => {
  try {
    await AsyncStorage.setItem(SYNC_DURATION_KEY, value);
    addLog(`[HealthConnectService] Saved sync duration: ${value}`);
  } catch (error) {
    addLog(`[HealthConnectService] Failed to save sync duration: ${error.message}`);
    console.error(`Failed to save sync duration`, error);
  }
};

/**
 * Loads the sync duration preference from AsyncStorage.
 * @returns {Promise<string|null>} The sync duration value, or null if not found.
 */
export const loadSyncDuration = async () => {
  try {
    const value = await AsyncStorage.getItem(SYNC_DURATION_KEY);
    if (value !== null) {
      addLog(`[HealthConnectService] Loaded sync duration: ${value}`);
      return value;
    }
    addLog(`[HealthConnectService] Sync duration not found, returning default '24h'.`);
    return '24h'; // Default to 24 hours if not found
  } catch (error) {
    addLog(`[HealthConnectService] Failed to load sync duration: ${error.message}`);
    console.error(`Failed to load sync duration`, error);
    return '24h'; // Default to 24 hours on error
  }
};

/**
 * Orchestrates reading health data from Health Connect, transforming it, and sending it to the server.
 * @param {string} syncDuration - The duration for which to sync data (e.g., '24h', '3d', '7d').
 * @param {object} healthMetricStates - An object indicating which health metrics are enabled.
 * @returns {Promise<object>} An object containing processed and error results from the server.
 */
export const syncHealthData = async (syncDuration, healthMetricStates = {}) => { // Default to empty object
  addLog(`[HealthConnectService] Starting health data sync for duration: ${syncDuration}`);
  const startDate = getSyncStartDate(syncDuration);
  startDate.setHours(0, 0, 0, 0); // Set to the beginning of the day

  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999); // Set to the end of the day
  addLog(`[HealthConnectService] Syncing data from ${startDate.toISOString()} to ${endDate.toISOString()}`);

  // Filter healthDataTypesToSync based on enabled healthMetricStates
  // Ensure healthMetricStates is an object before filtering
  const enabledMetricStates = healthMetricStates && typeof healthMetricStates === 'object' ? healthMetricStates : {};
  const healthDataTypesToSync = HEALTH_METRICS.filter(metric => enabledMetricStates[metric.stateKey]).map(metric => metric.recordType);

  let allTransformedData = [];
  const syncErrors = [];

  for (const type of healthDataTypesToSync) {
    try {
      addLog(`[HealthConnectService] Attempting to read ${type} records...`);
      const rawRecords = await readHealthRecords(type, startDate, endDate);
      addLog(`[HealthConnectService] Found ${rawRecords.length} raw ${type} records.`);
      if (rawRecords.length > 0) {
        const metricConfig = HEALTH_METRICS.find(m => m.recordType === type);
        if (metricConfig) {
          let dataToTransform = rawRecords;
          // Apply aggregation for specific record types
          if (type === 'Steps') {
            dataToTransform = aggregateStepsByDate(rawRecords);
            addLog(`[HealthConnectService] Aggregated ${rawRecords.length} raw Steps records into ${dataToTransform.length} daily totals.`);
          } else if (type === 'HeartRate') {
            dataToTransform = aggregateHeartRateByDate(rawRecords);
            addLog(`[HealthConnectService] Aggregated ${rawRecords.length} raw HeartRate records into ${dataToTransform.length} daily totals.`);
          } else if (type === 'ActiveCaloriesBurned') {
            dataToTransform = aggregateActiveCaloriesByDate(rawRecords);
            addLog(`[HealthConnectService] Aggregated ${rawRecords.length} raw ActiveCaloriesBurned records into ${dataToTransform.length} daily totals.`);
          }

          const transformed = transformHealthRecords(dataToTransform, metricConfig);
          addLog(`[HealthConnectService] Transformed ${transformed.length} ${type} records.`);
          allTransformedData = allTransformedData.concat(transformed);
        } else {
          addLog(`[HealthConnectService] No metric configuration found for record type: ${type}. Skipping transformation.`);
        }
      } else {
        addLog(`[HealthConnectService] No raw ${type} records found for transformation.`);
      }
    } catch (error) {
      addLog(`[HealthConnectService] Error reading or transforming ${type} records: ${error.message}. Stack: ${error.stack}`);
      syncErrors.push({ type, error: error.message });
    }
  }

  addLog(`[HealthConnectService] Total transformed data entries: ${allTransformedData.length}`);

  if (allTransformedData.length > 0) {
    try {
      const apiResponse = await api.syncHealthData(allTransformedData);
      addLog(`[HealthConnectService] Server sync response: ${JSON.stringify(apiResponse)}`);
      return { success: true, apiResponse, syncErrors };
    } catch (error) {
      addLog(`[HealthConnectService] Error sending data to server: ${error.message}`);
      return { success: false, error: error.message, syncErrors };
    }
  } else {
    addLog(`[HealthConnectService] No health data to sync.`);
    return { success: true, message: "No health data to sync.", syncErrors };
  }
};