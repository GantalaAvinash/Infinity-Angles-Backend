import { Request, Response } from 'express';
import User from '@/models/User';
import Post from '@/models/Post';
import { ResponseUtils } from '@/utils/response';
import { asyncHandler } from '@/middleware/errorHandler';
import { AuthenticatedRequest } from '@/types';
import { logger } from '@/utils/logger';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { config } from '@/config';

export class UsersController {
  /**
   * @swagger
   * /api/users/profile:
   *   get:
   *     tags: [Users]
   *     summary: Get current user profile
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: User profile retrieved successfully
   *       401:
   *         description: Unauthorized
   */
  static getCurrentUser = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.userId;

    try {
      const user = await User.findById(userId)
        .populate('posts', 'title createdAt metadata.likesCount metadata.commentsCount')
        .select('-password');

      if (!user) {
        ResponseUtils.notFound(res, 'User not found');
        return;
      }

      ResponseUtils.success(res, { user }, 'User profile retrieved successfully');
    } catch (error) {
      logger.error('Error fetching current user:', error);
      ResponseUtils.serverError(res, 'Failed to fetch user profile');
    }
  });

  /**
   * @swagger
   * /api/users/profile:
   *   put:
   *     tags: [Users]
   *     summary: Update current user profile
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               fullName:
   *                 type: string
   *               bio:
   *                 type: string
   *               avatar:
   *                 type: string
   *               coverImage:
   *                 type: string
   *               socialLinks:
   *                 type: object
   *               settings:
   *                 type: object
   *     responses:
   *       200:
   *         description: Profile updated successfully
   */
  static updateProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.userId;
    const { fullName, bio, avatar, coverImage, socialLinks, settings } = req.body;

    try {
      const updateData: any = {};

      if (fullName) updateData.fullName = fullName;
      if (bio) updateData.bio = bio;
      if (avatar) updateData.avatar = avatar;
      if (coverImage) updateData.coverImage = coverImage;
      if (socialLinks) updateData.socialLinks = socialLinks;
      if (settings) updateData.settings = settings;

      updateData.updatedAt = new Date();

      const user = await User.findByIdAndUpdate(userId, updateData, {
        new: true,
        runValidators: true,
      }).select('-password');

      if (!user) {
        ResponseUtils.notFound(res, 'User not found');
        return;
      }

      ResponseUtils.success(res, { user }, 'Profile updated successfully');
    } catch (error) {
      logger.error('Error updating profile:', error);
      ResponseUtils.serverError(res, 'Failed to update profile');
    }
  });

  /**
   * @swagger
   * /api/users/{id}:
   *   get:
   *     tags: [Users]
   *     summary: Get user by ID
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: User retrieved successfully
   *       404:
   *         description: User not found
   */
  static getUserById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        ResponseUtils.badRequest(res, 'Invalid user ID');
        return;
      }

      const user = await User.findById(id)
        .populate('posts', 'title createdAt metadata.likesCount metadata.commentsCount')
        .select('-password -email');

      if (!user || !user.isActive) {
        ResponseUtils.notFound(res, 'User not found');
        return;
      }

      ResponseUtils.success(res, { user }, 'User retrieved successfully');
    } catch (error) {
      logger.error('Error fetching user:', error);
      ResponseUtils.serverError(res, 'Failed to fetch user');
    }
  });

  /**
   * @swagger
   * /api/users:
   *   get:
   *     tags: [Users]
   *     summary: Get all users with pagination
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 10
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Users retrieved successfully
   */
  static getAllUsers = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const skip = (page - 1) * limit;

    try {
      let query: any = { isActive: true };

      if (search) {
        query.$or = [
          { username: { $regex: search, $options: 'i' } },
          { fullName: { $regex: search, $options: 'i' } },
        ];
      }

      const users = await User.find(query)
        .select('-password -email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await User.countDocuments(query);
      const totalPages = Math.ceil(total / limit);

      ResponseUtils.success(res, {
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      }, 'Users retrieved successfully');
    } catch (error) {
      logger.error('Error fetching users:', error);
      ResponseUtils.serverError(res, 'Failed to fetch users');
    }
  });

  /**
   * @swagger
   * /api/users/{id}/follow:
   *   post:
   *     tags: [Users]
   *     summary: Follow a user
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: User ID to follow
   *     responses:
   *       200:
   *         description: User followed successfully
   *       400:
   *         description: Invalid user ID or already following
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: User not found
   */
  static followUser = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    const userId = req.user!.userId;

    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        ResponseUtils.badRequest(res, 'Invalid user ID');
        return;
      }

      if (id === userId) {
        ResponseUtils.badRequest(res, 'You cannot follow yourself');
        return;
      }

      const targetUser = await User.findById(id);
      const currentUser = await User.findById(userId);

      if (!targetUser || !targetUser.isActive) {
        ResponseUtils.notFound(res, 'User not found');
        return;
      }

      if (!currentUser) {
        ResponseUtils.notFound(res, 'Current user not found');
        return;
      }

      const isAlreadyFollowing = currentUser.following.includes(id);
      if (isAlreadyFollowing) {
        ResponseUtils.badRequest(res, 'You are already following this user');
        return;
      }

      // Follow user
      await User.findByIdAndUpdate(userId, {
        $addToSet: { following: id },
        $inc: { 'stats.followingCount': 1 },
      });

      await User.findByIdAndUpdate(id, {
        $addToSet: { followers: userId },
        $inc: { 'stats.followersCount': 1 },
      });

      ResponseUtils.success(res, { following: true }, 'User followed successfully');
    } catch (error) {
      logger.error('Error following user:', error);
      ResponseUtils.serverError(res, 'Failed to follow user');
    }
  });

  /**
   * @swagger
   * /api/users/{id}/unfollow:
   *   post:
   *     tags: [Users]
   *     summary: Unfollow a user
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: User ID to unfollow
   *     responses:
   *       200:
   *         description: User unfollowed successfully
   *       400:
   *         description: Invalid user ID or not following
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: User not found
   */
  static unfollowUser = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    const userId = req.user!.userId;

    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        ResponseUtils.badRequest(res, 'Invalid user ID');
        return;
      }

      if (id === userId) {
        ResponseUtils.badRequest(res, 'You cannot unfollow yourself');
        return;
      }

      const targetUser = await User.findById(id);
      const currentUser = await User.findById(userId);

      if (!targetUser || !targetUser.isActive) {
        ResponseUtils.notFound(res, 'User not found');
        return;
      }

      if (!currentUser) {
        ResponseUtils.notFound(res, 'Current user not found');
        return;
      }

      const isFollowing = currentUser.following.includes(id);
      if (!isFollowing) {
        ResponseUtils.badRequest(res, 'You are not following this user');
        return;
      }

      // Unfollow user
      await User.findByIdAndUpdate(userId, {
        $pull: { following: id },
        $inc: { 'stats.followingCount': -1 },
      });

      await User.findByIdAndUpdate(id, {
        $pull: { followers: userId },
        $inc: { 'stats.followersCount': -1 },
      });

      ResponseUtils.success(res, { following: false }, 'User unfollowed successfully');
    } catch (error) {
      logger.error('Error unfollowing user:', error);
      ResponseUtils.serverError(res, 'Failed to unfollow user');
    }
  });

  /**
   * @swagger
   * /api/users/{id}/followers:
   *   get:
   *     tags: [Users]
   *     summary: Get user followers
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 20
   *     responses:
   *       200:
   *         description: Followers retrieved successfully
   */
  static getFollowers = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        ResponseUtils.badRequest(res, 'Invalid user ID');
        return;
      }

      const user = await User.findById(id)
        .populate({
          path: 'followers',
          select: 'username fullName avatar isVerified',
          options: {
            skip,
            limit,
            sort: { createdAt: -1 },
          },
        })
        .select('followers stats.followersCount');

      if (!user || !user.isActive) {
        ResponseUtils.notFound(res, 'User not found');
        return;
      }

      const totalFollowers = user.stats.followersCount;
      const totalPages = Math.ceil(totalFollowers / limit);

      ResponseUtils.success(res, {
        followers: user.followers,
        pagination: {
          page,
          limit,
          total: totalFollowers,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      }, 'Followers retrieved successfully');
    } catch (error) {
      logger.error('Error fetching followers:', error);
      ResponseUtils.serverError(res, 'Failed to fetch followers');
    }
  });

  /**
   * @swagger
   * /api/users/{id}/following:
   *   get:
   *     tags: [Users]
   *     summary: Get users that a user is following
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 20
   *     responses:
   *       200:
   *         description: Following list retrieved successfully
   */
  static getFollowing = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        ResponseUtils.badRequest(res, 'Invalid user ID');
        return;
      }

      const user = await User.findById(id)
        .populate({
          path: 'following',
          select: 'username fullName avatar isVerified',
          options: {
            skip,
            limit,
            sort: { createdAt: -1 },
          },
        })
        .select('following stats.followingCount');

      if (!user || !user.isActive) {
        ResponseUtils.notFound(res, 'User not found');
        return;
      }

      const totalFollowing = user.stats.followingCount;
      const totalPages = Math.ceil(totalFollowing / limit);

      ResponseUtils.success(res, {
        following: user.following,
        pagination: {
          page,
          limit,
          total: totalFollowing,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      }, 'Following list retrieved successfully');
    } catch (error) {
      logger.error('Error fetching following:', error);
      ResponseUtils.serverError(res, 'Failed to fetch following list');
    }
  });

  /**
   * @swagger
   * /api/users/change-password:
   *   put:
   *     tags: [Users]
   *     summary: Change user password
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - currentPassword
   *               - newPassword
   *             properties:
   *               currentPassword:
   *                 type: string
   *               newPassword:
   *                 type: string
   *     responses:
   *       200:
   *         description: Password changed successfully
   */
  static changePassword = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.userId;
    const { currentPassword, newPassword } = req.body;

    try {
      const user = await User.findById(userId).select('+password');

      if (!user) {
        ResponseUtils.notFound(res, 'User not found');
        return;
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);

      if (!isCurrentPasswordValid) {
        ResponseUtils.badRequest(res, 'Current password is incorrect');
        return;
      }

      // Hash new password
      const saltRounds = config.BCRYPT_ROUNDS;
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      await User.findByIdAndUpdate(userId, {
        password: hashedNewPassword,
        updatedAt: new Date(),
      });

      ResponseUtils.success(res, null, 'Password changed successfully');
    } catch (error) {
      logger.error('Error changing password:', error);
      ResponseUtils.serverError(res, 'Failed to change password');
    }
  });

  /**
   * @swagger
   * /api/users/deactivate:
   *   put:
   *     tags: [Users]
   *     summary: Deactivate user account
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Account deactivated successfully
   */
  static deactivateAccount = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.userId;

    try {
      await User.findByIdAndUpdate(userId, {
        isActive: false,
        updatedAt: new Date(),
      });

      ResponseUtils.success(res, null, 'Account deactivated successfully');
    } catch (error) {
      logger.error('Error deactivating account:', error);
      ResponseUtils.serverError(res, 'Failed to deactivate account');
    }
  });

  /**
   * @swagger
   * /api/users/search:
   *   get:
   *     tags: [Users]
   *     summary: Search users
   *     parameters:
   *       - in: query
   *         name: q
   *         required: true
   *         schema:
   *           type: string
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 10
   *     responses:
   *       200:
   *         description: Search results retrieved successfully
   */
  static searchUsers = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const query = req.query.q as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    try {
      if (!query || query.trim().length < 2) {
        ResponseUtils.badRequest(res, 'Search query must be at least 2 characters long');
        return;
      }

      const searchRegex = new RegExp(query.trim(), 'i');

      const users = await User.find({
        isActive: true,
        $or: [
          { username: searchRegex },
          { fullName: searchRegex },
        ],
      })
        .select('username fullName avatar isVerified stats')
        .sort({ 'stats.followersCount': -1 })
        .skip(skip)
        .limit(limit);

      const total = await User.countDocuments({
        isActive: true,
        $or: [
          { username: searchRegex },
          { fullName: searchRegex },
        ],
      });

      const totalPages = Math.ceil(total / limit);

      ResponseUtils.success(res, {
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      }, 'Search results retrieved successfully');
    } catch (error) {
      logger.error('Error searching users:', error);
      ResponseUtils.serverError(res, 'Failed to search users');
    }
  });

  /**
   * @swagger
   * /api/users/{id}/following-status:
   *   get:
   *     tags: [Users]
   *     summary: Check if current user is following a specific user
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: User ID to check following status
   *     responses:
   *       200:
   *         description: Following status retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                   properties:
   *                     isFollowing:
   *                       type: boolean
   *                 message:
   *                   type: string
   *       400:
   *         description: Invalid user ID
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: User not found
   */
  static getFollowingStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    const userId = req.user!.userId;

    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        ResponseUtils.badRequest(res, 'Invalid user ID');
        return;
      }

      // Check if target user exists
      const targetUser = await User.findById(id);
      if (!targetUser || !targetUser.isActive) {
        ResponseUtils.notFound(res, 'User not found');
        return;
      }

      // Get current user and check following status
      const currentUser = await User.findById(userId);
      if (!currentUser) {
        ResponseUtils.notFound(res, 'Current user not found');
        return;
      }

      const isFollowing = currentUser.following.includes(id);

      ResponseUtils.success(res, { isFollowing }, 'Following status retrieved successfully');
    } catch (error) {
      logger.error('Error getting following status:', error);
      ResponseUtils.serverError(res, 'Failed to get following status');
    }
  });

  /**
   * @swagger
   * /api/users/stats:
   *   get:
   *     tags: [Users]
   *     summary: Get user statistics
   *     responses:
   *       200:
   *         description: User statistics retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 totalUsers:
   *                   type: number
   *                 onlineUsers:
   *                   type: number
   */
  static getUserStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      const totalUsers = await User.countDocuments({ isActive: true });
      
      // Calculate estimated online users based on recent activity (last hour)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentlyActiveUsers = await User.countDocuments({
        isActive: true,
        'metadata.lastLogin': { $gte: oneHourAgo }
      });

      ResponseUtils.success(res, {
        totalUsers,
        onlineUsers: recentlyActiveUsers,
      }, 'User statistics retrieved successfully');
    } catch (error) {
      logger.error('Error fetching user stats:', error);
      ResponseUtils.serverError(res, 'Failed to fetch user statistics');
    }
  });
}
