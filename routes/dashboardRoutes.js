const express = require('express');
const router = express.Router();

const dashboardController = require('../controllers/dashboardController');
const requireAuth = require('../middleware/requireAuth');
const roleMiddleware = require('../middleware/roleMiddleware');

// Admin dashboard
router.get(
    '/admin',
    requireAuth,
    roleMiddleware('admin'),
    dashboardController.adminDashboard
);

// Instructor dashboard
router.get(
    '/instructor',
    requireAuth,
    roleMiddleware('instructor'),
    dashboardController.instructorDashboard
);

// Student dashboard
router.get(
    '/student',
    requireAuth,
    roleMiddleware('student'),
    dashboardController.studentDashboard
);

module.exports = router;