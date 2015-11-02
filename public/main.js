var app = angular.module('mumbleExpressApp', ['luegg.directives', 'btford.socket-io','notification', 'ui.tree']);

var defaultUsername = "MumbleExpress";

app.factory('socket', function (socketFactory) {
    return socketFactory();
});

function insertIntoTree(node, parentChannel, tree) {
    if(parentChannel==null) { //root
	tree.push(node);
	return true;
    }
    for (child of tree) {
	if(child.isChannel && child.channelId == parentChannel) {
	    child.children.push(node);
	    return true;
	}
	else if(insertIntoTree(node, parentChannel, child.children))
	    return true;
    }	
    return false;
}

function deleteFromTree(isChannel, id, tree) {
    var i=0;
    for (child of tree) {
	if( (isChannel == child.isChannel)
	    && ((isChannel? child.channelId : child.session) == id)) {
	    tree.splice(i,1);
	    return true;
	}
	else if(deleteFromTree(isChannel,id,child.children))
	    return true;
	i++;
    }
    return false;
}

function getFromTree(isChannel, id, tree) {
    for (child of tree) {
	if((isChannel? child.channelId : child.session) == id)
	    return child;

	var res = getFromTree(isChannel,id,child.children);
	if(res)
	    return res;
    }
    
    return null;
}



