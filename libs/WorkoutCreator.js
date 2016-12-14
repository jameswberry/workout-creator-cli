// REQUIRE LIBRARIES
var fs			= require('fs');
var Mustache	= require('mustache');

var ErrorHandler	= require('./error');
ErrorHandler		= new ErrorHandler();

var TextEventManager	= require('./TextEventManager.js');
TextEvents				= new TextEventManager();

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
	var workout_id, workout, workoutblock;

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
				
				// Process Workout
					workout		= null;
					switch ( type ) {

				// WORKOUT DETAILS
					case 'author':
						phases[workout_id].author = csv[line].Value;
						workout = false;
						TextEvents.deleteBlock(phase, classnum, blocknum);
						break;

					case 'name':
						if (csv[line].Class<10) {
							classname = '0'+csv[line].Class;
						} else { 
							classname = csv[line].Class;
						}
						phases[workout_id].name = csv[line].Phase+' #'+classname+': '+csv[line].Value;
						workout = false;
						TextEvents.deleteBlock(phase, classnum, blocknum);
						break;

					case 'description':
						phases[workout_id].description = csv[line].Value;
						workout = false;
						TextEvents.deleteBlock(phase, classnum, blocknum);
						break;

					case 'sport':
						phases[workout_id].sport = csv[line].Value.toLowerCase();
						workout = false;
						TextEvents.deleteBlock(phase, classnum, blocknum);
						break;

					case 'tag':
						// Initialize Tags
						if (typeof phases[workout_id].tag	=== 'undefined') {
							phases[workout_id].tags = true;
							phases[workout_id].tag = [];
						}
						if (csv[line].Value.toLowerCase() == 'recovery' ||
							csv[line].Value.toLowerCase() == 'intervals' ||
							csv[line].Value.toLowerCase() == 'ftp' ||
							csv[line].Value.toLowerCase() == 'tt') {
								csv[line].Value = csv[line].Value.toUpperCase();
						}
						phases[workout_id].tag.push({ 'name': csv[line].Value });
						workout = false;
						TextEvents.deleteBlock(phase, classnum, blocknum);
						break;

					case 'textevent':
						// NOTE: Should never get here because we have already skipped this processing for TextEvents.
						workout = false;
						TextEvents.deleteBlock(phase, classnum, blocknum);
						break;

				// DEFAULT WORKOUT BLOCKS
					case 'warmup':
						TextEvents.addEvent(0, 'Warm Up', phase, classnum, blocknum, true);
						
						workout = WarmUp(		csv[line].Duration,
										 		csv[line].Power,
										 		csv[line].PowerHigh,
										 		csv[line].Cadence,
												0);
						break;

					case 'ramp':
						TextEvents.addEvent(0, 'Ramp', phase, classnum, blocknum, true);
					
						workout = Ramp(			csv[line].Duration,
												csv[line].Power,
												csv[line].PowerHigh,
												csv[line].Cadence,
												csv[line].CadenceOff,
												0);
						break;

					case 'steadystate':
						TextEvents.addEvent(0, 'Steady State', phase, classnum, blocknum, true);
					
						workout = SteadyState(	csv[line].Duration,
												csv[line].Power,
												csv[line].Cadence,
												csv[line].CadenceOff,
												0);
						break;

					case 'intervalst':
						TextEvents.addEvent(0, 'Interval', phase, classnum, blocknum, true);
						
						workout = IntervalsT(	csv[line].Repeat,
												csv[line].Duration,
												csv[line].DurationOff,
												csv[line].Power,
												csv[line].PowerOff,
												csv[line].Cadence,
												csv[line].CadenceOff,
												0);
						break;

					case 'freeride':
						TextEvents.addEvent(0, 'Free Ride', phase, classnum, blocknum, true);
						
						workout = FreeRide(		csv[line].Duration,
												1,
												0);
						break;
				
				// CUSTOM WORKOUT BLOCKS
					case 'progressivewarmup':
						TextEvents.addEvent(0, 'Progressive Warmup', phase, classnum, blocknum, true);
					
						workout = ProgressiveWarmup(csv[line].Duration,
												csv[line].PowerLow,
												csv[line].PowerHigh,
												csv[line].CadenceLow,
												csv[line].CadenceHigh,
												csv[line].Repeat);
						break;

					case 'steadybuild':
						TextEvents.addEvent(0, 'Steady Build', phase, classnum, blocknum, true);
						
						workout = SteadyBuild(	csv[line].Duration,
												csv[line].DurationOff,
												csv[line].PowerLow,
												csv[line].PowerHigh,
												csv[line].CadenceLow,
												csv[line].CadenceHigh);
						break;

					case 'progressivebuild':
						TextEvents.addEvent(0, 'Progressive Build', phase, classnum, blocknum, true);
						TextEvents.addEvent(0, 'Build power and cadence together', phase, classnum, blocknum, true);
					
						workout = ProgressiveBuild(csv[line].Duration,
												csv[line].PowerLow,
												csv[line].PowerHigh,
												csv[line].CadenceLow,
												csv[line].CadenceHigh,
												csv[line].Repeat);
						break;

					case 'progression':
						TextEvents.addEvent(0, 'Progressive Build', phase, classnum, blocknum, true);
						
						workout = Progression(	csv[line].Duration,
												csv[line].PowerLow,
												csv[line].PowerHigh,
												csv[line].CadenceLow,
												csv[line].CadenceHigh,
												csv[line].Repeat,
												0);
						break;

					case 'rest':
						TextEvents.addEvent(0, 'Full Recovery', phase, classnum, blocknum, true);
					
						workout = Rest(			csv[line].Duration,
												csv[line].Power);
						break;

					case 'activerest':
						TextEvents.addEvent(0, 'Active Rest', phase, classnum, blocknum, true);
					
						workout = ActiveRest(	csv[line].Duration,
												csv[line].Power,
												csv[line].Cadence);
						break;
					
					case 'alternatingclimb':
						TextEvents.addEvent(0, 'Alternate Seated Climbing with Standing', phase, classnum, blocknum, true);
						TextEvents.addEvent(0, 'Climb (Seated)', phase, classnum, blocknum, true);
						TextEvents.addEvent(1, 'Climb (Seated)', phase, classnum, blocknum);
						TextEvents.addEvent(2, 'Stand', phase, classnum, blocknum);
						TextEvents.addEvent(3, 'Descent!', phase, classnum, blocknum);

						workout = Climbing(		csv[line].Duration,
							 					csv[line].Power,
												csv[line].Cadence,
												csv[line].PowerLow,
												csv[line].CadenceLow,
												csv[line].PowerHigh,
												csv[line].CadenceHigh,
												csv[line].DurationOff,
												csv[line].CadenceOff,
												csv[line].Repeat);
						break;

					case 'climbing':
						TextEvents.addEvent(0, 'Climbing', phase, classnum, blocknum, true);
						TextEvents.addEvent(0, 'Base', phase, classnum, blocknum, true);
						TextEvents.addEvent(1, 'Approach', phase, classnum, blocknum);
						TextEvents.addEvent(2, 'Climbing out of the saddle', phase, classnum, blocknum);
						TextEvents.addEvent(3, 'Descent', phase, classnum, blocknum);
						workout = Climbing(		csv[line].Duration,
							 					csv[line].Power,
												csv[line].Cadence,
												csv[line].PowerLow,
												csv[line].CadenceLow,
												csv[line].PowerHigh,
												csv[line].CadenceHigh,
												csv[line].DurationOff,
												csv[line].CadenceOff,
												csv[line].Repeat);
						break;

					case 'seatedroller':
						TextEvents.addEvent(0, 'Seated Roller', phase, classnum, blocknum, true);
						TextEvents.addEvent(0, 'Mix RPM from smooth seated rollers', phase, classnum, blocknum);
						TextEvents.addEvent(0, 'Tension on chain', phase, classnum, blocknum);
						TextEvents.addEvent(0, 'Smooth transitions from climb to descend', phase, classnum, blocknum);

						workout = SeatedRoller( csv[line].DurationOff,
												csv[line].PowerOff,
												csv[line].CadenceOff,
												csv[line].Duration,
												csv[line].Power,
												csv[line].CadenceLow,
												csv[line].CadenceHigh,
												csv[line].Repeat);
						break;

					case 'standingroller':
						TextEvents.addEvent(0, 'Standing Roller', phase, classnum, blocknum, true);
						TextEvents.addEvent(0, 'Base', phase, classnum, blocknum, true);
						TextEvents.addEvent(1, 'Approach', phase, classnum, blocknum);
						TextEvents.addEvent(2, 'Climbing out of the saddle', phase, classnum, blocknum);
						TextEvents.addEvent(3, 'Descent', phase, classnum, blocknum);

						workout = StandingRoller(csv[line].Duration,
												csv[line].Power,
												csv[line].CadenceOff,
												csv[line].Cadence,
												csv[line].CadenceLow,
												csv[line].CadenceHigh);
						break;

					case 'paceline':
						TextEvents.addEvent(0, 'Paceline', phase, classnum, blocknum, true);
						TextEvents.addEvent(0, 'Base', phase, classnum, blocknum, true);
						TextEvents.addEvent(1, 'Base', phase, classnum, blocknum);
						TextEvents.addEvent(2, 'Front - Pulling', phase, classnum, blocknum);
						TextEvents.addEvent(3, 'Drafting', phase, classnum, blocknum);
						TextEvents.addEvent(4, 'Front - Climbing', phase, classnum, blocknum);

						workout = Paceline(		csv[line].Duration,
												csv[line].Power,
												csv[line].Cadence,
												csv[line].PowerLow,
												csv[line].CadenceLow,
												csv[line].PowerHigh,
												csv[line].CadenceHigh,
												csv[line].PowerOff,
												csv[line].CadenceOff,
												csv[line].Repeat);
						break;

					case 'cooldown':
						// We HATES the default '<RAMP>' implementation, so let's do something better.
						// Swaps PowerHigh and Power
						TextEvents.addEvent(0, 'Cool Down', phase, classnum, blocknum, true);

						workout = CoolDown(		csv[line].Duration,
												csv[line].PowerHigh,
												csv[line].PowerLow,
												csv[line].CadenceHigh,
												csv[line].CadenceLow,
												csv[line].Repeat);
						break;

					case 'bigdaddies':
						TextEvents.addEvent(0, 'BIG DADDIES!', phase, classnum, blocknum, true);
						TextEvents.addEvent(0, 'STAY SEATED', phase, classnum, blocknum, true);
						TextEvents.addEvent(0, 'No bouncing', phase, classnum, blocknum, true);
						TextEvents.addEvent(0, 'Max RPM from standing start', phase, classnum, blocknum, true);
						TextEvents.addEvent(0, 'Complete recovery Rest', phase, classnum, blocknum, true);

						workout = BigDaddies(	csv[line].Repeat,
												csv[line].Duration,
												csv[line].DurationOff,
												csv[line].Power,
												csv[line].PowerOff,
												csv[line].Cadence,
												csv[line].CadenceOff);
						break;
					case 'climbingpaceline':
					default:
						break;
					}

				// Apply Processed Workouts
					workoutblock = [];
					if(typeof workout !== 'undefined' && workout !== null) {
						if (workout) {
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

// BASE WORKOUT DATA STRUCTURES
function Comment(message, duration) {
	var comment = { 'comment': message.toUpperCase() };
	if (typeof duration !== 'undefined' && duration !== null) {
		comment.duration = getTime(duration);
	}
	return comment;
}

function WorkoutBlock(type, duration, duration_off, power, power_off, power_high, cadence, cadence_off, repeat, flatroad, index) {
	var workout = 				{};
		workout[type] = [{ 'duration': duration }];

	if (duration_off !== null)	workout[type][0]['duration_off']	= duration_off;	
	if (power !== null)			workout[type][0]['power']			= power;	
	if (power_off !== null)		workout[type][0]['power_off']		= power_off;	
	if (power_high !== null)	workout[type][0]['power_high']		= power_high;	
	if (cadence !== null)		workout[type][0]['cadence']			= cadence;	
	if (cadence_off !== null)	workout[type][0]['cadence_off']		= cadence_off;	
	if (repeat !== null)		workout[type][0]['repeat']			= repeat;	
	if (flatroad !== null)		workout[type][0]['flatroad']		= flatroad;	
	workout[type][0]['textevent']									= TextEvents.getTextEvents(index, phase, classnum, blocknum);

	return workout;	
}

// DEFAULT WORK BLOCKS
function WarmUp(duration, power_low, power_high, cadence, index) {
	var workout = WorkoutBlock('warmup',duration,null,power_low,null,power_high,null,null,null,null,index);
	return workout;
}
function Ramp(duration, power_low, power_high, cadence, cadence_off, index) {
	var workout = WorkoutBlock('ramp',duration,null,power_low,null,power_high,cadence,cadence_off,null,null,index);
	return workout;
}
function SteadyState(duration, power, cadence, cadence_off, index) {
	var workout = WorkoutBlock('steadystate',duration,null,power,null,null,cadence,cadence_off,null,null,index);
	return workout;
}
function IntervalsT(repeat, duration, duration_off, power_on, power_off, cadence, cadence_off, index) {
	var workout = WorkoutBlock('intervalst',duration,duration_off,power_on,power_off,null,cadence,cadence_off,repeat,null,index);
	return workout;
}
function FreeRide(duration, flatroad, index) {
	var workout = WorkoutBlock('freeride',duration,null,null,null,null,null,null,null,flatroad,index);
	return workout;
}

// CUSTOM WORK BLOCKS
function Progression(duration, powerA, powerB, cadenceA, cadenceB, repeat, index) {
	var workout = [];

	if (typeof repeat === 'undefined' || repeat === null || repeat === 0) repeat = 4;
	if (repeat === 1) repeat = 2;

	
	var interval			= Math.round(duration/repeat);
	var power_increment		= (powerB-powerA)/(repeat-1);
	var cadence_increment	= (cadenceB-cadenceA)/(repeat-1);

	var power							= powerA;
	if (powerA < powerB) power			= powerB;

	var cadence							= cadenceA;
	if (cadenceA < cadenceB) cadence	= cadenceB;

	for (var b=0;b<repeat;b++) {
		workout.push(SteadyState(interval, power+(power_increment*b), cadence+(cadence_increment*b), null, index));
		if (b == 0) index = -1; // Kill subsequent TextEvents
	}
	return workout;
}
function SteadyBuild(duration, duration_off, power_low, power_high, cadence_low, cadence_high) {
	var workout = Progression(duration, power_low, power_high, cadence_low, cadence_high, duration/60, 1)
	workout.splice(0,0,SteadyState(duration_off,power_low,cadence_low,null,0));
	return workout;
}
function ProgressiveWarmup(duration, power_low, power_high, cadence_low, cadence_high, repeat) {
	var workout = Progression(duration, power_low, power_high, cadence_low, cadence_high, repeat);
	return workout;
}
function ProgressiveBuild(duration, power_low, power_high, cadence_low, cadence_high, repeat) {
	var workout = Progression(duration, power_low, power_high, cadence_low, cadence_high, repeat);
	return workout;
}
function CoolDown(duration, power_high, power_low, cadence_high, cadence_low, repeat) {
	var workout = Progression(duration, power_high, power_low, cadence_high, cadence_low, duration/60);
	return workout;
}
function Rest(duration, power) {
	var workout = SteadyState(duration,power,null,null,0);
	return workout;
}
function ActiveRest(duration, power, cadence) {
	var workout = SteadyState(duration,power,cadence,null,0);
	return workout;
}
function SeatedRoller(duration_off, power_off, cadence_off, duration, power, cadence_low, cadence_high, repeat) {
	var workout = [];

	if (typeof repeat === 'undefined' || repeat === null || repeat === 0 || repeat === '') repeat = 4;

	// Base
	workout.push(SteadyState(duration_off,power_off,cadence_off,null,0));

	var interval = Math.round(duration/repeat);	

	for (var r=0;r<repeat;r++) {		
		// Climb
		workout.push(SteadyState(interval/2,power,cadence_low,null,1));
		// Descent
		workout.push(SteadyState(interval/2,power,cadence_high,null,2));		
	}
	return workout;
}
function StandingRoller(duration, power, cadence_off, cadence, cadence_low, cadence_high) {
	var workout = [];
	var interval = Math.round(duration/4);

	// Base
	workout.push(SteadyState(interval,power,cadence,null,0));
	// Approach
	workout.push(SteadyState(interval,power,cadence_low,null,1));
	// Climb
	workout.push(SteadyState(interval,power,cadence_high,null,2));
	// Descent
	workout.push(SteadyState(interval,power,cadence_off,null,3));

	return workout;
}
function Paceline(duration, power, cadence, power_low, cadence_low, power_high, cadence_high, power_off, cadence_off, repeat) {
	var workout = [];

	if (typeof repeat === 'undefined' || repeat === null || repeat === 0 || repeat === '') repeat = 4;
	
	var interval = Math.round(duration/repeat);

	var index = 0;
	for (var r=0;r<repeat;r++) {
		// Base
		workout.push(SteadyState(interval,power,cadence,null,index));
		// Approach
		workout.push(SteadyState(interval,power_low,cadence_low,null,2));
		// Climb
		workout.push(SteadyState(interval,power_high,cadence_high,null,3));
		// Descent
		workout.push(SteadyState(interval,power_off,cadence_off,null,4));
		if (r == 0) index = 1;
	}	
	return workout;
}
function Climbing(duration, power, cadence, power_low, cadence_low, power_high, cadence_high, duration_off, cadence_off, repeat) {
	var workout = [];

	if (typeof repeat === 'undefined' || repeat === null || repeat === 0 || repeat === '') repeat = 4;

	var interval = Math.round(duration/repeat)/2;
	
 	var power_progression = power_low;
	if (typeof power_high !== 'undefined' || power_high !== null) {
		power_progression = power_high;
	}

 	var cadence_progression	= cadence_low;
	if (typeof cadence_high !== 'undefined' || cadence_high !== null) {
		cadence_progression = cadence_high;
	}

	var index = 0;
	for (var r=0;r<repeat;r++) {
		// Phase 1
		workout.push(SteadyState(interval,power,cadence,null,index));
		// Phase 2
		if(repeat > 0) {
			workout.push(SteadyState(interval,power_progression,cadence_progression,null,2));
		} else {
			workout.push(SteadyState(interval,power_low,cadence_low,null,3));
		}
		if (r == 0) index = 1;
	}
	
	// Descent
	if (typeof duration_off !== 'undefined' || duration_off !== null) {
		workout.push(SteadyState(duration_off,power,cadence_off,null,4));
	}
	return workout;
}
function BigDaddies(repeat, duration, duration_off, power_on, power_off, cadence, cadence_off) {
	var workout = IntervalsT(repeat, duration, duration_off, power_on, power_off, cadence, cadence_off, 0);
	return workout;
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