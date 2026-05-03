const User = require('../models/User');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const bcrypt = require('bcrypt');

// ==============================
// GET ALL USERS (ADMIN ONLY)
// ==============================
exports.getUsers = async (req, res) => {
    try {

        //  AUTHORIZATION (MISSING BEFORE)
        if (req.user.role !== 'admin') {
            req.flash('error', 'Unauthorized access');
            return res.redirect('/dashboard');
        }

        const users = await User.find()
            .select('-password')
            .lean();

        return res.render('users/index', {
            users,
            user: req.user
        });

    } catch (err) {
        console.log("GET USERS ERROR:", err);
        req.flash('error', 'Failed to load users');
        return res.redirect('/');
    }
};


// ==============================
// GET SINGLE USER 
// ==============================
exports.getUserById = async (req, res) => {
    try {
        const userData = await User.findById(req.params.id)
            .select('-password')
            .lean();

        if (!userData) {
            req.flash('error', 'User not found');
            return res.redirect('/users');
        }

        //  AUTHORIZATION ADDED
        if (
            req.user.role !== 'admin' &&
            req.user.id !== userData._id.toString()
        ) {
            req.flash('error', 'Unauthorized access');
            return res.redirect('/dashboard');
        }

        let extraData = [];

        // ======================
        // STUDENT → enrollments
        // ======================
        if (userData.role === 'student') {
            extraData = await Enrollment.find({ student: userData._id })
                .populate({
                    path: 'course',
                    populate: {
                        path: 'instructor',
                        select: 'name email'
                    }
                })
                .lean();
        }

        // ======================
        // INSTRUCTOR → courses
        // ======================
        if (userData.role === 'instructor') {
            extraData = await Course.find({ instructor: userData._id })
                .lean();
        }

        return res.render('users/details', {
            userData,
            extraData,
            user: req.user
        });

    } catch (err) {
        console.log("USER DETAILS ERROR:", err);
        req.flash('error', 'Failed to load user details');
        return res.redirect('/users');
    }
};


// ==============================
// CREATE USER (ADMIN ONLY)
// ==============================
exports.createUser = async (req, res) => {
    try {
        let { name, email, password, role } = req.body;

        email = email?.toLowerCase().trim();

        if (!name || !email || !password) {
            req.flash('error', 'All fields are required');
            return res.redirect('/users/create');
        }

        const existing = await User.findOne({ email });
        if (existing) {
            req.flash('error', 'Email already exists');
            return res.redirect('/users/create');
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await User.create({
            name: name.trim(),
            email,
            password: hashedPassword,
            role: role || 'student'
        });

        req.flash('success', 'User created successfully');
        return res.redirect('/users');

    } catch (err) {
        console.log("CREATE USER ERROR:", err);
        req.flash('error', 'Failed to create user');
        return res.redirect('/users/create');
    }
};

// ==============================
// GET UPDATE USER PAGE (ADMIN ONLY)
// ==============================
exports.getUpdateUserPage = async (req, res) => {
    try {

        //  AUTHORIZATION (ADD)
        if (req.user.role !== 'admin' && req.user.id !== req.params.id) {
            req.flash('error', 'Unauthorized access');
            return res.redirect('/dashboard');
        }

        const user = await User.findById(req.params.id);

        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/users');
        }

        res.render('users/update', { 
            user,
            currentUser: req.user,
            messages: req.flash() 
        });

    } catch (err) {
        console.error(err);
        req.flash('error', 'Something went wrong');
        res.redirect('/users');
    }
};
// ==============================
// UPDATE USER
// ==============================

