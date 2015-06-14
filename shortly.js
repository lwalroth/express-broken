var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bcrypt = require('bcrypt-nodejs');

var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var app = express();

app.configure(function() {
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(partials());
  app.use(express.bodyParser())
  app.use(express.static(__dirname + '/public'));
  app.use(express.cookieParser('chocolate chips'));
  app.use(express.session());
});

app.get('/', function(req, res) {
  util.checkUser(req,res, function(){
    res.render('index');
  });
});

app.get('/create', function(req, res) {
  util.checkUser(req,res, function(){
    res.render('index');
  });
});

app.get('/links', function(req, res) {
  util.checkUser(req,res, function(){
    Links.reset().fetch().then(function(links) {
      res.send(200, links.models);
    });
  });
});

app.get('/myLinks', function(req, res) {
  util.checkUser(req,res, function(){
    Links.reset().fetch().then(function(links) {
      var myLinks = [];
      new User({username: req.session.user}).fetch().then(function(user){
        links.forEach(function(link){
          if(link.get('user_id') === user.get('id')){
            myLinks.push(link);
          }
        })
        res.send(200, myLinks);
      });
    });
  });
});

app.post('/links', function(req, res) {
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.send(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.send(200, found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.send(404);
        }
        var link = new Link({
          url: uri,
          title: title,
          base_url: req.headers.origin,
          user_id: 21
        });

        link.save().then(function(newLink) {
          Links.add(newLink);
          res.send(200, newLink);            
        });

        new User({username: req.session.user}).fetch()
          .then(function(user){
            console.log("user***",user);
            console.log("*****", req.session.user);
          });
      });
    }
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/

app.get('/login', function(req, res) {
  res.render('login');
});

app.post('/login', function(req, res) {
  var username = req.body.username;
  var password = req.body.password;
  var salt = bcrypt.genSaltSync(10);
  var hash = bcrypt.hashSync(password,salt);

  new User({ username: username}).fetch().then(function(found) {
    if (!found || bcrypt.compareSync(found.get('password'), hash)) {
      //append a red bar with incorrect pw/username
      res.redirect('/login');
    } else {
      req.session.regenerate(function(){
        req.session.user = username;
        res.redirect('/');
      });
    }
  });
});

app.get('/signup', function(req, res) {
  res.render('signup');
});

app.post('/signup', function(req, res)  {
  var username = req.body.username;
  var password = req.body.password;
  new User({ username: username }).fetch().then(function(found) {
    if (found) {
      console.log('user exists already');
      res.send(200);
    } else {
      var hash = bcrypt.hashSync(password, bcrypt.genSaltSync(10));
      var user = new User({
        username: username,
        password: hash
      });

      user.save().then(function(newUser){
        console.log('new user created ' + newUser);
        Users.add(newUser);
        req.session.regenerate(function(){
          req.session.user = username;
          res.redirect('/');
        });
      });
    }
  });
});

app.get('/logout', function(req, res) {
  req.session.destroy(function(){
    res.redirect('/');
  });
});

/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        link_id: link.get('id')
      });

      click.save().then(function() {
        db.knex('urls')
          .where('code', '=', link.get('code'))
          .update({
            visits: link.get('visits') + 1,
          }).then(function() {
            return res.redirect(link.get('url'));
          });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);