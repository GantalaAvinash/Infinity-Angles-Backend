const JwtUtils = require('../utils/jwtUtils');
const User = require('../models/User');
const ResponseUtils = require('../utils/responseUtils');

// Middleware to authenticate user
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return sendErrorResponse(res, 'Access token is required', 401);
    }

    const token = JwtUtils.extractTokenFromHeader(authHeader);
    
    if (!token) {
      return sendErrorResponse(res, 'Invalid token format. Use Bearer <token>', 401);
    }

    // Verify token
    const decoded = JwtUtils.verifyToken(token);
    
    // Find user
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return sendErrorResponse(res, 'User not found or token is invalid', 401);
    }

    // Add user to request object
    req.user = user;
    req.userId = user._id;
    
    next();
  } catch (error) {
    return sendErrorResponse(res, error.message || 'Authentication failed', 401);
  }
};

// Middleware to check if user is authenticated (optional auth)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader) {
      const token = JwtUtils.extractTokenFromHeader(authHeader);
      
      if (token) {
        try {
          const decoded = JwtUtils.verifyToken(token);
          const user = await User.findById(decoded.userId).select('-password');
          
          if (user) {
            req.user = user;
            req.userId = user._id;
            req.isAuthenticated = true;
          }
        } catch (error) {
          // Token is invalid but we continue without authentication
          req.isAuthenticated = false;
        }
      }
    }
    
    req.isAuthenticated = req.isAuthenticated || false;
    next();
  } catch (error) {
    req.isAuthenticated = false;
    next();
  }
};

// Middleware to check if user owns the resource
const authorize = (resourceModel) => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params.id;
      const userId = req.userId;

      if (!resourceId) {
        return sendErrorResponse(res, 'Resource ID is required', 400);
      }

      let resource;
      
      if (resourceModel === 'Post') {
        const Post = require('../models/Post');
        resource = await Post.findById(resourceId);
      } else if (resourceModel === 'Comment') {
        const Comment = require('../models/Comment');
        resource = await Comment.findById(resourceId);
      }

      if (!resource) {
        return sendErrorResponse(res, 'Resource not found', 404);
      }

      if (resource.author.toString() !== userId.toString()) {
        return sendErrorResponse(res, 'Access denied. You can only modify your own content', 403);
      }

      req.resource = resource;
      next();
    } catch (error) {
      return sendErrorResponse(res, 'Authorization failed', 500);
    }
  };
};

module.exports = {
  authenticate,
  optionalAuth,
  authorize
};
