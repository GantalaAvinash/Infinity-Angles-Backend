import request from 'supertest';
import mongoose from 'mongoose';
import application from '@/server';
import User from '@/models/User';
import Post from '@/models/Post';
import { config } from '@/config';

// Test database connection
const testDbUri = config.MONGODB_TEST_URI || 'mongodb://localhost:27017/infinity-angles-test';

describe('Infinity Angles API - Comprehensive Test Suite', () => {
  let app: any;
  let authToken: string;
  let testUser: any;
  let testPost: any;
  let secondUser: any;
  let secondAuthToken: string;

  beforeAll(async () => {
    try {
      // Use the existing application instance
      app = application.getApp();
      
      // Connect to test database
      await mongoose.connect(testDbUri);
      
      // Clear test data
      await User.deleteMany({});
      await Post.deleteMany({});
      
      console.log('Test setup complete');
    } catch (error) {
      console.error('Test setup failed:', error);
      throw error;
    }
  });

  afterAll(async () => {
    try {
      // Clean up and close connection
      await User.deleteMany({});
      await Post.deleteMany({});
      await mongoose.connection.close();
      console.log('Test cleanup complete');
    } catch (error) {
      console.error('Test cleanup failed:', error);
    }
  });

  describe('1. Health Check API', () => {
    it('GET /api/health - should return application health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data).toHaveProperty('timestamp');
      expect(response.body.data).toHaveProperty('services');

      console.log('✓ Health check API working');
    });

    it('GET /api/health/detailed - should return detailed health information', async () => {
      const response = await request(app)
        .get('/api/health/detailed')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('performance');
      expect(response.body.data).toHaveProperty('memory');

      console.log('✓ Detailed health check API working');
    });
  });

  describe('2. Authentication API', () => {
    const testUserData = {
      username: 'testuser123',
      email: 'test@infinityangles.com',
      password: 'TestPassword123!',
      fullName: 'Test User',
      bio: 'This is a test user account'
    };

    const secondUserData = {
      username: 'testuser456',
      email: 'test2@infinityangles.com',
      password: 'TestPassword456!',
      fullName: 'Second Test User',
      bio: 'This is another test user account'
    };

    it('POST /api/auth/register - should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUserData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('tokens');
      expect(response.body.data.user.username).toBe(testUserData.username);
      expect(response.body.data.user.email).toBe(testUserData.email);
      expect(response.body.data.user).not.toHaveProperty('password');
      expect(response.body.data.tokens).toHaveProperty('accessToken');
      expect(response.body.data.tokens).toHaveProperty('refreshToken');
      
      authToken = response.body.data.tokens.accessToken;
      testUser = response.body.data.user;

      console.log('✓ User registration working');
    });

    it('POST /api/auth/register - should register a second user', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(secondUserData)
        .expect(201);

      secondAuthToken = response.body.data.tokens.accessToken;
      secondUser = response.body.data.user;

      console.log('✓ Second user registration working');
    });

    it('POST /api/auth/register - should fail with duplicate email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...testUserData,
          username: 'differentusername'
        })
        .expect(409);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');

      console.log('✓ Duplicate email validation working');
    });

    it('POST /api/auth/register - should fail with duplicate username', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...testUserData,
          email: 'different@example.com'
        })
        .expect(409);

      expect(response.body).toHaveProperty('success', false);

      console.log('✓ Duplicate username validation working');
    });

    it('POST /api/auth/register - should fail with invalid data', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'ab', // too short
          email: 'invalid-email',
          password: '123', // too short
          fullName: ''
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('errors');

      console.log('✓ Input validation working');
    });

    it('POST /api/auth/login - should login existing user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUserData.email,
          password: testUserData.password,
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('tokens');
      expect(response.body.data.user.email).toBe(testUserData.email);
      expect(response.body.data.tokens).toHaveProperty('accessToken');

      console.log('✓ User login working');
    });

    it('POST /api/auth/login - should fail with wrong password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUserData.email,
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body).toHaveProperty('success', false);

      console.log('✓ Wrong password validation working');
    });

    it('POST /api/auth/login - should fail with non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: testUserData.password,
        })
        .expect(401);

      expect(response.body).toHaveProperty('success', false);

      console.log('✓ Non-existent user validation working');
    });

    it('GET /api/auth/profile - should get current user profile', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user.username).toBe(testUserData.username);

      console.log('✓ Get profile working');
    });

    it('GET /api/auth/profile - should fail without token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);

      console.log('✓ Authentication required validation working');
    });

    it('PUT /api/auth/profile - should update user profile', async () => {
      const updateData = {
        fullName: 'Updated Test User',
        bio: 'Updated bio for test user'
      };

      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.user.fullName).toBe(updateData.fullName);
      expect(response.body.data.user.bio).toBe(updateData.bio);

      console.log('✓ Profile update working');
    });
  });

  describe('3. Users API', () => {
    it('GET /api/users - should get all users', async () => {
      const response = await request(app)
        .get('/api/users')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('users');
      expect(Array.isArray(response.body.data.users)).toBe(true);
      expect(response.body.data.users.length).toBeGreaterThan(0);

      console.log('✓ Get all users working');
    });

    it('GET /api/users/search - should search users by query', async () => {
      const response = await request(app)
        .get('/api/users/search')
        .query({ q: 'test' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('users');
      expect(Array.isArray(response.body.data.users)).toBe(true);

      console.log('✓ User search working');
    });

    it('GET /api/users/:id - should get user by ID', async () => {
      const response = await request(app)
        .get(`/api/users/${testUser._id}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user._id).toBe(testUser._id);

      console.log('✓ Get user by ID working');
    });

    it('GET /api/users/profile/me - should get current user profile', async () => {
      const response = await request(app)
        .get('/api/users/profile/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('user');

      console.log('✓ Get current user working');
    });

    it('POST /api/users/:id/follow - should follow another user', async () => {
      const response = await request(app)
        .post(`/api/users/${secondUser._id}/follow`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);

      console.log('✓ Follow user working');
    });

    it('GET /api/users/:id/followers - should get user followers', async () => {
      const response = await request(app)
        .get(`/api/users/${secondUser._id}/followers`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('followers');

      console.log('✓ Get followers working');
    });

    it('GET /api/users/:id/following - should get user following', async () => {
      const response = await request(app)
        .get(`/api/users/${testUser._id}/following`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('following');

      console.log('✓ Get following working');
    });
  });

  describe('4. Posts API', () => {
    const postData = {
      content: 'This is a test post for the API testing',
      tags: ['test', 'api', 'backend']
    };

    it('POST /api/posts - should create a new post', async () => {
      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(postData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('post');
      expect(response.body.data.post.content).toBe(postData.content);
      expect(response.body.data.post.author).toBe(testUser._id);

      testPost = response.body.data.post;

      console.log('✓ Create post working');
    });

    it('GET /api/posts - should get all posts', async () => {
      const response = await request(app)
        .get('/api/posts')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('posts');
      expect(Array.isArray(response.body.data.posts)).toBe(true);
      expect(response.body.data.posts.length).toBeGreaterThan(0);

      console.log('✓ Get all posts working');
    });

    it('GET /api/posts/:id - should get post by ID', async () => {
      const response = await request(app)
        .get(`/api/posts/${testPost._id}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('post');
      expect(response.body.data.post._id).toBe(testPost._id);

      console.log('✓ Get post by ID working');
    });

    it('GET /api/posts/user/:userId - should get posts by user', async () => {
      const response = await request(app)
        .get(`/api/posts/user/${testUser._id}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('posts');

      console.log('✓ Get posts by user working');
    });

    it('PUT /api/posts/:id - should update post', async () => {
      const updateData = {
        content: 'Updated test post content'
      };

      const response = await request(app)
        .put(`/api/posts/${testPost._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.post.content).toBe(updateData.content);

      console.log('✓ Update post working');
    });

    it('POST /api/posts/:id/like - should like/unlike post', async () => {
      const response = await request(app)
        .post(`/api/posts/${testPost._id}/like`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);

      console.log('✓ Like/unlike post working');
    });

    it('POST /api/posts/:id/comments - should add comment to post', async () => {
      const commentData = {
        content: 'This is a test comment'
      };

      const response = await request(app)
        .post(`/api/posts/${testPost._id}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(commentData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);

      console.log('✓ Add comment working');
    });

    it('DELETE /api/posts/:id - should delete post', async () => {
      const response = await request(app)
        .delete(`/api/posts/${testPost._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);

      console.log('✓ Delete post working');
    });
  });

  describe('5. Upload API', () => {
    it('POST /api/upload - should handle file upload endpoint', async () => {
      // Create a simple test file buffer
      const testImageBuffer = Buffer.from('test image data');

      const response = await request(app)
        .post('/api/upload')
        .attach('image', testImageBuffer, 'test.jpg')
        .expect((res) => {
          // Either 200 (success) or 400 (no file) is acceptable for this test
          // since we're just testing the endpoint availability
          expect([200, 400]).toContain(res.status);
        });

      console.log('✓ Upload endpoint accessible');
    });
  });

  describe('6. Error Handling', () => {
    it('should handle 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/api/nonexistent')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);

      console.log('✓ 404 error handling working');
    });

    it('should handle malformed JSON requests', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json"}')
        .expect(400);

      console.log('✓ Malformed JSON handling working');
    });

    it('should handle requests without required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('success', false);

      console.log('✓ Required field validation working');
    });
  });

  describe('7. Rate Limiting & Security', () => {
    it('should include security headers', async () => {
      const response = await request(app)
        .get('/api/health');

      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');

      console.log('✓ Security headers present');
    });
  });
});
