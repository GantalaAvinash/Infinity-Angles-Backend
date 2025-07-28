import mongoose, { Schema } from 'mongoose';
import { IPost } from '@/types';

const postSchema = new Schema<IPost>({
  title: {
    type: String,
    trim: true,
  },
  content: {
    type: String,
  },
  author: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  images: [{
    type: String,
  }],
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
  }],
  location: {
    name: {
      type: String,
      trim: true,
    },
    coordinates: {
      type: [Number],
    }
  },
  category: {
    type: String,
    trim: true,
  },
  status: {
    isPublished: {
      type: Boolean,
      default: true,
    },
    isDraft: {
      type: Boolean,
      default: false,
    },
  },
  likes: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: [],
  }],
  comments: [{
    _id: { type: Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId() },
    author: { type: Schema.Types.ObjectId, ref: 'User' },
    content: String,
    createdAt: { type: Date, default: Date.now },
    likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    likesCount: { type: Number, default: 0 },
  }],
  metadata: {
    likesCount: {
      type: Number,
      default: 0,
    },
    commentsCount: {
      type: Number,
      default: 0,
    },
    sharesCount: {
      type: Number,
      default: 0,
    },
    viewsCount: {
      type: Number,
      default: 0,
    },
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes
postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ createdAt: -1 });
postSchema.index({ tags: 1 });
postSchema.index({ 'status.isPublished': 1, 'status.isDraft': 1 });
postSchema.index({ 'metadata.likesCount': -1 });
postSchema.index({ 'location.coordinates': '2dsphere' });

// Text search index
postSchema.index({
  title: 'text',
  content: 'text',
  tags: 'text'
}, {
  weights: {
    title: 10,
    content: 5,
    tags: 3
  }
});

postSchema.pre('save', async function(next) {
  if (this.isNew && !this.status.isDraft) {
    try {
      await mongoose.model('User').findByIdAndUpdate(
        this.author,
        { $inc: { 'stats.postsCount': 1 } }
      );
    } catch (error) {
      // Don't fail the post save if user update fails
      console.error('Error updating user post count:', error);
    }
  }
  next();
});

// Pre-remove middleware to update author's post count
postSchema.pre('findOneAndDelete', async function(next) {
  try {
    const post = await this.model.findOne(this.getQuery());
    if (post && !post.status.isDraft) {
      await mongoose.model('User').findByIdAndUpdate(
        post.author,
        { $inc: { 'stats.postsCount': -1 } }
      );
    }
  } catch (error) {
    console.error('Error updating user post count on delete:', error);
  }
  next();
});

// Static method to get trending posts
postSchema.statics.getTrending = async function(limit: number = 10, timeframe: number = 7) {
  const since = new Date();
  since.setDate(since.getDate() - timeframe);

  return this.find({
    'status.isPublished': true,
    'status.isDraft': false,
    createdAt: { $gte: since }
  })
  .sort({
    'metadata.likesCount': -1,
    'metadata.commentsCount': -1,
    'metadata.viewsCount': -1
  })
  .limit(limit)
  .populate('author', 'username fullName avatar isVerified');
};

// Static method to get posts by location
postSchema.statics.getNearby = async function(
  longitude: number, 
  latitude: number, 
  maxDistance: number = 1000, // meters
  limit: number = 20
) {
  return this.find({
    'status.isPublished': true,
    'status.isDraft': false,
    'location.coordinates': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        $maxDistance: maxDistance
      }
    }
  })
  .limit(limit)
  .populate('author', 'username fullName avatar isVerified');
};

// Static method to search posts
postSchema.statics.search = async function(
  query: string,
  options: {
    page?: number;
    limit?: number;
    tags?: string[];
    authorId?: string;
    since?: Date;
  } = {}
) {
  const {
    page = 1,
    limit = 20,
    tags,
    authorId,
    since
  } = options;

  const searchQuery: any = {
    'status.isPublished': true,
    'status.isDraft': false,
    $text: { $search: query }
  };

  if (tags && tags.length > 0) {
    searchQuery.tags = { $in: tags };
  }

  if (authorId) {
    searchQuery.author = authorId;
  }

  if (since) {
    searchQuery.createdAt = { $gte: since };
  }

  return this.find(searchQuery)
    .score({ score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('author', 'username fullName avatar isVerified');
};

// Instance method to increment view count
postSchema.methods.incrementViews = async function() {
  this.metadata.viewsCount += 1;
  await this.save({ validateBeforeSave: false });
};

// Instance method to update like count
postSchema.methods.updateLikeCount = async function() {
  const likeCount = await mongoose.model('Like').countDocuments({
    target: this._id,
    targetType: 'post'
  });
  
  this.metadata.likesCount = likeCount;
  await this.save({ validateBeforeSave: false });
};

// Instance method to update comment count
postSchema.methods.updateCommentCount = async function() {
  const commentCount = await mongoose.model('Comment').countDocuments({
    post: this._id
  });
  
  this.metadata.commentsCount = commentCount;
  await this.save({ validateBeforeSave: false });
};

const Post = mongoose.model<IPost>('Post', postSchema);

export default Post;
