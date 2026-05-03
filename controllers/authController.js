const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// =======================
// REGISTER
// =======================
exports.register = async (req, res) => {
    try {
        let { name, email, password, role } = req.body;

        email = email?.toLowerCase().trim();

        if (!name || !email || !password) {
            req.flash('error', 'All fields are required');
            return res.redirect('/auth/register');
        }

        const emailRegex = /^\S+@\S+\.\S+$/;
        if (!emailRegex.test(email)) {
            req.flash('error', 'Invalid email format');
            return res.redirect('/auth/register');
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            req.flash('error', 'Email already exists');
            return res.redirect('/auth/register');
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await User.create({
            name: name.trim(),
            email,
            password: hashedPassword,

            // SECURITY FIX (IMPORTANT)
            role: role === 'admin' || role === 'instructor' ? 'student' : (role || 'student')
        });

        req.flash('success', 'Account created successfully. Please login.');
        return res.redirect('/auth/login');

    } catch (err) {
        req.flash('error', 'Something went wrong');
        return res.redirect('/auth/register');
    }
};

// =======================
// LOGIN
// =======================
exports.login = async (req, res) => {
try {
        let { email, password } = req.body;

        email = email?.toLowerCase().trim();

        if (!email || !password) {
            req.flash('error', 'Email and password are required');
            return res.redirect('/auth/login');
        }

        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            req.flash('error', 'Invalid credentials');
            return res.redirect('/auth/login');
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            req.flash('error', 'Invalid credentials');
            return res.redirect('/auth/login');
        }

        const token = jwt.sign(
            {
                id: user._id,
                role: user.role,
                name: user.name,
                email: user.email
            },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.cookie("token", token, {
            httpOnly: true,
            sameSite: 'strict',
            secure: true
        });

        req.flash('success', 'Login successful');

        // role-based redirect
        if (user.role === "admin") return res.redirect('/dashboard/admin');
        if (user.role === "instructor") return res.redirect('/dashboard/instructor');
        return res.redirect('/dashboard/student');

    } catch (err) {
    console.log("LOGIN ERROR:", err);
    req.flash('error', 'Login failed');
    return res.redirect('/auth/login');
}
};

// =======================
// LOGOUT
// =======================
exports.logout = (req, res) => {
    res.clearCookie("token");
    req.flash('success', 'Logged out successfully');
    return res.redirect("/auth/login");
};