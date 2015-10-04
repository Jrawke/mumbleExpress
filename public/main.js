var app = angular.module('mumbleExpressApp', ['luegg.directives', 'btford.socket-io']);

app.factory('socket', function (socketFactory) {
    return socketFactory();
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

function deleteChannelFromTree(channelId, tree) {
    var i=0;
    for (childChannel of tree.childChannels) {
	if(childChannel.channel == channelId) {
	    tree.childChannels.splice(i,1);
	    return true;
	}
	else if(deleteChannelFromTree(channelId,childChannel))
	    return true;
	i++;
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
    var d = new Date();
    $scope.msgs = [
	{
	    "userName": "mumbleExpress",
	    "message": "Enter server ip",
	    "time": ''+d.getHours()+':'+d.getMinutes()
	}
    ];
    d = null;

    $scope.channelTree = {
	"name": null,
	"channel": null,
	"childChannels": [],
	"users": []
    };
    
    var loginState = 0;
    var loginInfo = {};
    
    $scope.sendMsg = function() {
	//connect to the server using first few messages as info
	if(loginState == 0) { //server ip
	    loginInfo.ip = $scope.msg.text;
	    loginState++;
	    var d = new Date();
	    var textMessage = {
		"userName": "mumbleExpress",
		"message": "Enter port",
		"time": ''+d.getHours()+':'+d.getMinutes()
	    }
	}
	else if(loginState == 1) { //port
	    loginInfo.port = $scope.msg.text;
	    loginState++;
	    var d = new Date();
	    var textMessage = {
		"userName": "mumbleExpress",
		"message": "Enter user name",
		"time": ''+d.getHours()+':'+d.getMinutes()
	    }
	}
	else if(loginState == 2) { //username
	    loginInfo.userName = $scope.msg.text;
	    loginState++;
	    var d = new Date();
	    var textMessage = {
		"userName": "mumbleExpress",
		"message": "Enter password",
		"time": ''+d.getHours()+':'+d.getMinutes()
	    }
	}
	else if(loginState == 3) { //password
	    loginInfo.password = $scope.msg.text;
	    loginState++;
	    //transmit info to server
	    socket.emit('login', loginInfo);
	    $scope.msg.text = '';
	    return;
	}
	else {
	    //else, sending message
	    socket.emit('send msg', $scope.msg.text);
	    var d = new Date();
	    var textMessage = {
		"userName": loginInfo.userName,
		"message": $scope.msg.text,
		"time": ''+d.getHours()+':'+d.getMinutes()
	    }
	}
	$scope.msgs.push(textMessage);
	$scope.msg.text = '';
    };

    socket.on('error', function(errorMessage) {
	var d = new Date();
	var textMessage = {
	    "userName": "mumbleExpress",
	    "message": errorMessage,
	    "time": ''+d.getHours()+':'+d.getMinutes()
	}
	$scope.msgs.push(errorMessage);
    });
    
    socket.on('textMessage', function(textMessage) {
	//append local time to textMessage object as string
	//(collected on client so locality is not an issue)
	var d = new Date();
	textMessage["time"]=''+d.getHours()+':'+d.getMinutes();

	$scope.msgs.push(textMessage);
    });

    socket.on('userState', function(state) {
	if(state.name) { // a new user connected
	    if(state.channel_id == null) {
		//make those in the root channel a child of the
		//root node for cleaner rendering. Why doesn't
		//mumble do this by default?
		state.channel_id = 0;
	    }
	    insertUserIntoTree(state,$scope.channelTree);
	}
	
	//update user info
	user = getUserFromTree(state.session,$scope.channelTree);
	if(state.channel_id!=null) //updating user position
	    user.channel_id=state.channel_id;

	if(state.self_deaf==true) //user deafened, must be mute also
	    user.self_deaf = user.self_mute = true;

	if(state.self_deaf==false) //user deafened
	    user.self_deaf = false;

	if(state.self_mute!=null) //updating user mute
	    user.self_mute=state.self_mute;

	//replace user with updated version in tree
	deleteUserFromTree(state.session,$scope.channelTree);
	insertUserIntoTree(user,$scope.channelTree);
    });

    socket.on('channelState', function(state) {
	insertChannelIntoTree(state,$scope.channelTree);
    });

    socket.on('channelRemove', function(state) {
	deleteChannelFromTree(state.channel_id,$scope.channelTree);
    });

    socket.on('userRemove', function(state) {
	deleteUserFromTree(state.session,$scope.channelTree);
    });

});
