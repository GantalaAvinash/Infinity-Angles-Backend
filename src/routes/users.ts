import { Router } from 'express';
import { UsersController } from '@/controllers/usersController';
import { authenticate } from '@/middleware/auth';
import { userValidations, handleValidationErrors } from '@/middleware/validation';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management endpoints
 */

// Public routes
router.get('/', UsersController.getAllUsers);
router.get('/stats', UsersController.getUserStats);
router.get('/search', UsersController.searchUsers);
router.get('/:id', UsersController.getUserById);
router.get('/:id/followers', UsersController.getFollowers);
router.get('/:id/following', UsersController.getFollowing);

// Protected routes
router.use(authenticate);

router.get('/profile/me', UsersController.getCurrentUser);
router.put('/profile', userValidations.updateProfile, handleValidationErrors, UsersController.updateProfile);
router.put('/change-password', userValidations.changePassword, handleValidationErrors, UsersController.changePassword);
router.put('/deactivate', UsersController.deactivateAccount);
router.get('/:id/following-status', UsersController.getFollowingStatus);
router.post('/:id/follow', UsersController.followUser);
router.post('/:id/unfollow', UsersController.unfollowUser);

export default router;
