const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { tokenCheck, adminCheck } = require('../utils/jwt.js');
const editableTaskFields = new Set(['title', 'description', 'deadline', 'completed']);
//GET http://localhost:3000/api/tasks -> all tasks
//GET http://localhost:3000/api/tasks/:id -> single task by id
//POST http://localhost:3000/api/tasks -> post new task
//PATCH http://localhost:3000/api/tasks/:id -> patch task by id
//DELETE http://localhost:3000/api/tasks/:id -> delete task by id
//DELETE http://localhost:3000/api/tasks -> delete all tasks




// GET all tasks
router.get('/', adminCheck, (req, res) => {
  db.query('SELECT * FROM tasks', (err, results) => {
    if (err) {
      return res.status(500).json({ error: '[GETAllRecordsError] Failed to fetch tasks', err });
    }
    return res.status(200).json(results)
    
  });
});

// GET a single task by ID
router.get('/:id', tokenCheck, (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const query = isAdmin
    ? 'SELECT * FROM tasks WHERE ID = ?'
    : 'SELECT * FROM tasks WHERE ID = ? AND user_ID = ?';
  const values = isAdmin ? [req.params.id] : [req.params.id, req.user.id];

  db.query(query, values, (err, results) => {
    if (err) {
      return res.status(500).json({ error: '[GETRecordError] Failed to fetch task', err });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: '[GETRecordError] Task not found' });
    }
    return res.status(200).json(results);
  });
});

//post new task
router.post('/', tokenCheck, (req, res) => {
  const { title, description, deadline } = req.body;
  if (!title) {
    return res.status(400).json({ error: '[POSTRecordError] Title is required' });
  }

  db.query('INSERT INTO tasks (user_ID, title, description, deadline) VALUES (?, ?, ?, ?)',
    [req.user.id, title, description, deadline], (err, results) => {
    if (err) {
      return res.status(500).json({ error: '[POSTRecordError] Failed to create task', err });
    }
    return res.status(201).json({ message: '[POSTRecordSuccess] Task created successfully', id: results.insertId });
  });
});

//patch task by id
router.patch('/:id', tokenCheck, (req, res) => {
  const fields = Object.keys(req.body);
  if (fields.length === 0 || fields.some(field => !editableTaskFields.has(field))) {
    return res.status(400).json({ error: '[PATCHRecordError] Provide valid task fields to update' });
  }

  const isAdmin = req.user.role === 'admin';
  const updateFields = fields.map(field => `${field} = ?`).join(', ');
  const whereClause = isAdmin ? 'ID = ?' : 'ID = ? AND user_ID = ?';
  const values = fields.map(field => req.body[field]);
  values.push(req.params.id);
  if (!isAdmin) values.push(req.user.id);

  db.query(`UPDATE tasks SET ${updateFields} WHERE ${whereClause}`, values, (err, results) => {
    if (err) {
      return res.status(500).json({ error: '[PATCHRecordError] Failed to update task', err });
    }
    if (results.affectedRows === 0) {
      return res.status(404).json({ error: '[PATCHRecordError] Task not found' });
    }
    return res.status(200).json({ message: '[PATCHRecordSuccess] Task updated successfully' });
  });
});

//delete task by id
router.delete('/:id', tokenCheck, (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const query = isAdmin
    ? 'DELETE FROM tasks WHERE ID = ?'
    : 'DELETE FROM tasks WHERE ID = ? AND user_ID = ?';
  const values = isAdmin ? [req.params.id] : [req.params.id, req.user.id];

  db.query(query, values, (err, results) => {
    if (err) {
      return res.status(500).json({ error: '[DELETERecordError] Failed to delete task', err });
    }
    if (results.affectedRows === 0) {
      return res.status(404).json({ error: '[DELETERecordError] Task not found' });
    }
    return res.status(200).json({ message: '[DELETERecordSuccess] Task deleted successfully' });
  });
});

//delete all tasks
router.delete('/', adminCheck, (req, res) => {
  db.query('DELETE FROM tasks', (err, results) => {
    if (err) {
      return res.status(500).json({ error: '[DELETEAllRecordsError] Failed to delete tasks', err });
    }
    return res.status(200).json({ message: '[DELETEAllRecordsSuccess] All tasks deleted successfully' });
  });
});

module.exports = router;