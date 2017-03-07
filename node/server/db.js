'use strict';

var mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/pizzahut');

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback() {
    console.log('connection successful...');
});
/*
 Model.find({type: 'etc'}, function(err, docs){
 docs.forEach(function(doc){
 console.log(doc);
 });
 });

 Model.findOne({type: 'pizza'}, function(err, docs){
 console.log(docs);
 });
 */