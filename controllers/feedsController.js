const { v4: uuidv4 } = require('uuid');
const feedsData = require('../data/feeds');
const FileStorage = require('../utils/fileStorage');

// In-memory storage (synchronized with file)
let feeds = [...feedsData];

class FeedsController {
  // Initialize feeds from file
  static initializeFeeds() {
    try {
      const fileFeeds = FileStorage.loadFeedsFromFile();
      feeds.length = 0; // Clear existing array
      feeds.push(...fileFeeds); // Add all feeds from file
      console.log(`Initialized ${feeds.length} feeds from file`);
    } catch (error) {
      console.error('Error initializing feeds:', error);
    }
  }

  // Get all feeds with optional filtering and pagination
  static getAllFeeds(req, res) {
    try {
      const { category, limit = 10, offset = 0, search } = req.query;
      
      let filteredFeeds = feeds;
      
      // Filter by category if provided
      if (category && category !== 'all') {
        filteredFeeds = feeds.filter(feed => 
          feed.category.toLowerCase() === category.toLowerCase()
        );
      }
      
      // Search functionality
      if (search) {
        const searchTerm = search.toLowerCase();
        filteredFeeds = filteredFeeds.filter(feed =>
          feed.content.toLowerCase().includes(searchTerm) ||
          feed.author.toLowerCase().includes(searchTerm) ||
          feed.tags.some(tag => tag.toLowerCase().includes(searchTerm))
        );
      }
      
      // Sort by creation date (newest first)
      filteredFeeds.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      // Apply pagination
      const startIndex = parseInt(offset);
      const endIndex = startIndex + parseInt(limit);
      const paginatedFeeds = filteredFeeds.slice(startIndex, endIndex);
      
      res.json({
        success: true,
        data: paginatedFeeds,
        pagination: {
          total: filteredFeeds.length,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: endIndex < filteredFeeds.length
        },
        filters: {
          category: category || 'all',
          search: search || null
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching feeds',
        error: error.message
      });
    }
  }

  // Get feed by ID
  static getFeedById(req, res) {
    try {
      const { id } = req.params;
      const feed = feeds.find(f => f.id === id);
      
      if (!feed) {
        return res.status(404).json({
          success: false,
          message: 'Feed not found'
        });
      }
      
      res.json({
        success: true,
        data: feed
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching feed',
        error: error.message
      });
    }
  }

  // Create new feed
  static createFeed(req, res) {
    try {
      const { author, authorRole, content, category, tags } = req.body;
      
      // Validation
      if (!author || !content) {
        return res.status(400).json({
          success: false,
          message: 'Author and content are required'
        });
      }
      
      const now = new Date();
      const newFeed = {
        id: uuidv4(),
        author: author.trim(),
        authorRole: authorRole || "User",
        timestamp: "now",
        content: content.trim(),
        category: category || "General",
        likes: 0,
        comments: 0,
        tags: Array.isArray(tags) ? tags : [],
        images: req.processedImages || [], // Add processed images
        createdAt: now,
        updatedAt: now
      };
      
      feeds.unshift(newFeed); // Add to beginning of array
      
      // Save to file for persistence
      FileStorage.saveFeedsToFile(feeds);
      
      res.status(201).json({
        success: true,
        data: newFeed,
        message: 'Feed created successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error creating feed',
        error: error.message
      });
    }
  }

  // Update feed content
  static updateFeed(req, res) {
    try {
      const { id } = req.params;
      const { content, category, tags } = req.body;
      
      const feedIndex = feeds.findIndex(f => f.id === id);
      
      if (feedIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'Feed not found'
        });
      }
      
      // Update feed
      if (content) feeds[feedIndex].content = content.trim();
      if (category) feeds[feedIndex].category = category;
      if (tags && Array.isArray(tags)) feeds[feedIndex].tags = tags;
      feeds[feedIndex].updatedAt = new Date();
      
      res.json({
        success: true,
        data: feeds[feedIndex],
        message: 'Feed updated successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error updating feed',
        error: error.message
      });
    }
  }

  // Like a feed
  static likeFeed(req, res) {
    try {
      const { id } = req.params;
      const feedIndex = feeds.findIndex(f => f.id === id);
      
      if (feedIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'Feed not found'
        });
      }
      
      feeds[feedIndex].likes += 1;
      feeds[feedIndex].updatedAt = new Date();
      
      // Save to file for persistence
      FileStorage.saveFeedsToFile(feeds);
      
      res.json({
        success: true,
        data: feeds[feedIndex],
        message: 'Feed liked successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error liking feed',
        error: error.message
      });
    }
  }

  // Unlike a feed
  static unlikeFeed(req, res) {
    try {
      const { id } = req.params;
      const feedIndex = feeds.findIndex(f => f.id === id);
      
      if (feedIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'Feed not found'
        });
      }
      
      if (feeds[feedIndex].likes > 0) {
        feeds[feedIndex].likes -= 1;
        feeds[feedIndex].updatedAt = new Date();
      }
      
      // Save to file for persistence
      FileStorage.saveFeedsToFile(feeds);
      
      res.json({
        success: true,
        data: feeds[feedIndex],
        message: 'Feed unliked successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error unliking feed',
        error: error.message
      });
    }
  }

  // Delete feed
  static deleteFeed(req, res) {
    try {
      const { id } = req.params;
      const feedIndex = feeds.findIndex(f => f.id === id);
      
      if (feedIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'Feed not found'
        });
      }
      
      const deletedFeed = feeds.splice(feedIndex, 1)[0];
      
      // Save to file for persistence
      FileStorage.saveFeedsToFile(feeds);
      
      res.json({
        success: true,
        data: deletedFeed,
        message: 'Feed deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error deleting feed',
        error: error.message
      });
    }
  }

  // Get all categories
  static getCategories(req, res) {
    try {
      const categories = [...new Set(feeds.map(feed => feed.category))];
      res.json({
        success: true,
        data: categories.sort()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching categories',
        error: error.message
      });
    }
  }

  // Get feed statistics
  static getFeedStats(req, res) {
    try {
      const stats = {
        totalFeeds: feeds.length,
        totalLikes: feeds.reduce((sum, feed) => sum + feed.likes, 0),
        totalComments: feeds.reduce((sum, feed) => sum + feed.comments, 0),
        categoriesCount: [...new Set(feeds.map(feed => feed.category))].length,
        topCategories: this.getTopCategories(),
        recentActivity: feeds.slice(0, 5).map(feed => ({
          id: feed.id,
          author: feed.author,
          timestamp: feed.timestamp,
          likes: feed.likes
        }))
      };

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching feed statistics',
        error: error.message
      });
    }
  }

  // Helper method to get top categories
  static getTopCategories() {
    const categoryCount = {};
    feeds.forEach(feed => {
      categoryCount[feed.category] = (categoryCount[feed.category] || 0) + 1;
    });

    return Object.entries(categoryCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([category, count]) => ({ category, count }));
  }
}

module.exports = FeedsController;
