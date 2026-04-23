const mongoose = require('mongoose');

const RequestSchema = new mongoose.Schema({
    skillId: { type: mongoose.Schema.Types.ObjectId, ref: 'Skill', required: true },
    skillTitle: { type: String, required: true },
    requesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    requesterEmail: { type: String, required: true },
    requesterName: { type: String, required: true },
    providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    providerEmail: { type: String, required: true },
    message: { type: String, default: "I'd like to learn this skill from you." },
    status: { 
        type: String, 
        enum: ['Pending', 'Accepted', 'Rejected'], 
        default: 'Pending' 
    }
}, { timestamps: true });

module.exports = mongoose.model('Request', RequestSchema);
