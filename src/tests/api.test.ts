import request from 'supertest';
import mongoose from 'mongoose';
import app from '@/server';
import User from '@/models/User';
import Post from '@/models/Post';
import { config } from '@/config';

// Test database connection
const testDbUri = config.MONGODB_TEST_URI || 'mongodb://localhost:27017/infinity-angles-test';

describe('API Tests', () => {
  let authToken: string;
  let testUser: any;
  let testPost: any;

  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(testDbUri);
    
    // Clear test data
    await User.deleteMany({});
    await Post.deleteMany({});
  });

  afterAll(async () => {
    // Clean up and close connection
    await User.deleteMany({});
    await Post.deleteMany({});
    await mongoose.connection.close();
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('healthy');
    });
  });

  describe('Authentication', () => {
    const testUserData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'TestPassword123',
      fullName: 'Test User',
    };

    it('should register a new user', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUserData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.username).toBe(testUserData.username);
      expect(response.body.data.user.email).toBe(testUserData.email);
      expect(response.body.data.tokens.accessToken).toBeDefined();
      
      authToken = response.body.data.tokens.accessToken;
      testUser = response.body.data.user;
    });

    it('should login existing user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUserData.email,
          password: testUserData.password,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(testUserData.email);
      expect(response.body.data.tokens.accessToken).toBeDefined();
    });

    it('should fail login with wrong password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUserData.email,
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should get current user profile', async () => {
      const response = await request(app)
        .get('/api/users/profile/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.username).toBe(testUserData.username);
    });
  });

  describe('Users', () => {
    it('should get user by ID', async () => {
      const response = await request(app)
        .get(`/api/users/${testUser._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user._id).toBe(testUser._id);
    });

    it('should update user profile', async () => {
      const updateData = {
        fullName: 'Updated Test User',
        bio: 'This is my test bio',
      };

      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.fullName).toBe(updateData.fullName);
      expect(response.body.data.user.bio).toBe(updateData.bio);
    });

    it('should search users', async () => {
      const response = await request(app)
        .get('/api/users/search?q=test')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.users).toBeInstanceOf(Array);
    });

    it('should get all users with pagination', async () => {
      const response = await request(app)
        .get('/api/users?page=1&limit=10')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.users).toBeInstanceOf(Array);
      expect(response.body.data.pagination).toBeDefined();
    });
  });

  describe('Posts', () => {
    const testPostData = {
      title: 'Test Post',
      content: 'This is a test post content.',
      tags: ['test', 'api'],
      category: 'Technology',
    };

    it('should create a new post', async () => {
      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testPostData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.post.title).toBe(testPostData.title);
      expect(response.body.data.post.content).toBe(testPostData.content);
      expect(response.body.data.post.author._id).toBe(testUser._id);
      
      testPost = response.body.data.post;
    });

    it('should get all posts', async () => {
      const response = await request(app)
        .get('/api/posts')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.posts).toBeInstanceOf(Array);
      expect(response.body.data.posts.length).toBeGreaterThan(0);
    });

    it('should get post by ID', async () => {
      const response = await request(app)
        .get(`/api/posts/${testPost._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.post._id).toBe(testPost._id);
      expect(response.body.data.post.title).toBe(testPostData.title);
    });

    it('should update post', async () => {
      const updateData = {
        title: 'Updated Test Post',
        content: 'This is updated content.',
      };

      const response = await request(app)
        .put(`/api/posts/${testPost._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.post.title).toBe(updateData.title);
      expect(response.body.data.post.content).toBe(updateData.content);
    });

    it('should like a post', async () => {
      const response = await request(app)
        .post(`/api/posts/${testPost._id}/like`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.liked).toBe(true);
    });

    it('should unlike a post', async () => {
      const response = await request(app)
        .post(`/api/posts/${testPost._id}/like`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.liked).toBe(false);
    });

    it('should add comment to post', async () => {
      const commentData = {
        content: 'This is a test comment',
      };

      const response = await request(app)
        .post(`/api/posts/${testPost._id}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(commentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.comment.content).toBe(commentData.content);
      expect(response.body.data.comment.author._id).toBe(testUser._id);
    });

    it('should get user posts', async () => {
      const response = await request(app)
        .get(`/api/posts/user/${testUser._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.posts).toBeInstanceOf(Array);
      expect(response.body.data.posts.length).toBeGreaterThan(0);
    });

    it('should delete post', async () => {
      const response = await request(app)
        .delete(`/api/posts/${testPost._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should return 404 for deleted post', async () => {
      const response = await request(app)
        .get(`/api/posts/${testPost._id}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should return 401 for protected routes without token', async () => {
      const response = await request(app)
        .get('/api/users/profile/me')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid post data', async () => {
      const invalidPostData = {
        title: '', // Empty title should fail validation
        content: 'Some content',
      };

      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidPostData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent resources', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .get(`/api/users/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Password Change', () => {
    it('should change user password', async () => {
      const passwordData = {
        currentPassword: 'TestPassword123',
        newPassword: 'NewTestPassword123',
      };

      const response = await request(app)
        .put('/api/users/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send(passwordData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should fail with wrong current password', async () => {
      const passwordData = {
        currentPassword: 'WrongPassword123',
        newPassword: 'NewTestPassword456',
      };

      const response = await request(app)
        .put('/api/users/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send(passwordData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Follow System', () => {
    let secondUser: any;
    let secondAuthToken: string;

    beforeAll(async () => {
      // Create second user
      const secondUserData = {
        username: 'testuser2',
        email: 'test2@example.com',
        password: 'TestPassword123',
        fullName: 'Test User 2',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(secondUserData);

      secondUser = response.body.data.user;
      secondAuthToken = response.body.data.tokens.accessToken;
    });

    it('should follow another user', async () => {
      const response = await request(app)
        .post(`/api/users/${secondUser._id}/follow`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.following).toBe(true);
    });

    it('should get user followers', async () => {
      const response = await request(app)
        .get(`/api/users/${secondUser._id}/followers`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.followers).toBeInstanceOf(Array);
    });

    it('should get user following', async () => {
      const response = await request(app)
        .get(`/api/users/${testUser._id}/following`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.following).toBeInstanceOf(Array);
    });

    it('should unfollow user', async () => {
      const response = await request(app)
        .post(`/api/users/${secondUser._id}/follow`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.following).toBe(false);
    });
  });
});
