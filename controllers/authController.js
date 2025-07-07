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
      const userId = req.user.userId;

      const user = await User.findById(userId)
        .select('-password')
        .populate('posts', 'title content createdAt');

      if (!user) {
        return ResponseUtils.error(res, 'User not found', 404);
      }

      return ResponseUtils.success(res, {
        user
      }, 'Profile retrieved successfully');

    } catch (error) {
      console.error('Get profile error:', error);
      return ResponseUtils.error(res, 'Failed to get profile', 500);
    }
  }

  // Get user by ID or username (for viewing other profiles)
  static async getUserById(req, res) {
    try {
      const { userId } = req.params;
      
      // Try to find by ID first, then by username
      let user = await User.findById(userId).select('-password');
      
      if (!user) {
        // Try to find by username
        user = await User.findOne({ username: userId }).select('-password');
      }

      if (!user) {
        return ResponseUtils.error(res, 'User not found', 404);
      }

      return ResponseUtils.success(res, {
        user
      }, 'User retrieved successfully');

    } catch (error) {
      console.error('Get user by ID error:', error);
      return ResponseUtils.error(res, 'Failed to get user', 500);
    }
  }

  // Update user profile
  static async updateProfile(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('❌ Profile update validation errors:', errors.array());
        console.log('📋 Request body:', JSON.stringify(req.body, null, 2));
        return ResponseUtils.error(res, 'Validation failed', 400, errors.array());
      }

      const userId = req.user.userId;
      const updates = req.body;

      console.log('✅ Profile update validation passed');
      console.log('👤 User ID:', userId);
      console.log('📝 Updates:', JSON.stringify(updates, null, 2));

      // Remove sensitive fields that shouldn't be updated via this endpoint
      delete updates.password;
      delete updates.email;
      delete updates.username;
      delete updates._id;
      delete updates.createdAt;
      delete updates.updatedAt;

      // Update user profile
      const user = await User.findByIdAndUpdate(
        userId,
        { $set: updates },
        { new: true, runValidators: true }
      ).select('-password');

      if (!user) {
        return ResponseUtils.error(res, 'User not found', 404);
      }

      console.log('✅ Profile updated successfully');
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
