const express = require('express');
const router = express.Router();

const courseController = require('../controllers/courseController');
const requireAuth = require('../middleware/requireAuth');
const roleMiddleware = require('../middleware/roleMiddleware');
const mongoose = require('mongoose');

// ==========================
// VALIDATE OBJECT ID
// ==========================
function validateObjectId(req, res, next) {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        req.flash('error', 'Invalid course ID');
        return res.redirect('/courses');
    }
    next();
}

// ==========================
// LIST COURSES
// ==========================
router.get('/', courseController.coursePage);

// ==========================
// CREATE COURSE
// ==========================
router.get('/create',
    requireAuth,
    roleMiddleware('instructor', 'admin'),
    courseController.createPage
);

router.post('/create',
    requireAuth,
    roleMiddleware('instructor', 'admin'),
    courseController.createCourse
);

// ==========================
// EDIT PAGE (IMPORTANT: BEFORE /:id)
// ==========================
router.get('/update/:id',
    requireAuth,
    roleMiddleware('instructor', 'admin'),
    validateObjectId,
    courseController.getCourseEditPage
);

// ==========================
// GET SINGLE COURSE
// ==========================
router.get('/:id',
    requireAuth,
    validateObjectId,
    courseController.getCourseById
);

// ==========================
// UPDATE COURSE
// ==========================
router.put('/:id',
    requireAuth,
    roleMiddleware('instructor', 'admin'),
    validateObjectId,
    courseController.updateCourse
);

// ==========================
// DELETE COURSE
// ==========================
router.delete('/:id',
    requireAuth,
    roleMiddleware('instructor', 'admin'),
    validateObjectId,
    courseController.deleteCourse
);

module.exports = router;