/**
 * 
 */

// IMPLEMENTATION
var Author = require("../../core/author.js");

function _initAuthor(){
    var zwoAuthor = new Author();
    return zwoAuthor.();
}
function someFunction(fileName){
    var zwoAuthor=_initAuthor();
	return 
}

// MODULE INTERFACES
module.exports.someFunction = someFunction;
