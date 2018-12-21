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
  cookie: { maxAge: 60000 } //60 secs, please increase time to extend session time
}))

// **********************************Add your code here*******************************************

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

/* ADD LOGIN  ANSLEY 15/12/2018*/

//app.get('/token', function (req, res) {
  //const identity = req.query.identity || 'identity';
  //const room = req.query.room;
  //res.send(tokenGenerator(identity, room));
//});

app.get("/login", function (req, res) {
  res.sendFile(path.join(__dirname, '../public', 'login.html'));
});

app.post('/loginsubmit', function (req, res) {

  if (req.body.constructor === Object && Object.keys(req.body).length === 0) {
    res.sendFile(path.join(__dirname, '../public', 'login.html'));
  }

    var sess = req.session; 

    var username = req.body.username;
    var password = encrypt.sha1hash(req.body.password);

    console.log(password);

    con.query('SELECT * from users WHERE username = \"' + username + '\" AND password = \"' + password + '\"', function (err, rows, fields) {
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
  console.log(req.session)

	if(userid == null){
		res.render(path.join(__dirname, '../public', 'login.html'));
		return;
	}
	 
	 var sql="SELECT * FROM users WHERE userid ='"+userid+"'";
	 
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

// **********************************************************************************************

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