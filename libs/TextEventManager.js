var ErrorHandler = require('./error.js');

var textevents = {};
var event_offsets = {};
var textevent_setnum = {};

var errors = {
	'tm-1002': 'Unable to getEvent(). Try addEvent() if \'id\' does not exist: ',
	'tm-1003': 'Unable to getOffsets(). Try addOffsets() if \'id\' does not exist: ',
	'tm-1004': 'addEvents() requires an array of events.  Non-array provided.',
};

/***
 *	For phase in Phases {
 *		For classnum in Classes[phase] {
 *			For set in Sets[classnum] {
 *				incrementSetNum(phase,classnum)
 *				addEvent('Message', phase, classnum)
 *
 *				events = getTextEvents();
 *			}
 *			resetSetNum();
 *		}
 *	}
 */
function TextEventManager() {}


function TextEvent(offset, message) {
	return { 'offset': offset, 'message': message };
}

function getId(phase, classnum, setnum) {
	return phase+':'+classnum+':'+setnum;
	if (typeof setnum === 'undefined' || setnum === null) setnum = 0;
}
function getOffsetId(phase, classnum, setnum) {
	return phase+':'+classnum+':'+setnum+':offsets';
}
function getOffsetIdById(id) {
	return id+':offsets';
}

/***
 * Return the TextEvent data structure.
 */
TextEventManager.prototype.getTextEvents = function(phase, classnum, setnum) {
	if (typeof setnum === 'undefined' || setnum === null) setnum = this.getSetNum(phase,classnum);

	this.updateOffsets();

	var offsets = this.getOffsets(phase, classnum, setnum);
	var events	= this.getEvents(phase, classnum, setnum);
	var textevents = [];
	for(key in events) {
		textevents.push(TextEvent(offsets[key],events[key]));
	}
	return textevents;
}


/***
 * Increment the associated set number being tracked.
 */
TextEventManager.prototype.incrementSetNum = function(phase, classnum) {
	var id = getId(phase,classnum);
	if (textevent_setnum[id] === undefined) textevent_setnum[id] = -1;
	return textevent_setnum[id]++;
}
/***
 * Get the associated set number being tracked.
 */
TextEventManager.prototype.getSetNum = function(phase, classnum) {
	return textevent_setnum[getId(phase,classnum)];
}
/***
 * Reset the current set number being tracked.
 */
TextEventManager.prototype.resetSetNum = function(phase, classnum) {
	return textevent_setnum[getId(phase,classnum)] = 0;
}

/***
 * Build associated event messages.
 * Note: Events are added in FIFO order!
 * setnum - OPTIONAL
 */
TextEventManager.prototype.addEvent = function(message, phase, classnum, setnum) {
	if (typeof setnum === 'undefined' || setnum === null) setnum = this.getSetNum(phase,classnum);
	return addEventById(getId(phase,classnum,setnum), message);
}
function addEventById(id, message) {
	if (typeof textevents[id] !== 'undefined') {
			textevents[id] += ';'+message;
	} else {
		textevents[id] = message;
	}
	return true;
}

/***
 * Returns array of individual events.
 * setnum - OPTIONAL
 */
TextEventManager.prototype.getEvents = function(phase, classnum, setnum) {
	if (typeof setnum === 'undefined' || setnum === null) setnum = this.getSetNum(phase,classnum);
	var events = getEventById(getId(phase,classnum,setnum)).split(';');
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
	var value = null;
	
	for(var key in events) {
		value = events[key].split(';');

		if (typeof offsets[key] !== 'undefined' && offsets[key].split(';').length !== value.length) continue;
		
		// Caluculate and apply offset values.
		for(var v=0;v<value.length;v++) {
			this.addOffsetById(key,v*5)
		}
	}
	return true;
}

/***
 * Add an offset value by event id.
 * Note: Offsets are added in FIFO order!
 */
TextEventManager.prototype.addOffsetById = function(id, offset) {
	var offsets = event_offsets;
	if (typeof offsets[id] !== 'undefined') {
		offsets[id] += offset+';';
	} else {
		offsets[id] = offset+';';
	}
	return true;
}
/***
 * setnum - OPTIONAL
 */
TextEventManager.prototype.getOffsets = function(phase, classnum, setnum) {
	if (typeof setnum === 'undefined' || setnum === null) setnum = this.getSetNum(phase,classnum);
 	var offsets = getOffsetsById(getId(phase,classnum,setnum));
	if (typeof offsets === 'string') {
		return offsets.split(';');
	} else {
		return offsets;
	}
}
function getOffsetsById(id) {
	var offsets = event_offsets;
	if (typeof offsets[id] !== 'undefined') {
		return offsets[id];
	} else {
		return '';
	}
}

/***
 * setnum - OPTIONAL
 */
TextEventManager.prototype.deleteSet = function(phase, classnum, setnum) {
	if (typeof setnum === 'undefined' || setnum === null) setnum = this.getSetNum(phase,classnum);
	return deleteSetById(getId(phase,classnum,setnum));
}
function deleteSetById(id) {
	var events = textevents;
	delete events[id]; 
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
