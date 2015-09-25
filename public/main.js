var app = angular.module('mumbleExpressApp', []);

app.factory('socket', function(){
    var socket = io();
    return socket;
});

app.controller('mumbleExpressController', function($scope, socket){
    $scope.msgs = ['one message'];

    socket.on('onText',function(data) {
	console.log(data.message);
	$scope.msgs.push(data.message);
	$scope.$digest();
    });
});
