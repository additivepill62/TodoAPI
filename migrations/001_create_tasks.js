const db = require('../config/db')

const run = () => {
    return new Promise((resolve, reject) =>{

        
        db.query(`CREATE TABLE IF NOT EXISTS tasks (
            ID INT AUTO_INCREMENT PRIMARY KEY,
            user_ID INT,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            deadline DATE,
            completed BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            CONSTRAINT fk_user FOREIGN KEY (user_ID) REFERENCES users(ID)
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