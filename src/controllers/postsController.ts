import { Request, Response } from 'express';
import Post from '@/models/Post';
import User from '@/models/User';
import { ResponseUtils } from '@/utils/response';
import { asyncHandler } from '@/middleware/errorHandler';
import { AuthenticatedRequest } from '@/types';
import { logger } from '@/utils/logger';
import mongoose from 'mongoose';

export class PostsController {
  /**
   * @swagger
   * /api/posts:
   *   get:
   *     tags: [Posts]
   *     summary: Get all posts with pagination
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
   *         name: sort
   *         schema:
   *           type: string
   *           enum: [newest, oldest, popular]
   *           default: newest
   *     responses:
   *       200:
   *         description: Posts retrieved successfully
   */
  static getAllPosts = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const sort = req.query.sort as string || 'newest';
    const skip = (page - 1) * limit;

    try {
      let sortOptions: any = { createdAt: -1 }; // newest first

      switch (sort) {
        case 'oldest':
          sortOptions = { createdAt: 1 };
          break;
        case 'popular':
          sortOptions = { 'metadata.likesCount': -1, createdAt: -1 };
          break;
        default:
          sortOptions = { createdAt: -1 };
      }

      const posts = await Post.find({ 'status.isPublished': true })
        .populate('author', 'username fullName avatar isVerified')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .select('-content');

      const total = await Post.countDocuments({ 'status.isPublished': true });
      const totalPages = Math.ceil(total / limit);

      ResponseUtils.success(res, {
        posts,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      }, 'Posts retrieved successfully');
    } catch (error) {
      logger.error('Error fetching posts:', error);
      ResponseUtils.serverError(res, 'Failed to fetch posts');
    }
  });

  /**
   * @swagger
   * /api/posts/{id}:
   *   get:
   *     tags: [Posts]
   *     summary: Get post by ID
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Post retrieved successfully
   *       404:
   *         description: Post not found
   */
  static getPostById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        ResponseUtils.badRequest(res, 'Invalid post ID');
        return;
      }

      const post = await Post.findById(id)
        .populate('author', 'username fullName avatar isVerified');

      if (!post || !post.status.isPublished) {
        ResponseUtils.notFound(res, 'Post not found');
        return;
      }

      // Increment view count
      await Post.findByIdAndUpdate(id, {
        $inc: { 'metadata.viewsCount': 1 }
      });

      ResponseUtils.success(res, { post }, 'Post retrieved successfully');
    } catch (error) {
      logger.error('Error fetching post:', error);
      ResponseUtils.serverError(res, 'Failed to fetch post');
    }
  });

  /**
   * @swagger
   * /api/posts:
   *   post:
   *     tags: [Posts]
   *     summary: Create a new post
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - title
   *               - content
   *             properties:
   *               title:
   *                 type: string
   *               content:
   *                 type: string
   *               tags:
   *                 type: array
   *                 items:
   *                   type: string
   *               category:
   *                 type: string
   *               isDraft:
   *                 type: boolean
   *     responses:
   *       201:
   *         description: Post created successfully
   */
  static createPost = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { title, content, images = [], tags = [], category, isDraft = false } = req.body;
    const userId = req.user!.userId;

    try {
      const post = new Post({
        title,
        content,
        images,
        author: userId,
        tags,
        category,
        status: {
          isPublished: !isDraft,
          isDraft,
        },
        metadata: {
          likesCount: 0,
          commentsCount: 0,
          sharesCount: 0,
          viewsCount: 0,
        },
      });

      await post.save();

      // Update user's posts count
      await User.findByIdAndUpdate(userId, {
        $inc: { 'stats.postsCount': 1 },
        $push: { posts: post._id },
      });

      const populatedPost = await Post.findById(post._id)
        .populate('author', 'username fullName avatar isVerified');

      ResponseUtils.created(res, { post: populatedPost }, 'Post created successfully');
    } catch (error) {
      logger.error('Error creating post:', error);
      ResponseUtils.serverError(res, 'Failed to create post');
    }
  });

  /**
   * @swagger
   * /api/posts/{id}:
   *   put:
   *     tags: [Posts]
   *     summary: Update a post
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               title:
   *                 type: string
   *               content:
   *                 type: string
   *               tags:
   *                 type: array
   *                 items:
   *                   type: string
   *               category:
   *                 type: string
   *     responses:
   *       200:
   *         description: Post updated successfully
   */
  static updatePost = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    const { title, content, tags, category } = req.body;
    const userId = req.user!.userId;

    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        ResponseUtils.badRequest(res, 'Invalid post ID');
        return;
      }

      const post = await Post.findById(id);

      if (!post) {
        ResponseUtils.notFound(res, 'Post not found');
        return;
      }

      if (post.author.toString() !== userId) {
        ResponseUtils.forbidden(res, 'You can only update your own posts');
        return;
      }

      const updateData: any = {
        ...(title && { title }),
        ...(content && { content }),
        ...(tags && { tags }),
        ...(category && { category }),
        updatedAt: new Date(),
      };

      const updatedPost = await Post.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
      }).populate('author', 'username fullName avatar isVerified');

      ResponseUtils.success(res, { post: updatedPost }, 'Post updated successfully');
    } catch (error) {
      logger.error('Error updating post:', error);
      ResponseUtils.serverError(res, 'Failed to update post');
    }
  });

  /**
   * @swagger
   * /api/posts/{id}:
   *   delete:
   *     tags: [Posts]
   *     summary: Delete a post
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Post deleted successfully
   */
  static deletePost = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    const userId = req.user!.userId;

    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        ResponseUtils.badRequest(res, 'Invalid post ID');
        return;
      }

      const post = await Post.findById(id);

      if (!post) {
        ResponseUtils.notFound(res, 'Post not found');
        return;
      }

      if (post.author.toString() !== userId) {
        ResponseUtils.forbidden(res, 'You can only delete your own posts');
        return;
      }

      await Post.findByIdAndDelete(id);

      // Update user's posts count
      await User.findByIdAndUpdate(userId, {
        $inc: { 'stats.postsCount': -1 },
        $pull: { posts: id },
      });

      ResponseUtils.success(res, null, 'Post deleted successfully');
    } catch (error) {
      logger.error('Error deleting post:', error);
      ResponseUtils.serverError(res, 'Failed to delete post');
    }
  });

  /**
   * @swagger
   * /api/posts/{id}/like:
   *   post:
   *     tags: [Posts]
   *     summary: Like/unlike a post
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Post like status updated
   */
  static toggleLike = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    const userId = req.user!.userId;

    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        ResponseUtils.badRequest(res, 'Invalid post ID');
        return;
      }

      const post = await Post.findById(id);

      if (!post || !post.status.isPublished) {
        ResponseUtils.notFound(res, 'Post not found');
        return;
      }

      const userObjectId = new mongoose.Types.ObjectId(userId);
      const hasLiked = post.likes.some(like => like.toString() === userId);

      let update: any;
      let message: string;

      if (hasLiked) {
        // Unlike the post
        update = {
          $pull: { likes: userObjectId },
          $inc: { 'metadata.likesCount': -1 },
        };
        message = 'Post unliked successfully';
      } else {
        // Like the post
        update = {
          $addToSet: { likes: userObjectId },
          $inc: { 'metadata.likesCount': 1 },
        };
        message = 'Post liked successfully';
      }

      await Post.findByIdAndUpdate(id, update);

      ResponseUtils.success(res, { liked: !hasLiked }, message);
    } catch (error) {
      logger.error('Error toggling like:', error);
      ResponseUtils.serverError(res, 'Failed to update like status');
    }
  });

  /**
   * @swagger
   * /api/posts/{id}/comments:
   *   post:
   *     tags: [Posts]
   *     summary: Add a comment to a post
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - content
   *             properties:
   *               content:
   *                 type: string
   *     responses:
   *       201:
   *         description: Comment added successfully
   */
  static addComment = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user!.userId;

    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        ResponseUtils.badRequest(res, 'Invalid post ID');
        return;
      }

      const post = await Post.findById(id);

      if (!post || !post.status.isPublished) {
        ResponseUtils.notFound(res, 'Post not found');
        return;
      }

      const comment = {
        _id: new mongoose.Types.ObjectId(),
        author: new mongoose.Types.ObjectId(userId),
        content,
        createdAt: new Date(),
        likes: [],
        likesCount: 0,
      };

      const updatedPost = await Post.findByIdAndUpdate(
        id,
        {
          $push: { comments: comment },
          $inc: { 'metadata.commentsCount': 1 },
        },
        { new: true }
      ).populate('comments.author', 'username fullName avatar');

      const addedComment = updatedPost!.comments[updatedPost!.comments.length - 1];

      ResponseUtils.created(res, { comment: addedComment }, 'Comment added successfully');
    } catch (error) {
      logger.error('Error adding comment:', error);
      ResponseUtils.serverError(res, 'Failed to add comment');
    }
  });

  /**
   * @swagger
   * /api/posts/{id}/comments:
   *   get:
   *     tags: [Posts]
   *     summary: Get comments for a post
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Comments retrieved successfully
   *       404:
   *         description: Post not found
   */
  static getPostComments = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        ResponseUtils.badRequest(res, 'Invalid post ID');
        return;
      }

      const post = await Post.findById(id)
        .select('comments')
        .populate('comments.author', 'username fullName avatar isVerified');

      if (!post) {
        ResponseUtils.notFound(res, 'Post not found');
        return;
      }

      ResponseUtils.success(res, post.comments || [], 'Comments retrieved successfully');
    } catch (error) {
      logger.error('Error fetching post comments:', error);
      ResponseUtils.serverError(res, 'Failed to fetch comments');
    }
  });

  /**
   * @swagger
   * /api/posts/user/{userId}:
   *   get:
   *     tags: [Posts]
   *     summary: Get posts by user ID
   *     parameters:
   *       - in: path
   *         name: userId
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
   *         description: User posts retrieved successfully
   */
  static getUserPosts = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    try {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        ResponseUtils.badRequest(res, 'Invalid user ID');
        return;
      }

      const posts = await Post.find({
        author: userId,
        'status.isPublished': true,
      })
        .populate('author', 'username fullName avatar isVerified')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-content -comments');

      const total = await Post.countDocuments({
        author: userId,
        'status.isPublished': true,
      });

      const totalPages = Math.ceil(total / limit);

      ResponseUtils.success(res, {
        posts,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      }, 'User posts retrieved successfully');
    } catch (error) {
      logger.error('Error fetching user posts:', error);
      ResponseUtils.serverError(res, 'Failed to fetch user posts');
    }
  });

  /**
   * @swagger
   * /api/posts/{id}/share:
   *   post:
   *     tags: [Posts]
   *     summary: Share a post (increment share count)
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Post ID
   *     responses:
   *       200:
   *         description: Post shared successfully
   *       404:
   *         description: Post not found
   */
  static sharePost = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { id } = req.params;

    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        ResponseUtils.badRequest(res, 'Invalid post ID');
        return;
      }

      const post = await Post.findById(id);

      if (!post) {
        ResponseUtils.notFound(res, 'Post not found');
        return;
      }

      // Increment share count
      await Post.findByIdAndUpdate(
        id,
        { $inc: { 'metadata.sharesCount': 1 } },
        { new: true }
      );

      logger.info(`Post shared - Post ID: ${id}, User ID: ${req.user?.userId}`);
      
      ResponseUtils.success(res, {
        success: true,
        message: 'Post shared successfully',
      }, 'Post shared successfully');
    } catch (error) {
      logger.error('Error sharing post:', error);
      ResponseUtils.serverError(res, 'Failed to share post');
    }
  });

  /**
   * @swagger
   * /api/posts/{id}/bookmark:
   *   post:
   *     tags: [Posts]
   *     summary: Bookmark a post
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Post ID
   *     responses:
   *       200:
   *         description: Post bookmarked successfully
   *       404:
   *         description: Post not found
   */
  static bookmarkPost = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    const userId = req.user?.userId;

    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        ResponseUtils.badRequest(res, 'Invalid post ID');
        return;
      }

      const post = await Post.findById(id);
      if (!post) {
        ResponseUtils.notFound(res, 'Post not found');
        return;
      }

      // Check if user already bookmarked this post
      const user = await User.findById(userId);
      if (!user) {
        ResponseUtils.unauthorized(res, 'User not found');
        return;
      }

      if (!user.bookmarks) {
        user.bookmarks = [];
      }

      if (user.bookmarks.includes(id)) {
        ResponseUtils.badRequest(res, 'Post already bookmarked');
        return;
      }

      // Add bookmark
      user.bookmarks.push(id);
      await user.save();

      logger.info(`Post bookmarked - Post ID: ${id}, User ID: ${userId}`);
      
      ResponseUtils.success(res, {
        success: true,
        message: 'Post bookmarked successfully',
      }, 'Post bookmarked successfully');
    } catch (error) {
      logger.error('Error bookmarking post:', error);
      ResponseUtils.serverError(res, 'Failed to bookmark post');
    }
  });

  /**
   * @swagger
   * /api/posts/{id}/bookmark:
   *   delete:
   *     tags: [Posts]
   *     summary: Remove bookmark from a post
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Post ID
   *     responses:
   *       200:
   *         description: Bookmark removed successfully
   *       404:
   *         description: Post not found
   */
  static unbookmarkPost = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    const userId = req.user?.userId;

    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        ResponseUtils.badRequest(res, 'Invalid post ID');
        return;
      }

      const user = await User.findById(userId);
      if (!user) {
        ResponseUtils.unauthorized(res, 'User not found');
        return;
      }

      if (!user.bookmarks || !user.bookmarks.includes(id)) {
        ResponseUtils.badRequest(res, 'Post not bookmarked');
        return;
      }

      // Remove bookmark
      user.bookmarks = user.bookmarks.filter(bookmarkId => bookmarkId !== id);
      await user.save();

      logger.info(`Bookmark removed - Post ID: ${id}, User ID: ${userId}`);
      
      ResponseUtils.success(res, {
        success: true,
        message: 'Bookmark removed successfully',
      }, 'Bookmark removed successfully');
    } catch (error) {
      logger.error('Error removing bookmark:', error);
      ResponseUtils.serverError(res, 'Failed to remove bookmark');
    }
  });

  /**
   * @swagger
   * /api/posts/{id}/likes:
   *   get:
   *     tags: [Posts]
   *     summary: Get users who liked a post
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Post ID
   *     responses:
   *       200:
   *         description: Post likes retrieved successfully
   *       404:
   *         description: Post not found
   */
  static getPostLikes = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        ResponseUtils.badRequest(res, 'Invalid post ID');
        return;
      }

      const post = await Post.findById(id)
        .populate('likes', 'username fullName avatar isVerified')
        .select('likes');

      if (!post) {
        ResponseUtils.notFound(res, 'Post not found');
        return;
      }

      ResponseUtils.success(res, {
        likes: post.likes || [],
      }, 'Post likes retrieved successfully');
    } catch (error) {
      logger.error('Error fetching post likes:', error);
      ResponseUtils.serverError(res, 'Failed to fetch post likes');
    }
  });

  /**
   * @swagger
   * /api/posts/bookmarks:
   *   get:
   *     tags: [Posts]
   *     summary: Get user's bookmarked posts
   *     security:
   *       - bearerAuth: []
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
   *     responses:
   *       200:
   *         description: Bookmarked posts retrieved successfully
   */
  static getBookmarkedPosts = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    try {
      const user = await User.findById(userId).populate({
        path: 'bookmarks',
        populate: {
          path: 'author',
          select: 'username fullName avatar isVerified'
        },
        options: {
          sort: { createdAt: -1 },
          skip: skip,
          limit: limit
        }
      });

      if (!user) {
        ResponseUtils.unauthorized(res, 'User not found');
        return;
      }

      const bookmarkedPosts = user.bookmarks || [];
      const total = bookmarkedPosts.length;
      const totalPages = Math.ceil(total / limit);

      ResponseUtils.success(res, {
        posts: bookmarkedPosts,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      }, 'Bookmarked posts retrieved successfully');
    } catch (error) {
      logger.error('Error fetching bookmarked posts:', error);
      ResponseUtils.serverError(res, 'Failed to fetch bookmarked posts');
    }
  });
}
