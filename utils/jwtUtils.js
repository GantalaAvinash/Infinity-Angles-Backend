const jwt = require('jsonwebtoken');
const config = require('../config/config');

class JwtUtils {
  // Generate JWT token
  static generateToken(payload) {
    try {
      return jwt.sign(
        payload,
        config.jwt.secret,
        { 
          expiresIn: config.jwt.expiresIn,
          issuer: 'infinity-angles',
          audience: 'infinity-angles-app'
        }
      );
    } catch (error) {
      throw new Error('Failed to generate token');
    }
  }

  // Verify JWT token
  static verifyToken(token) {
    try {
      return jwt.verify(token, config.jwt.secret, {
        issuer: 'infinity-angles',
        audience: 'infinity-angles-app'
      });
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token has expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      } else {
        throw new Error('Token verification failed');
      }
    }
  }

  // Decode token without verification (for debugging)
  static decodeToken(token) {
    try {
      return jwt.decode(token, { complete: true });
    } catch (error) {
      throw new Error('Failed to decode token');
    }
  }

  // Extract token from Authorization header
  static extractTokenFromHeader(authHeader) {
    if (!authHeader) {
      return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }

  // Generate refresh token (longer expiry)
  static generateRefreshToken(payload) {
    try {
      return jwt.sign(
        payload,
        config.jwt.secret,
        { 
          expiresIn: '30d', // 30 days for refresh token
          issuer: 'infinity-angles',
          audience: 'infinity-angles-app'
        }
      );
    } catch (error) {
      throw new Error('Failed to generate refresh token');
    }
  }

  // Check if token is expired
  static isTokenExpired(token) {
    try {
      const decoded = this.decodeToken(token);
      const currentTime = Math.floor(Date.now() / 1000);
      return decoded.payload.exp < currentTime;
    } catch (error) {
      return true; // Consider invalid tokens as expired
    }
  }
}

module.exports = JwtUtils;
