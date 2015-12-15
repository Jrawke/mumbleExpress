app.service( 'mumbleChat', function( $rootScope , socket) {

    var service = {
	messages: [],
	
	addMessage: function (userName, message, recipient) {
	    if(typeof(recipient) == 'undefined')
		recipient = null;
	    
	    var d = new Date();
	    var textMessage = {
		"userName": userName,
		"message": message,
	    	"time": ''+d.getHours()+':'+d.getMinutes(),
		"recipient": recipient
	    };
	    service.messages.push(textMessage);
	    if(recipient)
		socket.emit('send msg', textMessage);
	    $rootScope.$broadcast( 'chatLog.update' );
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
	    $rootScope.$broadcast('chatLog.update');
	}
    };

    return service;
});
