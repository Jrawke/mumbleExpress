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

    var socket = socket;

    var onInit = function() {
	console.log( 'Connection initialized' );
	// Connection is authenticated and usable.
    };

    var onVoice = function(data) {
	//console.log( 'Mixed voice' );
    };

    var onText = function(data) {
	console.log(data.message);
    };

    this.doConnect = function(serverIp, username, password, ket, cert) {
	// TODO: if key and cert are not undefined, make a custom options object for this user
	mumble.connect( 'mumble://ball.holdings', options, function ( error, connection ) {
	    if( error ) { throw new Error( error ); }

	    console.log( 'Connected' );

	    connection.authenticate( 'ExampleUser' );
	    connection.on( 'initialized', onInit );
	    connection.on( 'voice', onVoice );
	    connection.on('textMessage', onText );
	    connection.on('ready', function() { console.log(connection.users());});
	});
    };
}

app.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){
    var user = new User(socket);
    console.log(user);
    // TODO: wait for user to provide info
    user.doConnect("mumble://ball.holdings", "user", null);
    socket.on('server info message', function(message) {
	var messageObject = JSON.parse(message);
	user.doConnect(messageObject.serverIp, messageObject.username, messageObject.password, messageObject.key, messageObject.cert);
    });
});

http.listen(3000, function(){
    console.log('listening on *:3000');
});