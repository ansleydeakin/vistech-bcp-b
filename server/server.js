// Uncomment following to enable zipkin tracing, tailor to fit your network configuration:
// var appzip = require('appmetrics-zipkin')({
//     host: 'localhost',
//     port: 9411,
//     serviceName:'frontend'
// });

//require('appmetrics-dash').attach();
//require('appmetrics-prometheus').attach();
const appName = require('./../package').name;
const http = require('http');
const express = require('express');
const log4js = require('log4js');
const localConfig = require('./config/local.json');
const path = require('path');

const logger = log4js.getLogger(appName);
logger.level = process.env.LOG_LEVEL || 'info'
const app = express();
const server = http.createServer(app);

app.use(log4js.connectLogger(logger, { level: logger.level }));
const serviceManager = require('./services/service-manager');
require('./services/index')(app);
require('./routers/index')(app, server);

require('dotenv').load();
var encrypt = require('./library/encryption'); //For encryption
const tokenGenerator = require('./library/token_generator'); //For token generator

var bodyParser = require('body-parser')
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());

var ejs = require('ejs');
var date = new Date();

app.set('views', path.join(__dirname, '../public'));
app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);

var routes = require('./routes')
var user = require('./routes/user')
var methodOverride = require('method-override')

var session = require('express-session'); //for session middleware
app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 3000000 } //50 mins, please increase time to extend session time
}))

//////////////////////////////////////////////////////////////////////////////////////////////////

/* ADD MYSQL DB CONNECTION  ANSLEY 15/12/2018 */

var mysql = require('mysql');
var con = mysql.createConnection({
    host: "sl-us-south-1-portal.47.dblayer.com",
    port: "17869",
    user: "admin",
    password: "ZVJKNWUGFGFEXJBK",
    database: "dbBCP"
});
con.connect();

//////////////////////////////////////////////////////////////////////////////////////////////////

// **********************************Add your code here*******************************************

/* ADD LOGIN  ANSLEY 15/12/2018*/

//app.get('/token', function (req, res) {
  //const identity = req.query.identity || 'identity';
  //const room = req.query.room;
  //res.send(tokenGenerator(identity, room));
//});

app.get("/login", function (req, res) {
  if (req.session) {
    res.redirect('/dashboard');
  }
  else {
    res.redirect('/login');
  }
});

app.post('/loginsubmit', function (req, res) {

  if (req.body.constructor === Object && Object.keys(req.body).length === 0) {
    res.sendFile(path.join(__dirname, '../public', 'login.html'));
  }

    var sess = req.session; 

    var username = req.body.username;
    var password = encrypt.sha1hash(req.body.password);

    console.log(password);

    con.query('SELECT * FROM users WHERE username = \"' + username + '\" AND password = \"' + password + '\"', function (err, rows, fields) {
        if (!err) {    
       
              if (rows.length > 0) {                   

                  // Cookie info
                  req.session.username = rows[0].Username;
                  req.session.userid = rows[0].UserID;
                  req.session.roles = rows[0].Roles;
                  req.session.firstname = rows[0].Firstname;
                  req.session.Lastname = rows[0].Lastname;

                  console.log(rows[0]);
                  console.log(rows[0].UserID);
                
                  res.redirect('/dashboard');
              }
              else {
              //ERROR
              res.sendFile(path.join(__dirname, '../public', 'login.html'));
              }
        }
      else {
        //ERROR
        res.render(path.join(__dirname, '../public', 'login.html'));
      }
    });

   
});

//////////////////////////////////////////////////////////////////////////////////////////////////

/* ADD DASHBOARD ANSLEY 21/12/2018*/

app.get("/dashboard", function (req, res) {

	var username =  req.session.username;
  var userid = req.session.userid;
  var roles = req.session.roles;
  var firstname = req.session.firstname;
  var lastname = req.session.Lastname;
  
  console.log(req.session)

	if(userid == null){
		res.render(path.join(__dirname, '../public', 'login.html'));
		return;
	}
	 
	 var sql="SELECT * FROM users WHERE userid ='" + userid + "'";
	 
	   con.query(sql, function(err, rows){
  
		   console.log("hello " + username);
      
		   res.render(path.join(__dirname, '../public', 'dashboard.html'),{username:username});	  
      
		});	 

});

//////////////////////////////////////////////////////////////////////////////////////////////////

/* ADD LOGOUT DASHBOARD ANSLEY 21/12/2018*/

