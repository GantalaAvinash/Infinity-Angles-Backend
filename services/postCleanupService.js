const cron = require('node-cron');
const Post = require('../models/Post');
const User = require('../models/User');

class PostCleanupService {
  static start() {
    // Run cleanup every hour (0 minutes of every hour)
    cron.schedule('0 * * * *', async () => {
      try {
        console.log('🧹 Starting post cleanup service...');
        await this.cleanupExpiredPosts();
        console.log('✅ Post cleanup completed');
      } catch (error) {
        console.error('❌ Post cleanup failed:', error);
      }
    });

    // Also run cleanup on service start
    setTimeout(async () => {
      try {
        console.log('🧹 Running initial post cleanup...');
        await this.cleanupExpiredPosts();
        console.log('✅ Initial post cleanup completed');
      } catch (error) {
        console.error('❌ Initial post cleanup failed:', error);
      }
    }, 5000); // Wait 5 seconds after service start

    console.log('⏰ Post cleanup service started - will run every hour');
  }

  static async cleanupExpiredPosts() {
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      // Find posts older than 24 hours that are still active
      const expiredPosts = await Post.find({
        createdAt: { $lt: twentyFourHoursAgo },
        isActive: true
      });

      if (expiredPosts.length === 0) {
        console.log('📝 No expired posts found');
        return;
      }

      console.log(`📝 Found ${expiredPosts.length} expired posts to cleanup`);

      // Get unique author IDs for updating post counts
      const authorIds = [...new Set(expiredPosts.map(post => post.author.toString()))];

      // Mark posts as inactive (soft delete)
      const result = await Post.updateMany(
        {
          createdAt: { $lt: twentyFourHoursAgo },
          isActive: true
        },
        {
          isActive: false,
          deletedAt: new Date()
        }
      );

      console.log(`🗑️ Marked ${result.modifiedCount} posts as inactive`);

      // Update post counts for affected users
      for (const authorId of authorIds) {
        const activePostCount = await Post.countDocuments({
          author: authorId,
          isActive: true
        });

        await User.findByIdAndUpdate(authorId, {
          postsCount: activePostCount
        });
      }

      console.log(`👥 Updated post counts for ${authorIds.length} users`);

      // Optional: Actually delete posts older than 7 days (hard delete)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const hardDeleteResult = await Post.deleteMany({
        createdAt: { $lt: sevenDaysAgo },
        isActive: false
      });

      if (hardDeleteResult.deletedCount > 0) {
        console.log(`🔥 Permanently deleted ${hardDeleteResult.deletedCount} old posts`);
      }

      return {
        softDeleted: result.modifiedCount,
        hardDeleted: hardDeleteResult.deletedCount,
        usersUpdated: authorIds.length
      };

    } catch (error) {
      console.error('❌ Error in cleanupExpiredPosts:', error);
      throw error;
    }
  }

  // Manual cleanup trigger (for admin use)
  static async manualCleanup() {
    try {
      console.log('🧹 Manual post cleanup triggered...');
      const result = await this.cleanupExpiredPosts();
      console.log('✅ Manual post cleanup completed:', result);
      return result;
    } catch (error) {
      console.error('❌ Manual post cleanup failed:', error);
      throw error;
    }
  }

  // Get cleanup statistics
  static async getCleanupStats() {
    try {
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const stats = {
        activePosts: await Post.countDocuments({ isActive: true }),
        inactivePosts: await Post.countDocuments({ isActive: false }),
        postsExpiringSoon: await Post.countDocuments({
          createdAt: { $lt: twentyFourHoursAgo },
          isActive: true
        }),
        postsEligibleForHardDelete: await Post.countDocuments({
          createdAt: { $lt: sevenDaysAgo },
          isActive: false
        })
      };

      return stats;
    } catch (error) {
      console.error('❌ Error getting cleanup stats:', error);
      throw error;
    }
  }
}

module.exports = PostCleanupService;
