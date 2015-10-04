var express = require('express');
var app = require('express')();
var fs = require('fs');
var HTTPS_OPTIONS = {
    ca: fs.readFileSync( 'ssl/https/sub.class1.server.sha2.ca.pem' ),
    key: fs.readFileSync( 'ssl/https/mumbleexpress.key' ),
    cert: fs.readFileSync( 'ssl/https/mumbleexpress.crt' )
};
var MUMBLE_OPTIONS = {
    key: fs.readFileSync( 'ssl/mumble/private.key' ),
    cert: fs.readFileSync( 'ssl/mumble/cert.crt' )
};
var https = require('https').createServer(HTTPS_OPTIONS,app);
var io = require('socket.io')(https);
var mumble = require('mumble');

function User(socket) {

    var socket = socket.id;

    var mumbleClient = null;

    //store the state of users connected to mumble server
    var sessions = {}

    var onInit = function() {
	console.log( 'Connection initialized' );
	// Connection is authenticated and usable.
    };

    var onVoice = function(data) {
	//console.log( 'Mixed voice' );
    };

    var onText = function(data) {
	var textMessage = {
	    "userName": sessions[data.actor].name,
	    "message": data.message
	}
	io.sockets.connected[socket].emit("textMessage",textMessage);
    };

    var onUserState = function(state) {
	sessions[state.session] = state;
	console.log("got user info");
	io.sockets.connected[socket].emit("userState",state);
    };

    var onUserRemove = function(state) {
	delete sessions[state.session];
	io.sockets.connected[socket].emit("userRemove",state);
    };

    var onChannelState = function(state) {
	io.sockets.connected[socket].emit("channelState",state);
    }

    var onChannelRemove = function (state) {
	io.sockets.connected[socket].emit("channelRemove",state);
    }

    this.getMumbleConnection = function() {
	return mumbleClient;
    };

    this.doConnect = function(serverAddress, username, password, key, cert) {
	// TODO: if key and cert are not undefined, make a custom options object for this user
	mumble.connect( serverAddress, MUMBLE_OPTIONS, function ( error, client ) {
	    mumbleClient = client;
	    if( error ) {
		io.sockets.connected[socket].emit("error","Could not connect");
		throw new Error( error );
	    }

	    console.log( 'Connected' );

	    client.authenticate( username );
	    client.on( 'initialized', onInit );
	    client.on( 'voice', onVoice );
	    client.on('textMessage', onText );
	    client.on('userState', onUserState);
	    client.on('userRemove', onUserRemove);
	    client.on('channelState', onChannelState);
	    client.on('channelRemove', onChannelRemove);
	    client.on('ready', function() {
		console.log("client ready");
		// console.log(client.users());
	    });
	});
    };

    this.disconnect = function() {
	if(mumbleClient)
	    mumbleClient.disconnect();
    }
}

io.on('connection', function(socket){
    var user = new User(socket);
    // console.log(user);
    // TODO: wait for user to provide info

    socket.on('login', function(loginInfo) {
	console.log(loginInfo);
	var password = loginInfo.password == '' ? null : loginInfo.password;
	console.log(password);
	var serverAddress = 'mumble://'+loginInfo.ip+':'+loginInfo.port;
	user.doConnect(serverAddress, loginInfo.userName, loginInfo.password);
    });

    socket.on('send msg', function(message) {
	var recipients = { session: [], channel_id: [] };

	var clients = user.getMumbleConnection().users();
        for( var c in clients ) {
            var client = clients[c];

            recipients.session.push( client.session );
            recipients.channel_id.push( client.channel.id );
        }

	user.getMumbleConnection().sendMessage(message, recipients);
    });

    socket.on('disconnect', function() {
	user.disconnect();
    });

});


https.listen(3000, function(){
    console.log('listening on *:3000');
});

app.use(express.static(__dirname + '/public'));
app.use(express.static(__dirname + '/node_modules'));
