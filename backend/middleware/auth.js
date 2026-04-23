const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
    const token = req.header('Authorization');

    if (!token) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    try {
        // Token is typically in the format "Bearer <token>"
        const actualToken = token.startsWith('Bearer ') ? token.slice(7, token.length).trimLeft() : token;
        
        const decoded = jwt.verify(actualToken, process.env.JWT_SECRET);
        req.user = decoded.user;
        next();
    } catch (err) {
        res.status(401).json({ message: 'Token is not valid' });
    }
};
