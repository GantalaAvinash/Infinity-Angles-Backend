const JwtUtils = require('../utils/jwtUtils');
const User = require('../models/User');
const ResponseUtils = require('../utils/responseUtils');

// Middleware to authenticate user
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return ResponseUtils.error(res, 'Access token is required', 401);
    }

    const token = JwtUtils.extractTokenFromHeader(authHeader);
    
    if (!token) {
      return ResponseUtils.error(res, 'Invalid token format. Use Bearer <token>', 401);
    }

    // Verify token
    const decoded = JwtUtils.verifyToken(token);
    
    // Find user
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return ResponseUtils.error(res, 'User not found or token is invalid', 401);
    }

    // Add user to request object
    req.user = {
      userId: user._id,
      username: user.username,
      email: user.email,
      fullName: user.fullName
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return ResponseUtils.error(res, error.message || 'Authentication failed', 401);
  }
};

// Optional authentication middleware (allows both authenticated and unauthenticated users)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      // No token provided, continue without authentication
      return next();
    }

    const token = JwtUtils.extractTokenFromHeader(authHeader);
    
    if (!token) {
      // Invalid token format, continue without authentication
      return next();
    }

    try {
      // Verify token
      const decoded = JwtUtils.verifyToken(token);
      
      // Find user
      const user = await User.findById(decoded.userId).select('-password');
      
      if (user) {
        // Add user to request object if valid
        req.user = {
          userId: user._id,
          username: user.username,
          email: user.email,
          fullName: user.fullName
        };
      }
    } catch (tokenError) {
      // Invalid token, continue without authentication
      console.log('Optional auth token verification failed:', tokenError.message);
    }

    next();
  } catch (error) {
    console.error('Optional authentication error:', error);
    // Don't fail on optional auth errors
    next();
  }
};

// Middleware to check ownership of a resource
const checkOwnership = (Model, paramKey = 'id', userField = 'author') => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[paramKey];
      
      if (!resourceId) {
        return ResponseUtils.error(res, 'Resource ID is required', 400);
      }

      const resource = await Model.findById(resourceId);
      
      if (!resource) {
        return ResponseUtils.error(res, 'Resource not found', 404);
      }

      // Check if user owns the resource
      if (resource[userField].toString() !== req.user.userId.toString()) {
        return ResponseUtils.error(res, 'Access denied. You can only modify your own content', 403);
      }

      req.resource = resource;
      next();
    } catch (error) {
      console.error('Ownership check error:', error);
      return ResponseUtils.error(res, 'Authorization failed', 500);
    }
  };
};

module.exports = {
  authenticate,
  optionalAuth,
  checkOwnership
};
