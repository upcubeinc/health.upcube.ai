import React, { useState, useEffect, useCallback } from 'react'; // Import useCallback
import { View, Text, Button, StyleSheet, Switch, Alert, TouchableOpacity, Image, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native'; // Import useFocusEffect
import {
  initHealthConnect,
  readStepRecords,
  aggregateStepsByDate,
  readActiveCaloriesRecords,
  aggregateActiveCaloriesByDate,
  readHeartRateRecords,
  aggregateHeartRateByDate,
  loadHealthPreference,
  saveStringPreference,
  loadStringPreference,
  getSyncStartDate,
} from '../services/healthConnectService';
import { syncHealthData as healthConnectSyncData } from '../services/healthConnectService';
import { saveTimeRange, loadTimeRange } from '../services/storage'; // Import saveTimeRange and loadTimeRange
import * as api from '../services/api'; // Keep api import for checkServerConnection
import { addLog } from '../services/LogService';
import { HEALTH_METRICS } from '../constants/HealthMetrics'; // Import HEALTH_METRICS

const MainScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [healthMetricStates, setHealthMetricStates] = useState({}); // State to hold enabled status for all metrics
  const [healthData, setHealthData] = useState({}); // State to hold fetched data for all metrics
  const [syncDuration, setSyncDuration] = useState(1); // This will be replaced by selectedTimeRange
  const [isSyncing, setIsSyncing] = useState(false);
  const [isHealthConnectInitialized, setIsHealthConnectInitialized] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h'); // New state for time range, initialized to '24h'
  const [isConnected, setIsConnected] = useState(false); // State for server connection status

  const initialize = useCallback(async () => { // Wrap initialize in useCallback
    addLog('--- MainScreen: initialize function started ---'); // Prominent log
    addLog('Initializing Health Connect...');
    const initialized = await initHealthConnect();
    if (initialized) {
      addLog('Health Connect initialized successfully.', 'info', 'SUCCESS');
    } else {
      addLog('Health Connect initialization failed.', 'error', 'ERROR');
    }
    setIsHealthConnectInitialized(initialized);

    // Load preferences from AsyncStorage for all health metrics
    const newHealthMetricStates = {};
    for (const metric of HEALTH_METRICS) {
      const enabled = await loadHealthPreference(metric.preferenceKey);
      newHealthMetricStates[metric.stateKey] = enabled !== null ? enabled : false;
    }
    setHealthMetricStates(newHealthMetricStates);

    // Load selected time range preference
    const loadedTimeRange = await loadTimeRange();
    const initialTimeRange = loadedTimeRange !== null ? loadedTimeRange : '24h';
    setSelectedTimeRange(initialTimeRange); // Initialize with loaded preference or default
    addLog(`[MainScreen] Loaded selectedTimeRange from storage: ${initialTimeRange}`); // Add this log

    // Fetch initial health data after setting the time range
    await fetchHealthData(newHealthMetricStates, initialTimeRange); // Pass the loaded states and initial time range

    // Check server connection status on initialization
    const connectionStatus = await api.checkServerConnection(); // Use api.checkServerConnection
    setIsConnected(connectionStatus);
  }, []); // Empty dependency array for useCallback

  useFocusEffect( // Use useFocusEffect to call initialize on focus
    useCallback(() => {
      initialize();
      return () => {
        // Optional: cleanup function when the screen loses focus
      };
    }, [initialize])
  );

  useEffect(() => {
    // Only re-fetch when healthMetricStates change, as selectedTimeRange is handled in initialize and onValueChange
    fetchHealthData(healthMetricStates, selectedTimeRange);
  }, [healthMetricStates, selectedTimeRange]); // Keep selectedTimeRange here to trigger re-fetch when user changes it

  useEffect(() => {
    const interval = setInterval(async () => {
      const connectionStatus = await checkServerConnection();
      setIsConnected(connectionStatus);
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval); // Clear interval on component unmount
  }, []);

  const fetchHealthData = async (currentHealthMetricStates, timeRange) => {
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    let startDate = new Date(endDate);

    switch (timeRange) { // Use timeRange parameter here
      case '24h':
        startDate.setHours(endDate.getHours() - 24, endDate.getMinutes(), endDate.getSeconds(), endDate.getMilliseconds());
        break;
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        startDate.setHours(0, 0, 0, 0);
        break;
      default:
        startDate.setHours(0, 0, 0, 0); // Default to beginning of today
        break;
    }

    const newHealthData = {};

    addLog(`[MainScreen] Fetching health data for display from ${startDate.toISOString()} to ${endDate.toISOString()} for range: ${timeRange}`);

    for (const metric of HEALTH_METRICS) {
      if (currentHealthMetricStates[metric.stateKey]) {
        let records = [];
        let aggregatedValue = 0;

        switch (metric.id) {
          case 'steps':
            records = await readStepRecords(startDate, endDate);
            aggregatedValue = aggregateStepsByDate(records).reduce((sum, record) => sum + record.value, 0);
            newHealthData[metric.id] = aggregatedValue.toLocaleString();
            break;
          case 'calories':
            records = await readActiveCaloriesRecords(startDate, endDate);
            aggregatedValue = aggregateActiveCaloriesByDate(records).reduce((sum, record) => sum + record.value, 0);
            newHealthData[metric.id] = aggregatedValue.toLocaleString();
            break;
          case 'heartRate':
            records = await readHeartRateRecords(startDate, endDate);
            aggregatedValue = aggregateHeartRateByDate(records).reduce((sum, record) => sum + record.value, 0);
            newHealthData[metric.id] = aggregatedValue > 0 ? `${Math.round(aggregatedValue)} bpm` : '0 bpm';
            break;
          // Add cases for other health metrics as needed
          default:
            newHealthData[metric.id] = 'N/A'; // Or handle other metrics
            break;
        }
        console.log(`[MainScreen] Fetched ${metric.label}: ${newHealthData[metric.id]}`);
      }
    }

    setHealthData(newHealthData);
    // Re-check server connection status after fetching health data
    const connectionStatus = await checkServerConnection();
    setIsConnected(connectionStatus);
    console.log(`[MainScreen] Displaying health data:`, newHealthData);
  };

  // Remove toggle functions as they are now handled in SettingsScreen

  const handleSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    addLog('Sync button pressed.');

    try {
      // The healthConnectSyncData function in healthConnectService.js already handles
      // reading, aggregating, and transforming data based on the sync duration.
      // So, we just need to call it with the selected syncDurationSetting and enabled health metrics.
      addLog(`[MainScreen] Sync duration setting: ${selectedTimeRange}`); // Use selectedTimeRange
      addLog(`[MainScreen] healthMetricStates before sync: ${JSON.stringify(healthMetricStates)}`);
      const result = await healthConnectSyncData(selectedTimeRange, healthMetricStates); // Pass selectedTimeRange

      if (result.success) {
        addLog('Health data synced successfully.', 'info', 'SUCCESS');
        Alert.alert('Success', 'Health data synced successfully.');
      } else {
        addLog(`Sync Error: ${result.error}`, 'error', 'ERROR');
        Alert.alert('Sync Error', result.error);
      }
    } catch (error) {
      addLog(`Sync Error: ${error.message}`, 'error', 'ERROR');
      Alert.alert('Sync Error', error.message);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        {/* Time Range */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Time Range</Text>
          <View style={styles.timeRangeContainer}>
            <Picker
              selectedValue={selectedTimeRange}
              style={styles.picker}
              onValueChange={async (itemValue) => {
                setSelectedTimeRange(itemValue);
                await saveTimeRange(itemValue); // Save selectedTimeRange using the new function
                addLog(`[MainScreen] Time range changed and saved: ${itemValue}`);
              }}
            >
              <Picker.Item label="Last 24 Hours" value="24h" />
              <Picker.Item label="Last 7 Days" value="7d" />
              <Picker.Item label="Last 30 Days" value="30d" />
            </Picker>
          </View>
        </View>

        {/* Health Overview */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Health Overview</Text>
          <View style={styles.healthMetricsContainer}>
            {HEALTH_METRICS.map(metric => healthMetricStates[metric.stateKey] && (
              <View style={styles.metricItem} key={metric.id}>
                <Image source={metric.icon} style={styles.metricIcon} />
                <View>
                  <Text style={styles.metricValue}>{healthData[metric.id] || '0'}</Text>
                  <Text style={styles.metricLabel}>{metric.label}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Sync Now Button */}
        <TouchableOpacity style={styles.syncButtonContainer} onPress={handleSync} disabled={isSyncing || !isHealthConnectInitialized}>
          <Image source={require('../../assets/icons/sync_now.png')} style={styles.metricIcon} />
          <Text style={styles.syncButtonText}>{isSyncing ? "Syncing..." : "Sync Now"}</Text>
          <Text style={styles.syncButtonSubText}>Sync your health data to the server</Text>
        </TouchableOpacity>

        {/* Connected to server status */}
        {isConnected && (
          <View style={styles.connectedStatusContainer}>
            <View style={styles.dot}></View>
            <Text style={styles.connectedStatusText}>Connected to server</Text>
          </View>
        )}

        {!isHealthConnectInitialized && (
          <Text style={styles.errorText}>
            Health Connect is not available. Please make sure it is installed and enabled.
          </Text>
        )}
      </ScrollView>

      {/* Bottom Navigation Bar */}
      <View style={[styles.bottomNavBar, { paddingBottom: insets.bottom }]}>
        <TouchableOpacity style={styles.navBarItem} onPress={() => navigation.navigate('Main')}>
          <Image source={require('../../assets/icons/home.png')} style={[styles.navBarIcon, styles.navBarIconActive]} />
          <Text style={[styles.navBarText, styles.navBarTextActive]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navBarItem} onPress={() => navigation.navigate('Settings')}>
          <Image source={require('../../assets/icons/settings.png')} style={styles.navBarIcon} />
          <Text style={styles.navBarText}>Settings</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navBarItem} onPress={() => navigation.navigate('Logs')}>
          <Image source={require('../../assets/icons/logs.png')} style={styles.navBarIcon} />
          <Text style={styles.navBarText}>Logs</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  scrollViewContent: {
    padding: 16,
    paddingBottom: 80, // Adjust this value based on your bottomNavBar height
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  timeRangeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  picker: {
    flex: 1,
    height: 50,
    color: '#333', // Ensure text is visible
  },
  timeRangeText: {
    fontSize: 16,
    color: '#555',
  },
  healthMetricsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricItem: {
    width: '48%', // Approximately half width, adjust as needed
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    alignItems: 'flex-start',
    flexDirection: 'row',
  },
  metricIcon: {
    width: 24,
    height: 24,
    marginRight: 8,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  metricLabel: {
    fontSize: 14,
    color: '#777',
  },
  syncButtonContainer: {
    backgroundColor: '#007bff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  syncButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 8,
  },
  syncButtonSubText: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.8,
  },
  connectedStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#e6ffe6', // Light green background
    alignSelf: 'center',
  },
  connectedStatusText: {
    color: '#28a745', // Green text
    marginLeft: 8,
    fontWeight: 'bold',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#28a745', // Green dot
  },
  errorText: {
    color: 'red',
    marginTop: 10,
    textAlign: 'center',
  },
  bottomNavBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  navBarItem: {
    alignItems: 'center',
  },
  navBarIcon: {
    width: 24,
    height: 24,
  },
  navBarIconActive: {
  },
  navBarText: {
    fontSize: 12,
    color: '#777',
    marginTop: 4,
  },
  navBarTextActive: {
    color: '#007bff',
    fontWeight: 'bold',
  },
});

export default MainScreen;