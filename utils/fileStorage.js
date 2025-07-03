const fs = require('fs');
const path = require('path');

class FileStorage {
  static saveFeedsToFile(feeds) {
    try {
      const feedsFilePath = path.join(__dirname, '../data/feeds.js');
      
      // Create the file content
      const fileContent = `const { v4: uuidv4 } = require('uuid');

// Sample feeds data
const feeds = ${JSON.stringify(feeds, null, 2)};

module.exports = feeds;`;

      // Write to file
      fs.writeFileSync(feedsFilePath, fileContent, 'utf8');
      console.log('Feeds saved to file successfully');
      return true;
    } catch (error) {
      console.error('Error saving feeds to file:', error);
      return false;
    }
  }

  static loadFeedsFromFile() {
    try {
      // Clear the require cache to get fresh data
      const feedsFilePath = path.join(__dirname, '../data/feeds.js');
      delete require.cache[require.resolve(feedsFilePath)];
      
      // Reload the feeds data
      const feedsData = require('../data/feeds');
      return feedsData;
    } catch (error) {
      console.error('Error loading feeds from file:', error);
      return [];
    }
  }

  static initializeFeeds() {
    try {
      const feedsData = this.loadFeedsFromFile();
      console.log(`Loaded ${feedsData.length} feeds from file`);
      return feedsData;
    } catch (error) {
      console.error('Error initializing feeds:', error);
      return [];
    }
  }
}

module.exports = FileStorage;
