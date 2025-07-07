const express = require('express');
const AuthController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const {
  validateRegister,
  validateLogin,
  validateUpdateProfile,
  validateChangePassword,
  handleValidationErrors
} = require('../middleware/authValidation');

const router = express.Router();

// Public routes
router.post('/register', 
  validateRegister,
  handleValidationErrors,
  AuthController.register
);

router.post('/login', 
  validateLogin,
  handleValidationErrors,
  AuthController.login
);

// Protected routes (require authentication)
router.use(authenticate); // All routes below require authentication

router.get('/profile', AuthController.getProfile);

// Get user by ID or username (for viewing other profiles)
router.get('/user/:userId', AuthController.getUserById);

router.put('/profile', 
  validateUpdateProfile,
  handleValidationErrors,
  AuthController.updateProfile
);

router.put('/change-password', 
  validateChangePassword,
  handleValidationErrors,
  AuthController.changePassword
);

router.get('/verify-token', AuthController.verifyToken);

router.post('/logout', AuthController.logout);

module.exports = router;
