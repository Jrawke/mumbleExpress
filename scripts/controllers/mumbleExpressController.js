app.controller('mumbleExpressController', function($scope, /*notification,*/ $rootScope, channelTree, mumbleChat, mumbleExpressConnection, socket) {

    var defaultUsername = "MumbleExpress";

    function decodeSample(a, b) {
	var ret = a*256 + b;
	if(ret > 32767) {
	    ret -= 65536;
	}
	return ret/32768;
    }

    function encodeSample(sample) {
	sample = sample*32768;
	if(sample < 0) {
	    sample += 65536;
	}
	return Math.floor(sample);
    }


    var audioBufferPos = 0;
    var audioBuffer = [];

    function pcmSource() {
	if(audioBufferPos == audioBuffer.length) {
	    return 0;
	} else {
	    return audioBuffer[audioBufferPos++];
	}
    }

    var audioContext;
    try {
	window.AudioContext = window.AudioContext || window.webkitAudioContext;
	audioContext = new AudioContext();
    } catch(e) {
	alert('Web Audio API is not supported in this browser');
    }

    var bufferSize = 4096;
    var pcmProcessingNode = audioContext.createScriptProcessor(bufferSize, 1, 1);
    pcmProcessingNode.onaudioprocess = function(e) {
	var output = e.outputBuffer.getChannelData(0);
	for (var i = 0; i < bufferSize; i++) {
	    // Generate and copy over PCM samples.
	    output[i] = pcmSource();
	}
    }
    pcmProcessingNode.connect(audioContext.destination);

    
    //set up html5 notifications
    /*
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
*/

    $scope.channelTree = channelTree.tree;

    //update object in controller when channelTree is changed
    $scope.$on( 'tree.update', function( event ) {
	$scope.channelTree = channelTree.tree;
    });
    
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
	    channelTree.deleteFromTree(srcObj.isChannel, srcObjId);
	    channelTree.insertIntoTree(srcObj, srcParent.channelId);
	}
    };

    //set up buttons
    $scope.user = mumbleExpressConnection.user;

    $scope.$on( 'connectionUpdate', function( event ) {
	$scope.user = mumbleExpressConnection.user;
    });
    
    var muteState =  true; //for remembering if should be muted when undeafening

    $scope.deafButton = function() {
	if(!$scope.user.deafened)
	    $scope.user.muted = muteState;

	mumbleExpressConnection.setMuteDeaf($scope.user.muted, $scope.user.deafened);
    };
    
    $scope.muteButton = function() {
	muteState = $scope.user.muted;
	if(!$scope.user.muted)
	    $scope.user.deafened = false;

	mumbleExpressConnection.setMute($scope.user.muted);
    };

    var selectedNode = null;
    var tempSelectedNode = null;

    //on click of item in tree
    $scope.selectNode = function(node) {
	var id = node.isChannel? node.channelId : node.session;
	selectedNode = {
	    "isChannel": node.isChannel,
	    "id": id
	}
    };

    //on mouseover of item in tree
    $scope.tempSelectNode = function(node) {
	var id = node.isChannel? node.channelId : node.session;
	tempSelectedNode = {
	    "isChannel": node.isChannel,
	    "id": id
	}
    };

    $scope.tempUnSelectNode = function() {
	tempSelectedNode = null;
    };
    
    $scope.selectedNode = function(node) {
	if(selectedNode && (node.isChannel == selectedNode.isChannel)) {
	    var id = node.isChannel? node.channelId : node.session;
	    if(id == selectedNode.id)
		return true;
	}
	if(tempSelectedNode && (node.isChannel == tempSelectedNode.isChannel)) {
	    var id = node.isChannel? node.channelId : node.session;
	    if(id == tempSelectedNode.id)
		return true;
	}
	return false;
    };


    socket.on('voiceMessage', function(data) {
	data = new Uint8Array(data);
	for(var i = 0; i < data.length; i += 2) {
	    audioBuffer.push(decodeSample(data[i+1], data[i]));
	}
    });

    var initializeMicrophone = function(e){
	// creates the audio context
	var context = new AudioContext();
	
	// let the server know what bitrate we're using
	socket.emit('bitrate', context.sampleRate);
	
	// creates a gain node
	volume = context.createGain();
	
	// creates an audio node from the microphone incoming stream
	audioInput = context.createMediaStreamSource(e);
	
	// connect the stream to the gain node
	audioInput.connect(volume);
	
	/* From the spec: This value controls how frequently the audioprocess event is 
	   dispatched and how many sample-frames need to be processed each call. 
	   Lower values for buffer size will result in a lower (better) latency. 
	   Higher values will be necessary to avoid audio breakup and glitches */
	var bufferSize = 2048;
	recorder = context.createScriptProcessor(bufferSize, 1, 1);
	
	recorder.onaudioprocess = function(e){
            var input = e.inputBuffer.getChannelData(0);
	    var voiceMessage = new Uint16Array(input.length);
	    for(var i = 0; i < input.length; i++) {
	    	voiceMessage[i] = encodeSample(input[i]);
	    }
	    socket.emit('microphone', voiceMessage);
	}
	
	// we connect the recorder
	volume.connect (recorder);
	recorder.connect(context.destination);
    }

    if (!navigator.getUserMedia)
        navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia ||
        navigator.mozGetUserMedia || navigator.msGetUserMedia;
    
    if (navigator.getUserMedia){
	navigator.getUserMedia({audio:true}, initializeMicrophone, function(e) {
	    alert('Error capturing audio.');
	});
    } else alert('getUserMedia not supported in this browser.');

});
