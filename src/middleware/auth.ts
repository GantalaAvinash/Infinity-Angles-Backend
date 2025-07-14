import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '@/types';
import { JwtUtils } from '@/utils/jwt';
import { ResponseUtils } from '@/utils/response';
import { logAuthEvent, logSecurityEvent } from '@/utils/logger';
import User from '@/models/User';

/**
 * Authentication middleware - requires valid JWT token
 */
export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      logSecurityEvent('Missing authorization header', 'low', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.originalUrl,
      });
      ResponseUtils.unauthorized(res, 'Access token is required');
      return;
    }

    const token = JwtUtils.extractTokenFromHeader(authHeader);

    if (!token) {
      logSecurityEvent('Invalid token format', 'medium', {
        authHeader: authHeader.substring(0, 20) + '...',
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });
      ResponseUtils.unauthorized(res, 'Invalid token format. Use Bearer <token>');
      return;
    }

    // Verify access token
    const decoded = JwtUtils.verifyAccessToken(token);

    // Find user and verify they still exist and are active
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      logSecurityEvent('Token for non-existent user', 'high', {
        userId: decoded.userId,
        ip: req.ip,
      });
      ResponseUtils.unauthorized(res, 'User not found or token is invalid');
      return;
    }

    if (!user.isActive) {
      logSecurityEvent('Token for inactive user', 'medium', {
        userId: decoded.userId,
        ip: req.ip,
      });
      ResponseUtils.unauthorized(res, 'User account is deactivated');
      return;
    }

    // Add user to request object
    req.user = {
      userId: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
    };

    logAuthEvent('Token verified', user._id, user.email, req.ip, req.get('User-Agent'));
    next();
  } catch (error) {
    if (error instanceof Error) {
      logSecurityEvent('Token verification failed', 'medium', {
        error: error.message,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });

      if (error.message.includes('expired')) {
        ResponseUtils.unauthorized(res, 'Access token has expired');
        return;
      }

      if (error.message.includes('invalid') || error.message.includes('malformed')) {
        ResponseUtils.unauthorized(res, 'Invalid access token');
        return;
      }
    }

    ResponseUtils.unauthorized(res, 'Authentication failed');
  }
};

/**
 * Optional authentication middleware - allows both authenticated and unauthenticated users
 */
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
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
      // Verify access token
      const decoded = JwtUtils.verifyAccessToken(token);

      // Find user
      const user = await User.findById(decoded.userId).select('-password');

      if (user && user.isActive) {
        // Add user to request object if valid
        req.user = {
          userId: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
        };
      }
    } catch (tokenError) {
      // Invalid token, continue without authentication
      console.log('Optional auth token verification failed:', tokenError);
    }

    next();
  } catch (error) {
    console.error('Optional authentication error:', error);
    // Don't fail on optional auth errors
    next();
  }
};

/**
 * Authorization middleware - checks user roles
 */
export const authorize = (...roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      ResponseUtils.unauthorized(res, 'Authentication required');
      return;
    }

    if (!roles.includes(req.user.role || 'user')) {
      logSecurityEvent('Unauthorized access attempt', 'medium', {
        userId: req.user.userId,
        requiredRoles: roles,
        userRole: req.user.role,
        url: req.originalUrl,
        ip: req.ip,
      });
      ResponseUtils.forbidden(res, 'Insufficient permissions');
      return;
    }

    next();
  };
};

/**
 * Ownership middleware - checks if user owns the resource
 */
export const checkOwnership = (
  Model: any,
  paramKey: string = 'id',
  userField: string = 'author'
) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        ResponseUtils.unauthorized(res, 'Authentication required');
        return;
      }

      const resourceId = req.params[paramKey];

      if (!resourceId) {
        ResponseUtils.error(res, 'Resource ID is required', 400);
        return;
      }

      const resource = await Model.findById(resourceId);

      if (!resource) {
        ResponseUtils.notFound(res, 'Resource not found');
        return;
      }

      // Check if user owns the resource or is admin
      const isOwner = resource[userField].toString() === req.user.userId.toString();
      const isAdmin = req.user.role === 'admin';

      if (!isOwner && !isAdmin) {
        logSecurityEvent('Unauthorized resource access attempt', 'medium', {
          userId: req.user.userId,
          resourceId,
          resourceType: Model.modelName,
          ip: req.ip,
        });
        ResponseUtils.forbidden(res, 'Access denied. You can only modify your own content');
        return;
      }

      // Add resource to request object for further use
      (req as any).resource = resource;
      next();
    } catch (error) {
      console.error('Ownership check error:', error);
      ResponseUtils.error(res, 'Authorization failed', 500);
    }
  };
};

/**
 * Rate limiting check for sensitive operations
 */
export const sensitiveOperation = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    ResponseUtils.unauthorized(res, 'Authentication required');
    return;
  }

  // Add additional security logging for sensitive operations
  logSecurityEvent('Sensitive operation accessed', 'medium', {
    userId: req.user.userId,
    operation: `${req.method} ${req.originalUrl}`,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  next();
};

/**
 * Admin only middleware
 */
export const adminOnly = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    ResponseUtils.unauthorized(res, 'Authentication required');
    return;
  }

  if (req.user.role !== 'admin') {
    logSecurityEvent('Admin access attempt by non-admin', 'high', {
      userId: req.user.userId,
      userRole: req.user.role,
      url: req.originalUrl,
      ip: req.ip,
    });
    ResponseUtils.forbidden(res, 'Admin access required');
    return;
  }

  next();
};

/**
 * Verified user only middleware
 */
export const verifiedOnly = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  if (!req.user) {
    ResponseUtils.unauthorized(res, 'Authentication required');
    return;
  }

  try {
    const user = await User.findById(req.user.userId).select('isVerified');
    
    if (!user || !user.isVerified) {
      ResponseUtils.forbidden(res, 'Verified account required');
      return;
    }

    next();
  } catch (error) {
    console.error('Verification check error:', error);
    ResponseUtils.error(res, 'Verification check failed', 500);
  }
};

export default {
  authenticate,
  optionalAuth,
  authorize,
  checkOwnership,
  sensitiveOperation,
  adminOnly,
  verifiedOnly,
};
