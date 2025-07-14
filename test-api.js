#!/usr/bin/env node

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000/api';
let authToken = '';
let testUserId = '';
let testPostId = '';
let secondAuthToken = '';
let secondUserId = '';

// Test results
const testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
};

// Helper function to log test results
function logTest(testName, success, details = '') {
  testResults.total++;
  if (success) {
    testResults.passed++;
    console.log(`✅ ${testName}`);
  } else {
    testResults.failed++;
    console.log(`❌ ${testName} - ${details}`);
  }
  testResults.details.push({ testName, success, details });
}

// Helper function to make API requests
async function apiRequest(method, endpoint, data = null, headers = {}) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status || 500
    };
  }
}

// Test functions
async function testHealthCheck() {
  console.log('\\n🔍 Testing Health Check API...');
  
  const result = await apiRequest('GET', '/health');
  logTest('GET /health - Basic health check', result.success && result.status === 200);
  
  if (result.success) {
    logTest('Health response structure', 
      result.data.success === true && 
      result.data.data && 
      result.data.data.status === 'healthy'
    );
  }
}

async function testAuthentication() {
  console.log('\\n🔐 Testing Authentication API...');
  
  // Test user registration
  const userData = {
    username: 'testuser123',
    email: 'test@infinityangles.com',
    password: 'TestPassword123!',
    fullName: 'Test User'
  };
  
  const registerResult = await apiRequest('POST', '/auth/register', userData);
  logTest('POST /auth/register - User registration', registerResult.success && registerResult.status === 201);
  
  if (registerResult.success) {
    authToken = registerResult.data.data.tokens.accessToken;
    testUserId = registerResult.data.data.user._id;
    logTest('Registration returns access token', !!authToken);
    logTest('Registration returns user data', !!registerResult.data.data.user);
  }
  
  // Test duplicate registration
  const duplicateResult = await apiRequest('POST', '/auth/register', userData);
  logTest('POST /auth/register - Duplicate email rejected', !duplicateResult.success && duplicateResult.status === 409);
  
  // Test user login
  const loginData = {
    email: userData.email,
    password: userData.password
  };
  
  const loginResult = await apiRequest('POST', '/auth/login', loginData);
  logTest('POST /auth/login - User login', loginResult.success && loginResult.status === 200);
  
  // Test wrong password
  const wrongPasswordResult = await apiRequest('POST', '/auth/login', {
    email: userData.email,
    password: 'wrongpassword'
  });
  logTest('POST /auth/login - Wrong password rejected', !wrongPasswordResult.success && wrongPasswordResult.status === 401);
  
  // Test get profile
  const profileResult = await apiRequest('GET', '/auth/profile', null, {
    'Authorization': `Bearer ${authToken}`
  });
  logTest('GET /auth/profile - Get user profile', profileResult.success && profileResult.status === 200);
  
  // Test profile update
  const updateData = {
    fullName: 'Updated Test User',
    bio: 'Updated bio for testing'
  };
  
  const updateResult = await apiRequest('PUT', '/auth/profile', updateData, {
    'Authorization': `Bearer ${authToken}`
  });
  logTest('PUT /auth/profile - Update profile', updateResult.success && updateResult.status === 200);
  
  // Register second user for follow testing
  const secondUserData = {
    username: 'testuser456',
    email: 'test2@infinityangles.com',
    password: 'TestPassword456!',
    fullName: 'Second Test User'
  };
  
  const secondRegisterResult = await apiRequest('POST', '/auth/register', secondUserData);
  if (secondRegisterResult.success) {
    secondAuthToken = secondRegisterResult.data.data.tokens.accessToken;
    secondUserId = secondRegisterResult.data.data.user._id;
  }
}

async function testUsers() {
  console.log('\\n👥 Testing Users API...');
  
  // Test get all users
  const usersResult = await apiRequest('GET', '/users');
  logTest('GET /users - Get all users', usersResult.success && usersResult.status === 200);
  
  // Test search users
  const searchResult = await apiRequest('GET', '/users/search?q=test');
  logTest('GET /users/search - Search users', searchResult.success && searchResult.status === 200);
  
  // Test get user by ID
  const userByIdResult = await apiRequest('GET', `/users/${testUserId}`);
  logTest('GET /users/:id - Get user by ID', userByIdResult.success && userByIdResult.status === 200);
  
  // Test get current user
  const currentUserResult = await apiRequest('GET', '/users/profile/me', null, {
    'Authorization': `Bearer ${authToken}`
  });
  logTest('GET /users/profile/me - Get current user', currentUserResult.success && currentUserResult.status === 200);
  
  // Test follow user
  if (secondUserId) {
    const followResult = await apiRequest('POST', `/users/${secondUserId}/follow`, null, {
      'Authorization': `Bearer ${authToken}`
    });
    logTest('POST /users/:id/follow - Follow user', followResult.success && followResult.status === 200);
    
    // Test get followers
    const followersResult = await apiRequest('GET', `/users/${secondUserId}/followers`);
    logTest('GET /users/:id/followers - Get followers', followersResult.success && followersResult.status === 200);
    
    // Test get following
    const followingResult = await apiRequest('GET', `/users/${testUserId}/following`);
    logTest('GET /users/:id/following - Get following', followingResult.success && followingResult.status === 200);
  }
}

