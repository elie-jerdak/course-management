const express = require('express');
const router = express.Router();

const enrollmentController = require('../controllers/enrollmentController');

const requireAuth = require('../middleware/requireAuth');
const roleMiddleware = require('../middleware/roleMiddleware');


// =======================
// STUDENT ROUTES
// =======================

// Enroll in course
router.post(
    '/:courseId',
    requireAuth,
    roleMiddleware('student'),
    enrollmentController.enrollInCourse
);


// My enrolled courses
router.get(
    '/me',
    requireAuth,
    roleMiddleware('student'),
    enrollmentController.getMyCourses
);


// Unenroll from course
router.post('/:courseId/unenroll', 
    requireAuth,
    roleMiddleware('student'),
    enrollmentController.unenroll
);


// =======================
// INSTRUCTOR / ADMIN
// =======================

// View students in a course
router.get(
    '/course/:courseId',
    requireAuth,
    roleMiddleware('instructor', 'admin'),
    enrollmentController.getCourseStudents
);


module.exports = router;