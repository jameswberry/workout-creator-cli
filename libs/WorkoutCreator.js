// REQUIRE LIBRARIES
var fs			= require('fs');
var Mustache	= require('mustache');

var ErrorHandler	= require('./error');
ErrorHandler		= new ErrorHandler();

var TextEventManager	= require('./TextEventManager.js');
TextEvents				= new TextEventManager();

var Block;
var Blocks		= {};

// Load Detail Blocks
var block_dir	= __dirname+'/../details/';
var block_files	= fs.readdirSync(block_dir);
for(var f=0;f<block_files.length;f++) {
	if (block_files[f].charAt(0) !== '.' && block_files[f].charAt(0) !== '_') {
		block_file			= block_files[f];
		block_name			= block_file.split('.')[0].toLowerCase();
		Block 				= require(block_dir+block_file);
		Blocks[block_name]	= new Block();
	}
}

// Load Workout Blocks
var block_dir	= __dirname+'/../blocks/';
var block_files	= fs.readdirSync(block_dir);
for(var f=0;f<block_files.length;f++) {
	if (block_files[f].charAt(0) !== '.' && block_files[f].charAt(0) !== '_') {
		block_file			= block_files[f];
		block_name			= block_file.split('.')[0].toLowerCase();
		Block 				= require(block_dir+block_file);
		Blocks[block_name]	= new Block();
	}
}
console.log(Blocks);

// TODO: Would like to move these into TextEvents library once it's working.

// Phase is required as a global for TextEvents
var phase;

// Classnum is required as a global for TextEvents
var classnum;

// Blocknum is required as a global for TextEvents
var blocknum = -1; // So we can increment it at the beginning of the block loop.

// Templates is used to cache template file reads.
var templates = {};

function WorkoutProcessor() {}

/**
 * template - The Mustache template filepath.
 * view - A single view dataset.
 * views - OPTIONAL an object containing multiple views. (raw response from this.process method)
 */
WorkoutProcessor.prototype.render = function(template, view, views) {
	var render = {};

	// Make sure the template has been loaded.
	loadTemplate(template);
	
	if (typeof views !== 'undefined' && views !== null) {
		// Render multiple views.
		for(var view in views) {
			render[view] = Mustache.render(getTemplate(template), views[view]);
		}
	} else {
		// Render a single view.
		render = Mustache.render(getTemplate(template), view);
	}
	return render;
}
function loadTemplate(template) {
	if (typeof getTemplate(template) === 'undefined') {
		setTemplate(template, fs.readFileSync(template, 'utf8'));
	}
}
function setTemplate(template, data) {
	return templates[template] = data;
}
function getTemplate(template) {
	return templates[template];
}

function getDuration(context, phase, classnum, blocknum) {
	context = initDurations(context, phase, classnum, blocknum);
	if (typeof blocknum !== 'undefined') return context.durations[phase][classnum][blocknum].duration;
	if (typeof classnum !== 'undefined') return context.durations[phase][classnum].duration;
	if (typeof phase	!== 'undefined') return context.durations[phase].duration;
	return context.durations;
}
function getTime(seconds) {
	var time		= { 'hours': 0, 'minutes': 0, 'seconds': 0 };
	time.hours		= (seconds/60/60).toString().split('.')[0];
	time.minutes	= ((seconds-(time.hours*60)*60)/60).toString().split('.')[0];
	time.seconds	= seconds-(time.hours*60*60)-(time.minutes*60);
	return time;
}
function setDuration(context, duration, phase, classnum, blocknum) {
	if (typeof duration === 'undefined') duration = 0;
	context = initDurations(context, phase, classnum, blocknum);
	context.durations[phase].duration						+= duration;
	context.durations[phase][classnum].duration				+= duration;
	context.durations[phase][classnum][blocknum].duration	+= duration;
	return context;
}
function initDurations(context, phase, classnum, blocknum) {
	if (typeof context.durations							=== 'undefined') context['durations']							= {};	
	if (typeof context.durations[phase]						=== 'undefined') context.durations[phase]						= { 'duration': 0 };
	if (typeof context.durations[phase][classnum]			=== 'undefined') context.durations[phase][classnum]				= { 'duration': 0 };
	if (typeof context.durations[phase][classnum][blocknum]	=== 'undefined') context.durations[phase][classnum][blocknum]	= { 'duration': 0 };
	return context;
}

/**
 * csv - csv-to-json conversaion data structure.
 */
