const express = require('express');
const router = express.Router();
const db = require('../config/db');
const SHA1 = require('sha1');
const { generateToken, tokenCheck, adminCheck } = require('../utils/jwt.js');

const publicUserFields = 'ID, name, email, role, created_at, updated_at';
const editableUserFields = new Set(['name', 'email', 'password', 'role']);
const editableProfileFields = new Set(['name', 'email']);

router.post('/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: '[LOGINMissingFields] Missing input fields' });
    }

    db.query('SELECT * FROM users WHERE email = ? AND password = ?', [email, SHA1(password)], (err, results) => {
        if (err) {
            return res.status(500).json({ error: '[LOGINError] Database query error' });
        }

        if (results.length === 0) {
            return res.status(401).json({ error: '[LOGINNoResultError] Invalid email or password' });
        }

        const user = results[0];
        const token = generateToken({
            id: user.ID,
            name: user.name,
            email: user.email,
            role: user.role
        });
        return res.status(200).json({ token });
    });
});

router.post('/register', (req, res) => {
    const { name, email, password, confirm } = req.body;

    if (!name || !email || !password || !confirm) {
        return res.status(400).json({ error: 'Name, email, password, and confirm are required' });
    }
    if (password !== confirm) {
        return res.status(400).json({ error: 'Passwords do not match' });
    }

    db.query('SELECT ID FROM users WHERE email = ?', [email], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (results.length > 0) {
            return res.status(409).json({ error: 'This email is already registered' });
        }

        db.query('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
            [name, email, SHA1(password), 'user'], (insertErr, insertResults) => {
                if (insertErr) {
                    return res.status(500).json({ error: insertErr.message });
                }
                return res.status(201).json({ message: 'User registered successfully', id: insertResults.insertId });
            });
    });
});

router.patch('/passmod', tokenCheck, (req, res) => {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
        return res.status(400).json({ error: 'Current password, new password, and confirmation are required' });
    }
    if (newPassword !== confirmPassword) {
        return res.status(400).json({ error: 'New passwords do not match' });
    }

    db.query('SELECT password FROM users WHERE ID = ?', [req.user.id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        if (results[0].password !== SHA1(currentPassword)) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        db.query('UPDATE users SET password = ? WHERE ID = ?', [SHA1(newPassword), req.user.id], (updateErr) => {
            if (updateErr) {
                return res.status(500).json({ error: updateErr.message });
            }
            return res.status(200).json({ message: 'Password updated successfully' });
        });
    });
});

router.get('/profile', tokenCheck, (req, res) => {
    db.query(`SELECT ${publicUserFields} FROM users WHERE ID = ?`, [req.user.id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        return res.status(200).json(results[0]);
    });
});

router.patch('/profile', tokenCheck, (req, res) => {
    const fields = Object.keys(req.body);
    if (fields.length === 0 || fields.some(field => !editableProfileFields.has(field))) {
        return res.status(400).json({ error: 'Provide profile fields to update: name or email' });
    }

    const updateProfile = () => {
        const assignments = fields.map(field => `${field} = ?`).join(', ');
        db.query(`UPDATE users SET ${assignments} WHERE ID = ?`, [...fields.map(field => req.body[field]), req.user.id], (updateErr) => {
            if (updateErr) {
                return res.status(500).json({ error: updateErr.message });
            }
            db.query(`SELECT ${publicUserFields} FROM users WHERE ID = ?`, [req.user.id], (selectErr, results) => {
                if (selectErr) {
                    return res.status(500).json({ error: selectErr.message });
                }
                if (results.length === 0) {
                    return res.status(404).json({ error: 'User not found' });
                }
                return res.status(200).json(results[0]);
            });
        });
    };

    if (!('email' in req.body)) {
        return updateProfile();
    }
    db.query('SELECT ID FROM users WHERE email = ? AND ID <> ?', [req.body.email, req.user.id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (results.length > 0) {
            return res.status(409).json({ error: 'This email is already registered' });
        }
        return updateProfile();
    });
});

router.delete('/profile', tokenCheck, (req, res) => {
    db.query('DELETE FROM users WHERE ID = ?', [req.user.id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (results.affectedRows === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        return res.status(200).json({ message: 'Profile deleted successfully' });
    });
});

router.get('/', adminCheck, (req, res) => {
    db.query(`SELECT ${publicUserFields} FROM users`, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        return res.status(200).json(results);
    });
});

router.get('/:id', adminCheck, (req, res) => {
    db.query(`SELECT ${publicUserFields} FROM users WHERE ID = ?`, [req.params.id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        return res.status(200).json(results[0]);
    });
});

router.post('/', adminCheck, (req, res) => {
    const { name, email, password, role = 'user' } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required' });
    }
    if (!['user', 'admin'].includes(role)) {
        return res.status(400).json({ error: 'Role must be user or admin' });
    }

    db.query('SELECT ID FROM users WHERE email = ?', [email], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (results.length > 0) {
            return res.status(409).json({ error: 'This email is already registered' });
        }

        db.query('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
            [name, email, SHA1(password), role], (insertErr, insertResults) => {
                if (insertErr) {
                    return res.status(500).json({ error: insertErr.message });
                }
                return res.status(201).json({ message: 'User created successfully', id: insertResults.insertId });
            });
    });
});

router.patch('/:id', adminCheck, (req, res) => {
    const fields = Object.keys(req.body);
    if (fields.length === 0 || fields.some(field => !editableUserFields.has(field))) {
        return res.status(400).json({ error: 'Provide fields to update: name, email, password, or role' });
    }
    if ('role' in req.body && !['user', 'admin'].includes(req.body.role)) {
        return res.status(400).json({ error: 'Role must be user or admin' });
    }

    const values = fields.map(field => field === 'password' ? SHA1(req.body[field]) : req.body[field]);
    const assignments = fields.map(field => `${field} = ?`).join(', ');

    db.query(`UPDATE users SET ${assignments} WHERE ID = ?`, [...values, req.params.id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (results.affectedRows === 0) {
            return res.status(404).json({ error: 'User not found or no values changed' });
        }
        return res.status(200).json({ message: 'User updated successfully' });
    });
});

router.delete('/:id', adminCheck, (req, res) => {
    db.query('DELETE FROM users WHERE ID = ?', [req.params.id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (results.affectedRows === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        return res.status(200).json({ message: 'User deleted successfully' });
    });
});

module.exports = router;