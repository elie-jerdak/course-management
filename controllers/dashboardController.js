const Course = require('../models/Course');
const User = require('../models/User');
const Enrollment = require('../models/Enrollment');

// ==========================
// ADMIN DASHBOARD
// ==========================
exports.adminDashboard = async (req, res) => {
    try {

        // AUTHORIZATION
        if (req.user.role !== 'admin') {
            req.flash('error', 'Unauthorized access');
            return res.redirect('/');
        }

        const searchTerm = req.query.q?.trim() || '';

        // OPTIONAL SEARCH LOGIC (if you want filtering)
        let filter = {};

        if (searchTerm) {
            filter = {
                name: { $regex: searchTerm, $options: 'i' }
            };
        }

        const users = await User.find(filter).lean();

        return res.render('dashboard/admin', {
            users,
            user: req.user,
            searchTerm   // ✅ IMPORTANT FIX
        });

    } catch (err) {
        console.log(err);
        req.flash('error', 'Failed to load admin dashboard');
        return res.redirect('/');
    }
};

// ==========================
// INSTRUCTOR DASHBOARD
// ==========================
exports.instructorDashboard = async (req, res) => {
    try {

        // AUTHORIZATION
        if (req.user.role !== 'instructor') {
            req.flash('error', 'Unauthorized access');
            return res.redirect('/');
        }

        const instructorId = req.user.id;
        const searchTerm = req.query.q?.trim() || '';

        // BUILD FILTER
        const filter = {
            instructor: instructorId
        };

        if (searchTerm) {
            filter.title = {
                $regex: searchTerm,
                $options: 'i'
            };
        }

        // COURSES
        const courses = await Course.find(filter).lean();

        const courseIds = courses.map(c => c._id);

        // ENROLLMENTS (only for visible courses)
        const enrollments = await Enrollment.find({
            course: { $in: courseIds }
        })
        .populate('student', 'name email')
        .populate('course', 'title description')
        .lean();

        // GROUP ENROLLMENTS BY COURSE
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
            enrollments,
            searchTerm
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

        const searchTerm = req.query.q?.trim() || '';

        const enrollments = await Enrollment.find({ student: studentId })
            .populate({
                path: 'course',
                populate: {
                    path: 'instructor',
                    select: 'name email'
                }
            })
            .lean();

        // remove invalid enrollments
        let safeEnrollments = enrollments.filter(e => e.course !== null);

        // SEARCH FILTER (client-side filtering on populated data)
        if (searchTerm) {
            safeEnrollments = safeEnrollments.filter(e =>
                e.course.title.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        return res.render('dashboard/student', {
            enrollments: safeEnrollments,
            user: req.user,
            searchTerm
        });

    } catch (err) {
        console.log("STUDENT DASHBOARD ERROR:", err);
        req.flash('error', 'Failed to load student dashboard');
        return res.redirect('/courses');
    }
};

