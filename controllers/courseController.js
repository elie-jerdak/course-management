const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const User = require('../models/User');
const mongoose = require('mongoose');

// ==========================
// CREATE COURSE PAGE
// ==========================
exports.createPage = async (req, res) => {
    try {

        // AUTHORIZATION (ADD)
        if (req.user.role !== 'admin' && req.user.role !== 'instructor') {
            req.flash('error', 'Unauthorized access');
            return res.redirect('/courses');
        }

        let instructors = [];

        if (req.user.role === 'admin') {
            instructors = await User.find({ role: 'instructor' })
                .select('name')
                .lean();
        }

        return res.render('courses/create', {
            user: req.user,
            instructors
        });

    } catch (err) {
        console.log("CREATE PAGE ERROR:", err);
        req.flash('error', 'Failed to load page');
        return res.redirect('/courses');
    }
};

// ==========================
// CREATE COURSE
// ==========================
exports.createCourse = async (req, res) => {
    try {

        // AUTHORIZATION (ADD)
        if (req.user.role !== 'admin' && req.user.role !== 'instructor') {
            req.flash('error', 'Unauthorized action');
            return res.redirect('/courses');
        }

        let { title, description, credits, instructor } = req.body;

        if (!title || !credits) {
            req.flash('error', 'Title and credits are required');
            return res.redirect('/courses/create');
        }

        const courseData = {
            title: title.trim(),
            description: description?.trim(),
            credits
        };

        if (req.user.role === 'admin') {
            courseData.instructor = instructor || null;
        } else {
            courseData.instructor = req.user.id;
        }

        await Course.create(courseData);

        req.flash('success', 'Course created successfully');
        return res.redirect('/courses');

    } catch (err) {
        console.log("CREATE COURSE ERROR:", err);
        req.flash('error', 'Error creating course');
        return res.redirect('/courses/create');
    }
};

// ==========================
// GET ALL COURSES
// ==========================
exports.coursePage = async (req, res) => {
    try {

        const searchTerm = req.query.q?.trim() || '';

        // Build course filter
        let courseFilter = {};

        if (searchTerm) {
            courseFilter = {
                $or: [
                    {
                        title: {
                            $regex: searchTerm,
                            $options: 'i'
                        }
                    },
                    {
                        description: {
                            $regex: searchTerm,
                            $options: 'i'
                        }
                    }
                ]
            };
        }

        const courses = await Course.find(courseFilter)
            .populate('instructor', 'name email')
            .lean();

        let enrollmentMap = {};

        if (req.user && req.user.role === 'student') {

            const enrollments = await Enrollment.find({
                student: req.user.id
            })
            .select('course status')
            .lean();

            enrollments
                .filter(e => e.course)
                .forEach(e => {
                    enrollmentMap[e.course.toString()] = e.status;
                });
        }

        return res.render('courses/index', {
            courses,
            user: req.user,
            enrollmentMap,
            searchTerm
        });

    } catch (err) {

        console.log("COURSE PAGE ERROR:", err);

        req.flash('error', 'Error loading courses');

        return res.render('courses/index', {
            courses: [],
            user: req.user,
            enrollmentMap: {},
            searchTerm: ''
        });
    }
};

// ==========================
// GET SINGLE COURSE
// ==========================
exports.getCourseById = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id)
            .select('title description instructor credits') // include credits
            .populate('instructor', 'name email')
            .lean();

        if (!course) {
            return res.status(404).send("Course not found");
        }

        let isEnrolled = false;

        if (req.user && req.user.role === 'student') {
            const existing = await Enrollment.findOne({
                student: req.user.id,
                course: course._id
            });

            isEnrolled = !!existing;
        }

        res.render('courses/details', {
            course,
            user: req.user,
            isEnrolled
        });

    } catch (err) {
        console.log("Get Course Error:", err);
        res.status(500).send("Server error");
    }
};

