const db = require('../config/db')

const migrations = [
    require('./002_create_users'),
    require('./001_create_tasks')
]

const runMigrations = async () => {
    for (const migration of migrations) {
        await migration.run()
    }
}

runMigrations().catch(err => {
    console.error('Migration failed:', err)
    process.exitCode = 1
})