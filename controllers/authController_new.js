const User = require('../models/User');
const JwtUtils = require('../utils/jwtUtils');
const ResponseUtils = require('../utils/responseUtils');
const { validationResult } = require('express-validator');

class AuthController {
  // Register new user
  static async register(req, res) {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return ResponseUtils.error(res, 'Validation failed', 400, errors.array());
      }

      const { username, email, password, fullName, bio } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [{ email }, { username }]
      });

      if (existingUser) {
        const field = existingUser.email === email ? 'email' : 'username';
        return ResponseUtils.error(res, `User with this ${field} already exists`, 409);
      }

      // Create new user
      const user = new User({
        username,
        email,
        password,
        fullName,
        bio: bio || ''
      });

      await user.save();

      // Generate JWT token
      const token = JwtUtils.generateToken({
        userId: user._id,
        username: user.username,
        email: user.email
      });

      // Remove password from response
      const userResponse = user.toObject();
      delete userResponse.password;

      return ResponseUtils.success(res, {
        user: userResponse,
        token
      }, 'User registered successfully', 201);

    } catch (error) {
      console.error('Registration error:', error);
      return ResponseUtils.error(res, 'Failed to register user', 500);
    }
  }

  // Login user
  static async login(req, res) {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return ResponseUtils.error(res, 'Validation failed', 400, errors.array());
      }

      const { email, password } = req.body;

      // Find user and include password for comparison
      const user = await User.findOne({ email }).select('+password');
      if (!user) {
        return ResponseUtils.error(res, 'Invalid email or password', 401);
      }

      // Check password
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return ResponseUtils.error(res, 'Invalid email or password', 401);
      }

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      // Generate JWT token
      const token = JwtUtils.generateToken({
        userId: user._id,
        username: user.username,
        email: user.email
      });

      // Remove password from response
      const userResponse = user.toObject();
      delete userResponse.password;

      return ResponseUtils.success(res, {
        user: userResponse,
        token
      }, 'Login successful');

    } catch (error) {
      console.error('Login error:', error);
      return ResponseUtils.error(res, 'Failed to login', 500);
    }
  }

  // Get user profile
  static async getProfile(req, res) {
    try {
      const user = await User.findById(req.user.userId);
      if (!user) {
        return ResponseUtils.error(res, 'User not found', 404);
      }

      return ResponseUtils.success(res, {
        user
      }, 'Profile retrieved successfully');

    } catch (error) {
      console.error('Get profile error:', error);
      return ResponseUtils.error(res, 'Failed to get user profile', 500);
    }
  }

  // Update user profile
  static async updateProfile(req, res) {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return ResponseUtils.error(res, 'Validation failed', 400, errors.array());
      }

      const { username, fullName, bio } = req.body;
      const userId = req.user.userId;

      // Check if username is being changed and if it's already taken
      if (username) {
        const existingUser = await User.findOne({ 
          username, 
          _id: { $ne: userId } 
        });
        
        if (existingUser) {
          return ResponseUtils.error(res, 'Username is already taken', 409);
        }
      }

      // Update user
      const user = await User.findByIdAndUpdate(
        userId,
        { 
          ...(username && { username }),
          ...(fullName && { fullName }),
          ...(bio !== undefined && { bio })
        },
        { new: true, runValidators: true }
      );

      if (!user) {
        return ResponseUtils.error(res, 'User not found', 404);
      }

      return ResponseUtils.success(res, {
        user
      }, 'Profile updated successfully');

    } catch (error) {
      console.error('Update profile error:', error);
      return ResponseUtils.error(res, 'Failed to update profile', 500);
    }
  }

  // Change password
  static async changePassword(req, res) {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return ResponseUtils.error(res, 'Validation failed', 400, errors.array());
      }

      const { currentPassword, newPassword } = req.body;
      const userId = req.user.userId;

      // Find user with password
      const user = await User.findById(userId).select('+password');
      if (!user) {
        return ResponseUtils.error(res, 'User not found', 404);
      }

      // Verify current password
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return ResponseUtils.error(res, 'Current password is incorrect', 401);
      }

      // Update password
      user.password = newPassword;
      await user.save();

      return ResponseUtils.success(res, {
        message: 'Password changed successfully'
      }, 'Password changed successfully');

    } catch (error) {
      console.error('Change password error:', error);
      return ResponseUtils.error(res, 'Failed to change password', 500);
    }
  }

  // Verify token
  static async verifyToken(req, res) {
    try {
      return ResponseUtils.success(res, {
        user: req.user,
        valid: true
      }, 'Token is valid');

    } catch (error) {
      console.error('Token verification error:', error);
      return ResponseUtils.error(res, 'Token verification failed', 500);
    }
  }

  // Logout (optional - mainly for client-side token removal)
  static async logout(req, res) {
    try {
      // In a more complete implementation, you might blacklist the token
      // For now, we'll just send a success response
      return ResponseUtils.success(res, {
        message: 'Logged out successfully'
      }, 'Logged out successfully');

    } catch (error) {
      console.error('Logout error:', error);
      return ResponseUtils.error(res, 'Failed to logout', 500);
    }
  }
}

module.exports = AuthController;
