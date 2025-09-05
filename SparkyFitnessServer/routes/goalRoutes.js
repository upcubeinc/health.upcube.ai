const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeAccess } = require('../middleware/authMiddleware');
const goalService = require('../services/goalService');

router.get('/', authenticateToken, authorizeAccess('goals', (req) => req.userId), async (req, res, next) => {
  const { selectedDate } = req.query;
 
  if (!selectedDate) {
    return res.status(400).json({ error: 'Selected date is required.' });
  }
 
  try {
    const goals = await goalService.getUserGoals(req.userId, selectedDate);
    res.status(200).json(goals);
  } catch (error) {
    if (error.message.startsWith('Forbidden')) {
      return res.status(403).json({ error: error.message });
    }
    next(error);
  }
});

router.get('/for-date', authenticateToken, authorizeAccess('goals', (req) => req.userId), async (req, res, next) => {
  const { date } = req.query;
 
  if (!date) {
    return res.status(400).json({ error: 'Date is required.' });
  }
 
  try {
    const goals = await goalService.getUserGoals(req.userId, date);
    res.status(200).json(goals);
  } catch (error) {
    if (error.message.startsWith('Forbidden')) {
      return res.status(403).json({ error: error.message });
    }
    next(error);
  }
});

router.post('/manage-timeline', authenticateToken, authorizeAccess('goals'), async (req, res, next) => {
  const authenticatedUserId = req.userId;
  const goalData = req.body;

  if (!goalData.p_start_date) {
    return res.status(400).json({ error: 'Start date is required.' });
  }

  try {
    const result = await goalService.manageGoalTimeline(authenticatedUserId, goalData);
    res.status(200).json(result);
  } catch (error) {
    if (error.message.startsWith('Forbidden')) {
      return res.status(403).json({ error: error.message });
    }
    next(error);
  }
});

module.exports = router;