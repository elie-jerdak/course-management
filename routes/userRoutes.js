const express = require('express');
const router = express.Router();

const userController = require('../controllers/userController');
const requireAuth = require('../middleware/requireAuth');
const roleMiddleware = require('../middleware/roleMiddleware');
const mongoose = require('mongoose');

function validateObjectId(req, res, next) {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        req.flash('error', 'Invalid ID');
        return res.redirect('back');
    }
    next();
}
// GET UPDATE USER PAGE (Edit Form)
router.get('/:id/edit',
    requireAuth,
    roleMiddleware('admin'), // optional depending on who can edit
    validateObjectId,
    userController.getUpdateUserPage
);

// ADMIN DASHBOARD
router.get('/',
    requireAuth,
    roleMiddleware('admin'),
    userController.getUsers
);

// GET USER DETAILS
router.get('/:id',
    requireAuth,
    roleMiddleware('admin'),
    validateObjectId,
    userController.getUserById
);

// UPDATE USER
router.put('/:id',
    requireAuth,
    validateObjectId,
    userController.updateUser
);

// PROMOTE / CHANGE ROLE
router.post('/:id/promote',
    requireAuth,
    roleMiddleware('admin'),
    validateObjectId,
    userController.changeUserRole
);

// DELETE USER
router.delete('/:id',
    requireAuth,
    roleMiddleware('admin'),
    validateObjectId,
    userController.deleteUser
);

module.exports = router;