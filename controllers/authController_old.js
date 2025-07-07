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
        return sendErrorResponse(res, 'Validation failed', 400, errors.array());
      }

      const { username, email, password, fullName, bio } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [{ email }, { username }]
      });

      if (existingUser) {
        const field = existingUser.email === email ? 'email' : 'username';
        return sendErrorResponse(res, `User with this ${field} already exists`, 409);
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

      return sendSuccessResponse(res, {
        message: 'User registered successfully',
        user: userResponse,
        token
      }, 201);

    } catch (error) {
      console.error('Registration error:', error);
      return sendErrorResponse(res, 'Failed to register user', 500);
    }
  }

  // Login user
  static async login(req, res) {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return sendErrorResponse(res, 'Validation failed', 400, errors.array());
      }

      const { email, password } = req.body;

      // Find user by email and include password for comparison
      const user = await User.findOne({ email }).select('+password');

      if (!user) {
        return sendErrorResponse(res, 'Invalid email or password', 401);
      }

      // Check password
      const isPasswordValid = await user.comparePassword(password);

      if (!isPasswordValid) {
        return sendErrorResponse(res, 'Invalid email or password', 401);
      }

      // Update last login
      await user.updateLastLogin();

      // Generate JWT token
      const token = JwtUtils.generateToken({
        userId: user._id,
        username: user.username,
        email: user.email
      });

      // Remove password from response
      const userResponse = user.toObject();
      delete userResponse.password;

      return sendSuccessResponse(res, {
        message: 'Login successful',
        user: userResponse,
        token
      });

    } catch (error) {
      console.error('Login error:', error);
      return sendErrorResponse(res, 'Failed to login', 500);
    }
  }

  // Get current user profile
  static async getProfile(req, res) {
    try {
      const user = await User.findById(req.userId).populate('posts');

      if (!user) {
        return sendErrorResponse(res, 'User not found', 404);
      }

      return sendSuccessResponse(res, {
        user
      });

    } catch (error) {
      console.error('Get profile error:', error);
      return sendErrorResponse(res, 'Failed to get user profile', 500);
    }
  }

  // Update user profile
  static async updateProfile(req, res) {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return sendErrorResponse(res, 'Validation failed', 400, errors.array());
      }

      const { username, fullName, bio } = req.body;
      const userId = req.userId;

      // Check if username is taken by another user
      if (username) {
        const existingUser = await User.findOne({ 
          username, 
          _id: { $ne: userId } 
        });

        if (existingUser) {
          return sendErrorResponse(res, 'Username is already taken', 409);
        }
      }

      // Update user
      const updateData = {};
      if (username) updateData.username = username;
      if (fullName) updateData.fullName = fullName;
      if (bio !== undefined) updateData.bio = bio;

      const user = await User.findByIdAndUpdate(
        userId,
        updateData,
        { new: true, runValidators: true }
      );

      if (!user) {
        return sendErrorResponse(res, 'User not found', 404);
      }

      return sendSuccessResponse(res, {
        message: 'Profile updated successfully',
        user
      });

    } catch (error) {
      console.error('Update profile error:', error);
      return sendErrorResponse(res, 'Failed to update profile', 500);
    }
  }

  // Change password
  static async changePassword(req, res) {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return sendErrorResponse(res, 'Validation failed', 400, errors.array());
      }

      const { currentPassword, newPassword } = req.body;
      const userId = req.userId;

      // Find user with password
      const user = await User.findById(userId).select('+password');

      if (!user) {
        return sendErrorResponse(res, 'User not found', 404);
      }

      // Check current password
      const isCurrentPasswordValid = await user.comparePassword(currentPassword);

      if (!isCurrentPasswordValid) {
        return sendErrorResponse(res, 'Current password is incorrect', 401);
      }

      // Update password
      user.password = newPassword;
      await user.save();

      return sendSuccessResponse(res, {
        message: 'Password changed successfully'
      });

    } catch (error) {
      console.error('Change password error:', error);
      return sendErrorResponse(res, 'Failed to change password', 500);
    }
  }

  // Verify token
  static async verifyToken(req, res) {
    try {
      // If we reach here, the token is valid (checked by authenticate middleware)
      return sendSuccessResponse(res, {
        message: 'Token is valid',
        user: req.user
      });

    } catch (error) {
      console.error('Verify token error:', error);
      return sendErrorResponse(res, 'Token verification failed', 500);
    }
  }

  // Logout (for token blacklisting if implemented)
  static async logout(req, res) {
    try {
      // For now, just return success
      // In production, you might want to blacklist the token
      return sendSuccessResponse(res, {
        message: 'Logged out successfully'
      });

    } catch (error) {
      console.error('Logout error:', error);
      return sendErrorResponse(res, 'Failed to logout', 500);
    }
  }
}

module.exports = AuthController;
