import { Request, Response } from 'express';
import { AuthenticatedRequest, ServiceResponse } from '@/types';
import { ResponseUtils } from '@/utils/response';
import { JwtUtils } from '@/utils/jwt';
import { logAuthEvent, logBusinessEvent, logError } from '@/utils/logger';
import { AppError, asyncHandler } from '@/middleware/errorHandler';
import User from '@/models/User';
import { validationResult } from 'express-validator';

/**
 * Authentication Controller
 */
export class AuthController {
  /**
   * Register new user
   */
  static register = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      ResponseUtils.validationError(res, errors.array());
      return;
    }

    const { username, email, password, fullName, bio } = req.body;

    try {
      // Create new user
      const user = new User({
        username: username.toLowerCase(),
        email: email.toLowerCase(),
        password,
        fullName,
        bio: bio || '',
      });

      await user.save();

      // Generate tokens
      const tokenPair = JwtUtils.generateTokenPair({
        userId: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      });

      // Update last login
      await user.updateLastLogin();

      // Remove sensitive data from response
      const userResponse = user.toObject();
      delete (userResponse as any).password;

      logAuthEvent('User registered', user._id, user.email, req.ip, req.get('User-Agent'));
      logBusinessEvent('New user registration', user._id, {
        username: user.username,
        email: user.email,
      });

      ResponseUtils.success(
        res,
        {
          user: userResponse,
          accessToken: tokenPair.accessToken,
          refreshToken: tokenPair.refreshToken,
          tokenExpiresAt: tokenPair.accessTokenExpiresAt,
        },
        'User registered successfully',
        201
      );
    } catch (error) {
      if (error instanceof Error) {
        // Handle duplicate key error
        if ((error as any).code === 11000) {
          const field = Object.keys((error as any).keyValue)[0];
          const value = (error as any).keyValue[field];
          ResponseUtils.conflict(res, `${field} '${value}' already exists`);
          return;
        }

        logError(error, { operation: 'register', email, username });
        throw new AppError('Registration failed', 500);
      }
    }
  });

  /**
   * Login user
   */
  static login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      ResponseUtils.validationError(res, errors.array());
      return;
    }

    const { email, password } = req.body;

    try {
      // Find user and include password for comparison
      const user = await User.findOne({ 
        email: email.toLowerCase() 
      }).select('+password');

      if (!user) {
        logAuthEvent('Login attempt - user not found', undefined, email, req.ip, req.get('User-Agent'));
        ResponseUtils.unauthorized(res, 'Invalid email or password');
        return;
      }

      // Check if user is active
      if (!user.isActive) {
        logAuthEvent('Login attempt - inactive user', user._id, user.email, req.ip, req.get('User-Agent'));
        ResponseUtils.unauthorized(res, 'Account has been deactivated');
        return;
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        logAuthEvent('Login attempt - invalid password', user._id, user.email, req.ip, req.get('User-Agent'));
        ResponseUtils.unauthorized(res, 'Invalid email or password');
        return;
      }

      // Generate tokens
      const tokenPair = JwtUtils.generateTokenPair({
        userId: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      });

      // Update last login
      await user.updateLastLogin();

      // Remove sensitive data from response
      const userResponse = user.toObject();
      delete (userResponse as any).password;

      logAuthEvent('User logged in', user._id, user.email, req.ip, req.get('User-Agent'));
      logBusinessEvent('User login', user._id);

      ResponseUtils.success(res, {
        user: userResponse,
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
        tokenExpiresAt: tokenPair.accessTokenExpiresAt,
      }, 'Login successful');
    } catch (error) {
      logError(error as Error, { operation: 'login', email });
      throw new AppError('Login failed', 500);
    }
  });

  /**
   * Refresh access token
   */
  static refreshToken = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      ResponseUtils.error(res, 'Refresh token is required', 400);
      return;
    }

    try {
      const decoded = JwtUtils.verifyRefreshToken(refreshToken);

      // Verify user still exists and is active
      const user = await User.findById(decoded.userId);
      if (!user || !user.isActive) {
        ResponseUtils.unauthorized(res, 'Invalid refresh token');
        return;
      }

      // Generate new access token
      const newTokenPair = JwtUtils.refreshAccessToken(refreshToken);

      logAuthEvent('Token refreshed', user._id, user.email, req.ip, req.get('User-Agent'));

      ResponseUtils.success(res, {
        accessToken: newTokenPair.accessToken,
        tokenExpiresAt: newTokenPair.accessTokenExpiresAt,
      }, 'Token refreshed successfully');
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('expired')) {
          ResponseUtils.unauthorized(res, 'Refresh token has expired');
          return;
        }
        if (error.message.includes('invalid')) {
          ResponseUtils.unauthorized(res, 'Invalid refresh token');
          return;
        }
      }

      logError(error as Error, { operation: 'refreshToken' });
      ResponseUtils.unauthorized(res, 'Token refresh failed');
    }
  });

  /**
   * Get current user profile
   */
  static getProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const user = await User.findById(req.user?.userId)
        .populate('posts', 'title createdAt metadata.likesCount metadata.commentsCount')
        .select('-password');

      if (!user) {
        ResponseUtils.notFound(res, 'User not found');
        return;
      }

      ResponseUtils.success(res, { user }, 'Profile retrieved successfully');
    } catch (error) {
      logError(error as Error, { operation: 'getProfile', userId: req.user?.userId });
      throw new AppError('Failed to get profile', 500);
    }
  });

  /**
   * Update user profile
   */
  static updateProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      ResponseUtils.validationError(res, errors.array());
      return;
    }

    const userId = req.user?.userId;
    const updates = req.body;

    // Remove fields that shouldn't be updated via this endpoint
    delete updates.password;
    delete updates.email;
    delete updates.role;
    delete updates.isVerified;
    delete updates.isActive;
    delete updates.metadata;

    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { $set: updates },
        { 
          new: true, 
          runValidators: true,
          context: 'query' // This ensures validators run with access to 'this'
        }
      ).select('-password');

      if (!user) {
        ResponseUtils.notFound(res, 'User not found');
        return;
      }

      logBusinessEvent('Profile updated', userId, { updates });

      ResponseUtils.success(res, { user }, 'Profile updated successfully');
    } catch (error) {
      if (error instanceof Error) {
        // Handle validation errors
        if ((error as any).name === 'ValidationError') {
          const validationErrors = Object.values((error as any).errors).map((err: any) => ({
            field: err.path,
            message: err.message,
          }));
          ResponseUtils.validationError(res, validationErrors);
          return;
        }

        // Handle duplicate key errors
        if ((error as any).code === 11000) {
          const field = Object.keys((error as any).keyValue)[0];
          ResponseUtils.conflict(res, `${field} already exists`);
          return;
        }
      }

      logError(error as Error, { operation: 'updateProfile', userId, updates });
      throw new AppError('Profile update failed', 500);
    }
  });

  /**
   * Change password
   */
  static changePassword = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      ResponseUtils.validationError(res, errors.array());
      return;
    }

    const { currentPassword, password: newPassword } = req.body;
    const userId = req.user?.userId;

    try {
      // Find user with password
      const user = await User.findById(userId).select('+password');
      if (!user) {
        ResponseUtils.notFound(res, 'User not found');
        return;
      }

      // Verify current password
      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        ResponseUtils.unauthorized(res, 'Current password is incorrect');
        return;
      }

      // Update password
      user.password = newPassword;
      await user.save();

      logAuthEvent('Password changed', userId, user.email, req.ip, req.get('User-Agent'));
      logBusinessEvent('Password changed', userId);

      ResponseUtils.success(res, {}, 'Password changed successfully');
    } catch (error) {
      logError(error as Error, { operation: 'changePassword', userId });
      throw new AppError('Password change failed', 500);
    }
  });

  /**
   * Get user by ID or username
   */
  static getUserById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.params;

    try {
      // Try to find by ID first, then by username
      let user: any = await User.findById(userId)
        .populate('posts', 'title createdAt metadata.likesCount metadata.commentsCount')
        .select('-password -email');

      if (!user) {
        // Try to find by username
        user = await User.findOne({ 
          username: { $regex: new RegExp(`^${userId}$`, 'i') }
        })
        .populate('posts', 'title createdAt metadata.likesCount metadata.commentsCount')
        .select('-password -email');
      }

      if (!user) {
        ResponseUtils.notFound(res, 'User not found');
        return;
      }

      if (!user.isActive) {
        ResponseUtils.notFound(res, 'User not found');
        return;
      }

      ResponseUtils.success(res, { user }, 'User retrieved successfully');
    } catch (error) {
      logError(error as Error, { operation: 'getUserById', userId });
      throw new AppError('Failed to get user', 500);
    }
  });

  /**
   * Verify token
   */
  static verifyToken = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const user = await User.findById(req.user?.userId).select('-password');
      
      if (!user) {
        ResponseUtils.unauthorized(res, 'User not found');
        return;
      }

      ResponseUtils.success(res, {
        user,
        valid: true,
      }, 'Token is valid');
    } catch (error) {
      logError(error as Error, { operation: 'verifyToken', userId: req.user?.userId });
      ResponseUtils.unauthorized(res, 'Token verification failed');
    }
  });

  /**
   * Logout user
   */
  static logout = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.userId;

    try {
      // In a more complete implementation, you might:
      // 1. Blacklist the token
      // 2. Clear refresh tokens from database
      // 3. Log the logout event

      logAuthEvent('User logged out', userId, req.user?.email, req.ip, req.get('User-Agent'));
      logBusinessEvent('User logout', userId);

      ResponseUtils.success(res, {}, 'Logged out successfully');
    } catch (error) {
      logError(error as Error, { operation: 'logout', userId });
      throw new AppError('Logout failed', 500);
    }
  });

  /**
   * Deactivate account
   */
  static deactivateAccount = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.userId;

    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { isActive: false },
        { new: true }
      ).select('-password');

      if (!user) {
        ResponseUtils.notFound(res, 'User not found');
        return;
      }

      logAuthEvent('Account deactivated', userId, user.email, req.ip, req.get('User-Agent'));
      logBusinessEvent('Account deactivated', userId);

      ResponseUtils.success(res, {}, 'Account deactivated successfully');
    } catch (error) {
      logError(error as Error, { operation: 'deactivateAccount', userId });
      throw new AppError('Account deactivation failed', 500);
    }
  });
}

export default AuthController;
