const Course = require('../models/Course');
const User = require('../models/User');
const Enrollment = require('../models/Enrollment');

// ==========================
// ADMIN DASHBOARD
// ==========================
exports.adminDashboard = async (req, res) => {
    try {

        //  AUTHORIZATION (ADD)
        if (req.user.role !== 'admin') {
            req.flash('error', 'Unauthorized access');
            return res.redirect('/');
        }

        const users = await User.find().lean();

        res.render('dashboard/admin', {
            users,
            user: req.user
        });

    } catch (err) {
        req.flash('error', 'Failed to load admin dashboard');
        res.redirect('/');
    }
};

// ==========================
// INSTRUCTOR DASHBOARD
// ==========================
exports.instructorDashboard = async (req, res) => {
    try {

        // AUTHORIZATION (ADD)
        if (req.user.role !== 'instructor') {
            req.flash('error', 'Unauthorized access');
            return res.redirect('/');
        }

        const instructorId = req.user.id;

        const courses = await Course.find({ instructor: instructorId })
            .lean();

        const courseIds = courses.map(c => c._id);

        const enrollments = await Enrollment.find({
            course: { $in: courseIds }
        })
        .populate('student', 'name email')
        .populate('course', 'title description')
        .lean();

        const enrollmentMap = {};

        enrollments.forEach(e => {
            const courseId = e.course?._id?.toString();

            if (!enrollmentMap[courseId]) {
                enrollmentMap[courseId] = [];
            }

            enrollmentMap[courseId].push(e);
        });

        return res.render('dashboard/instructor', {
            user: req.user,
            courses,
            enrollmentMap,
            enrollments
        });

    } catch (err) {
        console.log("INSTRUCTOR DASHBOARD ERROR:", err);
        req.flash('error', 'Failed to load dashboard');
        return res.redirect('/');
    }
};

// ==========================
// STUDENT DASHBOARD
// ==========================
exports.studentDashboard = async (req, res) => {
    try {
        const studentId = req.user?.id || req.user?._id;

        if (!studentId) {
            req.flash('error', 'Unauthorized access');
            return res.redirect('/auth/login');
        }

        const enrollments = await Enrollment.find({ student: studentId })
            .populate({
                path: 'course',
                populate: {
                    path: 'instructor',
                    select: 'name email'
                }
            })
            .lean();

        // ensure it's always an array
        const safeEnrollments = enrollments.filter(e => e.course !== null);

        return res.render('dashboard/student', {
            enrollments: safeEnrollments,
            user: req.user
        });

    } catch (err) {
        console.log("DASHBOARD ERROR:", err);
        req.flash('error', 'Failed to load student dashboard');
        return res.redirect('/courses');
    }
};