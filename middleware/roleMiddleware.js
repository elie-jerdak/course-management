const roleMiddleware = (...roles) => {
    return (req, res, next) => {

        //if not logged in redirect to login
        if (!req.user) {
            req.flash('error', 'Please login first');
            return res.redirect('/auth/login');
        }

        //if logged in but forbidden redirect to dashboard
        if (!roles.includes(req.user.role)) {
            req.flash('error', 'You are not allowed to access this page');
            
            if (req.user.role === 'admin') return res.redirect('/dashboard/admin');
            if (req.user.role === 'instructor') return res.redirect('/dashboard/instructor');
            return res.redirect('/dashboard/student');
        }

        next();
    };
};

module.exports = roleMiddleware;