const requireAuth = (req, res, next) => {
    if (!req.user) {
        return res.redirect('/auth/login'); // or res.status(401)
    }
    next();
};

module.exports = requireAuth;