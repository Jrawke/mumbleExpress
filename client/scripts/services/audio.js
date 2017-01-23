'use strict';

var audio = function(mumbleExpressConnection, socket) {

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

    // Store incoming audio in circular buffer
    var audioBuffer = [];
    var audioBufferReadPos = 0;
    var audioBufferWritePos = 0;
    var audioBufferMaxSize = 4096 * 100;

    function pcmSource() {
	if(audioBufferReadPos == audioBufferWritePos) {
	    return 0;
	}
	else {
	    if(audioBufferReadPos == audioBufferMaxSize) {
		audioBufferReadPos = 0;
	    }

	    audioBufferReadPos++; // Could get stuck in double-precision arithmetic
	    return audioBuffer[audioBufferReadPos];
	}
    }

    socket.on('voiceMessage', function(data) {
	data = new Uint8Array(data);
	for(var i = 0; i < data.length; i += 2) {
	    if(audioBufferWritePos == audioBufferMaxSize) {
		audioBufferWritePos = 0;
	    }

	    if(audioBufferWritePos + 1 == audioBufferReadPos) {
		// Buffer full, drop audio
		return;
	    }
	    
	    audioBuffer[audioBufferWritePos] = decodeSample(data[i+1], data[i]);
	    audioBufferWritePos++;
	}
    });

    // audio objects
    var micContext;
    var volume;
    var audioInput;
    var recorder;

    var speakerContext;
    var pcmProcessingNode;

    var service = {

	initializeMicrophone : function(e){
	    // creates the audio context
	    micContext = new AudioContext();
	    
	    // let the server know what bitrate we're using
	    socket.emit('bitrate', micContext.sampleRate);
	    
	    // creates a gain node
	    volume = micContext.createGain();
	    
	    // creates an audio node from the microphone incoming stream
	    audioInput = micContext.createMediaStreamSource(e);
	    
	    // connect the stream to the gain node
	    audioInput.connect(volume);
	    
	    /* From the spec: This value controls how frequently the audioprocess event is 
	       dispatched and how many sample-frames need to be processed each call. 
	       Lower values for buffer size will result in a lower (better) latency. 
	       Higher values will be necessary to avoid audio breakup and glitches */
	    var bufferSize = 2048;
	    recorder = micContext.createScriptProcessor(bufferSize, 1, 1);
	    
	    recorder.onaudioprocess = function(e){
		if (mumbleExpressConnection.user.muted)
		    return;
		var input = e.inputBuffer.getChannelData(0);
		var voiceMessage = new Uint16Array(input.length);
		for(var i = 0; i < input.length; i++) {
	    	    voiceMessage[i] = encodeSample(input[i]);
		}
		socket.emit('microphone', voiceMessage);
	    }
	    
	    // we connect the recorder
	    volume.connect (recorder);
	    recorder.connect(micContext.destination);
	},

	initializeSpeakers: function() {
	    try {
		window.AudioContext = window.AudioContext || window.webkitAudioContext;
		speakerContext = new AudioContext();
	    } catch(e) {
		alert('Web Audio API is not supported in this browser');
		//TODO: force set mute/deaf
	    }
	    var bufferSize = 4096;
	    pcmProcessingNode = speakerContext.createScriptProcessor(bufferSize, 1, 1);
	    pcmProcessingNode.onaudioprocess = function(e) {
		var output = e.outputBuffer.getChannelData(0);
		for (var i = 0; i < bufferSize; i++) {
		    // Generate and copy over PCM samples.
		    output[i] = pcmSource();
		}
	    }
	    pcmProcessingNode.connect(speakerContext.destination);
	}
    };

    return service;
};

module.exports = audio;
