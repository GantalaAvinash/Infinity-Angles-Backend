const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/infinityAngles')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Post schema (simplified)
const postSchema = new mongoose.Schema({
  title: String,
  content: String,
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  images: [String],
  tags: [String],
  status: {
    isPublished: { type: Boolean, default: true },
    isDraft: { type: Boolean, default: false }
  },
  metadata: {
    likesCount: { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 },
    sharesCount: { type: Number, default: 0 },
    viewsCount: { type: Number, default: 0 }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Post = mongoose.model('Post', postSchema);

async function createTestPost() {
  try {
    const testPost = new Post({
      title: 'Test Post with Image',
      content: 'This is a test post to check image display functionality',
      author: new mongoose.Types.ObjectId('687249ff7a61037437e3e8ca'),
      images: ['http://192.168.1.7:3000/uploads/1752484616676-245284273-1752481579068-223069793-87f4cb3f-2799-46fe-8715-6eabb90da86e.png'],
      tags: ['test', 'image', 'display'],
      status: { isPublished: true, isDraft: false },
      metadata: { likesCount: 0, commentsCount: 0, sharesCount: 0, viewsCount: 0 }
    });

    const saved = await testPost.save();
    console.log('Test post created successfully:', saved._id);
    process.exit(0);
  } catch (error) {
    console.error('Error creating test post:', error);
    process.exit(1);
  }
}

createTestPost();
