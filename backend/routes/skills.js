const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Skill = require('../models/Skill');
const User = require('../models/User');

// @route   GET api/skills
// @desc    Get all skills (search query optional)
router.get('/', async (req, res) => {
    try {
        const skills = await Skill.find().sort({ createdAt: -1 });
        res.json(skills);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/skills/my
// @desc    Get skills provided by the authenticated user
router.get('/my', auth, async (req, res) => {
    try {
        const skills = await Skill.find({ providerId: req.user.id }).sort({ createdAt: -1 });
        res.json(skills);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/skills
// @desc    Create a skill
router.post('/', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        
        const newSkill = new Skill({
            title: req.body.title,
            category: req.body.category,
            desc: req.body.desc,
            providerId: req.user.id,
            providerName: user.name,
            providerEmail: user.email
        });

        const skill = await newSkill.save();
        res.json(skill);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/skills/:id
// @desc    Update a skill
router.put('/:id', auth, async (req, res) => {
    const { title, category, desc } = req.body;

    try {
        let skill = await Skill.findById(req.params.id);

        if (!skill) return res.status(404).json({ message: 'Skill not found' });

        // Make sure user owns skill
        if (skill.providerId.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        skill = await Skill.findByIdAndUpdate(
            req.params.id,
            { $set: { title, category, desc } },
            { new: true }
        );

        res.json(skill);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE api/skills/:id
// @desc    Delete a skill
router.delete('/:id', auth, async (req, res) => {
    try {
        const skill = await Skill.findById(req.params.id);

        if (!skill) {
            return res.status(404).json({ message: 'Skill not found' });
        }

        // Make sure user owns skill
        if (skill.providerId.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        await Skill.findByIdAndDelete(req.params.id);

        const Request = require('../models/Request');
        await Request.deleteMany({ skillId: req.params.id });

        res.json({ message: 'Skill removed' });
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Skill not found' });
        }
        res.status(500).send('Server Error');
    }
});

module.exports = router;