function isValidHostname(str) {
    return /((^\s*((([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5]))\s*$)|(^\s*((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(%.+)?\s*$))|(^\s*((?=.{1,255}$)(?=.*[A-Za-z].*)[0-9A-Za-z](?:(?:[0-9A-Za-z]|\b-){0,61}[0-9A-Za-z])?(?:\.[0-9A-Za-z](?:(?:[0-9A-Za-z]|\b-){0,61}[0-9A-Za-z])?)*)\s*$)/.test(str);
}

function isValidUsername(str) {
    return /^[-=\w\[\]\{\}\(\)\@\|\.]+$/.test(str);
}

app.controller('mumbleExpressController', function($scope, $notification, socket){

    //set up html5 notifications
    function notify(textMessage) {
	var notification = $notification(textMessage.userName + " sent a message at " + textMessage.time, {
		body: textMessage.message,
		//icon:'icon.png',
		dir:'auto',
		focusWindowOnClick: true,
		delay: 8000
		});
    }

    $notification.requestPermission();

    //set up dynamic tree view callbacks
    $scope.treeOptions = {
	accept: function(sourceNodeScope, destNodesScope, destIndex) {
	    if(!destNodesScope.$modelValue ||
	       (destNodesScope.$modelValue[0] &&
		destNodesScope.$modelValue[0].channelId == 0))
		return false;
	    else
		return true;
	},
	dropped: function(event) {
	    var srcObj = event.source.nodeScope.$modelValue;
	    var srcParent = event.source.nodeScope.$parentNodeScope.$modelValue;
	    var dstParent = event.dest.nodesScope.$parent.$modelValue;

	    if(srcParent == dstParent)
		return;
	    
	    var channelSwitch = {
		"isChannel": srcObj.isChannel,
		"id": srcObj.isChannel? srcObj.channelId : srcObj.session,
		"channelName": dstParent.name
	    };
	    socket.emit('change channels', channelSwitch);

	    //move node back to original position in tree.
	    //if the position changes, server will tell us
	    srcObjId = srcObj.isChannel? srcObj.channelId : srcObj.session;
	    deleteFromTree(srcObj.isChannel, srcObjId, $scope.channelTree);
	    insertIntoTree(srcObj, srcParent.channelId ,$scope.channelTree);
	}
    };

    //set up message box
    var d = new Date();
    $scope.msgs = [
	{
	    "userName": defaultUsername,
	    "message": "Enter server address",
	    "time": ''+d.getHours()+':'+d.getMinutes()
	}
    ];
    d = null;

    $scope.channelTree = [];
    
    var loginState = 0;
    var loginInfo = {};
    
    $scope.sendMsg = function() {
	//connect to the server using first few messages as info
	var d = new Date();
	if(loginState == 0) { //server ip
	    if(isValidHostname($scope.msg.text)) {
		loginInfo.ip = $scope.msg.text;
		loginState++;
		var textMessage = {
		    "userName": defaultUsername,
		    "message": "Enter port (if blank, will be default of 64738)",
		    "time": ''+d.getHours()+':'+d.getMinutes()
		}
	    }
	    else {
	    	var textMessage = {
	    	    "userName": defaultUsername,
	    	    "message": "\"" + $scope.msg.text + "\" is not a valid hostname. Reenter server address",
	    	    "time": ''+d.getHours()+':'+d.getMinutes()
	    	};
		$scope.msgs.push(textMessage);
		return;
	    }
	}
	else if(loginState == 1) { //port
	    loginInfo.port = $scope.msg.text == '' ? "64738" : $scope.msg.text;
	    loginState++;
	    var textMessage = {
		"userName": defaultUsername,
		"message": "Enter user name",
		"time": ''+d.getHours()+':'+d.getMinutes()
	    }
	}
	else if(loginState == 2) { //username
	    if(isValidUsername($scope.msg.text)) {
		loginInfo.userName = $scope.msg.text;
		loginState++;
		var textMessage = {
		    "userName": defaultUsername,
		    "message": "Enter password",
		    "time": ''+d.getHours()+':'+d.getMinutes()
		}
	    }
	    else {
		var textMessage = {
		    "userName": defaultUsername,
	    	    "message": "\"" + $scope.msg.text + "\" is not a valid username. Reenter server address",
		    "time": ''+d.getHours()+':'+d.getMinutes()
		}
		$scope.msgs.push(textMessage);
		return;
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
	    var textMessage = {
		"userName": loginInfo.userName,
		"message": $scope.msg.text,
		"time": ''+d.getHours()+':'+d.getMinutes()
	    }
	}
	$scope.msgs.push(textMessage);
	$scope.msg.text = '';
    };

    socket.on('errorMessage', function(errorMessage) {
	var d = new Date();
	var textMessage = {
	    "userName": defaultUsername,
	    "message": errorMessage,
	    "time": ''+d.getHours()+':'+d.getMinutes()
	}
	$scope.msgs.push(textMessage);
    });
    
    socket.on('textMessage', function(textMessage) {
	//append local time to textMessage object as string
	//(collected on client so locality is not an issue)
	var d = new Date();
	textMessage["time"]=''+d.getHours()+':'+d.getMinutes();

	//receive remote message
	$scope.msgs.push(textMessage);
	notify(textMessage);
    });

   
    socket.on('userState', function(state) {
	if(state.name) { // a new user connected

	    //create a node object for insertion into tree
	    var node = {
		"name": state.name,
		"session": state.session,
		
		"isChannel": false,
		"channelId": null,
		
		"muted": (state.self_mute || state.self_deaf),
		"deafened": state.self_deaf,

		"children": []
	    };

	    var parentChannel = state.channel_id;
	    if(parentChannel == null) {
		//make those in the root channel a child of the
		//root node for cleaner rendering. Why doesn't
		//mumble do this by default?
		parentChannel = 0;
	    }
	    insertIntoTree(node,parentChannel,$scope.channelTree);
	    return;
	}
	
	//update user info
	node = getFromTree(false,state.session,$scope.channelTree);

	if(state.channel_id!=null) { //updating user position
	    deleteFromTree(false, state.session,$scope.channelTree);
	    insertIntoTree(node,state.channel_id,$scope.channelTree);
	}

	if(state.self_deaf==true) //user deafened, must be mute also
	    node.deafened = state.self_mute = true;

	if(state.self_deaf==false) //user undeafened
	    node.deafened = false;

	if(state.self_mute!=null) //updating user mute
	    node.muted=state.self_mute;
    });

    socket.on('channelState', function(state) {
	var node = {
	    "name": state.name,
	    "session": null,
	    
	    "isChannel": true,
	    "channelId": state.channel_id,
	    
	    "muted": state.self_mute,
	    "deafened": state.self_deaf,
	    
	    "children": []
	};
	insertIntoTree(node,state.parent,$scope.channelTree);
    });

    socket.on('channelRemove', function(state) {
	deleteFromTree(true, state.channel_id,$scope.channelTree);
    });

    socket.on('userRemove', function(state) {
	deleteFromTree(false, state.session,$scope.channelTree);
    });

});
