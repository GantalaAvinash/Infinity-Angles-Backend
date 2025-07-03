// Response utility functions
class ResponseUtils {
  // Success response
  static success(res, data, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    });
  }

  // Error response
  static error(res, message = 'Internal Server Error', statusCode = 500, errors = null) {
    const response = {
      success: false,
      message,
      timestamp: new Date().toISOString()
    };

    if (errors) {
      response.errors = errors;
    }

    return res.status(statusCode).json(response);
  }

  // Paginated response
  static paginated(res, data, pagination, message = 'Success') {
    return res.json({
      success: true,
      message,
      data,
      pagination,
      timestamp: new Date().toISOString()
    });
  }

  // Not found response
  static notFound(res, message = 'Resource not found') {
    return this.error(res, message, 404);
  }

  // Bad request response
  static badRequest(res, message = 'Bad request', errors = null) {
    return this.error(res, message, 400, errors);
  }

  // Unauthorized response
  static unauthorized(res, message = 'Unauthorized') {
    return this.error(res, message, 401);
  }

  // Forbidden response
  static forbidden(res, message = 'Forbidden') {
    return this.error(res, message, 403);
  }
}

module.exports = ResponseUtils;
