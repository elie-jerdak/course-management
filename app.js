const express = require('express');
const authMiddleware = require('./middleware/authMiddleware');
const cookieParser = require('cookie-parser');
const path = require('path');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const flash = require('connect-flash');
const methodOverride = require('method-override');


dotenv.config();

const app = express();

app.use(session({
    secret: process.env.SESSION_SECRET || 'secret',
    resave: false,
    saveUninitialized: false
}));

app.use(flash());
app.use(methodOverride('_method'));

// RATE LIMITING
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 2000,
    message: {
        message: "Too many requests, please try again later."
    },
    standardHeaders: true,
    legacyHeaders: false
});

app.use(globalLimiter);

app.use((req, res, next) => {
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
});

// MIDDLEWARE
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(authMiddleware);

// STATIC FILES
app.use(express.static(path.join(__dirname, 'public')));


// VIEW ENGINE
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use((req, res, next) => {
    res.locals.currentPath = req.path;
    next();
});

// ROUTES
app.use('/auth', require('./routes/authRoutes'));
app.use('/courses', require('./routes/courseRoutes'));
app.use('/dashboard', require('./routes/dashboardRoutes'));
app.use('/enrollments', require('./routes/enrollmentRoutes'));
app.use('/users', require('./routes/userRoutes'));

// DEFAULT ROUTE
app.get('/', (req, res) => {
    res.render("home/index")
});

module.exports = app;