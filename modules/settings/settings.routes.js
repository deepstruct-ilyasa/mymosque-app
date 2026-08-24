const express = require('express');
const router = express.Router();
const settingsController = require('./settings.controller');

router.get('/', settingsController.getSettings);
router.post('/', settingsController.updateSettings);

module.exports = router;