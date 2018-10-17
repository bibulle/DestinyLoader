var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index1', { title: 'Light level' });
});
router.get('/index.html', function(req, res, next) {
  res.render('index1', { title: 'Light level' });
});
router.get('/index1.html', function(req, res, next) {
  res.render('index1', { title: 'Light level' });
});

module.exports = router;
