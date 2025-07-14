import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import { IUser } from '@/types';
import { config } from '@/config';

const userSchema = new Schema<IUser>({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minLength: [3, 'Username must be at least 3 characters long'],
    maxLength: [30, 'Username must be less than 30 characters'],
    match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'],
    index: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      'Please provide a valid email address',
    ],
    index: true,
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minLength: [8, 'Password must be at least 8 characters long'],
    select: false, // Don't include password in queries by default
  },
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
    maxLength: [100, 'Full name must be less than 100 characters'],
  },
  bio: {
    type: String,
    default: '',
    maxLength: [500, 'Bio must be less than 500 characters'],
  },
  avatar: {
    type: String,
    default: '',
  },
  coverImage: {
    type: String,
    default: '',
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'moderator'],
    default: 'user',
  },
  socialLinks: {
    website: {
      type: String,
      default: '',
      match: [/^https?:\/\/.+\..+$/, 'Please provide a valid website URL'],
    },
    twitter: {
      type: String,
      default: '',
    },
    instagram: {
      type: String,
      default: '',
    },
    linkedin: {
      type: String,
      default: '',
    },
  },
  settings: {
    isPrivate: {
      type: Boolean,
      default: false,
    },
    emailNotifications: {
      type: Boolean,
      default: true,
    },
    pushNotifications: {
      type: Boolean,
      default: true,
    },
  },
  stats: {
    postsCount: {
      type: Number,
      default: 0,
    },
    followersCount: {
      type: Number,
      default: 0,
    },
    followingCount: {
      type: Number,
      default: 0,
    },
    likesCount: {
      type: Number,
      default: 0,
    },
  },
  metadata: {
    lastLogin: {
      type: Date,
      default: Date.now,
      index: true,
    },
    loginCount: {
      type: Number,
      default: 0,
    },
  },
  followers: {
    type: [String],
    default: [],
  },
  following: {
    type: [String],
    default: [],
  },
  bookmarks: {
    type: [String],
    default: [],
  },
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc: any, ret: any) {
      delete ret.password;
      delete ret.__v;
      return ret;
    }
  },
  toObject: { 
    virtuals: true,
    transform: function(doc: any, ret: any) {
      delete ret.password;
      delete ret.__v;
      return ret;
    }
  },
});

// Indexes
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ 'metadata.lastLogin': -1 });
userSchema.index({ isActive: 1, role: 1 });
userSchema.index({ createdAt: -1 });

// Virtual for posts
userSchema.virtual('posts', {
  ref: 'Post',
  localField: '_id',
  foreignField: 'author',
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(config.BCRYPT_ROUNDS);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Pre-save middleware to validate username uniqueness (case insensitive)
userSchema.pre('save', async function(next) {
  if (!this.isModified('username')) return next();

  try {
    const existingUser = await User.findOne({
      username: { $regex: new RegExp(`^${this.username}$`, 'i') },
      _id: { $ne: this._id }
    });

    if (existingUser) {
      const error = new Error('Username already exists');
      return next(error);
    }

    next();
  } catch (error) {
    next(error as Error);
  }
});

// Instance method to compare password
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

// Instance method to update last login
userSchema.methods.updateLastLogin = async function(): Promise<void> {
  this.metadata.lastLogin = new Date();
  this.metadata.loginCount += 1;
  await this.save({ validateBeforeSave: false });
};

// Instance method to generate auth token (placeholder - actual implementation in JWT utils)
userSchema.methods.generateAuthToken = function(): string {
  // This will be implemented using JwtUtils
  throw new Error('Use JwtUtils.generateAccessToken instead');
};

// Instance method to generate refresh token (placeholder - actual implementation in JWT utils)
userSchema.methods.generateRefreshToken = function(): string {
  // This will be implemented using JwtUtils
  throw new Error('Use JwtUtils.generateRefreshToken instead');
};

// Static method to find by email or username
userSchema.statics.findByCredentials = async function(identifier: string): Promise<IUser | null> {
  const user = await this.findOne({
    $or: [
      { email: identifier.toLowerCase() },
      { username: { $regex: new RegExp(`^${identifier}$`, 'i') } }
    ]
  }).select('+password');

  return user;
};

// Static method to check if user exists
userSchema.statics.exists = async function(email: string, username: string, excludeId?: string): Promise<boolean> {
  const query: any = {
    $or: [
      { email: email.toLowerCase() },
      { username: { $regex: new RegExp(`^${username}$`, 'i') } }
    ]
  };

  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  const user = await this.findOne(query);
  return !!user;
};

// Static method to get user stats
userSchema.statics.getStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        activeUsers: {
          $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
        },
        verifiedUsers: {
          $sum: { $cond: [{ $eq: ['$isVerified', true] }, 1, 0] }
        },
        admins: {
          $sum: { $cond: [{ $eq: ['$role', 'admin'] }, 1, 0] }
        },
        moderators: {
          $sum: { $cond: [{ $eq: ['$role', 'moderator'] }, 1, 0] }
        },
      }
    }
  ]);

  return stats[0] || {
    totalUsers: 0,
    activeUsers: 0,
    verifiedUsers: 0,
    admins: 0,
    moderators: 0,
  };
};

// Create and export the model
const User = mongoose.model<IUser>('User', userSchema);

export default User;
