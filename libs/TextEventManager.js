var ErrorHandler = require('./error.js');

var textevents = {};

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
	return getBlockId(phase, classnum, blocknum)+':'+index;
}

/***
 * Build associated event messages.
 * Note: Events are added in FIFO order!
 * priority - OPTIONAL 
 *	This parameter allows message order priority to be set up front.
 */
TextEventManager.prototype.addEvent = function(index, message, phase, classnum, blocknum, priority, offset) {
	return addEventById(getIndexId(phase,classnum,blocknum,index), message, priority, offset);
}
function addEventById(id, message, priority, offset) {
	// Process priority order
	// Static offset values override priority order
	if (typeof offset === 'undefined' || offset === null) {
		if (priority === true) {
			offset = -1;
		} else {
			offset = 0;
		}
	}

	var events = textevents;
	if (typeof events[id] !== 'undefined') {
		events[id].push(TextEvent(offset, message));
	} else {
		events[id] = [TextEvent(offset, message)];
	}
	return true;
}
/***
 * Return the TextEvent data structure.
 */
TextEventManager.prototype.getTextEvents = function(index, phase, classnum, blocknum) {
	var id = getIndexId(phase, classnum, blocknum, index);
	this.updateOffsets(id);
	return textevents[id];
}
/***
 * Returns array of individual events.
 * setnum - OPTIONAL
 */
TextEventManager.prototype.getEvents = function(phase, classnum, blocknum, index) {
	var events = getEventsById(getIndexId(phase,classnum,blocknum,index));
	if (events !== null) return events;
}
function getEventsById(id) {
	var events = textevents;
	if (typeof events[id] !== 'undefined') {
		return events[id];
	} else {
		return null;
	}
}


/***
 * Single pass processor for updating incremental offset values of existing events.
 */
TextEventManager.prototype.updateOffsets = function(id) {
	var events			= textevents;

	// Exit if there are no events for id
	if (typeof events[id] === 'undefined') return false;

	var increment		= 5;
	var offset_index	= 1;
	var priority_index	= 0;
	var priority_events	= [];
	var new_events		= events[id];
	var static_offsets	= {};
	var offset_search;

	// Pass #1: Process priority messages, and collect static offsets.
	priority_index = 0;
	for(var e=1;e<events[id].length;e++) {
		if (events[id][e].offset == -1) {
			priority_events[priority_index] = events[id][e];	// Move the message to the top of the stack 
			priority_events[priority_index].offset = 0;			// Reset the offset 
			new_events.splice(e,1);								// Remove the message from the source stack
			priority_index++;									// Increment the index counter
		} else {
			// Track static offsets to avoid overri
			if (events[id][e].offset !== 0) static_offsets[events[id][e].offset] = true;
		}
	}

	// If no priority messages ...
	if (new_events.length === 0) {
		new_events = events[id];
	} else {
		new_events = priority_events.concat(new_events);
	}
	
	// Ensure the first offset is always 0.
	new_events[0].offset = 0;

	// Pass #2: Process all other messages.
	for(var e=1;e<new_events.length;e++) {
		offset_search = true;
		if (typeof static_offsets[new_events[e].offset] === 'undefined') {
			// Only set non-conflicting offset values.
			while(offset_search && offset_index <= new_events.length) {
				if (typeof static_offsets[increment*offset_index] === 'undefined') {
					new_events[e].offset = increment*offset_index;
					offset_search = false;
				}
				offset_index++;
			}
		}
	}

	events[id] = new_events;
	return true;
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
