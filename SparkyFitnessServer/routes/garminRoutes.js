const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const garminConnectService = require('../integrations/garminconnect/garminConnectService');
const externalProviderRepository = require('../models/externalProviderRepository'); // Import the repository
const { log } = require('../config/logging');

router.use(express.json());

// Endpoint for Garmin direct login
router.post('/login', authenticateToken, async (req, res, next) => {
    try {
        const userId = req.userId;
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }
        const result = await garminConnectService.garminLogin(userId, email, password);
        log('info', `Garmin login microservice response for user ${userId}:`, result);
        if (result.status === 'success' && result.tokens) {
            log('info', `Garmin login successful for user ${userId}. Handling tokens...`);
            await garminConnectService.handleGarminTokens(userId, result.tokens);
        }
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
});

// Endpoint to resume Garmin login (e.g., after MFA)
router.post('/resume_login', authenticateToken, async (req, res, next) => {
    try {
        const userId = req.userId;
        const { client_state, mfa_code } = req.body;
        if (!client_state || !mfa_code) {
            return res.status(400).json({ error: 'Client state and MFA code are required.' });
        }
        const result = await garminConnectService.garminResumeLogin(userId, client_state, mfa_code);
        log('info', `Garmin resume login microservice response for user ${userId}:`, result);
        if (result.status === 'success' && result.tokens) {
            log('info', `Garmin resume login successful for user ${userId}. Handling tokens...`);
            await garminConnectService.handleGarminTokens(userId, result.tokens);
        }
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
});

// Endpoint to manually sync daily summary data from Garmin
router.post('/sync/daily_summary', authenticateToken, async (req, res, next) => {
    try {
        const userId = req.userId;
        const { date } = req.body; // Date in YYYY-MM-DD format
        
        // Retrieve Garmin tokens for the user from the database
        const provider = await externalProviderRepository.getExternalDataProviderByUserIdAndProviderName(userId, 'garmin');
        if (!provider || !provider.garth_dump) {
            return res.status(400).json({ error: 'Garmin Connect not linked for this user or tokens missing.' });
        }
        
        // Pass the full garth_dump directly to the Python microservice
        const tokensB64 = provider.garth_dump;

        const summaryData = await garminConnectService.getGarminDailySummary(userId, date);
        // TODO: Process and store summaryData into check_in_measurements or custom_measurements
        res.status(200).json({ message: 'Daily summary synced successfully.', data: summaryData });
    } catch (error) {
        next(error);
    }
});

// Endpoint to manually sync body composition data from Garmin
router.post('/sync/body_composition', authenticateToken, async (req, res, next) => {
    try {
        const userId = req.userId;
        const { startDate, endDate } = req.body; // Dates in YYYY-MM-DD format
        
        // Retrieve Garmin tokens for the user from the database
        const provider = await externalProviderRepository.getExternalDataProviderByUserIdAndProviderName(userId, 'garmin');
        if (!provider || !provider.garth_dump) {
            return res.status(400).json({ error: 'Garmin Connect not linked for this user or tokens missing.' });
        }
 
        const tokensB64 = provider.garth_dump;

        const bodyCompData = await garminConnectService.getGarminBodyComposition(userId, startDate, endDate);
        // TODO: Process and store bodyCompData into check_in_measurements or custom_measurements
        res.status(200).json({ message: 'Body composition synced successfully.', data: bodyCompData });
    } catch (error) {
        next(error);
    }
});

// Endpoint to get Garmin connection status and token info
router.get('/status', authenticateToken, async (req, res, next) => {
    try {
        const userId = req.userId;
        log('debug', `Garmin /status endpoint called for user: ${userId}`);
        const provider = await externalProviderRepository.getExternalDataProviderByUserIdAndProviderName(userId, 'garmin');
        log('debug', `Provider data from externalProviderRepository for user ${userId}:`, provider);

        if (provider) {
            // For security, do not send raw tokens to the frontend.
            // Instead, send status, last updated, and token expiry.
            // You might also send a masked external_user_id if available and useful for display.
            res.status(200).json({
                isLinked: true,
                lastUpdated: provider.updated_at,
                tokenExpiresAt: provider.token_expires_at,
                // externalUserId: provider.external_user_id ? `${provider.external_user_id.substring(0, 4)}...` : null, // Example masking
                message: "Garmin Connect is linked."
            });
        } else {
            res.status(200).json({
                isLinked: false,
                message: "Garmin Connect is not linked."
            });
        }
    } catch (error) {
        next(error);
    }
});

// Endpoint to unlink Garmin account
router.post('/unlink', authenticateToken, async (req, res, next) => {
    try {
        const userId = req.userId;
        const provider = await externalProviderRepository.getExternalDataProviderByUserIdAndProviderName(userId, 'garmin');

        if (provider) {
            await externalProviderRepository.deleteExternalDataProvider(provider.id);
            res.status(200).json({ success: true, message: "Garmin Connect account unlinked successfully." });
        } else {
            res.status(400).json({ error: "Garmin Connect account not found for this user." });
        }
    } catch (error) {
        next(error);
    }
});

module.exports = router;