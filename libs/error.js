var stack = '';

function ErrorHandler(error, code, message) {
	this.err = error;
	this.errCode = code;
	this.message = '';

	if (typeof this.errCode !== 'undefined' && this.errCode !== null) this.message += '['+errors[code]+'] ';
	if (typeof message !== 'undefined' && message !== null) this.message += message;

	this.errors = {
	  // General Errors
		100: ''
	};
}

ErrorHandler.prototype.throwError = function() {
	this.message += '\nStack Trace: '+ this.err.stack;
	stack += this.message+'\n\n';
}

ErrorHandler.prototype.flushErrors = function() {
	var FlushErrorBuffer = '\n\nPROCESS STACK FLUSH\n====================\n'+stack
	throw new Error(FlushErrorBuffer);
}

module.exports = ErrorHandler;

