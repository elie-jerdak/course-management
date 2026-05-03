const express = require('express');
const router = express.Router();

const enrollmentController = require('../controllers/enrollmentController');

const requireAuth = require('../middleware/requireAuth');
const roleMiddleware = require('../middleware/roleMiddleware');
const role = roleMiddleware

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

// =======================
// ADMIN ROUTES
// =======================

// Get all enrollments (grid index)
router.get(
    '/admin',
    requireAuth,
    role('admin'),
    enrollmentController.getAllEnrollments
);

// Create enrollment page
router.get(
    '/admin/create',
    requireAuth,
    role('admin'),
    enrollmentController.getCreateEnrollmentPage
);

// Create enrollment action
router.post(
    '/admin',
    requireAuth,
    role('admin'),
    enrollmentController.createEnrollment
);

// View single enrollment
router.get(
    '/admin/:id',
    requireAuth,
    role('admin'),
    enrollmentController.getEnrollmentById
);

// Edit page
router.get(
    '/admin/:id/edit',
    requireAuth,
    role('admin'),
    enrollmentController.getEditEnrollmentPage
);

// Update enrollment
router.put(
    '/admin/:id',
    requireAuth,
    role('admin'),
    enrollmentController.updateEnrollment
);

// Delete enrollment
router.delete(
    '/admin/:id',
    requireAuth,
    role('admin'),
    enrollmentController.deleteEnrollment
);
module.exports = router;