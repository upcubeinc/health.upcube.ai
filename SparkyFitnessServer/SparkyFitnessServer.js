const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') }); // Load .env from root directory
const express = require('express');
const cors = require('cors'); // Added this line
const pool = require('./db/connection');
const { log } = require('./config/logging');
const { getDefaultModel } = require('./ai/config');
const { authenticateToken } = require('./middleware/authMiddleware');
const foodRoutes = require('./routes/foodRoutes');
const mealRoutes = require('./routes/mealRoutes');
const reportRoutes = require('./routes/reportRoutes');
const preferenceRoutes = require('./routes/preferenceRoutes');
const nutrientDisplayPreferenceRoutes = require('./routes/nutrientDisplayPreferenceRoutes');
const chatRoutes = require('./routes/chatRoutes');
const measurementRoutes = require('./routes/measurementRoutes');
const goalRoutes = require('./routes/goalRoutes');
const goalPresetRoutes = require('./routes/goalPresetRoutes');
const weeklyGoalPlanRoutes = require('./routes/weeklyGoalPlanRoutes');
const mealPlanTemplateRoutes = require('./routes/mealPlanTemplateRoutes');
const exerciseRoutes = require('./routes/exerciseRoutes');
const exerciseEntryRoutes = require('./routes/exerciseEntryRoutes');
const healthDataRoutes = require('./integrations/healthData/healthDataRoutes');
const authRoutes = require('./routes/authRoutes');
const healthRoutes = require('./routes/healthRoutes');
const externalProviderRoutes = require('./routes/externalProviderRoutes'); // Renamed import
const garminRoutes = require('./routes/garminRoutes'); // Import Garmin routes
const moodRoutes = require('./routes/moodRoutes'); // Import Mood routes
const { router: openidRoutes, initializeOidcClient } = require('./openidRoutes');
const oidcSettingsRoutes = require('./routes/oidcSettingsRoutes');
const versionRoutes = require('./routes/versionRoutes');
const { applyMigrations } = require('./utils/dbMigrations');
const waterContainerRoutes = require('./routes/waterContainerRoutes');
const errorHandler = require('./middleware/errorHandler'); // Import the new error handler

const app = express();
const PORT = process.env.SPARKY_FITNESS_SERVER_PORT || 3010;

console.log(`DEBUG: SPARKY_FITNESS_FRONTEND_URL is: ${process.env.SPARKY_FITNESS_FRONTEND_URL}`);

// Use cors middleware to allow requests from your frontend
app.use(cors({
  origin: process.env.SPARKY_FITNESS_FRONTEND_URL || 'http://localhost:8080',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-provider-id', 'x-api-key'],
  credentials: true // Allow cookies to be sent from the frontend
}));

// Middleware to parse JSON bodies for all incoming requests
app.use(express.json());

const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);

// Trust the first proxy
app.set('trust proxy', 1);

const isProduction = process.env.NODE_ENV === 'production';

app.use(session({
  store: new pgSession({
    pool: pool, // Connection pool
    tableName: 'session' // Use a table named 'session'
  }),
  name: 'sparky.sid',
  secret: process.env.SESSION_SECRET ?? 'sparky_secret',
  resave: false,
  saveUninitialized: true,
  proxy: true, // Trust the proxy in all environments (like Vite dev server)
  cookie: {
    path: '/', // Ensure cookie is sent for all paths
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 1 day
    // secure and sameSite will be set dynamically
  }
}));

// Dynamically set cookie properties based on protocol
app.use((req, res, next) => {
  if (req.session && req.protocol === 'https') {
    req.session.cookie.secure = true;
    req.session.cookie.sameSite = 'none';
  } else if (req.session) {
    req.session.cookie.sameSite = 'lax';
  }
  log('debug', `[Session Debug] Request Protocol: ${req.protocol}, Secure: ${req.secure}, Host: ${req.headers.host}`);
  next();
});

