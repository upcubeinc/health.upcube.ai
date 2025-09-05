import { apiCall } from './api';

export interface CustomCategory {
  id: string;
  name: string;
  measurement_type: string;
  frequency: string;
}

export interface CustomMeasurement {
  id: string;
  category_id: string;
  value: number;
  entry_date: string;
  entry_hour: number | null;
  entry_timestamp: string;
  custom_categories: {
    name: string;
    measurement_type: string;
    frequency: string;
  };
}

export const getCustomCategories = async (userId: string): Promise<CustomCategory[]> => {
  return apiCall(`/measurements/custom-categories?userId=${userId}`, {
    method: 'GET',
  });
};

export const getCustomMeasurements = async (userId: string): Promise<CustomMeasurement[]> => {
  return apiCall(`/measurements/custom-entries?userId=${userId}`, {
    method: 'GET',
  });
};

export const getCustomMeasurementsForDate = async (userId: string, date: string): Promise<CustomMeasurement[]> => {
  return apiCall(`/measurements/custom-entries/${userId}/${date}`, {
    method: 'GET',
  });
};

export const saveCustomMeasurement = async (measurementData: any, frequency: string): Promise<CustomMeasurement> => {
  if (frequency === 'All') {
    return apiCall('/measurements/custom-entries', {
      method: 'POST',
      body: measurementData,
    });
  } else {
    return apiCall('/measurements/custom-entries', {
      method: 'PUT',
      body: measurementData,
    });
  }
};

export const deleteCustomMeasurement = async (measurementId: string): Promise<void> => {
  return apiCall(`/measurements/custom-entries/${measurementId}`, {
    method: 'DELETE',
  });
};