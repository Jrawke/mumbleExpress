app.service( 'mumbleExpressConnection', function( $rootScope, channelTree, mumbleChat, socket ) {
    //this service handles all server communication and logic needed for
    //recording connection state. It does this by handling incoming messages
    //from the server and using them to update underlying data structures.

    var loginInfo = {};

    var defaultUsername = "MumbleExpress";
    
    var service = {
	user : { //user mute & deaf state
	    muted: true,
	    deafened: false
	},

	currentChannel : null, //the channel that the user is in
	
	setMuteDeaf: function (muted, deafened) {
	    socket.emit('deafButton',
			{
			    selfMute: muted,
			    selfDeaf: deafened
			}
		       );
	},

	setMute: function (muted) {
	    socket.emit('muteButton', muted);
	},

	setLoginInfo: function(li) {
	    loginInfo = li;
	    socket.emit('login', loginInfo);
	}

    };

    var initialized = false;
    socket.on('ready', function() {
	initialized = true;
    });

    socket.on('errorMessage', function(errorMessage) {
	mumbleChat.addMessage(defaultUsername, errorMessage);
    });
    
    socket.on('textMessage', function(textMessage) {
	//todo: find better way to do this
	//see notes in services/chatLog.js
	mumbleChat.incomingMessage(textMessage);
	//notify(textMessage);
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
	    if(initialized) {
		//log the connection to chatbox
		mumbleChat.addMessage(node.name, "connected")
	    }

	    var parentChannel = state.channel_id;
	    if(parentChannel == null) {
		//make those in the root channel a child of the
		//root node for cleaner rendering. Why doesn't
		//mumble do this by default?
		parentChannel = 0;
	    }

	    if(node.name == loginInfo.userName) { //updating the user's position
		loginInfo.session = node.session;
		service.currentChannel = parentChannel;
	    }


	    channelTree.insertIntoTree(node,parentChannel);
	    return;
	}
	
	//update user info
	node = channelTree.getFromTree(false,state.session);

	if(state.channel_id!=null) { //updating user position
	    channelTree.deleteFromTree(false, state.session);
	    channelTree.insertIntoTree(node,state.channel_id);

	    if(state.session == loginInfo.session) { //updating the user's position
		service.currentChannel = state.channel_id;
		//$scope.selectNode(node); //when user moves, select new channel by default
	    }
	    else {
		//log the move to chatbox
		var newChannel = channelTree.getFromTree(true, state.channel_id);
		mumbleChat.addMessage(node.name, "moved to "+newChannel.name);
	    }
	}

	if(state.self_deaf==true) { //user deafened, must be mute also
	    node.deafened = state.self_mute = true;
	    if(node.name == loginInfo.userName) {
		service.user.muted = service.user.deafened = true;
		$rootScope.$broadcast( 'muteDeafUpdate' );
	    }
	}

	if(state.self_deaf==false) { //user undeafened
	    node.deafened = false;
	    if(node.name == loginInfo.userName) {
		service.user.deafened = false;
		$rootScope.$broadcast( 'muteDeafUpdate' );
	    }
	}

	if(state.self_mute!=null) { //updating user mute
	    node.muted=state.self_mute;
	    if(node.name == loginInfo.userName) {
		service.user.muted = state.self_mute;
		$rootScope.$broadcast( 'muteDeafUpdate' );
	    }
	}

	if(state.self_mute != null || state.self_deaf != null) {
	    //log the mute/deaf to chatbox
	    var muteDeafMessage = '';
	    if(state.self_deaf == true)
		muteDeafMessage = "muted and deafened";
	    else if(state.self_deaf == false)
		muteDeafMessage = node.muted? "undeafened" : "unmuted and undeafened";
	    else if(state.self_mute == true)
		muteDeafMessage = "muted";
	    else if(state.self_mute == false)
		muteDeafMessage = "unmuted";
	    mumbleChat.addMessage(node.name, muteDeafMessage);
	}

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
	channelTree.insertIntoTree(node,state.parent);
    });

    socket.on('channelRemove', function(state) {
	channelTree.deleteFromTree(true, state.channel_id);
    });

    socket.on('userRemove', function(state) {
	node = channelTree.getFromTree(false,state.session);
	//log the disconnection to chatbox
	mumbleChat.addMessage(node.name, "disconnected");

	channelTree.deleteFromTree(false, state.session);
    });

    return service;
    
});
