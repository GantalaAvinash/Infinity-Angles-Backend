#!/usr/bin/env node

// Test script to debug login validation issues
const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function testLogin(email, password, testName) {
  console.log(`\n🧪 Test: ${testName}`);
  console.log(`📧 Email: ${email}`);
  console.log(`🔐 Password: ${password}`);
  
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email,
      password
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      validateStatus: function (status) {
        return true; // Accept any status code
      }
    });

    console.log(`✅ Status: ${response.status}`);
    console.log(`📄 Response:`, JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error) {
    console.log(`❌ Error:`, error.message);
    if (error.response) {
      console.log(`📄 Error Response:`, JSON.stringify(error.response.data, null, 2));
    }
    return null;
  }
}

async function testLogout(accessToken) {
  console.log(`\n🚪 Testing logout...`);
  
  try {
    const response = await axios.post(`${BASE_URL}/auth/logout`, {}, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      validateStatus: function (status) {
        return true;
      }
    });

    console.log(`✅ Logout Status: ${response.status}`);
    console.log(`📄 Logout Response:`, JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error) {
    console.log(`❌ Logout Error:`, error.message);
    return null;
  }
}

async function runTest() {
  // Test with a known email - replace with actual test email
  const testEmail = 'test@example.com';
  const testPassword = 'TestPassword123!';
  
  console.log('🔍 Testing login validation issue...');
  
  // First login attempt
  const firstLogin = await testLogin(testEmail, testPassword, 'First Login');
  
  if (firstLogin && firstLogin.success && firstLogin.data.accessToken) {
    console.log('✅ First login successful!');
    
    // Logout
    await testLogout(firstLogin.data.accessToken);
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Second login attempt
    const secondLogin = await testLogin(testEmail, testPassword, 'Second Login (After Logout)');
    
    if (secondLogin && secondLogin.success) {
      console.log('✅ Second login successful!');
    } else {
      console.log('❌ Second login failed!');
    }
  } else {
    console.log('❌ First login failed!');
  }
}

// Check if server is running
axios.get(`${BASE_URL}/health`)
  .then(() => {
    console.log('🟢 Server is running, starting tests...');
    runTest();
  })
  .catch(() => {
    console.log('🔴 Server is not running. Please start the server first.');
    console.log('Run: npm start');
  });
