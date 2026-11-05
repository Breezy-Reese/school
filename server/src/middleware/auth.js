import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  try {
    const { id } = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
    req.user = await User.findById(id);
    if (!req.user || req.user.active === false) {
      return res.status(401).json({ message: 'User not found or deactivated' });
    }
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// superadmin always passes; everyone else must be in the list
export const allowRoles = (...roles) => (req, res, next) =>
  req.user.role === 'superadmin' || roles.includes(req.user.role)
    ? next()
    : res.status(403).json({ message: 'You do not have permission to do this' });