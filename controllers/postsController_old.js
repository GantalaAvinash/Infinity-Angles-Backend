const Post = require('../models/Post');
const User = require('../models/User');
const ResponseUtils = require('../utils/responseUtils');
const { validationResult } = require('express-validator');

class PostsController {
  // Get all posts with pagination and filtering
  static async getAllPosts(req, res) {
    try {
      const { 
        category, 
        limit = 10, 
        page = 1, 
        search,
        userId // To filter posts by specific user
      } = req.query;
      
      const limitNum = Math.min(parseInt(limit), 50); // Max 50 posts per request
      const skip = (parseInt(page) - 1) * limitNum;
      
      // Build query
      let query = { isActive: true };
      
      // Filter by category
      if (category && category !== 'all') {
        query.category = category;
      }
      
      // Filter by user
      if (userId) {
        query.author = userId;
      }
      
      // Search functionality
      if (search) {
        query.$or = [
          { content: { $regex: search, $options: 'i' } },
          { tags: { $in: [new RegExp(search, 'i')] } }
        ];
      }
      
      // Get posts with author information
      const posts = await Post.find(query)
        .populate('author', 'username fullName avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean();
      
      // Get total count for pagination
      const totalPosts = await Post.countDocuments(query);
      const totalPages = Math.ceil(totalPosts / limitNum);
      
      // Add user interaction info if authenticated
      if (req.isAuthenticated) {
        posts.forEach(post => {
          post.isLikedByUser = post.likes.some(
            like => like.user.toString() === req.userId.toString()
          );
        });
      }
      
      return sendSuccessResponse(res, {
        posts,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalPosts,
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1
        }
      });
      
    } catch (error) {
      console.error('Get all posts error:', error);
      return sendErrorResponse(res, 'Failed to fetch posts', 500);
    }
  }

  // Get post by ID
  static async getPostById(req, res) {
    try {
      const postId = req.params.id;
      
      const post = await Post.findOne({ _id: postId, isActive: true })
        .populate('author', 'username fullName avatar')
        .lean();
      
      if (!post) {
        return sendErrorResponse(res, 'Post not found', 404);
      }
      
      // Add user interaction info if authenticated
      if (req.isAuthenticated) {
        post.isLikedByUser = post.likes.some(
          like => like.user.toString() === req.userId.toString()
        );
      }
      
      return sendSuccessResponse(res, { post });
      
    } catch (error) {
      console.error('Get post by ID error:', error);
      return sendErrorResponse(res, 'Failed to fetch post', 500);
    }
  }

  // Create new post
  static async createPost(req, res) {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return sendErrorResponse(res, 'Validation failed', 400, errors.array());
      }

      const { content, category, tags } = req.body;
      const authorId = req.userId;
      
      // Handle images if uploaded
      let images = [];
      if (req.processedImages && req.processedImages.length > 0) {
        images = req.processedImages;
      }
      
      // Create new post
      const post = new Post({
        content,
        author: authorId,
        category: category || 'General',
        tags: tags || [],
        images
      });
      
      await post.save();
      
      // Update user's posts count
      await User.findByIdAndUpdate(authorId, { $inc: { postsCount: 1 } });
      
      // Populate author info for response
      await post.populate('author', 'username fullName avatar');
      
