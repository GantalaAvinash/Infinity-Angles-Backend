const Post = require('../models/Post');
const User = require('../models/User');
const ResponseUtils = require('../utils/responseUtils');
const { validationResult } = require('express-validator');

class PostsController {
  // Get all posts with pagination and filtering
  static async getAllPosts(req, res) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        category, 
        tags, 
        author,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const skip = (page - 1) * limit;
      const limitNum = Math.min(parseInt(limit), 50); // Max 50 posts per page

      // Build filter object
      const filter = {};
      if (category && category !== 'all') filter.category = category;
      if (author) filter.author = author;
      if (tags) {
        const tagArray = Array.isArray(tags) ? tags : [tags];
        filter.tags = { $in: tagArray };
      }

      // Build sort object
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      // Get posts with author information
      const posts = await Post.find(filter)
        .populate('author', 'username fullName avatar')
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean();

      // Get total count for pagination
      const total = await Post.countDocuments(filter);
      const totalPages = Math.ceil(total / limitNum);

      return ResponseUtils.success(res, {
        posts,
        pagination: {
          page: parseInt(page),
          limit: limitNum,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }, 'Posts retrieved successfully');

    } catch (error) {
      console.error('Get posts error:', error);
      return ResponseUtils.error(res, 'Failed to get posts', 500);
    }
  }

  // Get single post by ID
  static async getPostById(req, res) {
    try {
      const { id } = req.params;

      const post = await Post.findById(id)
        .populate('author', 'username fullName avatar')
        .lean();

      if (!post) {
        return ResponseUtils.error(res, 'Post not found', 404);
      }

      // Add user-specific fields if authenticated
      if (req.user) {
        const userId = req.user.userId;
        post.isLikedByUser = post.likes?.some(like => 
          like.user && like.user.toString() === userId
        ) || false;
      }

      return ResponseUtils.success(res, {
        post
      }, 'Post retrieved successfully');

    } catch (error) {
      console.error('Get post error:', error);
      return ResponseUtils.error(res, 'Failed to get post', 500);
    }
  }

  // Create new post
  static async createPost(req, res) {
    try {
      // Debug logging
      console.log('📦 Request body:', req.body);
      console.log('📋 Content-Type:', req.headers['content-type']);
      console.log('🖼️ Processed images:', req.processedImages?.length || 0);
      
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('❌ Validation errors:', errors.array());
        return ResponseUtils.error(res, 'Validation failed', 400, errors.array());
      }

      const { content, category, tags } = req.body;
      const authorId = req.user.userId;

      console.log('📝 Creating post with:', { content, category, tags });
      console.log('🖼️ Processed images:', req.processedImages?.length || 0);

      // Create new post
      const post = new Post({
        content,
        author: authorId,
        category: category || 'General',
        tags: tags || [],
        images: req.processedImages || []
      });

      await post.save();

      // Populate author information
      await post.populate('author', 'username fullName avatar');

      console.log('✅ Post created with images:', post.images?.length || 0);

      // Update user's post count
      await User.findByIdAndUpdate(authorId, {
        $inc: { postsCount: 1 }
      });

      return ResponseUtils.success(res, {
        post
      }, 'Post created successfully', 201);

    } catch (error) {
      console.error('Create post error:', error);
      return ResponseUtils.error(res, 'Failed to create post', 500);
    }
  }

  // Update post
  static async updatePost(req, res) {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return ResponseUtils.error(res, 'Validation failed', 400, errors.array());
      }

      const { id } = req.params;
      const { content, category, tags } = req.body;
      const userId = req.user.userId;

      // Find the post
      const post = await Post.findById(id);
      if (!post) {
        return ResponseUtils.error(res, 'Post not found', 404);
      }

      // Check if user is the author
      if (post.author.toString() !== userId) {
        return ResponseUtils.error(res, 'Not authorized to update this post', 403);
      }

      // Update post
      const updatedPost = await Post.findByIdAndUpdate(
        id,
        { 
          ...(content && { content }),
          ...(category && { category }),
          ...(tags && { tags })
        },
        { new: true, runValidators: true }
      ).populate('author', 'username fullName avatar');

      return ResponseUtils.success(res, {
        post: updatedPost
      }, 'Post updated successfully');

    } catch (error) {
      console.error('Update post error:', error);
      return ResponseUtils.error(res, 'Failed to update post', 500);
    }
  }

  // Delete post
  static async deletePost(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      // Find the post
      const post = await Post.findById(id);
      if (!post) {
        return ResponseUtils.error(res, 'Post not found', 404);
      }

      // Check if user is the author
      if (post.author.toString() !== userId) {
        return ResponseUtils.error(res, 'Not authorized to delete this post', 403);
      }

      // Delete the post
      await Post.findByIdAndDelete(id);

      // Update user's post count
      await User.findByIdAndUpdate(userId, {
        $inc: { postsCount: -1 }
      });

      return ResponseUtils.success(res, {
        message: 'Post deleted successfully'
      }, 'Post deleted successfully');

    } catch (error) {
      console.error('Delete post error:', error);
      return ResponseUtils.error(res, 'Failed to delete post', 500);
    }
  }

  // Like/Unlike post
  static async toggleLike(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      const post = await Post.findById(id);
      if (!post) {
        return ResponseUtils.error(res, 'Post not found', 404);
      }

      const isLiked = post.likes.includes(userId);
      
      if (isLiked) {
        // Unlike
        post.likes.pull(userId);
        post.likesCount = Math.max(0, post.likesCount - 1);
      } else {
        // Like
        post.likes.push(userId);
        post.likesCount += 1;
      }

      await post.save();

      return ResponseUtils.success(res, {
        isLiked: !isLiked,
        likesCount: post.likesCount
      }, isLiked ? 'Post unliked' : 'Post liked');

    } catch (error) {
      console.error('Toggle like error:', error);
      return ResponseUtils.error(res, 'Failed to toggle like', 500);
    }
  }

  // Get posts by user
  static async getUserPosts(req, res) {
    try {
      const { userId } = req.params;
      const { page = 1, limit = 10 } = req.query;

      const skip = (page - 1) * limit;
      const limitNum = Math.min(parseInt(limit), 50);

      // Check if user exists
      const user = await User.findById(userId);
      if (!user) {
        return ResponseUtils.error(res, 'User not found', 404);
      }

      // Get user's posts
      const posts = await Post.find({ author: userId })
        .populate('author', 'username fullName avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean();

      const total = await Post.countDocuments({ author: userId });
      const totalPages = Math.ceil(total / limitNum);

      return ResponseUtils.success(res, {
        posts,
        pagination: {
          page: parseInt(page),
          limit: limitNum,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }, 'User posts retrieved successfully');

    } catch (error) {
      console.error('Get user posts error:', error);
      return ResponseUtils.error(res, 'Failed to get user posts', 500);
    }
  }

  // Get posts for the authenticated user
  static async getMyPosts(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const userId = req.user.userId; // From auth middleware

      const skip = (page - 1) * limit;
      const limitNum = Math.min(parseInt(limit), 50);

      // Get user's posts
      const posts = await Post.find({ author: userId })
        .populate('author', 'username fullName avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean();

      const total = await Post.countDocuments({ author: userId });
      const totalPages = Math.ceil(total / limitNum);

      return ResponseUtils.success(res, {
        posts,
        pagination: {
          page: parseInt(page),
          limit: limitNum,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }, 'My posts retrieved successfully');

    } catch (error) {
      console.error('Get my posts error:', error);
      return ResponseUtils.error(res, 'Failed to get my posts', 500);
    }
  }

  // Get posts by category
  static async getPostsByCategory(req, res) {
    try {
      const { category } = req.params;
      const { page = 1, limit = 10 } = req.query;

      const skip = (page - 1) * limit;
      const limitNum = Math.min(parseInt(limit), 50);

      const posts = await Post.find({ category })
        .populate('author', 'username fullName avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean();

      const total = await Post.countDocuments({ category });
      const totalPages = Math.ceil(total / limitNum);

      return ResponseUtils.success(res, {
        posts,
        pagination: {
          page: parseInt(page),
          limit: limitNum,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }, `Posts in ${category} category retrieved successfully`);

    } catch (error) {
      console.error('Get posts by category error:', error);
      return ResponseUtils.error(res, 'Failed to get posts by category', 500);
    }
  }

  // Get post statistics
  static async getPostStats(req, res) {
    try {
      const userId = req.user?.userId;

      // Get overall stats
      const totalPosts = await Post.countDocuments();
      const totalCategories = await Post.distinct('category').then(cats => cats.length);

      // Get category distribution
      const categoryStats = await Post.aggregate([
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 }
          }
        },
        {
          $sort: { count: -1 }
        }
      ]);

      // Get user-specific stats if authenticated
      let userStats = null;
      if (userId) {
        const userPosts = await Post.countDocuments({ author: userId });
        const userLikes = await Post.aggregate([
          { $match: { author: userId } },
          { $group: { _id: null, totalLikes: { $sum: '$likesCount' } } }
        ]);
        
        userStats = {
          postsCount: userPosts,
          totalLikes: userLikes[0]?.totalLikes || 0
        };
      }

      return ResponseUtils.success(res, {
        totalPosts,
        totalCategories,
        categoryStats,
        userStats
      }, 'Post statistics retrieved successfully');

    } catch (error) {
      console.error('Get post stats error:', error);
      return ResponseUtils.error(res, 'Failed to get post statistics', 500);
    }
  }

  // Get available categories
  static async getCategories(req, res) {
    try {
      const categories = ['Ideologies', 'Ideas', 'Inventions', 'Innovations', 'Businesses', 'Ventures', 'Startups', 'Companies', 'Branches', 'Investments', 'Partnerships', 'Networth'];
      return ResponseUtils.success(res, {
        categories
      }, 'Categories retrieved successfully');

    } catch (error) {
      console.error('Get categories error:', error);
      return ResponseUtils.error(res, 'Failed to get categories', 500);
    }
  }
}

module.exports = PostsController;
