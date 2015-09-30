var app = angular.module('mumbleExpressApp', ['luegg.directives']);

app.factory('socket', function(){
    var socket = io();
    return socket;
});

function insertChannelIntoTree(node, tree) {
    if(node.parent == tree.channel) {
	tree.childChannels.push(
	    {
		"name": node.name,
		"channel": node.channel_id,
		"childChannels": [],
		"users": []
	    }
	);
	return true;
    }

    for (child of tree.childChannels) {
	if(insertChannelIntoTree(node,child))
	    return true;
    }

    return false;
}

function insertUserIntoTree(node, tree) {
    if(node.channel_id == tree.channel) {
	tree.users.push(node);
	return true;
    }

    for (child of tree.childChannels) {
	if(insertUserIntoTree(node,child))
	    return true;
    }
    
    return false;
}

function deleteUserFromTree(session, tree) {
    var i=0;
    for (user of tree.users) {
	if(user.session == session) {
	    tree.users.splice(i,1);
	    return true;
	}
	i++;
    }

    for (child of tree.childChannels) {
	if(deleteUserFromTree(session,child))
	    return true;
    }

    return false;
}

function getUserFromTree(session, tree) {
    var i=0;
    for (user of tree.users) {
	if(user.session == session)
	    return user;
    }
    i++;

    for (child of tree.childChannels) {
	var user = getUserFromTree(session,child);
	if(user!=null)
	    return user;
    }
    
    return null;
}

app.controller('mumbleExpressController', function($scope, socket){
    $scope.msgs = [];

    //todo: set this dynamically based on user input
    $scope.userName = "ExampleUser";

    $scope.channelTree = {
	"name": null,
	"channel": null,
	"childChannels": [],
	"users": []
    };
    
    $scope.usersList = {};

    $scope.sendMsg = function() {
	socket.emit('send msg', $scope.msg.text);
	var d = new Date();
	var textMessage = {
	    "userName": $scope.userName,
	    "message": $scope.msg.text,
	    "time": ''+d.getHours()+':'+d.getMinutes()
	}
	$scope.msgs.push(textMessage);
	$scope.msg.text = '';
	$scope.$digest();
    };

    socket.on('textMessage',function(textMessage) {
	//append local time to textMessage object as string
	//(collected on client so locality is not an issue)
	var d = new Date();
	textMessage["time"]=''+d.getHours()+':'+d.getMinutes();

	$scope.msgs.push(textMessage);
	$scope.$digest();
    });

    socket.on('userState', function(state) {
	console.log("userState");
	console.log(state);
	if(state.name) { // a new user connected
	    console.log('adding new user');
	    if(state.channel_id == null) {
		//make those in the root channel a child of the
		//root node for cleaner rendering. Why doesn't
		//mumble do this by default?
		state.channel_id = 0;
	    }
	    insertUserIntoTree(state,$scope.channelTree);
	}
	else { //updating something about user info
	    if(state.channel_id!=null) { //updating user position
		console.log('moving user position');
		user = getUserFromTree(state.session,$scope.channelTree);
		deleteUserFromTree(state.session,$scope.channelTree);
		user.channel_id=state.channel_id;
		insertUserIntoTree(user,$scope.channelTree);
	    }
	    if(state.self_mute!=null) { //updating user mute/deaf
		console.log('updating mute/def');
		user = getUserFromTree(state.session,$scope.channelTree);
		deleteUserFromTree(state.session,$scope.channelTree);
		user.self_mute=state.self_mute;
		user.self_deaf=state.self_deaf;
		insertUserIntoTree(user,$scope.channelTree);
	    }
	}
	$scope.$digest();
	console.log($scope.channelTree);
    });

    socket.on('channelState', function(state) {
	console.log("channelState");
	console.log(state);
	insertChannelIntoTree(state,$scope.channelTree);
	$scope.$digest();
	console.log($scope.channelTree);
    });

    socket.on('channelRemove', function(state) {
	console.log("channelRemove");
	console.log(state);
    });

    socket.on('userRemove', function(state) {
	console.log("userRemove");
	console.log(state);
	deleteUserFromTree(state.session,$scope.channelTree);
	$scope.$digest();
	console.log($scope.channelTree);
    });

});
