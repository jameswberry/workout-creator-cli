var ErrorHandler = require('./error.js');

var textevents = {};
var event_offsets = {};

var errors = {
	'tm-1002': 'Unable to getEvent(). Try addEvent() if \'id\' does not exist: ',
	'tm-1003': 'Unable to getOffsets(). Try addOffsets() if \'id\' does not exist: ',
	'tm-1004': 'addEvents() requires an array of events.  Non-array provided.',
};

/***
 *	For phase in Phases {
 *		Classes = Phases[phase]
 *		For classnum in Classes {
 *			Blocks = Classes[classnum]
 *			For block in Blocks {
 *				incrementBlockNum(phase,classnum)
 *
 *				// TextEvents are always appiled at the Block level.
 *				addEvent(0, 'TextEvent 1', phase, classnum)
 *				addEvent(0, 'TextEvent 2', phase, classnum)
 *				addEvent(1, 'TextEvent Index 1', phase, classnum)
 *				addEvent(2, 'TextEvent Index 2', phase, classnum)
 *				... 
 *				addEvent(n, 'TextEvent Index n', phase, classnum)
 *
 *				// TextEvent 1 & TextEvent 2
 *				events = getTextEvents(phase, classnum); // Inferred from IncrementBlockNum, IncrementSetNum, and IncrementIndex
 *					// or
 *				events = getTextEvents(phase, classnum, blocknum, 0); // Explicit
 *
 *				// TextEvent Index 1-n
 *				incrementIndexNum(phase,classnum)
 *				events = getTextEvents(phase, classnum); // Inferred from IncrementBlockNum, IncrementSetNum, and IncrementIndex
 *					// or
 *				events = getTextEvents(phase, classnum, blocknum, 1); // Explicit
 *				...
 *
 *				For set in Blocks[block]
 *					//TextEvent Index 1
 *					incrementIndexNum(phase,classnum)
 *					events = getTextEvents(phase, classnum); // Inferred from IncrementBlockNum, IncrementSetNum, and IncrementIndex
 *						// or
 *					events = getTextEvents(phase, classnum, blocknum, 1); // Explicit
 *
 *					// TextEvent Index 1
 *					incrementIndexNum(phase,classnum)
 *					events = getTextEvents(phase, classnum); // Inferred from IncrementBlockNum, IncrementSetNum, and IncrementIndex
 *						// or
 *					events = getTextEvents(phase, classnum, blocknum, 2); // Explicit
 *					...
 *
 *					// You may also want to resetIndexNum at this point if you would like TextEvents to repeat.
 *					resetIndexNum();
 *				}
 *			}
 *			resetBlockNum(); // Also resets SetNum
 *		}
 *	}
 */
function TextEventManager() {}


function TextEvent(offset, message) {
	return { 'offset': offset, 'message': message };
}

function getBlockId(phase, classnum, blocknum) {
	return phase+':'+classnum+':'+blocknum;
}
function getIndexId(phase, classnum, blocknum, index) {
	if (typeof blocknum	=== 'undefined' || blocknum	=== null) blocknum	= 0;
	if (typeof index	=== 'undefined' || index	=== null) index	= 0;
	return getBlockId(phase,classnum,blocknum)+':'+index;
}
function getOffsetId(phase, classnum, blocknum, index) {
	return getOffsetIdById(getIndexId(phase, classnum, blocknum, index));
}
function getOffsetIdById(id) {
	return id+':offsets';
}

/***
 * Return the TextEvent data structure.
 */
TextEventManager.prototype.getTextEvents = function(index, phase, classnum, blocknum) {
	// if (typeof blocknum	=== 'undefined' || blocknum === null) blocknum	= this.getBlockNum(phase,classnum);
	// if (typeof index	=== 'undefined' || index	=== null) index 	= this.getIndexNum(phase,classnum,blocknum);

	this.updateOffsets();

	var offsets = this.getOffsets(phase,classnum,blocknum,index);
	var events	= this.getEvents(phase,classnum,blocknum,index);
	var textevents = [];
	for(key in events) {
		textevents.push(TextEvent(offsets[key],events[key]));
	}
	return textevents;
}


