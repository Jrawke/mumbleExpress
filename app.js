var express = require('express');
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var mumble = require('mumble');
var fs = require('fs');

function User(socket) {
    var options = {
	key: fs.readFileSync( 'private.pem' ),
	cert: fs.readFileSync( 'public.pem' )
    };

    var socket = socket.id;

    var onInit = function() {
	console.log( 'Connection initialized' );
	// Connection is authenticated and usable.
    };

    var onVoice = function(data) {
	//console.log( 'Mixed voice' );
    };

    var onText = function(data) {
	console.log(data.message);
	io.sockets.connected[socket].emit("onText",data);
    };

    var mumbleClient = null;

    this.getMumbleConnection = function() {
	return mumbleClient;
    };

    this.doConnect = function(serverIp, username, password, ket, cert) {
	// TODO: if key and cert are not undefined, make a custom options object for this user
	mumble.connect( 'mumble://ball.holdings', options, function ( error, client ) {
	    mumbleClient = client;
	    if( error ) { throw new Error( error ); }

	    console.log( 'Connected' );

	    client.authenticate( 'ExampleUser' );
	    client.on( 'initialized', onInit );
	    client.on( 'voice', onVoice );
	    client.on('textMessage', onText );
	    client.on('ready', function() {
		console.log("client ready");
		// console.log(client.users());
	    });
	});
    };
}

io.on('connection', function(socket){
    var user = new User(socket);
    // console.log(user);
    // TODO: wait for user to provide info
    user.doConnect("mumble://ball.holdings", "user", null);

    socket.on('server info message', function(message) {
	var messageObject = JSON.parse(message);
	user.doConnect(messageObject.serverIp, 
		       messageObject.username, 
		       messageObject.password, 
		       messageObject.key, 
		       messageObject.cert);
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

});

http.listen(3000, function(){
    console.log('listening on *:3000');
});

app.use(express.static(__dirname + '/public'));
app.use(express.static(__dirname + '/bower_components'));
