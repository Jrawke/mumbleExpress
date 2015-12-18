'use strict';

var mumbleExpressController = function($notification, audio) {

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

    //setup audio service
    audio.initializeSpeakers();
    
    if (!navigator.getUserMedia)
        navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia ||
        navigator.mozGetUserMedia || navigator.msGetUserMedia;
    
    if (navigator.getUserMedia){
	navigator.getUserMedia({audio:true}, audio.initializeMicrophone, function(e) {
	    alert('Error capturing audio.');
	});
    } else alert('getUserMedia not supported in this browser.'); //todo: set mute/deaf


};

module.exports = mumbleExpressController;
