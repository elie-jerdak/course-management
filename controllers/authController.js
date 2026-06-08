const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// =======================
// REGISTER
// =======================
exports.register = async (req, res) => {
    try {
        let { username, email, password, role } = req.body;

        email = email?.toLowerCase().trim();
        username = username?.trim().toLowerCase();

        const errors = {};

        // ======================
        // USERNAME VALIDATION
        // ======================
        if (!username) {
            errors.username = 'Username is required';
        }

        // ======================
        // EMAIL VALIDATION
        // ======================
        if (!email) {
            errors.email = 'Email is required';
        } else {
            const emailRegex = /^\S+@\S+\.\S+$/;
            if (!emailRegex.test(email)) {
                errors.email = 'Invalid email format';
            }
        }

        // ======================
        // PASSWORD VALIDATION
        // ======================
        if (!password) {
            errors.password = 'Password is required';
        } else {
            const passwordErrors = [];

            if (password.length < 8) {
                passwordErrors.push('Minimum 8 characters required');
            }
            if (!/[A-Z]/.test(password)) {
                passwordErrors.push('One uppercase letter');
            }
            if (!/[a-z]/.test(password)) {
                passwordErrors.push('One lowercase letter');
            }
            if (!/[0-9]/.test(password)) {
                passwordErrors.push('One number');
            }

            const specialCharRegex = /[!@#$%^&*(),.?":{}|<>_]/;
            if (!specialCharRegex.test(password)) {
                passwordErrors.push('One special character');
            }

            if (passwordErrors.length > 0) {
                errors.password = passwordErrors.join(', ');
            }
        }

        // ======================
        // STOP IF VALIDATION FAILS
        // ======================
        if (Object.keys(errors).length > 0) {
            return res.render('auth/register', {
                errors,
                old: { username, email, role }
            });
        }

        // ======================
        // DUPLICATE CHECK (OPTIMIZED)
        // ======================
        const existingUser = await User.findOne({
            $or: [
                { email },
                { username }
            ]
        });

        if (existingUser) {
            const duplicateErrors = {};

            if (existingUser.email === email) {
                duplicateErrors.email = 'Email already exists';
            }

            if (existingUser.username === username) {
                duplicateErrors.username = 'Username already exists';
            }

            return res.render('auth/register', {
                errors: duplicateErrors,
                old: { username, email, role }
            }); 
        }

        // =====================
        // CREATE USER
        // =====================
        const hashedPassword = await bcrypt.hash(password, 10);

        await User.create({
            username,
            email,
            password: hashedPassword,
            role:
                role === 'admin' || role === 'instructor'
                    ? 'student'
                    : (role || 'student')
        });

        req.flash('success', 'Account created successfully. Please login.');
        return res.redirect('/auth/login');

    } catch (err) {
        console.log(err);

        return res.render('auth/register', {
            errors: {
                general: 'Something went wrong'
            },
            old: req.body
        });
    }
};

// =======================
// LOGIN
// =======================
exports.login = async (req, res) => {
    try {
        let { email, password } = req.body;

        email = email?.toLowerCase().trim();

        const errors = {};

        // ======================
        // EMAIL VALIDATION
        // ======================
        if (!email) {
            errors.email = 'Email is required';
        } else {
            const emailRegex = /^\S+@\S+\.\S+$/;

            if (!emailRegex.test(email)) {
                errors.email = 'Invalid email format';
            }
        }

        // ======================
        // PASSWORD VALIDATION
        // ======================
        if (!password) {
            errors.password = 'Password is required';
        }

        // ======================
        // STOP IF VALIDATION FAILS
        // ======================
        if (Object.keys(errors).length > 0) {
            return res.render('auth/login', {
                errors,
                old: {
                    email
                }
            });
        }

        // ======================
        // FIND USER
        // ======================
        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            return res.render('auth/login', {
                errors: {
                    email: 'Invalid email or password'
                },
                old: {
                    email
                }
            });
        }

        // ======================
        // CHECK PASSWORD
        // ======================
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.render('auth/login', {
                errors: {
                    password: 'Invalid email or password'
                },
                old: {
                    email
                }
            });
        }

        // ======================
        // JWT TOKEN
        // ======================
        const token = jwt.sign(
            {
                id: user._id,
                role: user.role,
                username: user.username,
                email: user.email
            },
            process.env.JWT_SECRET,
            {
                expiresIn: '1d'
            }
        );

        res.cookie('token', token, {
            httpOnly: true,
            sameSite: 'strict',
            secure: true
        });

        // ======================
        // ROLE REDIRECT
        // ======================
        if (user.role === 'admin') {
            return res.redirect('/dashboard/admin');
        }

        if (user.role === 'instructor') {
            return res.redirect('/dashboard/instructor');
        }

        return res.redirect('/dashboard/student');

    } catch (err) {
        console.log('LOGIN ERROR:', err);

        return res.render('auth/login', {
            errors: {
                general: 'Login failed'
            },
            old: {
                email: req.body?.email || ''
            }
        });
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