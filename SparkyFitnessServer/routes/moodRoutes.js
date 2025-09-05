const express = require('express');
const router = express.Router();
const moodRepository = require('../models/moodRepository');
const { authenticateToken } = require('../middleware/authMiddleware');
const { canAccessUserData } = require('../utils/permissionUtils');

// Create a new mood entry
router.post('/', authenticateToken, async (req, res, next) => {
  try {
    const { mood_value, notes, entry_date } = req.body;
    const userId = req.userId; // Changed from req.user.id

    if (!mood_value) {
      return res.status(400).json({ message: 'Mood value is required.' });
    }

    const newMoodEntry = await moodRepository.createOrUpdateMoodEntry(userId, mood_value, notes, entry_date);
    res.status(201).json(newMoodEntry);
  } catch (error) {
    next(error);
  }
});

// Get mood entries for a user within a date range
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const { userId, startDate, endDate } = req.query;
    const authenticatedUserId = req.userId; // Changed from req.user.id

    if (!userId || !startDate || !endDate) {
      return res.status(400).json({ message: 'User ID, start date, and end date are required.' });
    }

    if (!await canAccessUserData(userId, 'mood', authenticatedUserId)) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const moodEntries = await moodRepository.getMoodEntriesByUserId(userId, startDate, endDate);
    res.json(moodEntries);
  } catch (error) {
    next(error);
  }
});

// Get a single mood entry by ID
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const authenticatedUserId = req.userId; // Changed from req.user.id

    const moodEntry = await moodRepository.getMoodEntryById(id, authenticatedUserId);

    if (!moodEntry) {
      return res.status(404).json({ message: 'Mood entry not found.' });
    }

    if (!await canAccessUserData(moodEntry.user_id, 'mood', authenticatedUserId)) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    res.json(moodEntry);
  } catch (error) {
    next(error);
  }
});

// Get a single mood entry by date
router.get('/date/:entryDate', authenticateToken, async (req, res, next) => {
  try {
    const { entryDate } = req.params;
    const authenticatedUserId = req.userId;
    const moodEntry = await moodRepository.getMoodEntryByDate(authenticatedUserId, entryDate);

    if (!moodEntry) {
      return res.status(404).json({ message: 'Mood entry not found for this date.' });
    }

    if (!await canAccessUserData(moodEntry.user_id, 'mood', authenticatedUserId)) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    res.json(moodEntry);
  } catch (error) {
    next(error);
  }
});

// Update a mood entry
router.put('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { mood_value, notes } = req.body;
    const authenticatedUserId = req.userId; // Changed from req.user.id

    const existingMoodEntry = await moodRepository.getMoodEntryById(id, authenticatedUserId);
    if (!existingMoodEntry) {
      return res.status(404).json({ message: 'Mood entry not found.' });
    }

    if (!await canAccessUserData(existingMoodEntry.user_id, 'mood', authenticatedUserId)) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const updatedMoodEntry = await moodRepository.updateMoodEntry(id, authenticatedUserId, mood_value, notes);
    res.json(updatedMoodEntry);
  } catch (error) {
    next(error);
  }
});

// Delete a mood entry
router.delete('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const authenticatedUserId = req.userId; // Changed from req.user.id

    const existingMoodEntry = await moodRepository.getMoodEntryById(id, authenticatedUserId);
    if (!existingMoodEntry) {
      return res.status(404).json({ message: 'Mood entry not found.' });
    }

    if (!await canAccessUserData(existingMoodEntry.user_id, 'mood', authenticatedUserId)) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const deleted = await moodRepository.deleteMoodEntry(id, authenticatedUserId);
    if (deleted) {
      res.status(204).send(); // No content
    } else {
      res.status(404).json({ message: 'Mood entry not found or not authorized to delete.' });
    }
  } catch (error) {
    next(error);
  }
});

module.exports = router;