'use strict';

var mumbleExpressConnection = function( $rootScope, channelTree, mumbleChat, socket ) {
    //this service handles all server communication and logic needed for
    //recording connection state. It does this by handling incoming messages
    //from the server and using them to update underlying data structures.

    var loginInfo = {};

    var defaultUsername = "MumbleExpress";
    
    var service = {

	user : {
	    name: null,
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
	    service.user.name = loginInfo.userName;
	    loginInfo = li;
	    $rootScope.$broadcast( 'connectionUpdate' );
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

    socket.on('tryReconnect', function() {
	$rootScope.resetLoginState();
    });
    
    socket.on('userState', function(state) {
	var node;
	if(state.name) { // a new user connected

	    //create a node object for insertion into tree
	    node = {
		"name": state.name,
		"session": state.session,
		
		"isChannel": false,
		"channelId": null,
		
		"muted": (state.self_mute || state.self_deaf),
		"deafened": state.self_deaf,

		"serverMuted": (state.mute || state.deaf),
		"serverDeafened": state.deaf,

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
		$rootScope.$broadcast( 'connectionUpdate' );
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
		$rootScope.$broadcast( 'connectionUpdate' );
		//$scope.selectNode(node); //when user moves, select new channel by default
	    }
	    else {
		//log the move to chatbox
		var newChannel = channelTree.getFromTree(true, state.channel_id);
		mumbleChat.addMessage(node.name, "moved to "+newChannel.name);
	    }
	}

	//update user mute/deaf
	var previousMute = node.muted;
	var previousDeaf = node.deafened;

	if(state.self_deaf==true) //user deafened, must be mute also
	    node.deafened = node.muted = true;
	if(state.self_deaf==false) //user undeafened
	    node.deafened = false;
	if(state.self_mute!=null) //updating user mute
	    node.muted=state.self_mute;

	if(state.self_mute != null || state.self_deaf != null) {
	    //log the mute/deaf to chatbox
	    mumbleChat.addMessage(node.name,calculateMuteDeafMessage(
		state.self_mute, state.self_deaf, previousMute, previousDeaf
	    ));
	}

	// Update mute/deaf buttons
	if(node.name == loginInfo.userName) {
	    service.user.muted = node.muted;
	    service.user.deafened = node.deafened;
	    $rootScope.$broadcast( 'connectionUpdate' );
	}

	//update server mute/deaf
	var previousServerMuted = node.serverMuted;
	var previousServerDeafened = node.serverDeafened;

	if(state.deaf==true) //server deafened, must be mute also
	    node.serverDeafened = state.serverMute = true;
	if(state.deaf==false) //server undeafened
	    node.serverDeafened = false;
	if(state.mute!=null) //updating server mute
	    node.serverMuted=state.mute;

	if(state.mute != null || state.deaf != null) {
	    //log the server mute/deaf to chatbox
	    mumbleChat.addMessage(node.name,calculateMuteDeafMessage(
		state.mute, state.deaf, previousServerMuted, previousServerDeafened
	    ) + " by Server");
	}

    });

    var calculateMuteDeafMessage = function(mute, deaf, previousMute, previousDeaf) {
	var muteMessage = '';
	var deafMessage = '';

	if(mute != null && mute != previousMute)
	    muteMessage = mute? 'muted' : 'unmuted';
	if(deaf != null && deaf != previousDeaf)
	    deafMessage = deaf? 'deafened' : 'undeafened';

	if(muteMessage != '' && deafMessage != '')
	    return muteMessage + ' and ' + deafMessage;
	else
	    return muteMessage + deafMessage;
    }

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
	var node = channelTree.getFromTree(false,state.session);
	//log the disconnection to chatbox
	mumbleChat.addMessage(node.name, "disconnected");

	channelTree.deleteFromTree(false, state.session);
    });

    return service;
    
};

module.exports = mumbleExpressConnection;
