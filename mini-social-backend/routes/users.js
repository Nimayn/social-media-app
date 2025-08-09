const express = require('express');
const router = express.Router();
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');

// Get user profile
router.get('/:userId', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('-passwordHash').populate('followers following', 'username');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user' });
  }
});

// Follow/unfollow a user
router.post('/follow/:userId', authMiddleware, async (req, res) => {
  try {
    const userToFollow = await User.findById(req.params.userId);
    const currentUser = await User.findById(req.user);

    if (!userToFollow || !currentUser) return res.status(404).json({ message: 'User not found' });
    if (userToFollow._id.equals(currentUser._id)) return res.status(400).json({ message: 'Cannot follow yourself' });

    if (currentUser.following.includes(userToFollow._id)) {
      // Unfollow
      currentUser.following.pull(userToFollow._id);
      userToFollow.followers.pull(currentUser._id);
    } else {
      currentUser.following.push(userToFollow._id);
      userToFollow.followers.push(currentUser._id);
    }

    await currentUser.save();
    await userToFollow.save();

    res.json({ following: currentUser.following, followers: userToFollow.followers });
  } catch (error) {
    res.status(500).json({ message: 'Error following/unfollowing user' });
  }
});

// Search users by username (query param ?q=)
router.get('/search', authMiddleware, async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) return res.json([]);

    const users = await User.find({ username: { $regex: query, $options: 'i' } }).select('username profilePicUrl');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error searching users' });
  }
});

module.exports = router;