      return sendSuccessResponse(res, {
        message: 'Post created successfully',
        post
      }, 201);
      
    } catch (error) {
      console.error('Create post error:', error);
      return sendErrorResponse(res, 'Failed to create post', 500);
    }
  }

  // Update post
  static async updatePost(req, res) {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return sendErrorResponse(res, 'Validation failed', 400, errors.array());
      }

      const postId = req.params.id;
      const { content, category, tags } = req.body;
      
      // Find and update post
      const post = await Post.findOneAndUpdate(
        { _id: postId, author: req.userId, isActive: true },
        { 
          content, 
          category: category || 'General', 
          tags: tags || [],
          updatedAt: new Date()
        },
        { new: true, runValidators: true }
      ).populate('author', 'username fullName avatar');
      
      if (!post) {
        return sendErrorResponse(res, 'Post not found or unauthorized', 404);
      }
      
      return sendSuccessResponse(res, {
        message: 'Post updated successfully',
        post
      });
      
    } catch (error) {
      console.error('Update post error:', error);
      return sendErrorResponse(res, 'Failed to update post', 500);
    }
  }

  // Delete post
  static async deletePost(req, res) {
    try {
      const postId = req.params.id;
      
      // Soft delete - mark as inactive
      const post = await Post.findOneAndUpdate(
        { _id: postId, author: req.userId, isActive: true },
        { isActive: false },
        { new: true }
      );
      
      if (!post) {
        return sendErrorResponse(res, 'Post not found or unauthorized', 404);
      }
      
      // Update user's posts count
      await User.findByIdAndUpdate(req.userId, { $inc: { postsCount: -1 } });
      
      return sendSuccessResponse(res, {
        message: 'Post deleted successfully'
      });
      
    } catch (error) {
      console.error('Delete post error:', error);
      return sendErrorResponse(res, 'Failed to delete post', 500);
    }
  }

  // Toggle like on post
  static async toggleLike(req, res) {
    try {
      const postId = req.params.id;
      const userId = req.userId;
      
      const post = await Post.findOne({ _id: postId, isActive: true });
      
      if (!post) {
        return sendErrorResponse(res, 'Post not found', 404);
      }
      
      // Toggle like
      const isLiked = post.toggleLike(userId);
      await post.save();
      
      return sendSuccessResponse(res, {
        message: isLiked ? 'Post liked' : 'Post unliked',
        isLiked,
        likesCount: post.likesCount
      });
      
    } catch (error) {
      console.error('Toggle like error:', error);
      return sendErrorResponse(res, 'Failed to toggle like', 500);
    }
  }

  // Get user's own posts
  static async getUserPosts(req, res) {
    try {
      const { limit = 10, page = 1 } = req.query;
      const limitNum = Math.min(parseInt(limit), 50);
      const skip = (parseInt(page) - 1) * limitNum;
      
      // Get user's posts
      const posts = await Post.find({ 
        author: req.userId, 
        isActive: true 
      })
        .populate('author', 'username fullName avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean();
      
      // Get total count
      const totalPosts = await Post.countDocuments({ 
        author: req.userId, 
        isActive: true 
      });
      const totalPages = Math.ceil(totalPosts / limitNum);
      
      // Add like status
      posts.forEach(post => {
        post.isLikedByUser = post.likes.some(
          like => like.user.toString() === req.userId.toString()
        );
      });
      
      return sendSuccessResponse(res, {
        posts,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalPosts,
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1
        }
      });
      
    } catch (error) {
      console.error('Get user posts error:', error);
      return sendErrorResponse(res, 'Failed to fetch user posts', 500);
    }
  }

  // Get categories
  static async getCategories(req, res) {
    try {
      const categories = [
        'General',
        'Technology', 
        'Sports',
        'Entertainment',
        'Science',
        'Art',
        'Food',
        'Travel',
        'Health',
        'Education'
      ];
      
      return sendSuccessResponse(res, { categories });
      
    } catch (error) {
      console.error('Get categories error:', error);
      return sendErrorResponse(res, 'Failed to fetch categories', 500);
    }
  }

  // Get post statistics
  static async getPostStats(req, res) {
    try {
      const totalPosts = await Post.countDocuments({ isActive: true });
      const totalUsers = await User.countDocuments();
      
      // Get posts by category
      const postsByCategory = await Post.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);
      
      // Recent activity (posts in last 24 hours)
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentPosts = await Post.countDocuments({
        isActive: true,
        createdAt: { $gte: twentyFourHoursAgo }
      });
      
      return sendSuccessResponse(res, {
        totalPosts,
        totalUsers,
        recentPosts,
        postsByCategory
      });
      
    } catch (error) {
      console.error('Get post stats error:', error);
      return sendErrorResponse(res, 'Failed to fetch post statistics', 500);
    }
  }
}

module.exports = PostsController;