async function testPosts() {
  console.log('\\n📝 Testing Posts API...');
  
  // Test create post
  const postData = {
    content: 'This is a test post for API testing',
    tags: ['test', 'api', 'backend']
  };
  
  const createPostResult = await apiRequest('POST', '/posts', postData, {
    'Authorization': `Bearer ${authToken}`
  });
  logTest('POST /posts - Create post', createPostResult.success && createPostResult.status === 201);
  
  if (createPostResult.success) {
    testPostId = createPostResult.data.data.post._id;
  }
  
  // Test get all posts
  const postsResult = await apiRequest('GET', '/posts');
  logTest('GET /posts - Get all posts', postsResult.success && postsResult.status === 200);
  
  // Test get post by ID
  if (testPostId) {
    const postByIdResult = await apiRequest('GET', `/posts/${testPostId}`);
    logTest('GET /posts/:id - Get post by ID', postByIdResult.success && postByIdResult.status === 200);
    
    // Test update post
    const updatePostData = {
      content: 'Updated test post content'
    };
    
    const updatePostResult = await apiRequest('PUT', `/posts/${testPostId}`, updatePostData, {
      'Authorization': `Bearer ${authToken}`
    });
    logTest('PUT /posts/:id - Update post', updatePostResult.success && updatePostResult.status === 200);
    
    // Test like post
    const likeResult = await apiRequest('POST', `/posts/${testPostId}/like`, null, {
      'Authorization': `Bearer ${authToken}`
    });
    logTest('POST /posts/:id/like - Like post', likeResult.success && likeResult.status === 200);
    
    // Test add comment
    const commentData = {
      content: 'This is a test comment'
    };
    
    const commentResult = await apiRequest('POST', `/posts/${testPostId}/comments`, commentData, {
      'Authorization': `Bearer ${authToken}`
    });
    logTest('POST /posts/:id/comments - Add comment', commentResult.success && commentResult.status === 201);
  }
  
  // Test get posts by user
  const userPostsResult = await apiRequest('GET', `/posts/user/${testUserId}`);
  logTest('GET /posts/user/:userId - Get posts by user', userPostsResult.success && userPostsResult.status === 200);
}

async function testUpload() {
  console.log('\\n📎 Testing Upload API...');
  
  // Test upload endpoint (without actual file for basic test)
  const uploadResult = await apiRequest('POST', '/upload');
  logTest('POST /upload - Upload endpoint accessible', uploadResult.status === 400); // Should fail without file
}

async function testErrorHandling() {
  console.log('\\n🚨 Testing Error Handling...');
  
  // Test 404
  const notFoundResult = await apiRequest('GET', '/nonexistent');
  logTest('GET /nonexistent - 404 handling', !notFoundResult.success && notFoundResult.status === 404);
  
  // Test unauthorized access
  const unauthorizedResult = await apiRequest('GET', '/auth/profile');
  logTest('GET /auth/profile without token - 401 handling', !unauthorizedResult.success && notFoundResult.status === 401);
  
  // Test invalid JSON
  try {
    const invalidJsonResult = await axios.post(`${BASE_URL}/auth/login`, '{"invalid": json"}', {
      headers: { 'Content-Type': 'application/json' }
    });
    logTest('POST with invalid JSON - 400 handling', false);
  } catch (error) {
    logTest('POST with invalid JSON - 400 handling', error.response?.status === 400);
  }
}

async function cleanup() {
  console.log('\\n🧹 Cleaning up test data...');
  
  // Delete test post
  if (testPostId) {
    const deleteResult = await apiRequest('DELETE', `/posts/${testPostId}`, null, {
      'Authorization': `Bearer ${authToken}`
    });
    logTest('DELETE /posts/:id - Delete post', deleteResult.success && deleteResult.status === 200);
  }
}

async function runTests() {
  console.log('🚀 Starting Infinity Angles API Test Suite');
  console.log(`📡 Testing API at: ${BASE_URL}`);
  console.log('⏰ Starting tests at:', new Date().toISOString());
  
  try {
    await testHealthCheck();
    await testAuthentication();
    await testUsers();
    await testPosts();
    await testUpload();
    await testErrorHandling();
    await cleanup();
    
    console.log('\\n' + '='.repeat(60));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`📝 Total:  ${testResults.total}`);
    console.log(`📈 Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
    
    if (testResults.failed === 0) {
      console.log('\\n🎉 All tests passed! API is working correctly.');
    } else {
      console.log('\\n⚠️  Some tests failed. Please check the details above.');
    }
    
    console.log('\\n⏰ Tests completed at:', new Date().toISOString());
    
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\\n\\n🛑 Test suite interrupted');
  process.exit(0);
});

// Run the tests
runTests().catch(console.error);
