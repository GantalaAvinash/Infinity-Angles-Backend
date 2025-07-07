const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  content: {
    type: String,
    required: [true, 'Content is required'],
    trim: true,
    maxLength: [1000, 'Content must be less than 1000 characters']
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Author is required']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['Ideologies', 'Ideas', 'Inventions', 'Innovations', 'Businesses', 'Ventures', 'Startups', 'Companies', 'Branches', 'Investments', 'Partnerships', 'Networth', 'General'],
    default: 'Ideas'
  },
  tags: [{
    type: String,
    trim: true,
    maxLength: [30, 'Tag must be less than 30 characters']
  }],
  images: [{
    id: {
      type: String,
      required: true
    },
    url: {
      type: String,
      required: true
    },
    thumbnails: {
      small: {
        url: String,
        width: Number,
        height: Number
      },
      medium: {
        url: String,
        width: Number,
        height: Number
      },
      large: {
        url: String,
        width: Number,
        height: Number
      }
    }
  }],
  likes: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    likedAt: {
      type: Date,
      default: Date.now
    }
  }],
  likesCount: {
    type: Number,
    default: 0
  },
  commentsCount: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  expiresAt: {
    type: Date,
    default: Date.now,
    index: { expireAfterSeconds: 86400 } // 24 hours TTL index
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ category: 1, createdAt: -1 });
postSchema.index({ createdAt: -1 });
// TTL index already defined in schema field definition

// Virtual for comments
postSchema.virtual('comments', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'post'
});

// Update likes count when likes array changes
postSchema.pre('save', function(next) {
  if (this.isModified('likes')) {
    this.likesCount = this.likes.length;
  }
  next();
});

// Set expiration date to 24 hours from creation
postSchema.pre('save', function(next) {
  if (this.isNew) {
    const twentyFourHours = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    this.expiresAt = new Date(Date.now() + twentyFourHours);
  }
  next();
});

// Method to check if user has liked the post
postSchema.methods.isLikedBy = function(userId) {
  return this.likes.some(like => like.user.toString() === userId.toString());
};

// Method to toggle like
postSchema.methods.toggleLike = function(userId) {
  const existingLikeIndex = this.likes.findIndex(
    like => like.user.toString() === userId.toString()
  );
  
  if (existingLikeIndex > -1) {
    // Unlike - remove the like
    this.likes.splice(existingLikeIndex, 1);
    return false; // Unliked
  } else {
    // Like - add the like
    this.likes.push({ user: userId });
    return true; // Liked
  }
};

module.exports = mongoose.model('Post', postSchema);
