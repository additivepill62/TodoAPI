const db = require('../config/db')

const migrations=[
    require('./001_create_tasks'),
    require('./002_create_users')
]

migrations.forEach(migration=>{
    migration.run() //create tasks table
})