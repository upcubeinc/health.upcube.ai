const externalProviderRepository = require('../models/externalProviderRepository');
const { log } = require('../config/logging');

async function getExternalDataProviders(userId) {
  try {
    const providers = await externalProviderRepository.getExternalDataProviders(userId);
    log('debug', `externalProviderService: Providers from repository for user ${userId}:`, providers);
    return providers;
  } catch (error) {
    log('error', `Error fetching external data providers for user ${userId} in externalProviderService:`, error);
    throw error;
  }
}

async function getExternalDataProvidersForUser(authenticatedUserId, targetUserId) {
  try {
    const providers = await externalProviderRepository.getExternalDataProvidersByUserId(targetUserId);
    return providers;
  } catch (error) {
    log('error', `Error fetching external data providers for target user ${targetUserId} by ${authenticatedUserId} in externalProviderService:`, error);
    throw error;
  }
}

async function createExternalDataProvider(authenticatedUserId, providerData) {
  try {
    providerData.user_id = authenticatedUserId;
    const newProvider = await externalProviderRepository.createExternalDataProvider(providerData);
    return newProvider;
  } catch (error) {
    log('error', `Error creating external data provider for user ${authenticatedUserId} in externalProviderService:`, error);
    throw error;
  }
}

async function updateExternalDataProvider(authenticatedUserId, providerId, updateData) {
  try {
    const isOwner = await externalProviderRepository.checkExternalDataProviderOwnership(providerId, authenticatedUserId);
    if (!isOwner) {
      throw new Error("Forbidden: You do not have permission to update this external data provider.");
    }
    const updatedProvider = await externalProviderRepository.updateExternalDataProvider(providerId, authenticatedUserId, updateData);
    if (!updatedProvider) {
      throw new Error('External data provider not found or not authorized to update.');
    }
    return updatedProvider;
  } catch (error) {
    log('error', `Error updating external data provider ${providerId} by user ${authenticatedUserId} in externalProviderService:`, error);
    throw error;
  }
}

async function getExternalDataProviderDetails(authenticatedUserId, providerId) {
  try {
    const isOwner = await externalProviderRepository.checkExternalDataProviderOwnership(providerId, authenticatedUserId);
    if (!isOwner) {
      throw new Error("Forbidden: You do not have permission to access this external data provider.");
    }
    const details = await externalProviderRepository.getExternalDataProviderById(providerId);
    return details;
  } catch (error) {
    log('error', `Error fetching external data provider details for ${providerId} by user ${authenticatedUserId} in externalProviderService:`, error);
    throw error;
  }
}
 
async function deleteExternalDataProvider(authenticatedUserId, providerId) {
  try {
    const isOwner = await externalProviderRepository.checkExternalDataProviderOwnership(providerId, authenticatedUserId);
    if (!isOwner) {
      throw new Error("Forbidden: You do not have permission to delete this external data provider.");
    }
    const success = await externalProviderRepository.deleteExternalDataProvider(providerId);
    if (!success) {
      throw new Error('External data provider not found or not authorized to delete.');
    }
    return true;
  } catch (error) {
    log('error', `Error deleting external data provider ${providerId} by user ${authenticatedUserId} in externalProviderService:`, error);
    throw error;
  }
}

module.exports = {
  getExternalDataProviders,
  getExternalDataProvidersForUser,
  createExternalDataProvider,
  updateExternalDataProvider,
  getExternalDataProviderDetails,
  deleteExternalDataProvider,
};