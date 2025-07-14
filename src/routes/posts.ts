import { Router } from 'express';
import { PostsController } from '@/controllers/postsController';
import { authenticate } from '@/middleware/auth';
import { postValidations, commentValidations, handleValidationErrors } from '@/middleware/validation';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Posts
 *   description: Post management endpoints
 */

// Public routes
router.get('/', PostsController.getAllPosts);
router.get('/user/:userId', PostsController.getUserPosts);
router.get('/:id', PostsController.getPostById);
router.get('/:id/comments', PostsController.getPostComments);
router.get('/:id/likes', PostsController.getPostLikes);

// Protected routes
router.use(authenticate);

router.post('/', postValidations.create, handleValidationErrors, PostsController.createPost);
router.put('/:id', postValidations.update, handleValidationErrors, PostsController.updatePost);
router.delete('/:id', PostsController.deletePost);
router.post('/:id/like', PostsController.toggleLike);
router.post('/:id/share', PostsController.sharePost);
router.post('/:id/bookmark', PostsController.bookmarkPost);
router.delete('/:id/bookmark', PostsController.unbookmarkPost);
router.get('/bookmarks', PostsController.getBookmarkedPosts);
router.post('/:id/comments', commentValidations.create, handleValidationErrors, PostsController.addComment);

export default router;
