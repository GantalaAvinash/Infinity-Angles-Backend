import jwt, { SignOptions } from 'jsonwebtoken';
import { config, jwtConfig } from '@/config';
import { JwtUser } from '@/types';
import { logger } from './logger';

export class JwtUtils {
  /**
   * Generate access token
   */
  static generateAccessToken(payload: Omit<JwtUser, 'iat' | 'exp'>): string {
    try {
      const options: SignOptions = {
        expiresIn: jwtConfig.expiresIn as any,
        algorithm: jwtConfig.algorithm,
        issuer: jwtConfig.issuer,
        audience: jwtConfig.audience,
      };

      return jwt.sign(payload, jwtConfig.secret, options);
    } catch (error) {
      logger.error('Error generating access token:', error);
      throw new Error('Token generation failed');
    }
  }

  /**
   * Generate refresh token
   */
  static generateRefreshToken(payload: Omit<JwtUser, 'iat' | 'exp'>): string {
    try {
      const options: SignOptions = {
        expiresIn: jwtConfig.refreshExpiresIn as any,
        algorithm: jwtConfig.algorithm,
        issuer: jwtConfig.issuer,
        audience: jwtConfig.audience,
      };

      return jwt.sign(payload, jwtConfig.refreshSecret, options);
    } catch (error) {
      logger.error('Error generating refresh token:', error);
      throw new Error('Refresh token generation failed');
    }
  }

  /**
   * Verify access token
   */
  static verifyAccessToken(token: string): JwtUser {
    try {
      const decoded = jwt.verify(token, jwtConfig.secret, {
        algorithms: [jwtConfig.algorithm],
        issuer: jwtConfig.issuer,
        audience: jwtConfig.audience,
      }) as JwtUser;

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Access token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid access token');
      } else {
        logger.error('Error verifying access token:', error);
        throw new Error('Token verification failed');
      }
    }
  }

  /**
   * Verify refresh token
   */
  static verifyRefreshToken(token: string): JwtUser {
    try {
      const decoded = jwt.verify(token, jwtConfig.refreshSecret, {
        algorithms: [jwtConfig.algorithm],
        issuer: jwtConfig.issuer,
        audience: jwtConfig.audience,
      }) as JwtUser;

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Refresh token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid refresh token');
      } else {
        logger.error('Error verifying refresh token:', error);
        throw new Error('Refresh token verification failed');
      }
    }
  }

  /**
   * Extract token from Authorization header
   */
  static extractTokenFromHeader(authHeader: string): string | null {
    if (!authHeader) {
      return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }

  /**
   * Decode token without verification (for debugging)
   */
  static decodeToken(token: string): any {
    try {
      return jwt.decode(token);
    } catch (error) {
      logger.error('Error decoding token:', error);
      return null;
    }
  }

  /**
   * Check if token is expired
   */
  static isTokenExpired(token: string): boolean {
    try {
      const decoded = this.decodeToken(token);
      if (!decoded || !decoded.exp) {
        return true;
      }

      const currentTime = Math.floor(Date.now() / 1000);
      return decoded.exp < currentTime;
    } catch (error) {
      return true;
    }
  }

  /**
   * Get token expiration time
   */
  static getTokenExpiration(token: string): Date | null {
    try {
      const decoded = this.decodeToken(token);
      if (!decoded || !decoded.exp) {
        return null;
      }

      return new Date(decoded.exp * 1000);
    } catch (error) {
      return null;
    }
  }

  /**
   * Generate token pair (access + refresh)
   */
  static generateTokenPair(payload: Omit<JwtUser, 'iat' | 'exp'>): {
    accessToken: string;
    refreshToken: string;
    accessTokenExpiresAt: Date;
    refreshTokenExpiresAt: Date;
  } {
    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken(payload);

    // Calculate expiration dates
    const now = new Date();
    const accessTokenExpiresAt = new Date(now.getTime() + this.parseExpirationTime(jwtConfig.expiresIn));
    const refreshTokenExpiresAt = new Date(now.getTime() + this.parseExpirationTime(jwtConfig.refreshExpiresIn));

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresAt,
      refreshTokenExpiresAt,
    };
  }

  /**
   * Parse expiration time string to milliseconds
   */
  private static parseExpirationTime(expiration: string): number {
    const timeUnits: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    const match = expiration.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error(`Invalid expiration format: ${expiration}`);
    }

    const [, value, unit] = match;
    return parseInt(value, 10) * timeUnits[unit];
  }

  /**
   * Refresh access token using refresh token
   */
  static refreshAccessToken(refreshToken: string): {
    accessToken: string;
    accessTokenExpiresAt: Date;
  } {
    try {
      const decoded = this.verifyRefreshToken(refreshToken);
      
      // Create new payload without JWT specific fields
      const payload: Omit<JwtUser, 'iat' | 'exp'> = {
        userId: decoded.userId,
        username: decoded.username,
        email: decoded.email,
        role: decoded.role,
      };

      const accessToken = this.generateAccessToken(payload);
      const now = new Date();
      const accessTokenExpiresAt = new Date(now.getTime() + this.parseExpirationTime(jwtConfig.expiresIn));

      return {
        accessToken,
        accessTokenExpiresAt,
      };
    } catch (error) {
      logger.error('Error refreshing access token:', error);
      throw error;
    }
  }
}

export default JwtUtils;
