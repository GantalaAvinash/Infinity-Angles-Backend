import { Router, Request, Response } from 'express';
import { database } from '@/config/database';
import { config } from '@/config';
import { ResponseUtils } from '@/utils/response';
import { HealthCheck } from '@/types';
import { asyncHandler } from '@/middleware/errorHandler';

const router = Router();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Get application health status
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Application is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       enum: [healthy, unhealthy]
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     services:
 *                       type: object
 *                       properties:
 *                         database:
 *                           type: string
 *                           enum: [connected, disconnected]
 *                         redis:
 *                           type: string
 *                           enum: [connected, disconnected]
 *                         storage:
 *                           type: string
 *                           enum: [available, unavailable]
 *                     performance:
 *                       type: object
 *                       properties:
 *                         uptime:
 *                           type: number
 *                         memory:
 *                           type: object
 *                         cpu:
 *                           type: number
 *       503:
 *         description: Application is unhealthy
 */
router.get('/', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  try {
    // Check database health
    const dbHealth = await database.healthCheck();
    
    // Check memory usage
    const memoryUsage = process.memoryUsage();
    
    // Check uptime
    const uptime = process.uptime();
    
    // Determine overall health status
    const isHealthy = dbHealth.status === 'connected';
    
    const healthCheck: HealthCheck = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealth.status,
        storage: 'available', // TODO: Add actual storage check
      },
      performance: {
        uptime,
        memory: memoryUsage,
      },
    };
    
    const statusCode = isHealthy ? 200 : 503;
    const message = isHealthy ? 'Application is healthy' : 'Application is unhealthy';
    
    if (isHealthy) {
      ResponseUtils.success(res, healthCheck, message, statusCode);
    } else {
      ResponseUtils.serviceUnavailable(res, message);
    }
  } catch (error) {
    console.error('Health check failed:', error);
    
    const healthCheck: HealthCheck = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'disconnected',
        storage: 'unavailable',
      },
      performance: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
      },
    };
    
    ResponseUtils.serviceUnavailable(res, 'Health check failed');
  }
}));

/**
 * @swagger
 * /health/detailed:
 *   get:
 *     summary: Get detailed application health status
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Detailed health information
 */
router.get('/detailed', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  try {
    // Database health with detailed info
    const dbHealth = await database.healthCheck();
    
    // Memory usage details
    const memoryUsage = process.memoryUsage();
    const memoryUsageMB = {
      rss: Math.round(memoryUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      external: Math.round(memoryUsage.external / 1024 / 1024),
    };
    
    // System information
    const systemInfo = {
      nodeVersion: process.version,
      platform: process.platform,
      architecture: process.arch,
      environment: config.NODE_ENV,
      pid: process.pid,
      uptime: Math.round(process.uptime()),
    };
    
    // Application information
    const appInfo = {
      name: 'Infinity Angles Backend',
      version: '2.0.0',
      startTime: new Date(Date.now() - process.uptime() * 1000).toISOString(),
    };
    
    const detailedHealth = {
      status: dbHealth.status === 'connected' ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      application: appInfo,
      system: systemInfo,
      services: {
        database: {
          status: dbHealth.status,
          readyState: dbHealth.readyState,
          host: dbHealth.host,
          port: dbHealth.port,
          name: dbHealth.name,
        },
        storage: {
          status: 'available', // TODO: Add actual storage check
        },
      },
      performance: {
        uptime: process.uptime(),
        memory: {
          usage: memoryUsageMB,
          raw: memoryUsage,
        },
      },
    };
    
    ResponseUtils.success(res, detailedHealth, 'Detailed health information retrieved');
  } catch (error) {
    console.error('Detailed health check failed:', error);
    ResponseUtils.internalError(res, 'Detailed health check failed');
  }
}));

/**
 * @swagger
 * /health/ready:
 *   get:
 *     summary: Check if application is ready to serve requests (readiness probe)
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Application is ready
 *       503:
 *         description: Application is not ready
 */
router.get('/ready', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  try {
    const dbHealth = await database.healthCheck();
    
    if (dbHealth.status === 'connected') {
      ResponseUtils.success(res, { ready: true }, 'Application is ready');
    } else {
      ResponseUtils.serviceUnavailable(res, 'Application is not ready');
    }
  } catch (error) {
    console.error('Readiness check failed:', error);
    ResponseUtils.serviceUnavailable(res, 'Application is not ready');
  }
}));

/**
 * @swagger
 * /health/live:
 *   get:
 *     summary: Check if application is alive (liveness probe)
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Application is alive
 */
router.get('/live', (req: Request, res: Response): void => {
  ResponseUtils.success(res, { 
    alive: true,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  }, 'Application is alive');
});

export default router;
