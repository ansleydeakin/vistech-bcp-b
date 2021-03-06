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
//const tokenGenerator = require('./library/token_generator'); //For token generator

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
  secret: 'v1st3chbcpm3',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 3000000 } //50 mins, please increase time to extend session time
}))

var jwt = require('jsonwebtoken');

//var pdf = require('pdfkit'); //pdfkit to generate pdf file
var fs = require('fs');
var pdf = require('html-pdf');

//////////////////////////////////////////////////////////////////////////////////////////////////

/* ADD MYSQL DB CONNECTION  ANSLEY 15/12/2018 MAIN MySQL CONNECTION */

var mysql = require('mysql');
var con = mysql.createConnection({
    host: "sl-us-south-1-portal.47.dblayer.com",
    port: "17869",
    user: "admin",
    password: "ZVJKNWUGFGFEXJBK",
    database: "dbBCP",
    multipleStatements: true //enable mutiple select statements
});
con.connect();
con.query('SET SESSION sql_mode = ""', function (err, rows, fields) {} //disable sql_mode options
);

//////////////////////////////////////////////////////////////////////////////////////////////////

/* SENDGRID API ANSLEY 30/12/2018*/

const SENDGRID_API_KEY = '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';
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(SENDGRID_API_KEY);

 // using SendGrid's v3 Node.js Library
  // https://github.com/sendgrid/sendgrid-nodejs

//////////////////////////////////////////////////////////////////////////////////////////////////

/* TEST SENDEMAIL (SENDGRID API) ANSLEY 30/12/2018*/
  
  app.get("/sendemail", function (req, res) {
  var msg = {
    to: 'lammyz_33@hotmail.com',
    from: 'noreply@bcpme.com',
    subject: 'Sending with SendGrid is Fun',
    text: 'and easy to do anywhere, even with Node.js',
    html: '<strong>and easy to do anywhere, even with Node.js</strong>',
  };
  sgMail.send(msg);
  console.log(msg);
  });
  
  //////////////////////////////////////////////////////////////////////////////////////////////////

// **********************************Add your code here*******************************************

