app.controller('chatBoxController', function($scope, $rootScope, mumbleChat, mumbleExpressConnection, channelTree) {

    var defaultUsername = "MumbleExpress";

    function isValidHostname(str) {
	return /((^\s*((([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5]))\s*$)|(^\s*((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(%.+)?\s*$))|(^\s*((?=.{1,255}$)(?=.*[A-Za-z].*)[0-9A-Za-z](?:(?:[0-9A-Za-z]|\b-){0,61}[0-9A-Za-z])?(?:\.[0-9A-Za-z](?:(?:[0-9A-Za-z]|\b-){0,61}[0-9A-Za-z])?)*)\s*$)/.test(str);
    }

    function isValidUsername(str) {
	return /^[-=\w\[\]\{\}\(\)\@\|\.]+$/.test(str);
    }

    $scope.getChannelNameFromId = function (channelId) {
	node = channelTree.getFromTree(true,channelId);
	return node.name;
    };
    
    $scope.user = mumbleExpressConnection.user;
    $scope.currentChannel = mumbleExpressConnection.currentChannel;
    
    $scope.$on( 'connectionUpdate', function( event ) {
	$scope.user = mumbleExpressConnection.user;
	$scope.currentChannel = mumbleExpressConnection.currentChannel;
    });
    
    //set up message box
    $scope.msgs = mumbleChat.messages;

    //update object in controller when chatLog is changed
    $scope.$on( 'mumbleChat.update', function( event ) {
	$scope.msgs = mumbleChat.messages;
    });

    mumbleChat.addMessage(defaultUsername, "Enter server address")


    var loginState = 0;
    var loginInfo = {};
    
    $scope.sendMsg = function() {
	//connect to the server using first few messages as info
	if(loginState == 0) { //server ip
	    if(isValidHostname($scope.msg.text)) {
		loginInfo.ip = $scope.msg.text;
		loginState++;
		var msg = "Enter port (if blank, will be default of 64738)";
		mumbleChat.addMessage(defaultUsername, msg);
	    }
	    else {
		var msg = "\"" + $scope.msg.text + "\" is not a valid hostname. Reenter server address";
		mumbleChat.addMessage(defaultUsername,msg);
		return;
	    }
	}
	else if(loginState == 1) { //port
	    loginInfo.port = $scope.msg.text == '' ? "64738" : $scope.msg.text;
	    loginState++;
	    mumbleChat.addMessage(defaultUsername, "Enter user name");
	}
	else if(loginState == 2) { //username
	    if(isValidUsername($scope.msg.text)) {
		loginInfo.userName = $scope.msg.text;
		loginState++;
		mumbleChat.addMessage(defaultUsername, "Enter password");
	    }
	    else {
		var msg = "\"" + $scope.msg.text + "\" is not a valid username. Reenter server address";
		mumbleChat.addMessage(defaultUsername, msg);
		return;
	    }
	}
	else if(loginState == 3) { //password
	    loginInfo.password = $scope.msg.text;
	    loginInfo.muted = true;
	    loginInfo.deafened = false;
	    loginState++;
	    //transmit info to server
	    mumbleExpressConnection.setLoginInfo(loginInfo);
	    $scope.msg.text = '';
	    return;
	}
	else {
	    //else, sending message

	    if($scope.msg.text=='')
		return;
	    
	    var recipient = { //who to send message to
		"isChannel": true, //todo: support sending to user
		"id": $scope.currentChannel
	    };

	    mumbleChat.addMessage(loginInfo.userName, $scope.msg.text, recipient);
	}
	$scope.msg.text = '';
    };    
});
