const db = require('../config/db')

const run = () => {
    return new Promise((resolve, reject) =>{

        
        db.query(`CREATE TABLE IF NOT EXISTS tasks (
            ID INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            deadline DATE,
            completed BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )`, (err, results)=>{
                if(err){
                    console.error('Error creating tasks table: ', err)
                    return reject(err)
                } else{
                    console.log('Tasks table created or already exists.')
                    return resolve(results)
                }
            })
        })
    }




module.exports = { run }