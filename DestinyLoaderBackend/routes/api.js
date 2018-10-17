var logger = require('../lib/logger');
var destinyDb = require('../lib/destinyDb');

var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {

  res.setHeader('Last-Modified', (new Date()).toUTCString());

  destinyDb.list(function(err, docs) {
    if (err) {
      res.send(err);
    } else {
      res.json(docs);
    }
  }, true);
});

module.exports = router;