app.get("/logout", function (req, res) {

  if (req.session) {
    req.session.destroy(function(err) {
      return res.redirect('/login');
    })
  }

});

//////////////////////////////////////////////////////////////////////////////////////////////////

/* ADD USER MANAGEMENT ANSLEY 22/12/2018*/

app.get("/usermanagement", function (req, res) {

  var username =  req.session.username;
  var userid = req.session.userid;
  var roles = req.session.roles;
  var firstname = req.session.firstname;
  var lastname = req.session.Lastname;

  if (req.session) {

    if (req.session.roles == "admin"){

      con.query('SELECT * FROM users limit 50', function (err, rows, fields) {
        if (!err) {
            //console.log(rows[0]);
            var table = "";
            table += "<thead><tr>";
            table += "<th>UserID</th>" + "<th>Username</th>" + "<th>Password</th>" + "<th>Firstname</th>" + "<th>Lastname</th>" + "<th>Email</th>" + "<th>Role</th>"; //7
            table += "</tr></thead>";
            table += "<tbody>";
            if (rows.length > 0) {
                for (var i = 0; i < rows.length; i++) {

                    table += '<tr>';
                    table += '<td>' + rows[i].UserID + '</td>';
                    table += '<td>' + rows[i].Username + '</td>';

                    if (rows[i].Password.length > 0){
                    table += '<td>' + '*********' + '</td>';
                    }

                    table += '<td>' + rows[i].Firstname + '</td>';
                    table += '<td>' + rows[i].Lastname + '</td>';
                    table += '<td>' + rows[i].Email + '</td>';
                    table += '<td>' + rows[i].Roles + '</td>';

                    table += '</tr>';
                }
                console.log(table);
                table += '</tbody>';
                res.render(path.join(__dirname, '../public', 'usermanagement.html'), {
                    table: table
                });
            }
            else {
                //Fail
                //console.log(err.message);
                res.render(path.join(__dirname, '../public', 'login.html'));
            }
        }
        else {
            //ERROR
            console.log(err.message);
            res.render(path.join(__dirname, '../public', 'login.html'));
        }
    });

    }
    else{
      res.render(path.join(__dirname, '../public', 'login.html'));
    }

  }
  else {

    res.redirect('/login');
  
  }

});

//////////////////////////////////////////////////////////////////////////////////////////////////

/* ADD INSERT NEW USER ANSLEY 21/12/2018*/

app.get("/newuser", function (req, res) {

  var username =  req.session.username;
  var userid = req.session.userid;
  var roles = req.session.roles;
  var firstname = req.session.firstname;
  var lastname = req.session.Lastname;

  if (req.session) {

    if (req.session.roles == "admin"){
      res.sendFile(path.join(__dirname, '../public', 'newuser.html'));
    }
    else {
      res.render(path.join(__dirname, '../public', 'login.html'));
    }

  }
  else {

    res.redirect('/login');

  }
});
 

app.post("/newusersubmit", function (req, res) {

  if (req.body.constructor === Object && Object.keys(req.body).length === 0) {
    res.sendFile(path.join(__dirname, '../public', 'newuser.html'));
}

  var username =  req.session.username;
  var userid = req.session.userid;
  var roles = req.session.roles;
  var firstname = req.session.firstname;
  var lastname = req.session.Lastname;
 
  var newusername = req.body.username;
  var newpassword = encrypt.sha1hash(req.body.password);
  var newfirstname = req.body.firstname;
  var newlastname = req.body.lastname;
  var newemail = req.body.email;
  var newroles = req.body.roles;


  if (req.session) { 

    if (req.session.roles == "admin"){

      con.query('SELECT * from users WHERE username = \"' + newusername + '\" OR email = \"' + newemail + '\"', function (err, rows, fields) {
        if (!err) {
            console.log(rows);
            if (rows.length > 0) {
                //duplicate user
                res.send("Username or Email already exist");
            }
            else {
                console.log("Insert user");
                con.query("INSERT INTO users (username,password,firstname,lastname," +
                    "email,roles) VALUES ('" + newusername + "','" + newpassword + "','" + newfirstname + "','" +
                    newlastname + "','" + newemail + "','" + newroles + "')",
                    function (err, rows, fields) {
                        if (!err) {
                          res.redirect("/usermanagement");
                        }
                        else {
                            //ERROR
                            console.log(err.message);
                            console.log("Insert user error");
                            res.send("There was an issue adding the new user, please try again");
                        }
                    });
            }
        }
        else {
            //ERROR
            console.log(err);
            console.log("Select user error");
            res.sendFile(path.join(__dirname, '../public', 'newuser.html'));
        }
    });

    }
    else{
      console.log("Not admin");
      res.sendFile(path.join(__dirname, '../public', 'login.html'));
    }

  }
  else {
    console.log("No Session");
    res.redirect('/login');
  
  }

});

