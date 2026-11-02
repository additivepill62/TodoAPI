require('dotenv').config();
const express = require('express');
const app = express();
const todoRoutes = require('./routes/tasks');
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// use routes
app.use('/api/tasks', todoRoutes);


app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});


