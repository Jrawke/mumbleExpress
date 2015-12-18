app.service( 'audio', function(socket) {

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
	    var ret = audioBuffer[audioBufferPos];
	    delete audioBuffer[audioBufferPos];
	    audioBufferPos++; // Could overflow in double-precision arithmetic
	    return ret;
	}
    }

    socket.on('voiceMessage', function(data) {
	data = new Uint8Array(data);
	for(var i = 0; i < data.length; i += 2) {
	    audioBuffer.push(decodeSample(data[i+1], data[i]));
	}
    });

    var service = {

	initializeMicrophone : function(e){
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
	},

	initializeSpeakers: function() {
	    var audioContext;
	    try {
		window.AudioContext = window.AudioContext || window.webkitAudioContext;
		audioContext = new AudioContext();
	    } catch(e) {
		alert('Web Audio API is not supported in this browser');
		//TODO: force set mute/deaf
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
	}
    };

    return service;
});
