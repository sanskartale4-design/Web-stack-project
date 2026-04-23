const mongoose = require('mongoose');

const SkillSchema = new mongoose.Schema({
    title: { type: String, required: true },
    category: { 
        type: String, 
        required: true,
        enum: ['Programming', 'Design', 'Language', 'Music', 'Other']
    },
    desc: { type: String, required: true },
    providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    providerName: { type: String, required: true },
    providerEmail: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Skill', SkillSchema);
