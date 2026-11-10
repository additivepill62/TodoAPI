var jwt = require('jsonwebtoken')

function generateToken(payload) {
    const signOption={
        expiresIn:process.env.JWT_EXPIRES_IN
    }
    return jwt.sign(payload, process.env.JWT_SECRET,signOption)
}

function verifyToken(token) {
    return jwt.verify(token, process.env.JWT_SECRET,)
}
function tokenCheck(req, res, next) {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]
    if(!token) return res.status(401).json({message: '[TOKENNoTokenError] Access denied. No token provided'})

    try {
        const decoded = verifyToken(token);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(400).json({message: '[TOKENVerificationFailed] Invalid token or expired'})
    }

}
function adminCheck(req, res, next){
    const authHeader = req.headers['authorization']; // Bearer *token*
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: '[TOKENNoAdminTokenError] Access denied. No token provided.' });

    try{
        const decoded = verifyToken(token);
        req.user = decoded;
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: '[TOKENAccessDenied] Access denied. Admins only.' });
        }
        next();
    } catch (error) {
        return res.status(400).json({ error: '[TOKENAdminVerificationFailed] Invalid token or expired token.' });
    }

}

module.exports = {
    generateToken,
    verifyToken,
    tokenCheck,
    adminCheck
}