exports.updateUser = async (req, res) => {
    try {
        const targetUserId = req.params.id;

        const currentUser = req.user;

        //  AUTHORIZATION
        if (
            currentUser.role !== 'admin' &&
            currentUser.id !== targetUserId
        ) {
            req.flash('error', 'Unauthorized action');
            return res.redirect('/dashboard/admin');
        }

        const user = await User.findById(targetUserId);

        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/dashboard/admin');
        }

        let { name, email, role, password } = req.body;

        const updateData = {};

        //  NAME
        if (name && name.trim() !== user.name) {
            updateData.name = name.trim();
        }

        //  EMAIL
        if (email) {
            email = email.toLowerCase().trim();

            const existing = await User.findOne({ email });

            if (existing && existing._id.toString() !== targetUserId) {
                req.flash('error', 'Email already in use');
                return res.redirect('back');
            }

            updateData.email = email;
        }

        //  PASSWORD (strong validation)
        if (password && password.trim() !== '') {
            const strongPasswordRegex =
                /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

            if (!strongPasswordRegex.test(password)) {
                req.flash(
                    'error',
                    'Password must be at least 8 chars, include upper, lower, number, and symbol'
                );
                return res.redirect('back');
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            updateData.password = hashedPassword;
        }

        //  ROLE CHANGE (ADMIN ONLY)
        if (currentUser.role === 'admin' && role && role !== user.role) {

            const oldRole = user.role;
            const newRole = role;

            //  prevent self-demotion edge cases (optional but smart)
            if (currentUser.id === targetUserId && oldRole === 'admin' && newRole !== 'admin') {
                req.flash('error', 'You cannot change your own admin role');
                return res.redirect('back');
            }

            updateData.role = newRole;

            //  HANDLE ROLE TRANSITIONS
            // (you must have Course + Enrollment models for this)

            // Instructor → Student/Admin
            if (oldRole === 'instructor' && newRole !== 'instructor') {
                await Course.deleteMany({ instructor: targetUserId });
            }

            // Student → Instructor/Admin
            if (oldRole === 'student' && newRole !== 'student') {
                await Enrollment.deleteMany({ student: targetUserId });
            }
        }

        //  APPLY UPDATE
        await User.findByIdAndUpdate(targetUserId, updateData, {
            new: true,
            runValidators: true
        });

        req.flash('success', 'User updated successfully');
        return res.redirect('/dashboard/admin');

    } catch (err) {
        console.log("UPDATE USER ERROR:", err);
        req.flash('error', 'Failed to update user');
        return res.redirect('/dashboard/admin');
    }
};

// ==============================
// DELETE USER (ADMIN ONLY + SAFE)
// ==============================
exports.deleteUser = async (req, res) => {
    try {

        // AUTHORIZATION (ADD SAFETY LAYER)
        if (req.user.role !== 'admin') {
            req.flash('error', 'Unauthorized access');
            return res.redirect('/dashboard/admin');
        }

        const targetUserId = req.params.id;

        if (req.user.id === targetUserId) {
            req.flash('error', 'You cannot delete yourself');
            return res.redirect('/dashboard/admin');
        }

        const user = await User.findById(targetUserId);

        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/dashboard/admin');
        }

        if (user.role === 'student') {
            await Enrollment.updateMany(
                { student: targetUserId, status: 'active' },
                { status: 'dropped' }
            );
        }

        if (user.role === 'instructor') {
            await Course.updateMany(
                { instructor: targetUserId },
                { instructor: null }
            );
        }

        await User.findByIdAndDelete(targetUserId);

        req.flash('success', 'User deleted successfully');
        return res.redirect('/dashboard/admin');

    } catch (err) {
        console.log("DELETE USER ERROR:", err);
        req.flash('error', 'Failed to delete user');
        return res.redirect('/dashboard/admin');
    }
};


// ==============================
// CHANGE PASSWORD (SELF ONLY FIX)
// ==============================
exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        const user = await User.findById(req.user.id).select('+password');

        const isMatch = await bcrypt.compare(currentPassword, user.password);

        if (!isMatch) {
            req.flash('error', 'Current password is incorrect');
            return res.redirect('/profile');
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        user.password = hashedPassword;
        await user.save();

        req.flash('success', 'Password updated successfully');
        return res.redirect('/profile');

    } catch (err) {
        console.log("CHANGE PASSWORD ERROR:", err);
        req.flash('error', 'Failed to change password');
        return res.redirect('/profile');
    }
};


// ==============================
// PROMOTE TO ADMIN (ADMIN ONLY SAFE)
// ==============================
exports.changeUserRole = async (req, res) => {
    try {
        const targetUserId = req.params.id;

        const targetUser = await User.findById(targetUserId);

        if (!targetUser) {
            req.flash('error', 'User not found');
            return res.redirect('/dashboard/admin');
        }

        // already admin
        if (targetUser.role === 'admin') {
            req.flash('error', 'User is already admin');
            return res.redirect('/dashboard/admin');
        }

        //  AUTHORIZATION CHECK (IMPORTANT FIX)
        if (req.user.role !== 'admin') {
            req.flash('error', 'Unauthorized action');
            return res.redirect('/dashboard/admin');
        }

        // ==============================
        // CLEANUP BEFORE PROMOTION
        // ==============================

        if (targetUser.role === 'instructor') {
            await Course.updateMany(
                { instructor: targetUserId },
                { instructor: null }
            );
        }

        if (targetUser.role === 'student') {
            await Enrollment.updateMany(
                { student: targetUserId },
                { status: 'dropped' }
            );
        }

        targetUser.role = 'admin';
        await targetUser.save();

        req.flash('success', 'User promoted to admin successfully');
        return res.redirect('/dashboard/admin');

    } catch (err) {
        console.log("PROMOTE ERROR:", err);
        req.flash('error', 'Failed to promote user');
        return res.redirect('/dashboard/admin');
    }
};