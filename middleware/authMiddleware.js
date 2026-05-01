const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    const token = req.cookies.token;

    if (!token) {
        req.user = null;
        res.locals.user = null;
        return next();
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        req.user = decoded;
        res.locals.user = decoded;  

        next();
    }   catch (err) {
        req.user = null;
        res.locals.user = null;
        return next();
    }
};

module.exports = authMiddleware;