// routes/statisticsRoutes.js
const express = require('express');
const router = express.Router();
const { getStatisticsSummary } = require('../controllers/statisticsController');
const { authenticateToken } = require('../middlewares/authMiddleware');

router.route('/summary').get(authenticateToken, getStatisticsSummary);

module.exports = router;