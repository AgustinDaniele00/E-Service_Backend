const express = require('express')
const app = express()
const port = 4001
const mysql = require('mysql');
var bodyParser = require('body-parser')
const path = require('path');
const multer = require('multer');
const sharp = require('sharp')
const fs = require('fs')
const fileUpload = require('express-fileupload');
const cors = require('cors')

app.use(express.static('public'));
app.use(cors()); // it enables all cors requests
app.use(fileUpload());


app.post('/upload', (req, res) => {
  if (!req.files) {
      return res.status(500).send({ msg: "file is not found" })
  }

  var extension = req.files.file.mimetype.split('/')[1];
  var path = Date.now().toString()+'.'+extension;
  const myFile = req.files.file;
  myFile.mv(`${__dirname}/public/services_images/${path}`, function (err) {
    if (err) {
        console.log(err)
        return res.status(500).send({ msg: "Error occured" });
    }
    return res.send({ path: path });
  });

})


app.use(express.json());
app.use(express.urlencoded());

var connection;

  function handleDisconnect() {
    connection = mysql.createConnection({
      host: '192.169.147.133',
      user: 'e-service',
      password: 'iAs6V7NrWPndkWF',
      database: 'e-service'
      }); 
       // Recreate the connection, since
                                                    // the old one cannot be reused.
  
    connection.connect(function(err) {              // The server is either down
      if(err) {                                     // or restarting (takes a while sometimes).
        console.log('error when connecting to db:', err);
        setTimeout(handleDisconnect, 2000); // We introduce a delay before attempting to reconnect,
      }                                     // to avoid a hot loop, and to allow our node script to
    });                                     // process asynchronous requests in the meantime.
                                            // If you're also serving http, display a 503 error.
    connection.on('error', function(err) {
      //console.log('db error', err);
      if(err.code === 'PROTOCOL_CONNECTION_LOST') { // Connection to the MySQL server is usually
        handleDisconnect();                         // lost due to either server restart, or a
      } else {                                      // connnection idle timeout (the wait_timeout
        throw err;                                  // server variable configures this)
      }
    });
  }
  
  handleDisconnect();


app.post('/login', (req, res) => {
  connection.query('SELECT * FROM `users` WHERE email = ' + `'${req.body.email}'`, function (error, results, fields) {
    if (error) throw error;
    if (results.length > 0) {
      //console.log(results[0].password.toString())
      if (req.body.password == results[0].password) {
        res.send(JSON.stringify({ status: 0, user: results[0]}))
      } else {
        res.send(JSON.stringify({ status: 1 }))
      }
    } else {
      res.send(JSON.stringify({ status: 2 }))
    }
  });
  
})



app.post('/editUser', (req, res) => {
  connection.query("UPDATE users SET address='"+req.body.address+"', name='"+req.body.name+"', lastname='"+req.body.lastname+"', email='"+req.body.email+"', phone='"+req.body.phone+"', dni='"+req.body.dni+"', province='"+req.body.province+"', location='"+req.body.location+"' WHERE userId="+req.body.userId, function (error, results, fields) {
    if (error) throw error;
    console.log('updated')
    res.send(JSON.stringify({ status: 0 }))
  });
})


app.post('/changePass', (req, res) => {
  connection.query("UPDATE users SET  password='"+req.body.password+"' WHERE userId="+req.body.id, function (error, results, fields) {
    if (error) throw error;
    console.log('updated')
    res.send(JSON.stringify({ status: 0 }))
  });
})

app.post('/contactClient', (req, res) => {
  connection.query("UPDATE user_services SET contacted=1 WHERE userServicesId="+req.body.userServicesId, function (error, results, fields) {
    if (error) throw error;
    console.log('updated')
    res.send(JSON.stringify({ status: 0 }))
  });
})

app.get('/getTurns/:user', (req, res) => {
  connection.query('SELECT serviceName, contacted,phone,name,userServicesId,turnId FROM user_turns INNER JOIN user_services ON user_services.userServicesId=user_turns.turnUserServicesId INNER JOIN services ON services.serviceId = user_turns.turnServiceId INNER JOIN users ON users.userId= user_services.userServicesUserId WHERE turnUserId = ' + `'${req.params.user}'`, function (error, results, fields) {
    if (error) throw error;
    if (results.length > 0) {
      res.send(JSON.stringify({ status: 0, turns: results}))      
    } else {
      res.send(JSON.stringify({ status: 2 }))
    }
  });
  
})

app.post('/cancelServiceContract', (req, res) => {
  connection.query("DELETE FROM user_services WHERE userServicesId ='"+req.body.id+"'", function (error, results, fields) {
    if (error) throw error;
    console.log('Deleted')
    res.send(JSON.stringify({ status: 0 }))
  });
})

app.post('/addContractService', (req, res) => {
  var sql = `INSERT INTO user_services
              (
                userServicesServiceId, userServicesUserId
              )
              VALUES
              (
                  ?, ?
              )`;
  connection.query(sql,[req.body.service, req.body.user], function (error, results, fields) {
    if (error) throw error;
    console.log(results.insertId)
    var sql = `INSERT INTO user_turns
              (
                turnServiceId, turnUserId, turnUserServicesId
              )
              VALUES
              (
                  ?, ?,?
              )`;
  connection.query(sql,[req.body.service, req.body.turnUser,results.insertId], function (error, results, fields) {
    if (error) throw error;
    console.log(results.insertId)
    res.send(JSON.stringify({ status: 0 }))

  });

  });
})