// ==========================
// GET COURSE EDIT PAGE
// ==========================
exports.getCourseEditPage = async (req, res) => {
    try {
        const { id } = req.params;

        const course = await Course.findById(id).lean();

        if (!course) {
            req.flash('error', 'Course not found');
            return res.redirect('/courses');
        }

        // AUTHORIZATION
        if (
            req.user.role !== 'admin' &&
            course.instructor?.toString() !== req.user.id
        ) {
            req.flash('error', 'Unauthorized access');
            return res.redirect('/courses');
        }

        // only admins can reassign instructors
        let instructors = [];

        if (req.user.role === 'admin') {
            instructors = await User.find({ role: 'instructor' })
                .select('name email')
                .lean();
        }

        return res.render('courses/edit', {
            course,
            user: req.user,
            instructors // FIX: now defined
        });

    } catch (err) {
        console.log("Edit Page Error:", err);
        req.flash('error', 'Failed to load edit page');
        return res.redirect('/courses');
    }
};

// ==========================
// UPDATE COURSE (SECURE)
// ==========================
exports.updateCourse = async (req, res) => {
    try {
        const { id } = req.params;

        const course = await Course.findById(id);

        if (!course) {
            req.flash('error', 'Course not found');
            return res.redirect('/courses');
        }

        // AUTHORIZATION
        if (
            req.user.role !== 'admin' &&
            course.instructor?.toString() !== req.user.id
        ) {
            req.flash('error', 'Unauthorized action');
            return res.redirect('/courses');
        }

        // ==========================
        // INPUTS
        // ==========================
        let { title, description, credits, instructor } = req.body;

        // ==========================
        // VALIDATION
        // ==========================
        if (!title || !credits) {
            req.flash('error', 'Title and credits are required');
            return res.redirect(`/courses/update/${id}`);
        }

        title = title.trim();
        description = description?.trim();

        if (title.length < 3) {
            req.flash('error', 'Title must be at least 3 characters');
            return res.redirect(`/courses/update/${id}`);
        }

        credits = Number(credits);
        if (isNaN(credits) || credits < 1 || credits > 10) {
            req.flash('error', 'Credits must be between 1 and 10');
            return res.redirect(`/courses/update/${id}`);
        }

        // ==========================
        // ADMIN ONLY: instructor change
        // ==========================
        if (req.user.role === 'admin') {

            // allow empty selection → remove instructor
            if (instructor === '' || instructor === undefined) {
                course.instructor = null;
            } else {
                const User = require('../models/User');

                const newInstructor = await User.findOne({
                    _id: instructor,
                    role: 'instructor'
                });

                if (!newInstructor) {
                    req.flash('error', 'Invalid instructor selected');
                    return res.redirect(`/courses/update/${id}`);
                }

                course.instructor = instructor;
            }
        }

        // ==========================
        // NORMAL FIELDS UPDATE
        // ==========================
        course.title = title;
        course.description = description;
        course.credits = credits;

        await course.save();

        req.flash('success', 'Course updated successfully');
        return res.redirect(`/courses/${course._id}`);

    } catch (err) {
        console.log("Update Course Error:", err);
        req.flash('error', 'Error updating course');
        return res.redirect('/courses');
    }
};

// ==========================
// DELETE COURSE (SECURE)
// ==========================
exports.deleteCourse = async (req, res) => {
    try {
        const { id } = req.params;

        const course = await Course.findById(id);

        if (!course) {
            req.flash('error', 'Course not found');
            return res.redirect('/courses');
        }

        // ownership check (admin OR course instructor)
        if (
            req.user.role !== 'admin' &&
            course.instructor?.toString() !== req.user.id
        ) {
            req.flash('error', 'Unauthorized action');
            return res.redirect('/courses');
        }

        // CASCADE: mark enrollments as dropped (soft cleanup)
        await Enrollment.updateMany(
            { course: course._id },
            { status: 'dropped' }
        );

        // OPTIONAL (better consistency): remove orphan enrollments completely
        // await Enrollment.deleteMany({ course: course._id });

        // DELETE COURSE
        await Course.findByIdAndDelete(course._id);

        req.flash('success', 'Course deleted successfully');
        return res.redirect('/courses');

    } catch (err) {
        console.log("Delete Course Error:", err);
        req.flash('error', 'Error deleting course');
        return res.redirect('/courses');
    }
};