var app = angular.module('mumbleExpressApp', []);

app.factory('socket', function(){
    var socket = io();
    return socket;
});

app.controller('mumbleExpressController', function($scope, socket){
    $scope.msgs = ['one message'];

    $scope.sendMsg = function() {
	socket.emit('send msg', $scope.msg.text);
	$scope.msgs.push($scope.msg.text);
	$scope.msg.text = '';
	$scope.$digest();
    };

    socket.on('onText',function(data) {
	console.log(data.message);
	$scope.msgs.push(data.message);
	$scope.$digest();
    });
});
