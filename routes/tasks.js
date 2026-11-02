const express = require('express');
const router = express.Router();
const db = require('../config/db')

//GET http://localhost:3000/api/tasks -> all tasks
//GET http://localhost:3000/api/tasks/:id -> single task by id
//POST http://localhost:3000/api/tasks -> post new task
//PATCH http://localhost:3000/api/tasks/:id -> patch task by id
//DELETE http://localhost:3000/api/tasks/:id -> delete task by id
//DELETE http://localhost:3000/api/tasks -> delete all tasks




// GET all tasks
router.get('/', (req, res) => {
  db.query('SELECT * FROM tasks', (err, results) => {
    if (err) {
      res.status(500).json({ error: '[GETAllRecordsError] Failed to fetch tasks', err });
    } 
    return res.status(200).json(results)
    
  });
});

// GET a single task by ID
router.get('/:id', (req, res) => {
const id = req.params.id;

  db.query('SELECT * FROM tasks WHERE ID = ?', [id], (err, results) => {
    if (err) {
      res.status(500).json({ error: '[GETRecordError] Failed to fetch task', err });
    } 
    if(results.length ===0){
      return res.status(404).json({error:'[GETRecordError] Task not found'} )
    }
    return res.status(200).json(results)
    
  });
});

//post new task
router.post('/', (req, res) => {
  const { title, description, deadline } = req.body;
  db.query('INSERT INTO tasks (title, description, deadline) VALUES (?, ?, ?)', [title, description, deadline], (err, results) => {
    if (err) {
      res.status(500).json({ error: '[POSTRecordError] Failed to create task', err });
    }
    return res.status(201).json({ message: '[POSTRecordSuccess] Task created successfully', id: results.insertId });
  });
});

//patch task by id
router.patch('/:id', (req, res) => {
  const id = req.params.id;

  let updateFields = Object.keys(req.body).map(field => `${field} = ?`).join(', ')
  let updateValues = Object.values(req.body)

  db.query(`UPDATE tasks SET  ${updateFields}   WHERE id = ?`, [...updateValues, id], (err, results) => {
    if (err) {
      res.status(500).json({ error: '[PATCHRecordError] Failed to update task', err });
    }
    if (results.affectedRows === 0) {
      return res.status(404).json({ error: '[PATCHRecordError] Task not found' });
    }
    return res.status(200).json({ message: '[PATCHRecordSuccess] Task updated successfully' });
  });
});

//delete task by id
router.delete('/:id', (req, res) => {
  const id = req.params.id;
  db.query('DELETE FROM tasks WHERE id = ?', [id], (err, results) => {
    if (err) {
      res.status(500).json({ error: '[DELETERecordError] Failed to delete task', err });
    }
    if (results.affectedRows === 0) {
      return res.status(404).json({ error: '[DELETERecordError] Task not found' });
    }
    return res.status(200).json({ message: '[DELETERecordSuccess] Task deleted successfully' });
  });
});

//delete all tasks
router.delete('/', (req, res) => {
  db.query('DELETE FROM tasks', (err, results) => {
    if (err) {
      res.status(500).json({ error: '[DELETEAllRecordsError] Failed to delete tasks', err });
    }
    return res.status(200).json({ message: '[DELETEAllRecordsSuccess] All tasks deleted successfully' });
  });
});

module.exports = router;