'use strict';

var channelTree = function( $rootScope ) {

    function insertIntoTreeAux (node, parentChannel, tree) {
	if(parentChannel==null) { //root
	    tree.push(node);
	    return true;
	}
	for (var child of tree) {
	    if(child.isChannel && child.channelId == parentChannel) {
		child.children.push(node);
		return true;
	    }
	    else if(insertIntoTreeAux(node, parentChannel, child.children))
		return true;
	}	
	return false;
    }

    function deleteFromTreeAux (isChannel, id, tree) {
	var i=0;
	for (var child of tree) {
	    if( (isChannel == child.isChannel)
		&& ((isChannel? child.channelId : child.session) == id)) {
		tree.splice(i,1);
		return true;
	    }
	    else if(deleteFromTreeAux(isChannel,id,child.children))
		return true;
	    i++;
	}
	return false;
    }

    function getFromTreeAux (isChannel, id, tree) {
	for (var child of tree) {
	    if((isChannel? child.channelId : child.session) == id)
		return child;

	    var res = getFromTreeAux(isChannel,id,child.children);
	    if(res)
		return res;
	}
	
	return null;
    }

    function onUpdate() {
	$rootScope.$broadcast( 'tree.update' );
    }

    var service = {

	tree: [],

	insertIntoTree: function (node, parentChannel) {
	    var res = insertIntoTreeAux(node, parentChannel, service.tree);
	    onUpdate();
	    return res;
	},

	deleteFromTree: function (isChannel, id) {
	    var res = deleteFromTreeAux(isChannel, id, service.tree);
	    onUpdate();
	    return res;
	},

	getFromTree: function (isChannel, id) {
	    var res = getFromTreeAux(isChannel, id, service.tree);
	    onUpdate();
	    return res;
	}
    };

    return service;
};

module.exports = channelTree;