WorkoutProcessor.prototype.process = function(csv) {
	var phases = {};
	var classname;
	var lastclassnum
	var type, offset;
	var workout_id, workout, workoutblock, processed;

	for(line in csv) {
		// Convert line to an integer for indexing the csv array later. (searching for adjacent textevents)
		line = parseInt(line);

		if (csv[line].Phase != '') {
			phase = csv[line].Phase;

			if (csv[line].Class != '' ) {
				lastclassnum = classnum; // Store for Blocknum comparitor.
				classnum	 = csv[line].Class-1;
				type		 = csv[line].Type.toLowerCase();

				// Skip TextEvents since they are already processed as part of blocks.
				if (type !== 'textevent') {
					
					// Increment the Block Number
					if (classnum === lastclassnum) {
						blocknum++;
					} else {
						// Reset Block Number when moving between Classes.
						blocknum = 0; 
					}
					
					workout_id = getWorkoutId(phase,classnum);

					// Initialize Class Object
					if (typeof  phases[workout_id] === 'undefined' ) {
						phases[workout_id] = {
							'author'		: '',
							'name'			: '',
							'description'	: '',
							'sport'			: '',
							'tags'			: false,
							'workout'		: []
						};
					}

					// Process Block Text Event
					if (typeof  csv[line].Value !== 'undefined' && csv[line].Value !== '') {
						offset = csv[line].Offset;
						if (typeof csv[line].Offset === 'undefined' || csv[line].Offset === '') offset = null;
						TextEvents.addEvent(0, csv[line].Value, phase, classnum, blocknum, false, offset);
					}
				
					// Process additional Block Text Events
					if (typeof csv[line+1] !== 'undefined') {
						for ( var te=1; te<(csv.length-line); te++ ) { // Only search to the end of the csv array.
							if (typeof csv[line+te] === 'undefined') {
								break;
							} else if( csv[line+te].Type.toLowerCase() === 'textevent' ) {
								offset = csv[line+te].Offset;
								if (typeof csv[line+te].Offset === 'undefined' || csv[line+te].Offset === '') offset = null;
								TextEvents.addEvent(0, csv[line+te].Value, phase, classnum, blocknum, false, offset);
							} else {
								break;
							}
						}
					}

					workout	= null;

					// Process Details, Standard, and Custom Blocks
					processed = false;
					if (typeof Blocks[type] !== 'undefined') {
						Blocks[type].init({
							'Blocks':		Blocks,
							'Phases':		phases,
							'TextEvents':	TextEvents,
							'Line':			csv[line],
							'id': 			workout_id,
							'Phase': 		phase,
							'Classnum': 	classnum,
							'Blocknum': 	blocknum
						});
						workout = Blocks[type].process();
						processed = true;
					}

				// Apply Processed Workouts
					workoutblock = [];

					if(typeof workout !== 'undefined' && workout !== null && workout) {
						if (workout.length) {
							for(var b=0;b<workout.length;b++) {
								workoutblock.push(workout[b]);
								phases = setDuration(phases, workout[b][Object.keys(workout[b])[0]][0].duration,phase,classnum,blocknum);
							}
						} else {
							workoutblock.push(workout);
							phases = setDuration(phases, workout[Object.keys(workout)[0]][0].duration,phase,classnum,blocknum);
						}

						// Add Workout Block Comments

						phases[workout_id].workout.push(Comment(type,getDuration(phases,phase,classnum,blocknum)));
						phases[workout_id].workout = phases[workout_id].workout.concat(workoutblock);
					}
				}
			}
		}
		// Add Class Comment
		if (classnum !== lastclassnum) {
			phases[workout_id].workout.push(Comment(phase,getDuration(phases,phase)));
		}
	}
	return phases;
}

function getWorkoutId(phase, classnum) {
	return phase+':'+classnum;
}

function Comment(message, duration) {
	var comment = { 'comment': message.toUpperCase() };
	if (typeof duration !== 'undefined' && duration !== null) {
		comment.duration = getTime(duration);
	}
	return comment;
}

module.exports = WorkoutProcessor;

/*
var workout = {
	'author':		'',
	'name':			'',
	'description':	'',
	'sport':		'',
	'tags':			true,
	'tag':			[
		{ 'name': '' }
	],
	'workout':		[
		{ 'comment': 'WARMUP' }
		{ 'warmup': [{
			'duration':			'',
			'power_low':		'',
			'power_high':		'',
			'cadence':			'',
			'cadence_resting':	'',
			'textevent':		[
				{ 'offset': '', 'message': '' }
			]
		}]},
		{ 'comment': 'STEADYSTATE' }
		{ 'steadystate': [{
			'duration':			'',
			'power':			'',
			'cadence':			'',
			'cadence_resting':	'',
			'textevent':		[
				{ 'offset': '', 'message': '' }
			]
		}]},
		{ 'comment': 'INTERVALST' }
		{ 'intervalst': [{
			'repeat':			'',
			'on_duration':		'',
			'off_duration':		'',
			'on_power':			'',
			'off_power':		'',
			'cadence':			'',
			'cadence_resting':	'',
			'textevent':		[
				{ 'offset': '', 'message': '' }
			]
		}]},
		{ 'comment': 'RAMP' }
		{ 'ramp': [{
			'duration':			'',
			'power_low':		'',
			'power_high':		'',
			'cadence':			'',
			'cadence_resting':	'',
			'textevent': [
				{ 'offset': '', 'message': '' }
			]
		}]},
		{ 'comment': 'FREERIDE' }
		{ 'freeride': [{
			'duration':		'',
			'flatroad': 	1,
			'textevent': [
				{ 'offset': '', 'message': '' }
			]
		}]}
	]
}
*/