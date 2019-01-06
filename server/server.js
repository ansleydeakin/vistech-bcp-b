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

  var name = firstname + ' ' + lastname
  
  console.log(req.session)

	if(userid == null){
		res.render(path.join(__dirname, '../public', 'login.html'));
		return;
	}
	 
	 var sql="SELECT * FROM users WHERE userid ='" + userid + "'";
	 
	   con.query(sql, function(err, rows){
  
		   console.log("hello " + username);
      
		   res.render(path.join(__dirname, '../public', 'dashboard.html'),{name:name});	  
      
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
                //res.send("Username or Email already exist");
                res.render(path.join(__dirname, '../public', 'message.html'),{title:'There was an issue with your request', message: 'Username or Email already exist' });	
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
/* ADD SYSTEM DEPENDANCE ASSESSMENT ANSLEY 05/01/2019 */

app.get("/system", function (req, res) {

  var username =  req.session.username;
  var userid = req.session.userid;
  var roles = req.session.roles;
  var firstname = req.session.firstname;
  var lastname = req.session.Lastname;

  if (req.session.userid) {

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
                res.render(path.join(__dirname, '../public', 'system.html'), {
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