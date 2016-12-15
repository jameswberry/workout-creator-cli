var ErrorHandler = require('./error');
ErrorHandler = new ErrorHandler();

const cOFFSET_INCREMENT		= 10;
const cMESSAGE_LENGTH		= 40;
const cMOTIVATION_5SEC_MIN	= 15;

var errors = {
	'tm-1002': 'Unable to getEvent(). Try addEvent() if \'id\' does not exist: ',
	'tm-1003': 'Unable to getOffsets(). Try addOffsets() if \'id\' does not exist: ',
	'tm-1004': 'addEvents() requires an array of events.  Non-array provided.',
};

var textevents = {};

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
function getIdParts(id) {
	var id = id.split(':');
	return {
		'phase': 	id[0],
		'classnum': id[1],
		'blocknum': id[2],
		'index': 	id[3],
	};
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
	
	// Ensure event[id] is set the first time.
	if (typeof events[id] === 'undefined') events[id] = [];
			
	// Process compound events and limit string length

	var messages = message.toString().split(';');
	if (typeof messages === 'object' && messages.length >= 1) {
		for (var m=0; m<messages.length; m++) {
			events[id].push(TextEvent(offset, messages[m].substring(0,cMESSAGE_LENGTH)));
		}
	}
	return true;
}
/***
 * Return the TextEvent data structure.
 */
TextEventManager.prototype.getTextEvents = function(index, phase, classnum, blocknum, duration) {
	var id = getIndexId(phase, classnum, blocknum, index);
	this.applyMotivations(id,duration);
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
	var events = textevents;

	// Exit if there are no events for id
	if (typeof events[id] === 'undefined') return false;

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
				if (typeof static_offsets[cOFFSET_INCREMENT*offset_index] === 'undefined') {
					new_events[e].offset = cOFFSET_INCREMENT*offset_index;
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

// Defined "Motivations" (lowerCase())
var motivations = {
	'motivation5': [],
}

/***
 * 
 */
TextEventManager.prototype.setMotivationAllOn = function(motivation, phase, classnum) {
	var id = getMotivationAllId(phase, classnum);
	return setMotivationAll(motivation, id, 1);
}
TextEventManager.prototype.setMotivationAllOff = function(motivation, phase, classnum) {
	var id = getMotivationAllId(phase, classnum);
	return setMotivationAll(motivation, id, 0);
}
function getMotivationAllFromId(motivation, id) {
	var parts = getIdParts(id);
	var id	  = getMotivationAllId(parts.phase, parts.classnum);
	var result = getMotivation(motivation,id);
	if (!(result >= 1)) return 0;
	return result;
}
function getMotivationAllId(phase, classnum) {
	return getBlockId(phase, classnum, 'all');
}
function setMotivationAll(motivation, id, state, increment) {
	motivation = motivation.toLowerCase();
	var parts = getIdParts(id);
	var id	  = getMotivationAllId(parts.phase, parts.classnum);
	if (typeof state !== 'undefined' && state !== null) {
		return motivations[motivation][id] = state;
	} else {
		if (increment) {
			return motivations[motivation][id]++;
		}
	}
}

TextEventManager.prototype.setMotivationOn = function(motivation, phase, classnum, blocknum, index) {
	var id = getIndexId(phase, classnum, blocknum, index);
	return setMotivation(motivation, id, 1);
}
TextEventManager.prototype.setMotivationOff = function(motivation, id) {
	return setMotivation(motivation, id, 0);
}
function setMotivation(motivation, id, state, increment) {
	motivation = motivation.toLowerCase();
	if (typeof state !== 'undefined' && state !== null) {
		return motivations[motivation][id] = state;
	} else {
		if (increment) {
			return motivations[motivation][id]++;
		} else {
			return false;
		}
	}
}
function getMotivation(motivation, id) {
	var result = null;
	var motivation = motivation.toLowerCase();
	if (typeof motivations[motivation] === 'undefined' ||
		!(motivations[motivation][id] >= 1)) {
		result = 0;
	} else {
		result = motivations[motivation][id];
	}
	return result;
}
TextEventManager.prototype.applyMotivations = function(id, duration) {
	if (typeof duration !== 'undefined' && duration !== null) {
		for(motivation in motivations) {
			// Enable the motivation for this block if it's set on globally
			if (getMotivation(motivation, id) === 0 && getMotivationAllFromId(motivation,id)) setMotivation(motivation, id, 1);

			// Apply "specific "Motivations" that have been turned on.
			if (getMotivation(motivation, id) || getMotivationAllFromId(motivation,id)) {
				if (getMotivation(motivation, id) === 1) { // Only apply the motivation once.
					switch(motivation.toLowerCase()) {
					case 'motivation5':
						if (duration >= cMOTIVATION_5SEC_MIN) {
							addEventById(id, '5        ', null, duration-5);
							addEventById(id, '  4      ', null, duration-4);
							addEventById(id, '    3    ', null, duration-3);
							addEventById(id, '      2  ', null, duration-2);
							addEventById(id, '        1', null, duration-1);
						}
						break;
					default:
						break
					}
					setMotivation(motivation, id, null, true); // Increment motivation counter
				}
			}
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
