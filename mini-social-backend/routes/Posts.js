const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const Post = require('../models/Post');
const User = require('../models/User');
const multer = require('multer');
const path = require('path');

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// Create post (text + optional image)
router.post('/', authMiddleware, upload.single('media'), async (req, res) => {
  try {
    const newPost = new Post({
      userId: req.user,
      contentText: req.body.contentText,
      mediaUrl: req.file ? `/uploads/${req.file.filename}` : ''
    });
    const savedPost = await newPost.save();
    res.status(201).json(savedPost);
  } catch (error) {
    res.status(500).json({ message: 'Error creating post' });
  }
});

// Get posts from users the current user follows + self
router.get('/feed', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user);
    const followingIds = user.following.concat([user._id]);

    const posts = await Post.find({ userId: { $in: followingIds } })
      .sort({ createdAt: -1 })
      .populate('userId', 'username profilePicUrl')
      .populate('comments.userId', 'username');

    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching feed' });
  }
});

// Like a post
router.post('/:postId/like', authMiddleware, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    if (post.likes.includes(req.user)) {
      // Unlike
      post.likes.pull(req.user);
    } else {
      post.likes.push(req.user);
    }

    await post.save();
    res.json({ likesCount: post.likes.length });
  } catch (error) {
    res.status(500).json({ message: 'Error liking post' });
  }
});

// Comment on a post
router.post('/:postId/comment', authMiddleware, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    post.comments.push({ userId: req.user, commentText: req.body.commentText });
    await post.save();

    res.json(post.comments);
  } catch (error) {
    res.status(500).json({ message: 'Error commenting on post' });
  }
});

module.exports = router;
