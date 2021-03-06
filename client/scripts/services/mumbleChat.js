'use strict';

var mumbleChat = function( $rootScope , socket) {

    // Prepend num with zeros until it is 'places' long.
    // ex: zeroPad(5, 3) -> '005'
    // ex: zeroPad(1234, 1) -> '1234'
    function zeroPad (num, places) {
	var zero = places - num.toString().length + 1;
	return Array(+(zero > 0 && zero)).join("0") + num;
    }

    var service = {
	messages: [],

	//send a message to the server. If no recipient is specified,
	//it will only log the message to the chatBox.
	addMessage: function (userName, message, recipient) {
	    if(typeof(recipient) == 'undefined')
		recipient = null;

	    var d = new Date();
	    var textMessage = {
		"userName": userName,
		"message": message,
	    	"time": '' + zeroPad(d.getHours(), 2) + ':' + zeroPad(d.getMinutes(), 2),
		"recipient": recipient
	    };
	    service.messages.push(textMessage);
	    if(recipient)
		socket.emit('send msg', textMessage);
	    $rootScope.$broadcast( 'mumbleChat.update' );
	},

	//if server sends message with additional info then supported in
	//addMessage parameters, add it directly.
	//todo: cleaner way to do this would be to seperate login
	//logic from chat log. then can just have send/recieve functions
	incomingMessage: function(textMessage) {
	    //append local time to textMessage object as string
	    //(collected on client so locality is not an issue)
	    var d = new Date();
	    textMessage["time"]=''+d.getHours()+':'+d.getMinutes();
	    textMessage["recipient"]=null; //incoming message

	    service.messages.push(textMessage);
	    $rootScope.$broadcast('mumbleChat.update');
	}
    };

    return service;
};

module.exports = mumbleChat;
