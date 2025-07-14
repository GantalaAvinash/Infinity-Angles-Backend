import { Response } from 'express';
import { ApiResponse, PaginationQuery } from '@/types';
import { logger } from './logger';

export class ResponseUtils {
  /**
   * Send successful response
   */
  static success<T>(
    res: Response,
    data?: T,
    message: string = 'Success',
    statusCode: number = 200,
    pagination?: PaginationQuery & { total?: number; totalPages?: number }
  ): Response<ApiResponse<T>> {
    const response: ApiResponse<T> = {
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
    };

    if (pagination && pagination.total !== undefined) {
      response.pagination = {
        page: pagination.page || 1,
        limit: pagination.limit || 10,
        total: pagination.total,
        totalPages: pagination.totalPages || Math.ceil(pagination.total / (pagination.limit || 10)),
      };
    }

    return res.status(statusCode).json(response);
  }

  /**
   * Send error response
   */
  static error(
    res: Response,
    message: string = 'An error occurred',
    statusCode: number = 500,
    errors?: any[]
  ): Response<ApiResponse> {
    const response: ApiResponse = {
      success: false,
      message,
      errors,
      timestamp: new Date().toISOString(),
    };

    // Log error for monitoring
    logger.error(`API Error: ${message}`, {
      statusCode,
      errors,
      url: res.req?.originalUrl,
      method: res.req?.method,
      ip: res.req?.ip,
      userAgent: res.req?.get('User-Agent'),
    });

    return res.status(statusCode).json(response);
  }

  /**
   * Send validation error response
   */
  static validationError(
    res: Response,
    errors: any[],
    message: string = 'Validation failed'
  ): Response<ApiResponse> {
    return this.error(res, message, 400, errors);
  }

  /**
   * Send unauthorized response
   */
  static unauthorized(
    res: Response,
    message: string = 'Unauthorized access'
  ): Response<ApiResponse> {
    return this.error(res, message, 401);
  }

  /**
   * Send forbidden response
   */
  static forbidden(
    res: Response,
    message: string = 'Access forbidden'
  ): Response<ApiResponse> {
    return this.error(res, message, 403);
  }

  /**
   * Send not found response
   */
  static notFound(
    res: Response,
    message: string = 'Resource not found'
  ): Response<ApiResponse> {
    return this.error(res, message, 404);
  }

  /**
   * Send bad request response
   */
  static badRequest(
    res: Response,
    message: string = 'Bad request'
  ): Response<ApiResponse> {
    return this.error(res, message, 400);
  }

  /**
   * Send created response
   */
  static created<T>(
    res: Response,
    data?: T,
    message: string = 'Created successfully'
  ): Response<ApiResponse<T>> {
    return this.success(res, data, message, 201);
  }

  /**
   * Send server error response
   */
  static serverError(
    res: Response,
    message: string = 'Internal server error'
  ): Response<ApiResponse> {
    return this.error(res, message, 500);
  }

  /**
   * Send conflict response
   */
  static conflict(
    res: Response,
    message: string = 'Conflict occurred'
  ): Response<ApiResponse> {
    return this.error(res, message, 409);
  }

  /**
   * Send too many requests response
   */
  static tooManyRequests(
    res: Response,
    message: string = 'Too many requests'
  ): Response<ApiResponse> {
    return this.error(res, message, 429);
  }

  /**
   * Send internal server error response
   */
  static internalError(
    res: Response,
    message: string = 'Internal server error'
  ): Response<ApiResponse> {
    return this.error(res, message, 500);
  }

  /**
   * Send service unavailable response
   */
  static serviceUnavailable(
    res: Response,
    message: string = 'Service unavailable'
  ): Response<ApiResponse> {
    return this.error(res, message, 503);
  }
}

export default ResponseUtils;
