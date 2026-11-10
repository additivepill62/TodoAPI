const express = require('express');
const router = express.Router();
const db = require('../config/db');
const SHA1 = require('sha1');
const { generateToken, tokenCheck, adminCheck } = require('../utils/jwt.js');

const publicUserFields = 'ID, name, email, role, created_at, updated_at';
const editableUserFields = new Set(['name', 'email', 'password', 'role']);
const editableProfileFields = new Set(['name', 'email']);

//-------------------------------------
//AUTH ENDPOINTS
//-------------------------------------

router.post('/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: '[LOGINMissingReqFields] Missing required fields' });
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
        return res.status(400).json({ error: '[REGISTERMissingReqFields] Missing required fields' });
    }
    if (password !== confirm) {
        return res.status(400).json({ error: '[REGISTERPasswordMismatchError] Passwords do not match' });
    }

    db.query('SELECT ID FROM users WHERE email = ?', [email], (err, results) => {
        if (err) {
            return res.status(500).json({ error: '[REGISTERLookupError] Failed to check email' +err });
        }
        if (results.length > 0) {
            return res.status(409).json({ error: '[REGISTEREmailExistsError] This email is already registered' });
        }

        db.query('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
            [name, email, SHA1(password), 'user'], (insertErr, insertResults) => {
                if (insertErr) {
                    return res.status(500).json({ error: '[REGISTERCreateError] Failed to register user' });
                }
                return res.status(201).json({ message: '[REGISTERSuccess] User registered successfully', id: insertResults.insertId });
            });
    });
});

//-------------------------------------
//USER ENDPOINTS
//-------------------------------------

router.patch('/passmod', tokenCheck, (req, res) => {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
        return res.status(400).json({ error: '[PASSMODMissingReqFields] Current password, new password, and confirmation are required' });
    }
    if (newPassword !== confirmPassword) {
        return res.status(400).json({ error: '[PASSMODPasswordMismatchError] New passwords do not match' });
    }

    db.query('SELECT password FROM users WHERE ID = ?', [req.user.id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: '[PASSMODLookupError] Failed to retrieve user' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: '[PASSMODUserNotFoundError] User not found' });
        }
        if (results[0].password !== SHA1(currentPassword)) {
            return res.status(401).json({ error: '[PASSMODInvalidPasswordError] Current password is incorrect' });
        }

        db.query('UPDATE users SET password = ? WHERE ID = ?', [SHA1(newPassword), req.user.id], (updateErr) => {
            if (updateErr) {
                return res.status(500).json({ error: '[PASSMODUpdateError] Failed to update password' });
            }
            return res.status(200).json({ message: '[PASSMODSuccess] Password updated successfully' });
        });
    });
});

router.get('/profile', tokenCheck, (req, res) => {
    db.query(`SELECT ${publicUserFields} FROM users WHERE ID = ?`, [req.user.id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: '[PROFILEGetError] Failed to retrieve profile' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: '[PROFILENotFoundError] User not found' });
        }
        return res.status(200).json(results[0]);
    });
});

router.patch('/profile', tokenCheck, (req, res) => {
    const fields = Object.keys(req.body);
    if (fields.length === 0 || fields.some(field => !editableProfileFields.has(field))) {
        return res.status(400).json({ error: '[PROFILEMissingOrInvalidFieldsError] Provide profile fields to update: name or email' });
    }

    const updateProfile = () => {
        const assignments = fields.map(field => `${field} = ?`).join(', ');
        db.query(`UPDATE users SET ${assignments} WHERE ID = ?`, [...fields.map(field => req.body[field]), req.user.id], (updateErr) => {
            if (updateErr) {
                return res.status(500).json({ error: '[PROFILEUpdateError] Failed to update profile' });
            }
            db.query(`SELECT ${publicUserFields} FROM users WHERE ID = ?`, [req.user.id], (selectErr, results) => {
                if (selectErr) {
                    return res.status(500).json({ error: '[PROFILEGetError] Failed to retrieve updated profile' });
                }
                if (results.length === 0) {
                    return res.status(404).json({ error: '[PROFILENotFoundError] User not found' });
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
            return res.status(500).json({ error: '[PROFILEEmailLookupError] Failed to check email' });
        }
        if (results.length > 0) {
            return res.status(409).json({ error: '[PROFILEEmailExistsError] This email is already registered' });
        }
        return updateProfile();
    });
});

router.delete('/profile', tokenCheck, (req, res) => {
    db.query('DELETE FROM users WHERE ID = ?', [req.user.id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: '[PROFILEDeleteError] Failed to delete profile' });
        }
        if (results.affectedRows === 0) {
            return res.status(404).json({ error: '[PROFILENotFoundError] User not found' });
        }
        return res.status(200).json({ message: '[PROFILEDeleteSuccess] Profile deleted successfully' });
    });
});

//-------------------------------------
//ADMIN ENDPOINTS
//-------------------------------------

router.get('/', adminCheck, (req, res) => {
    db.query(`SELECT ${publicUserFields} FROM users`, (err, results) => {
        if (err) {
            return res.status(500).json({ error: '[GETAllUsersError] Failed to retrieve users' });
        }
        return res.status(200).json(results);
    });
});

router.get('/:id', adminCheck, (req, res) => {
    db.query(`SELECT ${publicUserFields} FROM users WHERE ID = ?`, [req.params.id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: '[GETUserError] Failed to retrieve user' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: '[GETUserNotFoundError] User not found' });
        }
        return res.status(200).json(results[0]);
    });
});

router.patch('/:id', adminCheck, (req, res) => {
    const fields = Object.keys(req.body);
    if (fields.length === 0 || fields.some(field => !editableUserFields.has(field))) {
        return res.status(400).json({ error: '[PATCHUserMissingOrInvalidFieldsError] Provide fields to update: name, email, password, or role' });
    }
    if ('role' in req.body && !['user', 'admin'].includes(req.body.role)) {
        return res.status(400).json({ error: '[PATCHUserInvalidRoleError] Role must be user or admin' });
    }

    const values = fields.map(field => field === 'password' ? SHA1(req.body[field]) : req.body[field]);
    const assignments = fields.map(field => `${field} = ?`).join(', ');

    db.query(`UPDATE users SET ${assignments} WHERE ID = ?`, [...values, req.params.id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: '[PATCHUserUpdateError] Failed to update user' });
        }
        if (results.affectedRows === 0) {
            return res.status(404).json({ error: '[PATCHUserNotFoundError] User not found or no values changed' });
        }
        return res.status(200).json({ message: '[PATCHUserSuccess] User updated successfully' });
    });
});

router.delete('/:id', adminCheck, (req, res) => {
    db.query('DELETE FROM users WHERE ID = ?', [req.params.id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: '[DELETEUserError] Failed to delete user' });
        }
        if (results.affectedRows === 0) {
            return res.status(404).json({ error: '[DELETEUserNotFoundError] User not found' });
        }
        return res.status(200).json({ message: '[DELETEUserSuccess] User deleted successfully' });
    });
});

module.exports = router;