/***
 * Increment the associated block number being tracked.
 *
TextEventManager.prototype.incrementBlockNum = function(phase, classnum) {
	var id = getBlockId(phase,classnum);
	if (typeof textevent_blocknum[id] === 'undefined') textevent_blocknum[id] = -1;
	return textevent_blocknum[id]++;
}
/***
 * Get the associated block number being tracked.
 *
TextEventManager.prototype.getBlockNum = function(phase, classnum) {
	return textevent_blocknum[getBlockId(phase,classnum)];
}
/***
 * Reset the current block number being tracked.
 *
TextEventManager.prototype.resetBlockNum = function(phase, classnum) {
	return textevent_blocknum[getBlockId(phase,classnum)] = 0;
}
*/

/***
 * Build associated event messages.
 * Note: Events are added in FIFO order!
 * setnum - OPTIONAL
 */
TextEventManager.prototype.addEvent = function(index, message, phase, classnum, blocknum) {
	return addEventById(getIndexId(phase,classnum,blocknum,index), message);
}
function addEventById(id, message) {
	var events = textevents;
	if (typeof events[id] !== 'undefined') {
			events[id] += ';'+message;
	} else {
		events[id] = message;
	}
	return true;
}

/***
 * Returns array of individual events.
 * setnum - OPTIONAL
 */
TextEventManager.prototype.getEvents = function(phase, classnum, blocknum, index) {
	var events = getEventById(getIndexId(phase,classnum,blocknum,index)).split(';');
	if (events[0] !== '') return events;
}
function getEventById(id) {
	var events = textevents;
	if (typeof events[id] !== 'undefined') {
		return events[id];
	} else {
		return '';
	}
}

/***
 * Single pass processor for updating incremental offset values of existing events.
 */
TextEventManager.prototype.updateOffsets = function() {
	var events = textevents;
	var offsets = event_offsets;
	var messages = null;
	
	for(var key in events) {
		messages = events[key].split(';');

		if (typeof offsets[key] !== 'undefined' && offsets[key].split(';').length !== messages.length) continue;
		
		// Caluculate and apply offset values.
		for(var v=0;v<messages.length;v++) {
			addOffsetByIndexId(key,v*5)
		}
	}
	return true;
}
/***
 * Add an offset value by event IndexID.
 * Note: Offsets are added in FIFO order!
 */
addOffsetByIndexId = function(id, offset) {
	var offsets = event_offsets;
	if (typeof offsets[id] !== 'undefined') {
		offsets[id] += offset+';';
	} else {
		offsets[id] = offset+';';
	}
	return true;
}
/***
 * blocknum	- OPTIONAL
 * index	- OPTIONAL
 */
TextEventManager.prototype.getOffsets = function(phase, classnum, blocknum, index) {
 	var offsets = getOffsetsByIndexId(getIndexId(phase,classnum,blocknum,index));
	if (typeof offsets === 'string') {
		return offsets.split(';');
	} else {
		return offsets;
	}
}
function getOffsetsByIndexId(id) {
	var offsets = event_offsets;
	if (typeof offsets[id] !== 'undefined') {
		return offsets[id];
	} else {
		return '';
	}
}

/***
 * blocknum - OPTIONAL
 */
TextEventManager.prototype.deleteBlock = function(phase, classnum, blocknum) {
	return deleteBlockById(getBlockId(phase,classnum));
}
function deleteBlockById(id) {
	var events = textevents;
	// Delete all associated IndexIDs as well.
	// delete events[id+'*']
	for(key in events) {
		if (key.indexOf(id) !== -1) {
			delete events[id];
		}
	}
}

TextEventManager.prototype.dump = function() {
	return textevents;
}

TextEventManager.prototype.clone = function() {
  var obj = Object.create(this);
  var newTextEventManager = new TextEventManager();
  for (var key in obj) {
    newTextEventManager[key] = obj[key];
  }
  return newTextEventManager;
};

module.exports = TextEventManager;