/* ADD LOGIN  ANSLEY 15/12/2018*/
/* UPDATE LOGIN PARAM & MySQL Query ANSLEY 30/12/2018*/


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

    var email = req.body.inputEmail;
    var password = encrypt.sha1hash(req.body.inputPassword);

    //var username = req.body.username;
    //var password = encrypt.sha1hash(req.body.password);

    console.log(password);

    con.query('SELECT * FROM users WHERE email = \"' + email + '\" AND password = \"' + password + '\"', function (err, rows, fields) {
        if (!err) {    
       
              if (rows.length > 0) {                   

                  // Cookie info
                  req.session.username = rows[0].Username;
                  req.session.userid = rows[0].UserID;
                  req.session.roles = rows[0].Roles;
                  req.session.firstname = rows[0].Firstname;
                  req.session.Lastname = rows[0].Lastname;
                  req.session.email = rows[0].Email;
                  req.session.department = rows[0].Department;

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
  var department = req.session.department;

  var name = firstname + ' ' + lastname
  
  console.log(req.session)

	if(userid == null){
		res.render(path.join(__dirname, '../public', 'login.html'));
		return;
	}
	 
	 var sql="SELECT * FROM users WHERE userid ='" + userid + "'";
	 
	   con.query(sql, function(err, rows){
  
		   console.log("hello " + username);
      
		   res.render(path.join(__dirname, '../public', 'home.html'),{name:name,userid:userid,department:department});	  
      
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

  var username = req.session.username;
  var userid = req.session.userid;
  var roles = req.session.roles;
  var firstname = req.session.firstname;
  var lastname = req.session.Lastname;
  var department = req.session.department;

  if (req.session) {

    if (req.session.roles == "admin"){

      con.query('SELECT * FROM users limit 50', function (err, rows, fields) {
        if (!err) {
            //console.log(rows[0]);
            var table = "";
            table += "<thead><tr>";
            table += "<th>UserID</th>" + "<th>Username</th>" + "<th>Password</th>" + "<th>Firstname</th>" + "<th>Lastname</th>" + "<th>Email</th>" + "<th>Role</th>" + "<th>Department</th>"; //7
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
                    table += '<td>' + rows[i].Department + '</td>';

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
      
     // res.sendFile(path.join(__dirname, '../public', 'newuser.html'));
     con.query('SELECT DISTINCT Program FROM r41FuncRef where Program <> "Information Technology"', function (err, rows, fields) {
      if (!err) {
        
          var userdepartment = "";
     
          if (rows.length > 0) {
              for (var i = 0; i < rows.length; i++) {
                  
                userdepartment += '<option value= \"' + rows[i].Program + '\">' + rows[i].Program + '</option>';
                   
              }
              console.log(userdepartment);
          
              res.render(path.join(__dirname, '../public', 'newuser.html'), {
                  userdepartment: userdepartment
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
  var department = req.body.department;


  if (req.session) { 

    if (req.session.roles == "admin"){

      con.query('SELECT * from users WHERE username = \"' + newusername + '\" OR email = \"' + newemail + '\"', function (err, rows, fields) {
        if (!err) {
            console.log(rows);
            if (rows.length > 0) {
                //duplicate user
                //res.send("Username or Email already exist");
                res.render(path.join(__dirname, '../public', 'message.html'),{title:'There was an issue with your request', message: 'Username or Email already exist' });	
            }
            else {
                console.log("Insert user");
                con.query("INSERT INTO users (username,password,firstname,lastname," +
                    "email,roles,department) VALUES ('" + newusername + "','" + newpassword + "','" + newfirstname + "','" +
                    newlastname + "','" + newemail + "','" + newroles + "','" + department + "')",
                    function (err, rows, fields) {
                        if (!err) {
                          res.redirect("/usermanagement");
                        }
                        else {
                            //ERROR
                            console.log(err.message);
                            console.log("Insert user error");
                            //res.send("There was an issue adding the new user, please try again");
                            res.render(path.join(__dirname, '../public', 'message.html'),{title:'There was an issue with your request', message: 'There was an issue adding the new user, please try again' });	
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
/* ADD REFERENCE TABLE 1 DISPLAY PATRICK 27/12/2018*/

app.get("/r1", function (req, res) {

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
                res.render(path.join(__dirname, '../public', 'r1.html'), {
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
/* ADD REFERENCE TABLE 2.1 DISPLAY PATRICK 29/12/2018*/

app.get("/r21", function (req, res) {

  var username =  req.session.username;
  var userid = req.session.userid;
  var roles = req.session.roles;
  var firstname = req.session.firstname;
  var lastname = req.session.Lastname;

  if (req.session) {

    if (req.session.roles == "admin"){

      con.query('SELECT * FROM r21DepRef limit 50', function (err, rows, fields) {
        if (!err) {
            console.log(rows[0]);
            var table = "";
            table += "<thead><tr>";
            table += "<th>RowID</th>" + "<th>Dependency Scale</th>" + "<th>Level</th>" + "<th>Description</th>" + "<th>Summary</th>";
            table += "</tr></thead>";
            table += "<tbody>";
            if (rows.length > 0) {
                for (var i = 0; i < rows.length; i++) {

                    table += '<tr>';
                    table += '<td>' + rows[i].R21ID + '</td>';
                    table += '<td>' + rows[i].DependencyScale + '</td>';
                    table += '<td>' + rows[i].Level + '</td>';
                    table += '<td>' + rows[i].Description + '</td>';
                    table += '<td>' + rows[i].Summary + '</td>';

                    table += '</tr>';
                }
                console.log(table);
                table += '</tbody>';
                res.render(path.join(__dirname, '../public', 'r21.html'), {
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
/* ADD REFERENCE TABLE 2.2 DISPLAY PATRICK 29/12/2018*/

app.get("/r22", function (req, res) {

  var username =  req.session.username;
  var userid = req.session.userid;
  var roles = req.session.roles;
  var firstname = req.session.firstname;
  var lastname = req.session.Lastname;

  if (req.session) {

    if (req.session.roles == "admin"){

      con.query('SELECT * FROM r22MTPD limit 50', function (err, rows, fields) {
        if (!err) {
            console.log(rows[0]);
            var table = "";
            table += "<thead><tr>";
            table += "<th>RowID</th>" +  "<th>Rating</th>" + "<th>Criteria</th>";
            table += "</tr></thead>";
            table += "<tbody>";
            if (rows.length > 0) {
                for (var i = 0; i < rows.length; i++) {

                    table += '<tr>';
                    table += '<td>' + rows[i].R22ID + '</td>';
                    table += '<td>' + rows[i].Rating + '</td>';
                    table += '<td>' + rows[i].Criteria + '</td>';

                    table += '</tr>';
                }
                console.log(table);
                table += '</tbody>';
                res.render(path.join(__dirname, '../public', 'r22.html'), {
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
/* ADD REFERENCE TABLE 3 DISPLAY PATRICK 29/12/2018*/

app.get("/r3", function (req, res) {

  var username =  req.session.username;
  var userid = req.session.userid;
  var roles = req.session.roles;
  var firstname = req.session.firstname;
  var lastname = req.session.Lastname;

  if (req.session) {

    if (req.session.roles == "admin"){

      con.query('SELECT * FROM r3SysReg limit 50', function (err, rows, fields) {
        if (!err) {
            console.log(rows[0]);
            var table = "";
            table += "<thead><tr>";
            table += "<th>RowID</th>" + "<th>System</th>" + "<th>Type</th>" + "<th>Class</th>" + "<th>Category</th>" + "<th>Function</th>";
            table += "</tr></thead>";
            table += "<tbody>";
            if (rows.length > 0) {
                for (var i = 0; i < rows.length; i++) {

                    table += '<tr>';
                    table += '<td>' + rows[i].R3ID + '</td>';
                    table += '<td>' + rows[i].System + '</td>';
                    table += '<td>' + rows[i].Type + '</td>';
                    table += '<td>' + rows[i].Class + '</td>';
                    table += '<td>' + rows[i].Category + '</td>';
                    table += '<td>' + rows[i].Function + '</td>';

                    table += '</tr>';
                }
                console.log(table);
                table += '</tbody>';
                res.render(path.join(__dirname, '../public', 'r3.html'), {
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
/* ADD REFERENCE TABLE 4.1 DISPLAY PATRICK 29/12/2018*/

app.get("/r41", function (req, res) {

  var username =  req.session.username;
  var userid = req.session.userid;
  var roles = req.session.roles;
  var firstname = req.session.firstname;
  var lastname = req.session.Lastname;

  if (req.session) {

    if (req.session.roles == "admin"){

      con.query('SELECT * FROM r41FuncRef limit 50', function (err, rows, fields) {
        if (!err) {
            console.log(rows[0]);
            var table = "";
            table += "<thead><tr>";
            table += "<th>RowID</th>" + "<th>Program</th>" + "<th>Clinical Unit</th>";
            table += "</tr></thead>";
            table += "<tbody>";
            if (rows.length > 0) {
                for (var i = 0; i < rows.length; i++) {

                    table += '<tr>';
                    table += '<td>' + rows[i].R41ID + '</td>';
                    table += '<td>' + rows[i].Program + '</td>';
                    table += '<td>' + rows[i].ClinicalUnit + '</td>';

                    table += '</tr>';
                }
                console.log(table);
                table += '</tbody>';
                res.render(path.join(__dirname, '../public', 'r41.html'), {
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
/* ADD REFERENCE TABLE 4.2 DISPLAY PATRICK 29/12/2018*/

app.get("/r42", function (req, res) {

  var username =  req.session.username;
  var userid = req.session.userid;
  var roles = req.session.roles;
  var firstname = req.session.firstname;
  var lastname = req.session.Lastname;

  if (req.session) {

    if (req.session.roles == "admin"){

      con.query('SELECT * FROM r42SysClassRef limit 50', function (err, rows, fields) {
        if (!err) {
            console.log(rows[0]);
            var table = "";
            table += "<thead><tr>";
            table += "<th>RowID</th>" + "<th>Class</th>" + "<th>Description</th>" + "<th>MTPD</th>" + "<th>RTO</th>" + "<th>RPO</th>";
            table += "</tr></thead>";
            table += "<tbody>";
            if (rows.length > 0) {
                for (var i = 0; i < rows.length; i++) {

                    table += '<tr>';
                    table += '<td>' + rows[i].R42ID + '</td>';
                    table += '<td>' + rows[i].Class + '</td>';
                    table += '<td>' + rows[i].Description + '</td>';
                    table += '<td>' + rows[i].MTPD + '</td>';
                    table += '<td>' + rows[i].RTO + '</td>';
                    table += '<td>' + rows[i].RPO + '</td>';

                    table += '</tr>';
                }
                console.log(table);
                table += '</tbody>';
                res.render(path.join(__dirname, '../public', 'r42.html'), {
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
/* ADD BCP PLANS DISPLAY PATRICK 28/12/2018*/

app.get("/bcpplans", function (req, res) {

  var username =  req.session.username;
  var userid = req.session.userid;
  var roles = req.session.roles;
  var firstname = req.session.firstname;
  var lastname = req.session.Lastname;

  if (req.session) {

    if (req.session.roles == "admin"){

      con.query('SELECT * FROM OS5BCP limit 50', function (err, rows, fields) {
        if (!err) {
            console.log(rows[0]);
            var table = "";
            table += "<thead><tr>";
            table += "<th>BCP ID</th>" + "<th>Program</th>" + "<th>System</th>" + "<th>Function</th>" + "<th>Activity</th>" + "<th>Clinical Unit</th>" + "<th>Immediate Action</th>" + "<th>Maintained Duration</th>" + "<th>Sustained Action</th>" + "<th>Resources</th>" + "<th>Draft</th>";
            table += "</tr></thead>";
            table += "<tbody>";
            if (rows.length > 0) {
                for (var i = 0; i < rows.length; i++) {

                    table += '<tr>';
                    table += '<td>' + rows[i].OS5ID + '</td>';
                    table += '<td>' + rows[i].Program + '</td>';
                    table += '<td>' + rows[i].System + '</td>';
                    table += '<td>' + rows[i].Function + '</td>';
                    table += '<td>' + rows[i].Activity + '</td>';
                    table += '<td>' + rows[i].ClinicalUnit + '</td>';
                    table += '<td>' + rows[i].ImmediateAction + '</td>';
                    table += '<td>' + rows[i].MaintainDuration + '</td>';
                    table += '<td>' + rows[i].SustainAction + '</td>';
                    table += '<td>' + rows[i].Resources + '</td>';
                    table += '<td>' + rows[i].Draft + '</td>';

                    table += '</tr>';
                }
                console.log(table);
                table += '</tbody>';
                res.render(path.join(__dirname, '../public', 'bcpplans.html'), {
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
/* ADD CRITICALITY MATRIX DISPLAY PATRICK 28/12/2018*/

app.get("/critmatrix", function (req, res) {

  var username =  req.session.username;
  var userid = req.session.userid;
  var roles = req.session.roles;
  var firstname = req.session.firstname;
  var lastname = req.session.Lastname;

  if (req.session) {

    if (req.session.roles == "admin"){

      con.query('SELECT * FROM OS4Crit limit 50', function (err, rows, fields) {
        if (!err) {
            console.log(rows[0]);
            var table = "";
            table += "<thead><tr>";
            table += "<th>Matrix ID</th>" + "<th>System</th>" + "<th>Type</th>" + "<th>Class</th>" + "<th>RTO</th>" + "<th>RPO</th>" + "<th>MTPD</th>" + "<th>Dependencies</th>" + "<th>Other</th>";
            table += "</tr></thead>";
            table += "<tbody>";
            if (rows.length > 0) {
                for (var i = 0; i < rows.length; i++) {

                    table += '<tr>';
                    table += '<td>' + rows[i].OS4ID + '</td>';
                    table += '<td>' + rows[i].System + '</td>';
                    table += '<td>' + rows[i].Type + '</td>';
                    table += '<td>' + rows[i].Class + '</td>';
                    table += '<td>' + rows[i].RTO + '</td>';
                    table += '<td>' + rows[i].RPO + '</td>';
                    table += '<td>' + rows[i].MTPD + '</td>';
                    table += '<td>' + rows[i].Dependencies + '</td>';
                    table += '<td>' + rows[i].Other + '</td>';

                    table += '</tr>';
                }
                console.log(table);
                table += '</tbody>';
                res.render(path.join(__dirname, '../public', 'critmatrix.html'), {
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
/* ADD RESET USER ANSLEY 30/12/2018 */

app.get("/reset", function (req, res) {
      res.sendFile(path.join(__dirname, '../public', 'reset.html'));
});

app.post("/resetsubmit", function (req, res) {

  if (req.body.constructor === Object && Object.keys(req.body).length === 0) {
    res.sendFile(path.join(__dirname, '../public', 'reset.html'));
}
 
  var email = req.body.email;

  var newtoken = jwt.sign({
    data: email
  }, 'secret', { expiresIn: '1h' });; //token expires in an hour

      con.query('SELECT * from users WHERE email = \"' + email + '\"', function (err, rows, fields) {
        if (!err) {
            console.log(rows);
            if (rows.length > 0) {

              console.log(newtoken);

              var firstname = rows[0].Firstname;
              var lastname = rows[0].Lastname;
              var fullname = firstname + ' ' + lastname

              var msg = {
                to: email,
                from: 'noreply@bcpme.com.au',
                subject: 'BCPme - Reset Password',
                text: 'Hi ' + fullname + ', ' + 'This link will expire in one hour, Please click on the following link to reset your password - ' +  'https://bcpapp.mybluemix.net/changepass?token='+newtoken,
                html: 'Hi ' + fullname + ', ' + '<br>' + 'This link will expire in one hour, please click on the following link to reset your password - ' + '<br>' + 'https://bcpapp.mybluemix.net/changepass?token=' + newtoken ,
              };
              sgMail.send(msg);
              console.log(msg);
              //res.send('Email with instructions has been sent');
              res.render(path.join(__dirname, '../public', 'message.html'),{title:'Success', message: 'Email with instructions has been sent' });
              
            }
            else {
               //res.send("Account does not exist");
                res.render(path.join(__dirname, '../public', 'message.html'),{title:'There was an issue with your request', message: 'Account does not exist' });
                res.end();
            }
        }
        else {
            //ERROR
            console.log(err);
            console.log("Select user error");
            res.sendFile(path.join(__dirname, '../public', 'reset.html'));
        }
    });

});

//////////////////////////////////////////////////////////////////////////////////////////////////
/* ADD CHANGE PASSWORD (RESET PASSWORD) ANSLEY 31/12/2018 */

app.get("/changepass", function (req, res) {

  if (req.query.constructor === Object && Object.keys(req.query).length === 0) {
    res.sendFile(path.join(__dirname, '../public', 'reset.html'));
}

  var token = req.query.token;
  req.session.destroy

  try {

    var decoded = jwt.verify(token, 'secret');
    
    console.log(decoded); 
    console.log(token); 
    console.log('email address ' + String(decoded.data)); 

    var email = String(decoded.data);

    con.query('SELECT * FROM users WHERE Email = \"' + email + '\"', function (err, rows, fields) {

      if (!err) {    
     
            if (rows.length > 0) {                   
                // Cookie info
                req.session.username = rows[0].Username;
                req.session.userid = rows[0].UserID;
                req.session.roles = rows[0].Roles;
                req.session.firstname = rows[0].Firstname;
                req.session.lastname = rows[0].Lastname;
                req.session.email = rows[0].Email;

                console.log(rows[0]);
                console.log(rows[0].UserID);
              
                res.sendFile(path.join(__dirname, '../public', 'changepass.html'));
            }
            else {
            //ERROR
            console.log('no rows');
            res.sendFile(path.join(__dirname, '../public', 'login.html'));
            }
      }
    else {
      //ERROR
      console.log('error sql');
      res.render(path.join(__dirname, '../public', 'login.html'));
    }
  });

  } catch(err) {
    
    // err
    //res.send('Invalid link - please try again');
    res.render(path.join(__dirname, '../public', 'message.html'),{title:'There was an issue with your request', message: 'Link is invalid' });
  
    }

});


app.post("/changepasssubmit", function (req, res) {

  if (req.body.constructor === Object && Object.keys(req.body).length === 0) {
    res.sendFile(path.join(__dirname, '../public', 'reset.html'));
  }

  var password = encrypt.sha1hash(req.body.password);
  var email = String(req.session.email);

  if (req.session) {

    con.query('UPDATE users SET password = \"' + password + '\" WHERE email = \"' + email + '\"', function (err, rows, fields) {

      if (!err) {    
            console.log(rows);
                      
              //res.send('Password has been changed successfully');
              res.render(path.join(__dirname, '../public', 'message.html'),{title:'Success', message: 'Password has been changed successfully' });
          
      }
      else {
      //ERROR
      res.render(path.join(__dirname, '../public', 'login.html'));
      }

    });
  }

});
//////////////////////////////////////////////////////////////////////////////////////////////////

/* ADD SYSTEMS IMPACT PATH ANSLEY 06/01/2019 */

app.get("/sysimpact", function (req, res) {

  var username =  req.session.username;
  var userid = req.session.userid;
  var roles = req.session.roles;
  var firstname = req.session.firstname;
  var lastname = req.session.Lastname;

  if (req.session.userid) {

    if (req.session.roles == "admin"){

      con.query('SELECT * FROM OS1SysImpactPaths', function (err, rows, fields) {
        if (!err) {
            //console.log(rows[0]);
            var table = "";
            table += "<thead><tr>";
            table += "<th>System ID</th>" + "<th>System</th>" + "<th>Acronym</th>" + "<th>Program</th>" + "<th>ClinicalUnit</th>" + "<th>Function</th>" + "<th>Comment</th>"; //7
            table += "</tr></thead>";
            table += "<tbody>";
            if (rows.length > 0) {
                for (var i = 0; i < rows.length; i++) {

                    table += '<tr>';

                    table += '<td>' + rows[i].OS1ID + '</td>';
                    table += '<td>' + rows[i].System + '</td>';
                    table += '<td>' + rows[i].Acronym + '</td>';
                    table += '<td>' + rows[i].Program + '</td>';
                    table += '<td>' + rows[i].ClinicalUnit + '</td>';
                    table += '<td>' + rows[i].Function + '</td>';
                    table += '<td>' + rows[i].Comment + '</td>';

                    table += '</tr>';
                }
                console.log(table);
                table += '</tbody>';
                res.render(path.join(__dirname, '../public', 'sysimpactpaths.html'), {
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
/* ADD PLAN CREATION ANSLEY 13/01/2019 */


app.get("/plan", function (req, res) {

  var username =  req.session.username;
  var userid = req.session.userid;
  var roles = req.session.roles;
  var firstname = req.session.firstname;
  var lastname = req.session.Lastname;
  var department = req.session.department;

  var name = firstname + ' ' + lastname;
  var BCPID = "";

  console.log('BCP ID ' + req.session.MyBCPID) 

  if (req.session.userid) {

    con.query('SELECT * FROM MyBCP WHERE userid = \"' + userid + '\"  and Status < 6 limit 1', function (err, rows, fields) {
    if (!err && rows.length > 0){
      if (rows[0].Status == 1) { //MySystem

          req.session.MyBCPID = rows[0].MyBCPID;

          var BCPID = req.session.MyBCPID;

          var LastUpdated = rows[0].LastUpdated;
          
          console.log('SET BCP ID ' + BCPID);

          var ActivityQuery = 'SELECT SYSTABLE.System, SYSTABLE.Program, SYSTABLE.ClinicalUnit, count(Activity) AS NoOfActivity, MySysID FROM' 
          + '(SELECT MySystems.System, MySystems.Program, MySystems.ClinicalUnit, SystemActivities.Activity, MySystems.MySysID FROM MySystems'
          + ' INNER JOIN SystemActivities ON MySystems.MySysID = SystemActivities.MySysID'
          + ' WHERE MySystems.UserID=' + userid +' and MySystems.MyBCPID = ' + BCPID + ') AS SYSTABLE'
          + ' GROUP BY SYSTABLE.System, SYSTABLE.Program, SYSTABLE.ClinicalUnit'
          
          console.log(ActivityQuery)

         // con.query('SELECT System, Program, ClinicalUnit, Count(Activity) as NoOfActivity FROM MySystems WHERE UserID= \"' + userid + '\" and Completed = \"' + '0' + '\" GROUP BY System', function (err, rows, fields) {
         con.query(ActivityQuery, function (err, rows, fields) { 
            if (!err) {
           
              var table = "";

              console.log(rows);
            
                if (rows.length > 0) {
                  for (var i = 0; i < rows.length; i++) {
                    table += "<tr>";

                    table += '<td>' + rows[i].System + '</td>';
                    table += '<td>' + rows[i].Program + '</td>';
                    table += '<td>' + rows[i].ClinicalUnit + '</td>';
                    table += '<td>' + rows[i].NoOfActivity + '</td>';
                    table += '<td> <a href="/system?mysystemid='+ rows[i].MySysID +'"> Edit </a></td>';

                    table += '</tr>';
                  }
                
                        console.log(table);
                        var progress = '<li id="sysprogress" class="li complete">';
        
                      res.render(path.join(__dirname, '../public', 'plan.html'), {
                        name:name, userid:userid, i:i, table:table,LastUpdated:LastUpdated,progress:progress
                      });
                }
                else {
                //Fail
                  var system = "";
                  var i = 0;
                  var progress = '<li class="li inprogress">';



                  res.render(path.join(__dirname, '../public', 'plan.html'), {
                    name:name, userid:userid,i:i,table:table,LastUpdated:LastUpdated,progress:progress
                  });
                }
            }
            else {
            //ERROR
              console.log(err.message);
              res.render(path.join(__dirname, '../public', 'login.html'));
            }
        });
      }
      else if (rows[0].Status == 2){ //Importance
        res.redirect("/myimportance");
      }
      else if (rows[0].Status == 3){ //Continuity
        res.redirect("/myctyhome");
      }
      else if (rows[0].Status == 4){ //BCPSummary
        res.redirect("/bcpsummary");
      }
      else if (rows[0].Status == 5){ //BCPSubmit
        res.redirect("/bcpsubmithome");
      }
    }
    else if (!err && rows.length <= 0 ||rows[0].Status > 5){

      console.log('Insert new BCP');
      req.session.MyBCPID = undefined;
      req.session.activityid = undefined;
      req.session.systemid = undefined;

      var Query = 'INSERT INTO MyBCP (DateCreated,Status,UserID,LastUpdated) VALUES (NOW(), 1' + ',' + userid + ', NOW())'
      console.log(Query);

      con.query(Query,function (err, rows, fields) {
                    if (!err) {
                      res.redirect("/plan");
                      console.log(rows);
                    }
      });
  }
    });
  }
  else {

    res.redirect('/login');
  }

});

//////////////////////////////////////////////////////////////////////////////////////////////////
/* ADDED FETCH SYSTEM ANSLEY 14/01/2019 */
/* UPDATED 19/01/2019 */

app.get("/system", function (req, res) {

  var username =  req.session.username;
  var userid = req.session.userid;
  var roles = req.session.roles;
  var firstname = req.session.firstname;
  var lastname = req.session.Lastname;
  var department = req.session.department;
  var BCPID = req.session.MyBCPID;

  var name = firstname + ' ' + lastname;

  var getSYSID = req.query.mysystemid;
  var SYSID = req.session.systemid;

  console.log('/system - start')
  
  if (req.session.userid) {

    var checksysquery = 'SELECT * FROM MySystems WHERE UserID = ' + userid + ' and Completed = 0 and MyBCPID = ' + BCPID + ' limit 1';

    con.query(checksysquery, function (err, rows, fields) {
      console.log(SYSID);

      if (!err){

        //req.session.systemid = rows[0].MySysID;

        //console.log('System ID ' + SYSID);
    
        if (getSYSID||SYSID){ 

            console.log('--------- 2')
            con.query('SELECT * FROM MySystems WHERE MySysID = ' + SYSID + ' limit 1; SELECT * FROM SystemActivities WHERE MySysID= ' + SYSID, function (err, rows, fields) {
              if (!err) {
                 
                  var system = "";
                  var program = "";
                  var unit = "";
                  var description = "";
                  var comment = "";
                  var table = "";
      
                  var result1 = rows[0];
                  var result2 = rows[1];
      
                  console.log(result1[0]);
                 
                  if (result1.length > 0) {
      
                            program += '<select class="form-control" readonly id="program" name="program">';
                            program += '<option value= \"' + result1[0].Program + '\">' + result1[0].Program + '</option>';
                            program += '</select>';
      
                            system += '<select class="form-control" readonly id="system" name="system">';
                            system += '<option value= \"' + result1[0].System + '\">' + result1[0].System + '</option>';
                            system += '</select>';
      
                            unit += '<select class="form-control" readonly id="unit" name="unit">';
                            unit += '<option value= \"' + result1[0].ClinicalUnit + '\">' + result1[0].ClinicalUnit + '</option>';
                            unit += '</select>';
      
                            description = '<input type="text" class="form-control" readonly id="description" name="description" value=' + 'System Description' + '>';
                            comment = '<input type="text" class="form-control" readonly id="comment" name="comment" value=' + 'Contact-Ansley' + '>';
      
                  }
                  if (result2.length > 0){

                    console.log('--------- Result 2 Activities')
                    console.log(result2)
      
                    for (var i = 0; i < result2.length; i++) {
      
                      table += "<tr>";
                      
                      table += '<td>' + result2[i].ActFunction + '</td>';
                      table += '<td>' + result2[i].Activity + '</td>';
                      table += '<td>' + result2[i].ActivityDep + '</td>';
                      table += '<td> <a href="/activities?activity='+ result2[i].Activity + '&function='+ result2[i].ActFunction + '"> Edit </a> </td>';
                      
                      table += '</tr>';
      
                    }
      
                  }

                      res.render(path.join(__dirname, '../public', 'mySystemHome.html'), {
                        system: system, program:program,unit:unit,description:description,comment:comment,table:table,name:name, userid:userid
                    });
                  
                  }
                  else {
                      //Fail
                      console.log('failed 1');
                      res.render(path.join(__dirname, '../public', 'home.html'), {
                        name:name,userid:userid,department:department
                    });
                  }
            });
          
          }
          else { 

            console.log('--------- 1')
            con.query('SELECT * FROM r3SysReg; SELECT DISTINCT Program FROM r41FuncRef', function (err, rows, fields) {
              if (!err) {
                 
                  var system = "";
                  var program = "";
                  var unit = "";
                  var description = "";
                  var comment = "";
                  var table = "";
      
                  var result1 = rows[0];
                  var result2 = rows[1];
      
                  console.log(result1[1]);
                 
                  if (rows.length > 0) {
      
                    system += '<select class="form-control" id="system" name="system">';
                    system += '<option value="" hidden >Make a selection</option>';
      
                    program += '<select class="form-control" id="program" name="program">';
                    program += '<option value="" hidden >Make a selection</option>';
      
                      for (var i = 0; i < result1.length; i++) {
      
                          system += '<option value= \"' + result1[i].System + '\">' + result1[i].System + '</option>';
      
                      }
                      for (var i = 0; i < result2.length; i++) {
      
                        program += '<option value= \"' + result2[i].Program + '\">' + result2[i].Program + '</option>';
      
                      }
                      console.log(program);
      
                      system += '</select>';
                      program += '</select>';
      
                      description = '<input type="text" class="form-control" readonly id="description" name="description">';
                      comment = '<input type="text" class="form-control" readonly id="comment" name="comment">';
                  
                      res.render(path.join(__dirname, '../public', 'mySystemHome.html'), {
                          system: system, program:program,unit:unit,description:description,comment:comment, table:table, name:name, userid:userid
                      });
                      
                  }
                  else {
                      //Fail
                      console.log('failed 1');
                      res.render(path.join(__dirname, '../public', 'home.html'), {
                        name:name,userid:userid,department:department
                    });
                  }
              }
              else {
                  //ERROR
                  console.log('failed 2');
                  res.render(path.join(__dirname, '../public', 'home.html'), {
                    name:name,userid:userid,department:department
                });
              }
            });
          }
  } 
  else {
    res.redirect('/login');
  }
  });
  }  
  else {
    res.redirect('/login');
  }

});


//////////////////////////////////////////////////////////////////////////////////////////////////

/* SUBMIT SYSTEM & REDIRECT TO ACTIVITIES ANSLEY 19/01/2019 */

app.get("/submitsystem", function (req, res) {

  var userid = req.session.userid;
  var BCPID = req.session.MyBCPID;
  var SYSID = req.session.systemid;

  var system = req.query.system;
  var description = req.query.description;
  var program = req.query.program;
  var clinicalunit = req.query.unit;
  var comment = req.query.comment;

  if (req.session.userid){

    console.log(req.session);

    if (SYSID === undefined){

              console.log("Insert MySystems");
              con.query("INSERT INTO MySystems (System,Description,Program,ClinicalUnit,Comment,Completed, UserID, MyBCPID" +
                  ") VALUES ('" + system + "','" + description + "','" + program + "','" +
                  clinicalunit + "','" + comment + "','" + '0' + "','" + userid + "','" + BCPID + "')" ,
                  function (err, rows, fields) {
                      if (!err) {

                        console.log('UserID is:'+userid +' and BCPID is:' +BCPID);

                        con.query('SELECT * FROM MySystems WHERE UserID = ' + userid +' and MyBCPID = ' + BCPID + ' and Completed = 0 limit 1', function (err, rows, fields) {
                          if (!err && rows.length > 0){
                            req.session.systemid = rows[0].MySysID;
                            console.log('set systemid');
                          }
                        });
                        res.redirect("/activities");
                      }
                      else {
                        res.redirect("/system");     
                        console.log(err)                   
                      }
              });
    }  
    else {
      res.redirect("/activities");
    }
  }  
});


//////////////////////////////////////////////////////////////////////////////////////////////////

/* FETCH CLINIC UNIT BASED ON PROGRAM ANSLEY 15/01/2019 */

app.get("/unit", function (req, res) {

    var selectedprogram = req.query.selectedprogram;
    
    console.log(selectedprogram);

      con.query('SELECT ClinicalUnit FROM r41FuncRef WHERE Program=\"' + selectedprogram + '\"', function (err, rows, fields) {

        if (!err) {
           
            var clinicalunit = "";
           
            if (rows.length > 0) {

              clinicalunit += '<select class="form-control" id="unit" name="unit">';
              clinicalunit += '<option value="" hidden >Make a selection</option>';

                for (var i = 0; i < rows.length; i++) {

                  clinicalunit += '<option value=\"' + rows[i].ClinicalUnit + '\">' + rows[i].ClinicalUnit + '</option>';

                }
                
                clinicalunit += '</select>';

                console.log(clinicalunit);
                res.send(clinicalunit);
            

            }
            else {
              res.end()
            }
      }

    });

});


//////////////////////////////////////////////////////////////////////////////////////////////////
/* ADD ACTIVITIES ANSLEY 16/01/2019 */

app.get("/activities", function (req, res) {

  var username =  req.session.username;
  var userid = req.session.userid;
  var roles = req.session.roles;
  var firstname = req.session.firstname;
  var lastname = req.session.Lastname;
  var department = req.session.department;

  var name = firstname + ' ' + lastname
  var activity = req.query.activity;
  var funct = req.query.function;

  if (req.session.userid) {

      con.query('SELECT DISTINCT Function FROM Function', function (err, rows, fields) {
        if (!err) {
           
            var functionlist = "";
           
            if (rows.length > 0) {
                for (var i = 0; i < rows.length; i++) {
                  
                  if(funct && (i == 0)){
                    functionlist += '<option hidden value= \"' + funct + '\">' + funct + '</option>';
                  } else {
                    functionlist += '<option hidden >Make a selection</option>'
                    functionlist += '<option value= \"' + rows[i].Function + '\">' + rows[i].Function + '</option>';
                  }
                }
            
                res.render(path.join(__dirname, '../public', 'myActivity.html'), {
                  functionlist: functionlist, name:name, userid:userid, activity:activity
                });
            }
            else {
                //Fail
                //console.log(err.message);
                res.render(path.join(__dirname, '../public', 'plan.html'), {
                  name:name,userid:userid,department:department
              });
            }
        }
        else {
            //ERROR
            console.log(err.message);
            res.render(path.join(__dirname, '../public', 'plan.html'), {
              name:name,userid:userid,department:department
          });
        }
    });

  }
  else {

    res.redirect('/login');
  
  }

});
//////////////////////////////////////////////////////////////////////////////////////////////////
/* MY IMPORTANCE RATINGS PATRICK 16/01/2019 */

app.get("/myimportance", function (req, res) {

  var username =  req.session.username;
  var userid = req.session.userid;
  var roles = req.session.roles;
  var firstname = req.session.firstname;
  var lastname = req.session.Lastname;
  var department = req.session.department;
  var count = 0;
  var name = firstname + ' ' + lastname;

  if (req.session.userid) {
    
    con.query('SELECT * FROM MyBCP WHERE userid = \"' + userid + '\" and Status < 6', function (err, rows, fields) {
      if (!err && rows.length > 0){
        if (rows[0].Status == 2) { //MyImportance
  
            req.session.MyBCPID = rows[0].MyBCPID;
            var BCPID = req.session.MyBCPID;
            var LastUpdated = rows[0].LastUpdated;
            console.log(BCPID);
  
            var importanceQuery = 'SELECT SYSTABLE.MySysID, SYSTABLE.System, SYSTABLE.Program, count(Activity) AS NoOfActivity, SYSTABLE.ImportanceRating,'
            + ' (select count(MySysID) from MySystems where MyBCPID='+BCPID+') as NoOfSystems,'
            + ' (select count(distinct(SystemActivities.MySYSID)) from SystemActivities'
            + ' INNER JOIN MySystems ON SystemActivities.MySysID = MySystems.MySysID'
            + ' WHERE SystemActivities.ImportanceRating is NOT NULL and MySystems.MyBCPID = '+BCPID+') as ImpCount'
            + ' FROM' 
            + ' (SELECT MySystems.MySysID, MySystems.System, MySystems.Program, SystemActivities.ImportanceRating, SystemActivities.Activity FROM MySystems'
            + ' INNER JOIN SystemActivities ON MySystems.MySysID = SystemActivities.MySysID'
            + ' WHERE MySystems.UserID=' + userid +' and MySystems.MyBCPID = ' + BCPID + ') AS SYSTABLE'
            + ' GROUP BY SYSTABLE.MySysID, SYSTABLE.System, SYSTABLE.Program'
            
            console.log(importanceQuery);

         con.query(importanceQuery, function (err, rows, fields) { 
          if (!err) {

            var table = "";

            console.log(rows);
          
              if (rows.length > 0) {
                for (var i = 0; i < rows.length; i++) {

                  table += "<tr>";
                  table += '<td>' + rows[i].System + '</td>';
                  table += '<td>' + rows[i].Program + '</td>';
                  table += '<td>' + rows[i].NoOfActivity + '</td>';
                  if(rows[i].ImportanceRating == null){
                    table += '<td> Not Set </td>';
                    var progress = '<li id="impprogress" class="li inprogress">';
                  } else {
                    table += '<td>' + rows[i].ImportanceRating + '</td>';
                    var progress = '<li id="impprogress" class="li complete">';
                  }
                  table += '<td><a href=\"' + '/myimportancesys?systemid=' + rows[i].MySysID + '\">Edit</a></td>'
                  table += '</tr>';

                 var noSys = rows[i].NoOfSystems;

                 if (rows[i].ImpCount > 0){
                    var count = rows[i].ImpCount;
                 }
                 else{
                    var count = 0;
                 }

                }
           

                      console.log(table);
      
                    res.render(path.join(__dirname, '../public', 'myImportanceHome.html'), {
                      name:name,userid:userid,department:department, i:i, LastUpdated:LastUpdated, table:table, progress:progress, count:count,noSys:noSys
                    });
              }
              else {
              //Fail
                var system = "";
                var i = 0;
                var count = 0;
                var noSys = 0;
                var progress="";
                var table="";

                res.render(path.join(__dirname, '../public', 'myImportanceHome.html'), {
                  name:name,userid:userid,department:department, i:i, LastUpdated:LastUpdated, table:table, progress:progress, count:count, noSys:noSys
                });
              }
            }
            else {
              //ERROR
                console.log(err.message);
                res.render(path.join(__dirname, '../public', 'login.html'));
              }
            });
          }       
          else if (rows[0].Status == 3){ //Continuity
            res.redirect("/myctyhome");
          }
          else if (rows[0].Status == 4){ //BCPSummary
            res.redirect("/bcpsummary");
          }
          else if (rows[0].Status == 5){ //BCPSubmit
            res.redirect("/bcpsubmithome");
          }
        }
        else {

          res.redirect('/login');
        
        }
    });
  }
});

//////////////////////////////////////////////////////////////////////////////////////////////////
/* MY IMPORTANCE SYSTEMS PATRICK 17/01/2019 */

app.get("/myimportancesys", function (req, res) {

  var username =  req.session.username;
  var userid = req.session.userid;
  var roles = req.session.roles;
  var firstname = req.session.firstname;
  var lastname = req.session.Lastname;
  var department = req.session.department;
  var BCPID = req.session.MyBCPID;
  var i = 0;
  
  var name = firstname + ' ' + lastname

  var SYSID = req.query.systemid;

  if (req.session.userid) {

            con.query('SELECT * FROM MySystems WHERE MySysID = ' + SYSID + ' limit 1; SELECT *, (SELECT MAX(ImportanceRating) from dbBCP.SystemActivities) as GreatestIR FROM SystemActivities WHERE MySysID= ' + SYSID, function (err, rows, fields) {
              if (!err) {
                 
                  var system = "";
                  var program = "";
                  var importance = "";
                  var description = "";
                  var comment = "";
                  var table = "";
      
                  var result1 = rows[0];
                  var result2 = rows[1];
      
                  req.session.systemid = SYSID;
                  console.log(result1.ImportanceRating);
                 
                  if (result1.length > 0) {
      
                            program += '<select class="form-control" readonly id="program" name="program">';
                            program += '<option value= \"' + result1[0].Program + '\">' + result1[0].Program + '</option>';
                            program += '</select>';
      
                            system += '<select class="form-control" readonly id="system" name="system">';
                            system += '<option value= \"' + result1[0].System + '\">' + result1[0].System + '</option>';
                            system += '</select>';

                            importance = '<input type="text" class="form-control" readonly id="importance" name="importance" value=' + result2[0].GreatestIR + '>';
      
                            description = '<input type="text" class="form-control" readonly id="description" name="description" value=' + result1[0].Description + '>';

                            comment = '<input type="text" class="form-control" readonly id="comment" name="comment" value=' + result1[0].Comment + '>';
      
                  }
                  if (result2.length > 0){

                    console.log('--------- Result 2 Activities');
                    console.log(result2);
      
                    for (var i = 0; i < result2.length; i++) {
      
                      table += "<tr>";
                      table += '<td>' + result2[i].Activity + '</td>';
                      if(result2[i].ImportanceRating == null){
                        table += '<td> Not Set </td>';
                      } else {
                        table += '<td>' + result2[i].ImportanceRating + '</td>';
                      }
                      if(result2[i].ActivityMTPD == null){
                        table += '<td> Not Set </td>';
                      } else {
                        table += '<td>' + result2[i].ActivityMTPD + '</td>';
                      }
                      if(result2[i].ActivityMTDL == null){
                        table += '<td> Not Set </td>';
                      } else {
                        table += '<td>' + result2[i].ActivityMTDL + '</td>';
                      }
                      table += '<td><a href=\"' + '/myimportanceact?activityid=' + result2[i].ActID + '\">Edit</a></td>'
                      table += '</tr>';

                      count = 0;

                      if (result2[i].ImportanceRating !== null || ""){
                        count++;
                      }

                    }
      
                  }

                  res.render(path.join(__dirname, '../public', 'myImportanceSystem.html'),{
                    name:name,userid:userid,department:department, i:i, system:system, program:program, importance:importance, table:table,
                    comment:comment, description:description, count:count
                  });
                  
                  }
                  else {
                      //Fail
                      console.log('failed 1');
                      res.render(path.join(__dirname, '../public', 'home.html'), {
                        name:name,userid:userid,department:department
                    });
                  }
            });
          
          }
  else {

    res.redirect('/login');
  
  }

});


//////////////////////////////////////////////////////////////////////////////////////////////////

/* MY IMPORTANCE ACTIVITIES PATRICK 17/01/2019 */

app.get("/myimportanceact", function (req, res) {

  var username =  req.session.username;
  var userid = req.session.userid;
  var roles = req.session.roles;
  var firstname = req.session.firstname;
  var lastname = req.session.Lastname;
  var department = req.session.department;
  var importanceCount = 5;

  var name = firstname + ' ' + lastname

  var username =  req.session.username;
  var userid = req.session.userid;
  var roles = req.session.roles;
  var firstname = req.session.firstname;
  var lastname = req.session.Lastname;
  var department = req.session.department;
  var BCPID = req.session.MyBCPID;
  var SYSID = req.session.systemid;
  var i = 0;

  var name = firstname + ' ' + lastname;

  var ACTID = req.query.activityid;
  
  if (req.session.userid) {

    console.log(userid)
    console.log(BCPID)

            console.log('--------- 1')
            //error happens here
            con.query('SELECT * FROM SystemActivities where ActID=' + ACTID +' limit 1', function (err, rows, fields) {
              if (!err) {
      
                  console.log(rows[0]);
                 
                  var activity = '<input type="text" class="form-control" readonly id="activity" name="activity" value=' + rows[0].Activity + '>';
                  var activityid = '<input class="form-control" type="hidden" readonly id="activityid" name="activityid" value=' + rows[0].ActID + '>';

                  res.render(path.join(__dirname, '../public', 'myImportanceActivity.html'),{
                    name:name,userid:userid,department:department, i:i, activity:activity ,activityid:activityid
                  });
                  
                  }
                  else {
                      //Fail
                      console.log('failed 1');
                      res.render(path.join(__dirname, '../public', 'home.html'), {
                        name:name,userid:userid,department:department
                    });
                  }
            });
          
  }
  else {

    res.redirect('/login');
  
  }

});


/*  if (req.session.userid) {

    res.render(path.join(__dirname, '../public', 'myImportanceActivity.html'),{
      name:name,userid:userid,department:department, importanceCount:importanceCount, date:date
    });
  }
  else {

    res.redirect('/login');
  
  }

});*/


//////////////////////////////////////////////////////////////////////////////////////////////////

/* SUBMIT RATING & REDIRECT TO IPORTANCE SYSTEMS PATRICK 21/01/2019 */

app.post("/submitrating", function (req, res) {

  var userid = req.session.userid;
  var BCPID = req.session.MyBCPID;
  var SYSID = req.session.systemid;

  var ImportanceRating = req.body.importancerating; //mins
  var HourRating = req.body.ratingHrs;
  var DayRating = req.body.ratingDay;
  var WeekRating = req.body.ratingWek;

  console.log('1 - ' + ImportanceRating + ' 2 - ' + DayRating + ' 3 - '+ DayRating + ' 4 - '+WeekRating );
  var greatestrating = Math.max(ImportanceRating, HourRating,DayRating,WeekRating)

  var MTPD = req.body.mtpd;
  var MTDL = req.body.mtdl;
  var activityid = req.body.activityid;


  console.log("SUBMIT RATING HERE")
 
  if (req.session.userid){

    if (MTPD !== null||MTDL!== null||greatestrating!==null){

    console.log("submit rating");

      impquery = 'UPDATE SystemActivities SET ImportanceRating = ' + greatestrating + ', ActivityMTPD = \"' + MTPD 
      + '\", ActivityMTDL = \"'  + MTDL + '\" WHERE ActID = ' + activityid;

    

        console.log("Update SystemActivities with rating");

        con.query(impquery,
            function (err, rows, fields) {
                if (!err) {
                  res.redirect("/myimportancesys?systemid=" + SYSID);

                  console.log('test1 ' + impquery)
                }
                else {
                  res.redirect("/myimportancesys?activityid="+activityid);  
                  
                  console.log('test2 ' + impquery)
                }
        });
      }
      else{
        res.redirect("/myimportance?activityid="+activityid);
      }
    
  }  
  else{
    res.redirect("/login");   
  }
});

//////////////////////////////////////////////////////////////////////////////////////////////////

/* SAVE IMPORTANCE RATING ANSLEY 23/01/2019 */

app.get("/saveimportance", function (req, res) {

  var userid = req.session.userid;
  var BCPID = req.session.MyBCPID;
  var SYSID = req.session.systemid;

  req.session.systemid = undefined;
  req.session.activityid = undefined;

  query = 'SELECT * FROM'
  + ' (SELECT MySystems.System, MySystems.Program, SystemActivities.ImportanceRating,'
  +  ' SystemActivities.Activity, MySystems.MySysID, SystemActivities.ActivityMTPD, SystemActivities.ActivityMTDL FROM MySystems'
  + ' INNER JOIN SystemActivities ON MySystems.MySysID = SystemActivities.MySysID'
  + ' WHERE MySystems.UserID=' + userid + ' and MySystems.MyBCPID ='+ BCPID + ' ) AS SYSTABLE'
  + ' WHERE ActivityMTPD is null or ActivityMTDL is null or ImportanceRating is null';

  if (req.session.userid){

  con.query(query, function (err, rows, fields) {
    
    if (!err){

      if(rows.length > 0){
      res.redirect("/myimportance");
      }
      else{
        con.query('UPDATE MyBCP SET Status = 3, LastUpdated=NOW() WHERE Status= 2 and MyBCPID = ' + BCPID + ' and UserID = ' + userid, function (err, rows, fields) {
          if (!err) {
            res.redirect("/myctyhome");

            console.log(rows)
          }
          else {
            res.redirect("/myimportance");                        
          }
        });

      }
    }
  });
              
  } 
  else{
    res.redirect('/login');
  }
  
});

//////////////////////////////////////////////////////////////////////////////////////////////////
/* MY CONTINUITY HOME PATRICK 17/01/2019 */

/* UPDATED QUERY BY ANSLEY 21/01/2019 */

app.get("/myctyhome", function (req, res) {

  var username =  req.session.username;
  var userid = req.session.userid;
  var roles = req.session.roles;
  var firstname = req.session.firstname;
  var lastname = req.session.Lastname;
  var department = req.session.department;
 
  var name = firstname + ' ' + lastname

  var table = "";
  
  req.session.activityid = undefined;
  req.session.MyBCPID = undefined;

  if (req.session.userid) {

    con.query('SELECT * FROM MyBCP WHERE userid = \"' + userid + '\" and Status < 6 limit 1', function (err, rows, fields) {
      if (!err && rows.length > 0){
        if (rows[0].Status == 3) { //MyContinuity
  
            req.session.MyBCPID = rows[0].MyBCPID;

            var BCPID = req.session.MyBCPID;
            var LastUpdated = rows[0].LastUpdated;

            console.log(BCPID);
  
            var ContinuityQuery = 'SELECT SYSTABLE.MySysID, SYSTABLE.System, SYSTABLE.Program,' 
            + ' (select count(distinct(SystemActivities.ActID)) from SystemActivities'
            + ' INNER JOIN MySystems ON SystemActivities.MySysID = MySystems.MySysID'
            + ' WHERE MySystems.MyBCPID ='+BCPID+') as TotalAct,'
            + ' count(Activity) AS NoOfActivity, count(ImmediateCA) AS ImmediateCA, count(SustainableCA) AS SustainableCA,'
            + ' (select count(distinct(SystemActivities.ActID)) from SystemActivities'
            + ' INNER JOIN MySystems ON SystemActivities.MySysID = MySystems.MySysID'
            + ' WHERE SystemActivities.ImmediateCA is NOT NULL and SystemActivities.SustainableCA is NOT NULL and MySystems.MyBCPID = '+BCPID+') as CompletedAct'
            + ' FROM (SELECT MySystems.MySysID, MySystems.System, MySystems.Program, SystemActivities.Activity, SystemActivities.ImmediateCA, SystemActivities.SustainableCA FROM MySystems'
            + ' INNER JOIN SystemActivities ON MySystems.MySysID = SystemActivities.MySysID'
            + ' WHERE MySystems.UserID=' + userid +' and MySystems.MyBCPID = ' + BCPID + ') AS SYSTABLE'
            + ' GROUP BY SYSTABLE.MySysID'
            
            console.log('--------------1--------------' + ContinuityQuery)

         con.query(ContinuityQuery, function (err, rows, fields) { 
          if (!err) {

            console.log('--------------2--------------' + rows);
          
              if (rows.length > 0) {
          
                for (var i = 0; i < rows.length; i++) {
                  table += "<tr>";

                  table += '<td>' + rows[i].System + '</td>';
                  table += '<td>' + rows[i].Program + '</td>';
                  table += '<td>' + rows[i].NoOfActivity + '</td>';
                  if(rows[i].ImmediateCA !== rows[i].NoOfActivity){
                    table += '<td> Not Set </td>';
                  } else {
                    table += '<td>' + rows[i].ImmediateCA + '</td>';
                  }
                  if(rows[i].SustainableCA !== rows[i].NoOfActivity){
                    table += '<td> Not Set </td>';
                  } else {
                    table += '<td>' + rows[i].ImmediateCA + '</td>';
                  }
                  table += '<td><a href=\"' + '/addctyactions?systemid=' + rows[i].MySysID + '\">Edit</a></td>'
                  table += '</tr>';

                  
                if (rows[i].ImmediateCA < rows[i].NoOfActivity || rows[i].SustainableCA < rows[i].NoOfActivity){
                  progress = '<li id="ctyprogress" class="li inprogress">';
               }
               else 
               {
                  progress = '<li id="ctyprogress" class="li complete">';
               }

               
               noSys = rows[i].NoOfSystems;

               if (rows[i].TotalAct > 0){
                var count = rows[i].CompletedAct;
                var TotalAct = rows[i].TotalAct;
               }
               else{
                 var count = 0;
                 var TotalAct = 0;
               }

               
                }

             

              
                      console.log('--------------3--------------' + table);
      
                    res.render(path.join(__dirname, '../public', 'myContinuityHome.html'), {
                      name:name,userid:userid,department:department, i:i, LastUpdated:LastUpdated, table:table, progress:progress, count:count, TotalAct:TotalAct
                    });
              }
              else {
              //Fail
                var system = "";
                var i = 0;
                var TotalAct = 0;
                var count = i;

                console.log('--------------4--------------');

                res.render(path.join(__dirname, '../public', 'myContinuityHome.html'), {
                  name:name,userid:userid,department:department, i:i, LastUpdated:LastUpdated, table:table, progress:progress, count: count, TotalAct:TotalAct
                });
              }
            }
            else {
              //ERROR
              console.log(rows);
              console.log('--------------5--------------');

                res.render(path.join(__dirname, '../public', 'login.html'));
              }
            });
          }       
          else if (rows[0].Status == 2){ //Importance
            res.redirect("/myimportance");
          }
          else if (rows[0].Status == 4){ //BCPSummary
            res.redirect("/bcpsummary");
          }
          else if (rows[0].Status == 5){ //BCPSubmit
            res.redirect("/bcpsubmithome");
          }
        }
        else {

          res.redirect('/login');
        
        }
    });
  }
});

//////////////////////////////////////////////////////////////////////////////////////////////////
/* MY CONTINUITY SYSTEMS PATRICK 17/01/2019 */
/*
app.get("/myctysys", function (req, res) {

  var username =  req.session.username;
  var userid = req.session.userid;
  var roles = req.session.roles;
  var firstname = req.session.firstname;
  var lastname = req.session.Lastname;
  var department = req.session.department;

  var name = firstname + ' ' + lastname

  if (req.session.userid) {

    res.render(path.join(__dirname, '../public', 'myContinuitySystem.html'),{
      name:name,userid:userid,department:department, date:date
    });
  }
  else {

    res.redirect('/login');
  
  }

});
*/
//////////////////////////////////////////////////////////////////////////////////////////////////

/* SUBMIT ACTIVITIES ANSLEY 19/01/2019 */

app.get("/submitactivities", function (req, res) {

  var userid = req.session.userid;
  var BCPID = req.session.MyBCPID;
  var SYSID = req.session.systemid;

  var activity = req.query.activity;
  var functact = req.query.functact;
  var actdep = req.query.optradio;

  if (req.session.userid){
    console.log("INSERTING ACTIVITY");
    console.log(SYSID)
    if (SYSID){

              console.log("Insert SystemActivities");
              con.query("INSERT INTO SystemActivities (Activity,ActivityDep,MySysID,ActFunction" +
                  ") VALUES ('" + activity + "','" + actdep + "','" + SYSID + "','" +
                  functact + "')" ,
                  function (err, rows, fields) {
                      if (!err) {
                        res.redirect("/system");
                      }
                      else {
                        res.redirect("/activities");                        
                      }
              });
    }  
    else {
      console.log("INSERTING ACTIVITY 2");
      con.query('SELECT * FROM MySystems WHERE UserID = ' + userid +' and MyBCPID = ' + BCPID + ' and Completed = 0 limit 1', function (err, rows, fields) {
        if (!err && rows.length > 0){
          
          req.session.systemid = rows[0].MySysID;
          var SYSID = req.session.systemid;

          console.log('set systemid');
            con.query("INSERT INTO SystemActivities (Activity,ActivityDep,MySysID,ActFunction" +
              ") VALUES ('" + activity + "','" + actdep + "','" + SYSID + "','" +
              functact + "')" ,
              function (err, rows, fields) {
                  if (!err) {
                    res.redirect("/system");
                  }
                  else {
                    res.redirect("/activities");                        
                  }
      });
        }
      });
    }
  } 
  else {
    res.redirect('/login');
  }
});
//////////////////////////////////////////////////////////////////////////////////////////////////

/* SAVE SYSTEM ANSLEY 20/01/2019 */

app.get("/savesys", function (req, res) {

  var userid = req.session.userid;
  var BCPID = req.session.MyBCPID;
  var SYSID = req.session.systemid;

  if (req.session.userid){

    if (SYSID && BCPID){

              con.query("UPDATE MySystems SET Completed = '1' WHERE Completed = 0 and MyBCPID = " + BCPID + " and MySysID = " + SYSID,function (err, rows, fields) {
                      if (!err) {
                        req.session.systemid = undefined;
                        res.end();
                      }
                      else {
                        res.end();                       
                      }
              });
    }  
    else {
      res.end();
    }
  }  
  else{
  res.redirect('/login');
  }
});

//////////////////////////////////////////////////////////////////////////////////////////////////

/* SAVE MY CRITICAL SYSTEMS & CONTINUE ANSLEY 20/01/2019 */

app.get("/savecritsys", function (req, res) {

  var userid = req.session.userid;
  var BCPID = req.session.MyBCPID;
  var SYSID = req.session.systemid;

  if (req.session.userid){

    console.log('------------0--------------' + userid)

    if (BCPID){
      con.query("SELECT * FROM MySystems WHERE Completed = '0' and MyBCPID = " + BCPID,function (err, rows, fields) {
        if (rows.length>0) {
          console.log('------------1--------------' + BCPID)
          res.render(path.join(__dirname, '../public', 'message.html'), {
            title:'Incomplete Systems',message:'There are still incomplete Systems', message2:'Please return and complete'
          });
        }
        else{
              con.query("UPDATE MyBCP SET Status = 2, LastUpdated = NOW() WHERE Status = 1 and MyBCPID = " + BCPID + " and UserID = " + userid,function (err, rows, fields) {
                      if (!err) {
                        console.log('------------2--------------' + rows)
                        req.session.systemid = undefined;
                        res.redirect("/myimportance");
                      }
                      else {
                        console.log('------------3--------------' + err)
                        res.end();                       
                      }
              });
          }
        
        
      });        
    }  
    else {
      console.log('------------4--------------')
      res.end();
    }
  }  

});

//////////////////////////////////////////////////////////////////////////////////////////////////

/* ADD CONTINUITY ACTIONS ANSLEY 21/01/2019 */

app.get("/addctyactions", function (req, res) {

  var username =  req.session.username;
  var userid = req.session.userid;
  var roles = req.session.roles;
  var firstname = req.session.firstname;
  var lastname = req.session.Lastname;
  var department = req.session.department;

  var name = firstname + ' ' + lastname;

  var BCPID = req.session.MyBCPID;
  var SYSID = req.query.systemid;

  var system="";
  var program = "";
  var table = "";

  if (req.session.userid){
    
              console.log("----------1----------" + ctyQuery);

              var ctyQuery = 'SELECT SYSTABLE.MySysID, SYSTABLE.System, SYSTABLE.Program, SYSTABLE.Activity, SYSTABLE.ImmediateCA, SYSTABLE.SustainableCA, SYSTABLE.Prereq,'
              + ' SYSTABLE.ImportanceRating, SYSTABLE.ActivityMTPD, SYSTABLE.ActID'
              + ' FROM (SELECT MySystems.MySysID, MySystems.System, MySystems.Program, SystemActivities.Activity, SystemActivities.Prereq,' 
              + ' SystemActivities.ImmediateCA, SystemActivities.SustainableCA, SystemActivities.ImportanceRating, SystemActivities.ActivityMTPD, SystemActivities.ActID'
              + ' FROM MySystems INNER JOIN SystemActivities ON MySystems.MySysID = SystemActivities.MySysID'
              + ' WHERE MySystems.UserID=' + userid +' and MySystems.MySysID =' +SYSID+ ' ) AS SYSTABLE';

              con.query(ctyQuery,function (err, rows, fields) {

                console.log(rows);

                      if (!err && rows.length > 0) {
                   
                              system = '<input type=\"' + 'text' + '\" class=\"' + 'form-control' + '\" readonly id=\"' + 'system' + '\" value= \"' + rows[0].System + '\">';
                              program = '<input type=\"' + 'text' + '\" class=\"' + 'form-control' + '\" readonly id=\"' + 'program' + '\" value= \"' + rows[0].Program + '\">';
                        
                            console.log("----------2.1----------");
                            
                            for (var i = 0; i < rows.length; i++) {

                              table += "<tr>";
                              table += '<td>' + rows[i].Activity + '</td>';
                              if(rows[i].ImportanceRating == null){
                                table += '<td> Not Set </td>';
                              } else {
                                table += '<td>' + rows[i].ImportanceRating + '</td>';
                              }
                              if(rows[i].ImmediateCA == null){
                                table += '<td> Not Set </td>';
                              } else {
                                table += '<td>' + rows[i].ImmediateCA + '</td>';
                              }
                              if(rows[i].SustainableCA == null){
                                table += '<td> Not Set </td>';
                              } else {
                                table += '<td>' + rows[i].SustainableCA + '</td>';
                              }
                              table += '<td><a href=\"' + '/editcty?ACTID=' + rows[i].ActID +'&systemid=' + rows[i].MySysID + '\">Edit</a></td>'
                              table += '</tr>';     
                             
                            }
                              console.log("----------2.2----------" + table);
                              
                      }
                      else{
                        console.log("----------3----------" + table);
                              
                      }   
                        res.render(path.join(__dirname, '../public', 'myContinuitySystem.html'),{name:name,userid:userid,department:department,
                        system:system,program:program,table:table});	  
                        console.log("----------4----------");
                      });
                  
  }
  else {
    res.redirect("/login");                        
  }                   
  
});

//////////////////////////////////////////////////////////////////////////////////////////////////

/* EDIT CONTINUITY ACTIONS ANSLEY 21/01/2019 */

app.get("/editcty", function (req, res) {

  var username =  req.session.username;
  var userid = req.session.userid;
  var roles = req.session.roles;
  var firstname = req.session.firstname;
  var lastname = req.session.Lastname;
  var department = req.session.department;

  var name = firstname + ' ' + lastname;

  var BCPID = req.session.MyBCPID;
  var SYSID = req.session.systemid;

  var activity="";
  var impact = "";
  var mtpd = "";

  var ACTID = req.query.ACTID;

  var systemid = req.query.systemid;

  if (req.session.userid){

    req.session.activityid = ACTID;

    
              console.log("----------1----------SELECT ACTIVITY" + ACTID);
              

              var ctyactQuery = 'SELECT SYSTABLE.MySysID, SYSTABLE.System, SYSTABLE.Program, SYSTABLE.Activity, SYSTABLE.ImmediateCA, SYSTABLE.SustainableCA,'
              + ' SYSTABLE.ImportanceRating, SYSTABLE.ActivityMTPD, SYSTABLE.ActID'
              + ' FROM (SELECT MySystems.MySysID, MySystems.System, MySystems.Program, SystemActivities.Activity,' 
              + ' SystemActivities.ImmediateCA, SystemActivities.SustainableCA, SystemActivities.ImportanceRating, SystemActivities.ActivityMTPD, SystemActivities.ActID'
              + ' FROM MySystems INNER JOIN SystemActivities ON MySystems.MySysID = SystemActivities.MySysID'
              + ' WHERE MySystems.UserID=' + userid +' and MySystems.MySysID ='+ systemid + ' and SystemActivities.ActID ='+ACTID+' ) AS SYSTABLE';
        
              con.query(ctyactQuery,function (err, rows, fields) {

                console.log(rows);

                      if (!err && rows.length > 0) {

                              activity = '<input type=\"' + 'text' + '\" class=\"' + 'form-control' + '\" name=\"' + 'activity' + '\" readonly id=\"' + 'activity' + '\" value= \"' + rows[0].Activity + '\">';
                              impact = '<input type=\"' + 'text' + '\" class=\"' + 'form-control' + '\" name=\"' + 'impact' + '\" readonly id=\"' + 'impact' + '\" value= \"' + rows[0].ImportanceRating + '\">';
                              mtpd = '<input type=\"' + 'text' + '\" class=\"' + 'form-control' + '\" name=\"' + 'mtpd' + '\" readonly id=\"' + 'mtpd' + '\" value= \"' + rows[0].ActivityMTPD + '\">';
                              console.log("----------2.2----------");
                      }
                      else{
                        console.log("----------3----------");
                              
                      }   
                      req.session.systemid = systemid;

                        res.render(path.join(__dirname, '../public', 'myContinuityActivity.html'),{name:name,userid:userid,department:department,
                          activity:activity,impact:impact,mtpd:mtpd});	  
                        console.log("----------4----------");
                      });
                  
  }
  else {
    res.redirect("/login");                        
  }                   
  
});
//////////////////////////////////////////////////////////////////////////////////////////////////

/* SAVE CONTINUITY ACTIONS ACTIVITIES ANSLEY 21/01/2019 */

app.post("/savectyact", function (req, res) {

  var userid = req.session.userid;
  var BCPID = req.session.MyBCPID;
  var SYSID = req.session.systemid;

  var ACTID = req.session.activityid;

  var immediate = req.body.immediate;
  var sustainable = req.body.sustainable;
  var prerequities = req.body.prerequities;
  var sustainduration = req.body.sustainduration;



  if (req.session.userid){

    console.log(req.session);

              console.log("SAVE CONTINUITY ACTIONS");
              con.query('UPDATE SystemActivities SET ImmediateCA = \"' + immediate + '\" , SustainableCA = \"' + sustainable + '\" , Prereq = \"' + 
              prerequities + '\" , SMD = \"' + sustainduration + '\"'
              + ' WHERE ACTID =' + ACTID,
                  function (err, rows, fields) {
                      if (!err) {
                        req.session.activityid = undefined;

                        res.redirect("/addctyactions?systemid="+SYSID);
                      }
                      else {
                        req.session.activityid = undefined;
                        res.redirect("/myctyhome");                        
                      }
              });
    
  }  
  
});
//////////////////////////////////////////////////////////////////////////////////////////////////

/* SAVE CONTINUITY ACTIONS & REDIRECT TO BCP SUMMARY ANSLEY 21/01/2019 */

app.get("/savecty", function (req, res) {

  var userid = req.session.userid;
  var BCPID = req.session.MyBCPID;
  var SYSID = req.session.systemid;

  req.session.systemid = undefined;
  req.session.activityid = undefined;

  if (req.session.userid){

              console.log("UPDATE BCP STATUS");

              con.query('UPDATE MyBCP SET Status = 4, LastUpdated=NOW() WHERE Status= 3 and MyBCPID = ' + BCPID + ' and UserID = ' + userid, function (err, rows, fields) {
                      if (!err) {
                        res.redirect("/bcpsummary");
                      }
                      else {
                        res.redirect("/myctyhome");                        
                      }
              });
    
  }  
  
});

//////////////////////////////////////////////////////////////////////////////////////////////////

/* BCP TRACKER ANSLEY 21/01/2019 */

app.get("/bcpsummary", function (req, res) {

  var username =  req.session.username;
  var userid = req.session.userid;
  var roles = req.session.roles;
  var firstname = req.session.firstname;
  var lastname = req.session.Lastname;
  var department = req.session.department;

  var name = firstname + ' ' + lastname;

  if (req.session.userid){

    
    con.query("SELECT * FROM MyBCP WHERE Status = 4 and UserID=" + userid, function (err, rows, fields) {
      if (!err && rows.length > 0){

        req.session.MyBCPID = rows[0].MyBCPID;
        BCPID = req.session.MyBCPID;

        var progress = '<li id="bcpprogress" class="li inprogress">';
   
    res.render(path.join(__dirname, '../public','mySummaryHome.html'),{name:name,userid:userid,LastUpdated :rows[0].LastUpdated,progress:progress});
      }	  
  });        
  }  
  else{ 
  res.redirect('/login');
  }              
            
});
  
//////////////////////////////////////////////////////////////////////////////////////////////////

/* GENERATE BCP REPORT ANSLEY 21/01/2019 */

app.get("/generatebcppdf", function (req, res) {

  var userid = req.session.userid;
  var SYSID = req.session.systemid;

  req.session.systemid = undefined;
  req.session.activityid = undefined;

  var html = '';
  
  if (req.session.userid){

    con.query("SELECT MyBCPID FROM MyBCP WHERE Status = 4 and UserID=" + userid, function (err, rows, fields) {
      if (!err && rows.length > 0){
        req.session.MyBCPID = rows[0].MyBCPID;
        BCPID = req.session.MyBCPID;
   
        
          if (req.session.MyBCPID){
      
            

    console.log('--------------1--------------' + userid + ' ' + BCPID);

    Query = 'SELECT SYSTABLE.System, SYSTABLE.ActFunction, SYSTABLE.Activity, SYSTABLE.ClinicalUnit, SYSTABLE.ActivityMTPD,'
    + ' SYSTABLE.ImportanceRating, SYSTABLE.ImmediateCA, SYSTABLE.SustainableCA, SYSTABLE.Prereq, SYSTABLE.SMD,'
    + ' SYSTABLE.ActID, SYSTABLE.MySysID, SYSTABLE.Program FROM' 
    + ' (SELECT MySystems.MySysID, MySystems.System, MySystems.Program, SystemActivities.Activity,SystemActivities.ActFunction,'
    + ' SystemActivities.ImmediateCA, SystemActivities.SustainableCA, SystemActivities.ImportanceRating, SystemActivities.ActivityMTPD, SystemActivities.ActID,'
    + ' SystemActivities.Prereq, SystemActivities.SMD, MySystems.ClinicalUnit'
    + ' FROM MySystems INNER JOIN SystemActivities ON MySystems.MySysID = SystemActivities.MySysID'
    + ' WHERE MySystems.UserID=' + userid +' and MyBCPID =' + BCPID + ') AS SYSTABLE'

              con.query(Query, function (err, rows, fields) {

                if (!err && rows.length >0){

                  console.log('--------------2--------------');

		    html += '<html>';	
		    html += '<head>';
		    
		    html += '</head>';
		    html += '<body>';
			
                    html += '<h1> BCP Report </h1>';
                    html += '<b> Date: ' + date;
                    html += '<br></br>';

                    html += '<table border="1" style="table-layout: fixed; width: 100%">';
                    html += '<thead><tr>';
                    html += "<th style='word-wrap: break-word'>System</th>" + "<th style='word-wrap: break-word'>Function</th>" + "<th style='word-wrap: break-word'>Activity</th>" + "<th style='word-wrap: break-word'>Clinical Unit</th>" + "<th style='word-wrap: break-word'>MTPD</th>"
                    + "<th style='word-wrap: break-word'>Higest Impact</th>" + "<th style='word-wrap: break-word'>Immediate continuity action</th>" + "<th style='word-wrap: break-word'>Maintainable duration</th>"
                    + "<th style='word-wrap: break-word'>Sustainable continuity action</th>" + "<th style='word-wrap: break-word'>Pre-requisites/Resources</th>" + "<th style='word-wrap: break-word'>Maintainable duration</th>" 
                    html += "</tr></thead>";
                    html += "<tbody>";

                  for (var i = 0; i < rows.length; i++) {  

                    html +='<tr>';

                    html += '<td style="word-wrap: break-word">' + rows[i].System + '</td>';
                    html += '<td style="word-wrap: break-word">' + rows[i].ActFunction + '</td>';
                    html += '<td style="word-wrap: break-word">' + rows[i].Activity + '</td>';
                    html += '<td style="word-wrap: break-word">' + rows[i].ClinicalUnit + '</td>';

                    if (rows[i].ActivityMTPD.includes("Hr")){
                      html += '<td style="word-wrap: break-word">'+'<font color="#FF0000">' + rows[i].ActivityMTPD + '</font>'+'</td>';
                    }
                    else if (rows[i].ActivityMTPD.includes("Day")){
                      html += '<td style="word-wrap: break-word">'+'<font color="#f29509">' + rows[i].ActivityMTPD + '</font>'+'</td>';
                    }
                    else if (rows[i].ActivityMTPD.includes("Week")){
                      html += '<td style="word-wrap: break-word">'+'<font color="#ffed28">' + rows[i].ActivityMTPD + '</font>'+'</td>';
                    }
                    else if (rows[i].ActivityMTPD.includes("Month")){
                      html += '<td style="word-wrap: break-word">'+'<font color="#63cd32">' + rows[i].ActivityMTPD + '</font>'+'</td>';
                    }
              

                    if (rows[i].ImportanceRating == 1){
                      html += '<td style="word-wrap: break-word" bgcolor="#63cd32">' + '1 - Negligible' + '</td>';
                    }
                    if (rows[i].ImportanceRating == 2){
                      html += '<td style="word-wrap: break-word" bgcolor="#ffed28">' + '2 - Minor' + '</td>';
                    }
                    if (rows[i].ImportanceRating == 3){
                      html += '<td style="word-wrap: break-word" bgcolor="#e5c824">' + '3 - Moderate' + '</td>';
                    }
                    if (rows[i].ImportanceRating == 4){
                      html += '<td style="word-wrap: break-word" bgcolor="#f29509">' + '4 - Major' + '</td>';
                    }
                    else if (rows[i].ImportanceRating == 5){
                      html += '<td style="word-wrap: break-word" bgcolor="#FF0000">' + '5 - Severe' + '</td>';
                    }

                    html += '<td style="word-wrap: break-word">' + rows[i].ImmediateCA + '</td>';
                    html += '<td style="word-wrap: break-word">' + rows[i].ActivityMTPD + '</td>';
                    html += '<td style="word-wrap: break-word">' + rows[i].SustainableCA + '</td>';
                    html += '<td style="word-wrap: break-word">' + rows[i].Prereq + '</td>';
                    html += '<td style="word-wrap: break-word">' + rows[i].SMD + '</td>';
        
                    html += '</tr>';   
                  }  

                  html += '</tbody>';
                  html += '</table>';
	          html += '</body>';
                  html += '</html>';

                  var options = { format: 'A3', orientation: 'landscape', border: '10mm' };

                  pdf.create(html, options).toFile('./server/pdf/'+BCPID+'.pdf', function(error, result) {
                    if (err) return console.log(error);
                    console.log(result); 
  
                    res.sendFile(__dirname + '/pdf/'+BCPID+'.pdf');
              
                }); 
              }
              else{
                res.redirect("/plan"); 
                console.log('--------------3--------------');
              }
        
              });
            }
          }
        });
  }  
  
  else {

    console.log('--------------4--------------');
    res.redirect("/login"); 
  }
  
});

//////////////////////////////////////////////////////////////////////////////////////////////////

/* SAVE SAVE BCP SUMMARY ANSLEY 22/01/2019 */

app.get("/savebcpsummary", function (req, res) {

  var userid = req.session.userid;
  var BCPID = req.session.MyBCPID;
  var SYSID = req.session.systemid;

  req.session.systemid = undefined;
  req.session.activityid = undefined;

  if (req.session.userid){

              console.log("UPDATE BCP STATUS");

              con.query('UPDATE MyBCP SET Status = 5, LastUpdated=NOW() WHERE Status= 4 and MyBCPID = ' + BCPID + ' and UserID = ' + userid, function (err, rows, fields) {
                      if (!err) {
                        res.redirect("/bcpsubmithome");
                      }
                      else {
                        res.redirect("/plan");                        
                      }
              });
    
  }  
  else {
    res.redirect('/login');
  }
  
});
//////////////////////////////////////////////////////////////////////////////////////////////////

/* BCP CATALOG ANSLEY 22/01/2019 */

app.get("/catalog", function (req, res) {

  var username =  req.session.username;
  var userid = req.session.userid;
  var roles = req.session.roles;
  var firstname = req.session.firstname;
  var lastname = req.session.Lastname;
  var department = req.session.department;

  var name = firstname + ' ' + lastname

  if (req.session.userid) {

    res.render(path.join(__dirname, '../public', 'catalog.html'),{
      name:name,userid:userid,department:department, date:date
    });
  }
  else {

    res.redirect('/login');
  
  }

});

//////////////////////////////////////////////////////////////////////////////////////////////////

/* BCP SUBMIT HOME ANSLEY 22/01/2019 */

app.get("/bcpsubmithome", function (req, res) {

  var username =  req.session.username;
  var userid = req.session.userid;
  var roles = req.session.roles;
  var firstname = req.session.firstname;
  var lastname = req.session.Lastname;
  var department = req.session.department;

  var name = firstname + ' ' + lastname

  if (req.session.userid) {

    console.log('------------bcpsubmithome1------------');

    con.query("SELECT * FROM MyBCP WHERE Status = 5 and UserID=" + userid +' limit 1', function (err, rows, fields) {
      if (!err && rows.length > 0){

        req.session.MyBCPID = rows[0].MyBCPID;
        BCPID = req.session.MyBCPID;

        console.log('------------bcpsubmithome2------------');

        var progress = '<li id="submitprogress" class="li inprogress">';
          
          res.render(path.join(__dirname, '../public', 'mySubmitHome.html'),{
            name:name,userid:userid,department:department, date:date,LastUpdated:rows[0].LastUpdated, progress:progress
          });
       
        }
    });
  
}
else {
  console.log('------------bcpsubmithome3------------');
  res.redirect('/login');
}

});

//////////////////////////////////////////////////////////////////////////////////////////////////

/* SUBMIT BCP FOR APPROVAL SUMMARY ANSLEY 22/01/2019 */

app.get("/bcpsubmit", function (req, res) {

  var username =  req.session.username;
  var userid = req.session.userid;
  var roles = req.session.roles;
  var firstname = req.session.firstname;
  var lastname = req.session.Lastname;
  var department = req.session.department;

  var name = firstname + ' ' + lastname

  var userid = req.session.userid;
  var BCPID = req.session.MyBCPID;
  var SYSID = req.session.systemid;

  if (req.session.userid){

              console.log("UPDATE BCP STATUS");

              con.query('UPDATE MyBCP SET Status = 6, LastUpdated=NOW() WHERE Status= 5 and MyBCPID = ' + BCPID + ' and UserID = ' + userid, function (err, rows, fields) {
                      if (!err) {

                        console.log('------------bcpsubmit1------------');

                        req.session.systemid = undefined;
                        req.session.activityid = undefined;
                        con.query("SELECT * FROM MyBCP WHERE UserID=" + userid + ' and MyBCPID =' + BCPID +' limit 1', function (err, rows, fields) {
                          if (!err & rows.length > 0){
              
                            res.render(path.join(__dirname, '../public', 'mySummarySubmitted.html'),{
                              name:name,userid:userid,department:department, date:date,LastUpdated:rows[0].LastUpdated
                            });
                       
                          }
                        });
                      }
                      else {
                        console.log('------------bcpsubmit4------------');
                        res.redirect('/bcpsubmithome');                    
                      }
              });
    
  }  
  else {
    console.log('------------bcpsubmit5------------');
    res.redirect('/login');
  }
  
});
//////////////////////////////////////////////////////////////////////////////////////////////////
/* BCP TRACKER PATRICK 19/01/2019 */

app.get("/tracker", function (req, res) {

  var username =  req.session.username;
  var userid = req.session.userid;
  var roles = req.session.roles;
  var firstname = req.session.firstname;
  var lastname = req.session.Lastname;
  var department = req.session.department;

  var name = firstname + ' ' + lastname

  if (req.session.userid) {

    res.render(path.join(__dirname, '../public', 'tracker.html'),{
      name:name,userid:userid,department:department, date:date
    });
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
