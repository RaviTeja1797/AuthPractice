const express = require("express");
const {open} = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const path = require('path');


const expressAppInstance = express();
expressAppInstance.use(express.json())

let dbPath = path.join(__dirname, "employee.db")
let dataBaseConnectionObject = null;

const initializeDatabaseAndServer = async() =>{
    try{
        dataBaseConnectionObject = await open({
            filename:dbPath,
            driver:sqlite3.Database
        })
        expressAppInstance.listen(3000, ()=>{
            console.log("Server stated listening at http://localhost:3000/")
        })
    }catch(e){
        console.log(`Database or server error`)
    }
}

initializeDatabaseAndServer()

expressAppInstance.get('/', (request, response)=>{
    response.send("Hello Welcome to 3000 port");
})

expressAppInstance.get("/create-employee-table/", async(request, response)=>{
    const createEmployeeTableQuery = `CREATE TABLE employee(employeeId INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, salary INT)`;
    try{
        await dataBaseConnectionObject.run(createEmployeeTableQuery);
        response.send("Employee table created")
    }catch(e){
        console.log(`DB error ${e.message}`)
    }    

})

expressAppInstance.get("/create-admin-table/", async(request, response)=>{
    const createAdminTableQuery = `CREATE TABLE admin(adminId INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, userName TEXT, password text, salary INT)`;
    try{
        await dataBaseConnectionObject.run(createAdminTableQuery);
        response.send("Admin table created")
    }catch(e){
        console.log(`DB error ${e.message}`)
    }
})

expressAppInstance.post("/add-admin-record/", async (request, response)=>{
    const {name, username, password, salary} = request.body;
    const passwordHash = await bcrypt.hash(password, 10);
    
    let adminObject;
    const getAdminObjectQuery = `SELECT * FROM admin WHERE username like "${username}"`
    adminObject = await dataBaseConnectionObject.get(getAdminObjectQuery);
    
    if (adminObject === undefined){
        //insertAdminRecord
        const insertAdminRecordQuery = `INSERT INTO admin (name, username, password, salary)
        values("${name}", "${username}", "${passwordHash}", ${salary})`
        try{
            await dataBaseConnectionObject.run(insertAdminRecordQuery);
            response.send(`Admin record inserted`)
        }catch(e){
            console.log(`Database Error ${e.message}`);
        }
    }else{
        response.status(401)
        response.send('Admin Already present')
    }

})

expressAppInstance.post('/add-employee-records/', async(request, response)=>{
     const authHeader = request.headers["authorization"]
    if (authHeader === undefined){
        response.status(401)
        response.send("You are not an admin. You can't add employee details")
    }else{
        let token = authHeader.split('Bearer ').join("")
        console.log(token)
        jwt.verify(token, "SecretCode123", async(error, payload)=>{
            if(error){
                response.status(401);
                response.send('You seem to have entered the wrong token')
            }else{
                const{name, salary} = request.body;

                const addEmployeeQuery = `INSERT INTO employee(name, salary)
                VALUES("${name}", ${salary})`
                
                await dataBaseConnectionObject.run(addEmployeeQuery)
                response.send('Employee details added successfully')
            }    
        
        });
    }
});








expressAppInstance.post("/admin_login/", async(request, response)=>{
    const{username, password} = request.body;
    
    let adminObject;
    const getAdminObjectQuery = `SELECT * FROM admin WHERE username = "${username}"`
    adminObject = await dataBaseConnectionObject.get(getAdminObjectQuery)
    
    if (adminObject !== undefined){
        //checkPassword
        //certify that he is valid admin
        //give token if password matches

        let isPasswordValid = await bcrypt.compare(password, adminObject["password"])
        if(isPasswordValid){
            console.log('Login success')
            const payload = {
                "username" : username
            }
            const jwtToken = jwt.sign(payload, "SecretCode123")
            //response.send("login success your token")
            console.log(jwtToken)
            response.send({jwtToken, "message": "Login Success! use jwt token to user the services"})
        }else{
            response.status(401)
            response.send('Invalid Password')
        }

    }else{
        response.status(401)
        response.send('Admin does not exits')
    }

})

expressAppInstance.get("/get-employee-details/:employeeId", (request, response)=>{
    
    const authHeader = request.headers["authorization"]
    if (authHeader === undefined){
        response.status(401)
        response.send("You are not an admin. Employee details can't be provided")
    }else{
        let token = authHeader.split('Bearer ').join("")
        console.log(token)
        jwt.verify(token, "SecretCode123", async(error, payload)=>{
            if(error){
                response.status(401)
                response.send('You seem to have entered the wrong token')
            }else{
                let {employeeId} = request.params;
                console.log(employeeId)

                const getEmployeeWithIdQuery = `SELECT * FROM employee where employeeId like ${employeeId}`
                try{
                    let employeeObject = await dataBaseConnectionObject.get(getEmployeeWithIdQuery)
                    response.send(employeeObject)
                }catch(e){
                    console.log(`Database Error ${e.message}`)
                }
                

            }
        })
    }

})