const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Request = require('../models/Request');
const Skill = require('../models/Skill');
const User = require('../models/User');

// @route   GET api/requests
// @desc    Get user's incoming and outgoing requests
router.get('/', auth, async (req, res) => {
    try {
        const incoming = await Request.find({ providerId: req.user.id }).sort({ createdAt: -1 });
        const outgoing = await Request.find({ requesterId: req.user.id }).sort({ createdAt: -1 });
        
        res.json({ incoming, outgoing });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/requests
// @desc    Create a new request
router.post('/', auth, async (req, res) => {
    try {
        const { skillId, message } = req.body;

        const skill = await Skill.findById(skillId);
        if (!skill) return res.status(404).json({ message: 'Skill not found' });

        const user = await User.findById(req.user.id);

        // Check if already requested
        const existingRequest = await Request.findOne({
            skillId,
            requesterId: req.user.id,
            status: { $ne: 'Rejected' }
        });

        if (existingRequest) {
            return res.status(400).json({ message: 'You already have an active request for this skill' });
        }

        // Prevent requesting own skill
        if (skill.providerId.toString() === req.user.id) {
            return res.status(400).json({ message: 'You cannot request your own skill' });
        }

        const newRequest = new Request({
            skillId: skill.id,
            skillTitle: skill.title,
            requesterId: req.user.id,
            requesterEmail: user.email,
            requesterName: user.name,
            providerId: skill.providerId,
            providerEmail: skill.providerEmail,
            message: message || "I'd like to learn this skill from you."
        });

        const request = await newRequest.save();
        res.json(request);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PATCH api/requests/:id
// @desc    Update request status or cancel request (DELETE conceptually for requester)
router.patch('/:id', auth, async (req, res) => {
    try {
        const { status } = req.body;
        const request = await Request.findById(req.params.id);

        if (!request) return res.status(404).json({ message: 'Request not found' });

        // If status is provided, only provider can update
        if (status) {
            if (request.providerId.toString() !== req.user.id) {
                return res.status(401).json({ message: 'Not authorized' });
            }
            request.status = status;
            await request.save();
            return res.json(request);
        }

        // If no status, it's a cancellation from requester
        if (request.requesterId.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        await Request.findByIdAndDelete(req.params.id);
        res.json({ message: 'Request cancelled' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
