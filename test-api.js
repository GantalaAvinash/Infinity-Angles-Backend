#!/usr/bin/env node

// Simple CLI tool to test the feeds API
const fetch = require('node-fetch');

const API_BASE_URL = 'http://localhost:3000/api';

const commands = {
  async health() {
    try {
      const response = await fetch('http://localhost:3000/health');
      const data = await response.json();
      console.log('✅ Health Check:', data);
    } catch (error) {
      console.error('❌ Health Check Failed:', error.message);
    }
  },

  async feeds() {
    try {
      const response = await fetch(`${API_BASE_URL}/feeds`);
      const data = await response.json();
      console.log('📄 Feeds:', JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('❌ Feeds Failed:', error.message);
    }
  },

  async categories() {
    try {
      const response = await fetch(`${API_BASE_URL}/categories`);
      const data = await response.json();
      console.log('📂 Categories:', JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('❌ Categories Failed:', error.message);
    }
  },

  async create() {
    try {
      const sampleFeed = {
        author: "Test User",
        authorRole: "Developer",
        content: "This is a test feed created via CLI",
        category: "Test",
        tags: ["test", "cli", "api"]
      };

      const response = await fetch(`${API_BASE_URL}/feeds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sampleFeed)
      });

      const data = await response.json();
      console.log('✅ Feed Created:', JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('❌ Create Feed Failed:', error.message);
    }
  },

  help() {
    console.log(`
🚀 Feeds API Test CLI

Commands:
  health     - Check if the backend is running
  feeds      - Get all feeds
  categories - Get all categories
  create     - Create a test feed
  help       - Show this help message

Usage:
  node test-api.js <command>

Examples:
  node test-api.js health
  node test-api.js feeds
  node test-api.js categories
  node test-api.js create
    `);
  }
};

// Parse command line arguments
const command = process.argv[2];

if (!command || !commands[command]) {
  commands.help();
  process.exit(1);
}

// Execute the command
commands[command]();