app.get('/getContractServices/:user', (req, res) => {
  connection.query('SELECT * FROM user_services INNER JOIN services ON user_services.userServicesServiceId=services.serviceId WHERE userServicesUserId = ' + `'${req.params.user}'`, function (error, results, fields) {
    if (error) throw error;
    if (results.length > 0) {
      res.send(JSON.stringify({ status: 0, services: results}))      
    } else {
      res.send(JSON.stringify({ status: 2 }))
    }
  });
  
})

app.post('/register', (req, res) =>{
  var sql = `INSERT INTO users
              (
                  name, lastname, email, phone, password, address, dni, province, location
              )
              VALUES
              (
                  ?, ?, ?, ?, ?, ?, ?, ?, ?
              )`;
  connection.query('SELECT * FROM `users` WHERE email = ' + `'${req.body.email}'`, function (error, results, fields) {
    if (error) throw error;
    if (results.length > 0) {
      res.send(JSON.stringify({ status: 1 }))
      connection.end();
    } else {
      connection.query(sql, [req.body.name, req.body.lastname, req.body.email, req.body.phone, req.body.password, req.body.address, req.body.dni, req.body.province, req.body.location], function (err, data) {
        if (err) {
            console.log(err)
            res.send(JSON.stringify({ status: 2 }))
        } else {
          res.send(JSON.stringify({status: 0, data:data}))
        }
    });
    }
  });
  
})


app.post('/createService', (req, res) =>{
  var sql = `INSERT INTO services
              (
                  user, serviceName, address, description, price, province, location, days, scheduleSelector, schedule, image, category
              )
              VALUES
              (
                  ?,?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
              )`;
  console.log(JSON.stringify(req.body.days))
  connection.query(sql, [req.body.user, req.body.name, req.body.adress, req.body.descripcion, req.body.price, req.body.province, req.body.location, JSON.stringify(req.body.days), req.body.hourSelect, JSON.stringify({fromMorning:req.body.fromMorning,
  untilMorning:req.body.untilMorning,
  fromAfternoon:req.body.fromAfternoon,
untilAfternoon:req.body.untilAfternoon}), req.body.image,req.body.categoria], function (err, data) {
    if (err) {
        console.log(err)
        res.send(JSON.stringify({ status: 2 }))
    } else {
      res.send(JSON.stringify({status: 0, data:data}))
    }
});

})


app.post('/updateService', (req, res) => {
  connection.query("UPDATE services SET  serviceName='"+req.body.name+"', address='"+req.body.adress+"', description='"+req.body.descripcion+"', price='"+req.body.price+"', province='"+req.body.province+"', location='"+req.body.location+"',  days='"+JSON.stringify(req.body.days)+"', scheduleSelector='"+req.body.hourSelect+"', schedule='"+JSON.stringify({fromMorning:req.body.fromMorning,
    untilMorning:req.body.untilMorning,
    fromAfternoon:req.body.fromAfternoon,
  untilAfternoon:req.body.untilAfternoon})+"', image='"+req.body.image+"', category='"+req.body.categoria+"' WHERE serviceId="+req.body.id, function (error, results, fields) {
    if (error) throw error;
    console.log('updated')
  });
})



app.get('/getServices/:user', (req, res) => {
  connection.query('SELECT * FROM `services` WHERE user = ' + `'${req.params.user}'`, function (error, results, fields) {
    if (error) throw error;
    if (results.length > 0) {
      res.send(JSON.stringify({ status: 0, services: results}))      
    } else {
      res.send(JSON.stringify({ status: 2 }))
    }
  });
  
})

app.get('/searchServices/:search', (req, res) => {
  var sql = 'SELECT * FROM services WHERE status = 1 AND serviceName LIKE ' + `'%${req.params.search}%'`;
  connection.query(sql, function (error, results, fields) {
    if (error) throw error;
    if (results.length > 0) {
      
      res.send(JSON.stringify({ status: 0, services: results}))      
    } else {
      res.send(JSON.stringify({ status: 2, services: [] }))
    }
  });
  
})

app.get('/getServiceById/:id', (req, res) => {
  connection.query('SELECT * FROM `services` WHERE serviceId = ' + `'${req.params.id}'`, function (error, results, fields) {
    if (error) throw error;
    if (results.length > 0) {
      res.send(JSON.stringify({ status: 0, service: results[0]}))      
    } else {
      res.send(JSON.stringify({ status: 2, }))
    }
  });
  
})

app.get('/getAllServices', (req, res) => {
  connection.query('SELECT * FROM `services` WHERE status = 1', function (error, results, fields) {
    if (error) throw error;
    if (results.length > 0) {
      res.send(JSON.stringify({ status: 0, services: results}))      
    } else {
      res.send(JSON.stringify({ status: 2 }))
    }
  });
  
})

app.post('/updateServiceStatus', (req, res) => {
  connection.query("UPDATE services SET  status='"+req.body.status+"' WHERE serviceId="+req.body.id, function (error, results, fields) {
    if (error) throw error;
    console.log('updated')
    res.send(JSON.stringify({ status: 0 }))
  });
})

app.post('/deleteService', (req, res) => {
  connection.query("DELETE FROM services WHERE serviceId ='"+req.body.id+"'", function (error, results, fields) {
    if (error) throw error;
    console.log('Deleted')
    res.send(JSON.stringify({ status: 0 }))
  });
})


app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}`)
})