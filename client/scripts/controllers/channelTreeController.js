'use strict';

var channelTreeController = function($scope, $rootScope, channelTree, socket) {

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
	    var srcObjId = srcObj.isChannel? srcObj.channelId : srcObj.session;
	    channelTree.deleteFromTree(srcObj.isChannel, srcObjId);
	    channelTree.insertIntoTree(srcObj, srcParent.channelId);
	}
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
    
};

module.exports = channelTreeController;