//////////////////////////////////////////////////////////////////////////////////////////////////

/* ADD DELETE USER ANSLEY 21/12/2018*/

app.post("/deleteuser", function (req, res) {

  var username =  req.session.username;
  var userid = req.session.userid;
  var roles = req.session.roles;
  var firstname = req.session.firstname;
  var lastname = req.session.Lastname;

  var tableuserid = req.body.tableuserid;
  console.log(tableuserid);

  if (req.session) {

    if (req.session.roles == "admin"){

      con.query('DELETE FROM users WHERE userid <> 1 and userid = \"' + tableuserid + '\"', function (err, rows, fields) {
        if (!err) {
            console.log(rows);
            res.end();
        }
        else {
            //ERROR
            console.log(err);
            console.log("Select user error");
            res.sendFile(path.join(__dirname, '../public', 'newuser.html'));
        }
    });
      
    }
    else{
      res.render(path.join(__dirname, '../public', 'login.html'));
    }

  }
  else {

    res.redirect('/login');
  
  }

});

//////////////////////////////////////////////////////////////////////////////////////////////////

/* ADD ADMIN DASHBOARD ANSLEY 21/12/2018*/

app.get("/admin", function (req, res) {

  var username =  req.session.username;
  var userid = req.session.userid;
  var roles = req.session.roles;
  var firstname = req.session.firstname;
  var lastname = req.session.Lastname;

  if (req.session) {

    if (req.session.roles == "admin"){
      res.sendFile(path.join(__dirname, '../public', 'admin.html'));
    }
    else{
      res.render(path.join(__dirname, '../public', 'login.html'));
    }

  }
  else {

    res.redirect('/login');
  
  }

});

//////////////////////////////////////////////////////////////////////////////////////////////////
/* ADD REFERENCE TABLE DISPLAY PATRICK 21/12/2018*/

app.get("/referencetables", function (req, res) {

  var username =  req.session.username;
  var userid = req.session.userid;
  var roles = req.session.roles;
  var firstname = req.session.firstname;
  var lastname = req.session.Lastname;

  if (req.session) {

    if (req.session.roles == "admin"){

      con.query('SELECT * FROM r1ImpactRef limit 50', function (err, rows, fields) {
        if (!err) {
            console.log(rows[0]);
            var table = "";
            table += "<thead><tr>";
            table += "<th>RowID</th>" + "<th>Impact Category</th>" + "<th>Rating</th>" + "<th>Description</th>";
            table += "</tr></thead>";
            table += "<tbody>";
            if (rows.length > 0) {
                for (var i = 0; i < rows.length; i++) {

                    table += '<tr>';
                    table += '<td>' + rows[i].R1ID + '</td>';
                    table += '<td>' + rows[i].ImpactCategory + '</td>';
                    table += '<td>' + rows[i].Rating + '</td>';
                    table += '<td>' + rows[i].Description + '</td>';

                    table += '</tr>';
                }
                console.log(table);
                table += '</tbody>';
                res.render(path.join(__dirname, '../public', 'referencetables.html'), {
                    table: table
                });
            }
            else {
                //Fail
                console.log(err.message);
                res.render(path.join(__dirname, '../public', 'login.html'));
            }
        }
        else {
            //ERROR
            console.log(err.message);
            res.render(path.join(__dirname, '../public', 'login.html'));
        }
    });

    }
    else{
      res.render(path.join(__dirname, '../public', 'login.html'));
    }

  }
  else {

    res.redirect('/login');
  
  }

});

//////////////////////////////////////////////////////////////////////////////////////////////////
// **********************************************************************************************

/* START THE APP & LISTEN TO THE PORT */

const port = process.env.PORT || localConfig.port;
server.listen(port, function(){
  logger.info(`BCPAPP listening on http://localhost:${port}/appmetrics-dash`);
  logger.info(`BCPAPP listening on http://localhost:${port}`);
});

//app.use(function (req, res, next) {
  //res.sendFile(path.join(__dirname, '../public', '404.html'));
//});

//app.use(function (err, req, res, next) {
	//res.sendFile(path.join(__dirname, '../public', '500.html'));
//});

module.exports = server;