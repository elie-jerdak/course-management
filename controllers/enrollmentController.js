const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const User = require('../models/User');

const mongoose = require('mongoose');

// ==========================
// ENROLL IN COURSE
// ==========================
exports.enrollInCourse = async (req, res) => {
    try {
        const courseId = req.params.courseId;
        const studentId = req.user.id;

        if (!mongoose.Types.ObjectId.isValid(courseId)) {
            req.flash('error', 'Invalid course ID');
            return res.redirect('/courses');
        }

        const course = await Course.findById(courseId);
        if (!course) {
            req.flash('error', 'Course not found');
            return res.redirect('/courses');
        }

        const existing = await Enrollment.findOne({
            student: studentId,
            course: courseId
        });

        // 🔁 REACTIVATE DROPPED ENROLLMENT
        if (existing && existing.status === 'dropped') {
            existing.status = 'active';
            await existing.save();

            req.flash('success', 'Re-enrolled successfully');
            return res.redirect('/dashboard/student');
        }

        // ❌ ALREADY ACTIVE
        if (existing && existing.status === 'active') {
            req.flash('error', 'You are already enrolled in this course');
            return res.redirect('/courses');
        }

        // ➕ NEW ENROLLMENT
        await Enrollment.create({
            student: studentId,
            course: courseId,
            status: 'active'
        });

        req.flash('success', 'Successfully enrolled in course!');
        return res.redirect('/courses');

    } catch (err) {
        console.log("ENROLL ERROR:", err);
        req.flash('error', 'Enrollment failed');
        return res.redirect('/courses');
    }
};

// ==========================
// GET MY COURSES (STUDENT DASHBOARD)
// ==========================
exports.getMyCourses = async (req, res) => {
    try {
        const enrollments = await Enrollment.find({
            student: req.user.id
        })
        .populate('course')
        .lean();

        const safeEnrollments = enrollments.filter(e => e.course);

        return res.render('dashboard/student', {
            enrollments: safeEnrollments,
            user: req.user
        });

    } catch (err) {
        console.log("MY COURSES ERROR:", err);
        req.flash('error', 'Failed to load courses');
        return res.redirect('/dashboard/student');
    }
};

// ==========================
// GET COURSE STUDENTS (INSTRUCTOR/ADMIN)
// ==========================
exports.getCourseStudents = async (req, res) => {
    try {
        const courseId = req.params.courseId;

        if (!mongoose.Types.ObjectId.isValid(courseId)) {
            req.flash('error', 'Invalid course ID');
            return res.redirect('/courses');
        }

        const course = await Course.findById(courseId);

        if (!course) {
            req.flash('error', 'Course not found');
            return res.redirect('/courses');
        }

        // 🔒 AUTHORIZATION (important missing check)
        if (
            req.user.role !== 'admin' &&
            course.instructor?.toString() !== req.user.id
        ) {
            req.flash('error', 'Unauthorized access');
            return res.redirect('/courses');
        }

        const enrollments = await Enrollment.find({
            course: courseId
        })
        .populate('student', 'name email')
        .lean();

        return res.render('enrollments/courseStudents', {
            enrollments,
            user: req.user,
            course
        });

    } catch (err) {
        console.log("COURSE STUDENTS ERROR:", err);
        req.flash('error', 'Failed to load students');
        return res.redirect('/courses');
    }
};

// ==========================
// UNENROLL (STUDENT ONLY)
// ==========================
exports.unenroll = async (req, res) => {
    try {
        const courseId = req.params.courseId;
        const studentId = req.user.id;

        const enrollment = await Enrollment.findOne({
            student: studentId,
            course: courseId
        });

        if (!enrollment) {
            req.flash('error', 'Enrollment not found');
            return res.redirect('/courses');
        }

        enrollment.status = 'dropped';
        await enrollment.save();

        req.flash('success', 'You have been unenrolled from the course');

        const backURL = req.get('Referer') || '/courses';
        return res.redirect(backURL);

    } catch (err) {
        console.log("UNENROLL ERROR:", err);
        req.flash('error', 'Something went wrong');
        return res.redirect('/courses');
    }
};

// ==========================
// ADMIN METHODS
// ==========================

exports.getAllEnrollments = async (req, res) => {
    try {
        const enrollments = await Enrollment.find()
            .populate('student', 'name email')
            .populate('course', 'title')
            .lean();

        res.render('enrollments/index', {
            enrollments,
            user: req.user,
            
        });

    } catch (err) {
        console.log(err);
        req.flash('error', 'Failed to load enrollments');
        res.redirect('/');
    }
};

exports.getCreateEnrollmentPage = async (req, res) => {
    try {
        const users = await User.find({ role: 'student' }).lean();
        const courses = await Course.find().lean();

        res.render('enrollments/create', {
            users,
            courses,
            user: req.user
        });

    } catch (err) {
        console.log(err);
        req.flash('error', 'Failed to load page');
        res.redirect('/enrollments/admin');
    }
};

exports.createEnrollment = async (req, res) => {
    try {
        const { studentId, courseId, status } = req.body;

        const existing = await Enrollment.findOne({
            student: studentId,
            course: courseId
        });

        if (existing) {
            req.flash('error', 'Enrollment already exists');
            return res.redirect('/enrollments/admin');
        }

        await Enrollment.create({
            student: studentId,
            course: courseId,
            status: status || 'active'
        });

        req.flash('success', 'Enrollment created');
        res.redirect('/enrollments/admin');

    } catch (err) {
        console.log(err);
        req.flash('error', 'Creation failed');
        res.redirect('/enrollments/admin');
    }
};

exports.getEnrollmentById = async (req, res) => {
    try {
        const enrollment = await Enrollment.findById(req.params.id)
            .populate('student')
            .populate('course')
            .lean();

        if (!enrollment) {
            req.flash('error', 'Enrollment not found');
            return res.redirect('/enrollments/admin');
        }

        res.render('enrollments/details', {
            enrollment,
            user: req.user
        });

    } catch (err) {
        console.log(err);
        req.flash('error', 'Failed to load enrollment');
        res.redirect('/enrollments/admin');
    }
};

exports.getEditEnrollmentPage = async (req, res) => {
    try {
        const enrollment = await Enrollment.findById(req.params.id)
            .populate('student')
            .populate('course')
            .lean();

        if (!enrollment) {
            req.flash('error', 'Enrollment not found');
            return res.redirect('/enrollments/admin');
        }

        res.render('enrollments/edit', {
            enrollment,
            user: req.user
        });

    } catch (err) {
        console.log(err);
        req.flash('error', 'Failed to load edit page');
        res.redirect('/enrollments/admin');
    }
};

exports.updateEnrollment = async (req, res) => {
    try {
        const { status } = req.body;

        await Enrollment.findByIdAndUpdate(req.params.id, {
            status
        });

        req.flash('success', 'Enrollment updated');
        res.redirect('/enrollments/admin');

    } catch (err) {
        console.log(err);
        req.flash('error', 'Update failed');
        res.redirect('/enrollments/admin');
    }
};

exports.deleteEnrollment = async (req, res) => {
    try {
        await Enrollment.findByIdAndDelete(req.params.id);

        req.flash('success', 'Enrollment deleted');
        res.redirect('/enrollments/admin');

    } catch (err) {
        console.log(err);
        req.flash('error', 'Delete failed');
        res.redirect('/enrollments/admin');
    }
};