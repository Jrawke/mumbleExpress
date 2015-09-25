var app = angular.module('mumbleExpressApp', []);

app.factory('socket', function(){
    var socket = io();
    return socket;
});

app.controller('mumbleExpressController', function($scope, socket){
    
});