// Apply authentication middleware to all routes except auth
app.use((req, res, next) => {
  // Routes that do not require authentication (e.g., login, register, OIDC flows, health checks)
  const publicRoutes = [
    '/auth/login',
    '/auth/register',
    '/auth/settings',
    '/api/health-data',
    '/health',
    '/openid', // All OIDC routes are handled by session, not JWT token
    '/openid/api/me', // Explicitly allow /openid/api/me as a public route for session check
    '/version', // Allow version endpoint to be public
  ];

  // Check if the current request path starts with any of the public routes
  if (publicRoutes.some(route => req.path.startsWith(route))) {
    log('debug', `Skipping authentication for public route: ${req.path}`);
    return next();
  }

  // For all other routes, apply JWT token authentication
  authenticateToken(req, res, next);
});

// Link all routes
app.use('/chat', chatRoutes);
app.use('/foods', foodRoutes);
app.use('/meals', mealRoutes);
app.use('/reports', reportRoutes);
app.use('/user-preferences', preferenceRoutes);
app.use('/preferences/nutrient-display', nutrientDisplayPreferenceRoutes);
app.use('/measurements', measurementRoutes);
app.use('/goals', goalRoutes);
app.use('/user-goals', goalRoutes);
app.use('/goal-presets', goalPresetRoutes);
app.use('/weekly-goal-plans', weeklyGoalPlanRoutes);
app.use('/meal-plan-templates', mealPlanTemplateRoutes);
app.use('/exercises', exerciseRoutes);
app.use('/exercise-entries', exerciseEntryRoutes);
app.use('/api/health-data', healthDataRoutes);
app.use('/auth', authRoutes);
app.use('/user', authRoutes);
app.use('/health', healthRoutes);
app.use('/external-providers', externalProviderRoutes); // Renamed route for generic data providers
app.use('/integrations/garmin', garminRoutes); // Add Garmin integration routes
app.use('/mood', moodRoutes); // Add Mood routes
app.use('/admin/oidc-settings', oidcSettingsRoutes); // Admin OIDC settings routes
app.use('/version', versionRoutes); // Version routes
log('debug', 'Registering /openid routes');
app.use('/openid', openidRoutes); // Import OpenID routes
app.use('/water-containers', waterContainerRoutes);

console.log('DEBUG: Attempting to start server...');
applyMigrations().then(async () => {
  // Initialize OIDC client after migrations are applied
  await initializeOidcClient();

  // Set admin user from environment variable if provided
  if (process.env.SPARKY_FITNESS_ADMIN_EMAIL) {
    const userRepository = require('./models/userRepository');
    const adminUser = await userRepository.findUserByEmail(process.env.SPARKY_FITNESS_ADMIN_EMAIL);
    if (adminUser && adminUser.id) {
      const success = await userRepository.updateUserRole(adminUser.id, 'admin');
      if (success) {
        log('info', `User ${process.env.SPARKY_FITNESS_ADMIN_EMAIL} set as admin.`);
      } else {
        log('warn', `Failed to set user ${process.env.SPARKY_FITNESS_ADMIN_EMAIL} as admin.`);
      }
    } else {
      log('warn', `Admin user with email ${process.env.SPARKY_FITNESS_ADMIN_EMAIL} not found.`);
    }
  }

  app.listen(PORT, () => {
    console.log(`DEBUG: Server started and listening on port ${PORT}`); // Direct console log
    log('info', `SparkyFitnessServer listening on port ${PORT}`);
  });
}).catch(error => {
  log('error', 'Failed to apply migrations and start server:', error);
  process.exit(1);
});

// Centralized error handling middleware - MUST be placed after all routes and other middleware
app.use(errorHandler);

// Catch-all for 404 Not Found - MUST be placed after all routes and error handlers
app.use((req, res, next) => {
  // For any unhandled routes, return a JSON 404 response
  res.status(404).json({ error: "Not Found", message: `The requested URL ${req.originalUrl} was not found on this server.` });
});