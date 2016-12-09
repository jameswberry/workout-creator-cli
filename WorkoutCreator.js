// REQUIRE LIBRARIES
var fs = require('fs');
var Prompt = require('prompt');
Prompt.message =		'';
Prompt.delimiter =		' >';
var Optimist = require('optimist');
var Mustache = require('mustache');
var CSVConverter = require('csvtojson').Converter;
var Converter = new CSVConverter({});

var ErrorHandler = require('./libs/error');
ErrorHandler = new ErrorHandler();

var TextEventManager = require('./libs/TextEventManager.js');
TextEvents = new TextEventManager();


// COMMAND LINE ARGUMENT OVERRIDES
Prompt.override = Optimist.argv;

// PROMPT FOR INPUT
/*{
	name:										// The name of the prompt field value.
	description:	'',							// Prompt displayed to the user. If not supplied name will be used. 
	type:			'string|boolean|integer',	// Specify the type of input to expect. 
	pattern:		/^\w+$/,					// Regular expression that input must be valid against. 
	message:		'',							// Warning message to display if validation fails. 
	hidden:			false,						// If true, characters entered will either not be output to console or will be outputed using the `replace` string. 
	replace:		'*',						// If `hidden` is set it will replace each hidden character with the specified string. 
	default:		'',							// Default value to use if no value is entered. 
	required:		true,						// If true, value entered must be non-empty. 
	before:			function(value) {			// Runs before node-prompt callbacks. It modifies user's input 
		return 'v' + value;
	}, 
}
*/
var properties = [{
	name: 			'input',
	description:	'Input [.csv]',
	pattern:		/[^\0]*.csv/,
	message:		'File must be a .csv',
	type:			'string',
	hidden:			false,
	default:		'WorkoutCreator.csv',
	required:		true
},
{
	name: 			'output',
	description:	'Output Directory',
	type:			'string',
	hidden:			false,
	default:		'./',
	required:		true,
},
{
	name:			'template',
	description:	'Template [.mustache]',
	pattern:		/[^\0]*.mustache/,
	message:		'File must be a .mustache',
	type:			'string',
	hidden:			false,
	default:		'WorkoutCreator.mustache',
	required:		true
},
{
	name:			'verbose',
	description:	'Verbose',
	type:			'boolean',
	hidden:			false,
	default:		true,
	required:		false
},
{
	name:			'debug',
	description:	'Debug',
	type:			'boolean',
	hidden:			false,
	default:		false,
	required:		false
}];
var prompts = [];
var inputs	= {}
for (var i=0;i<properties.length;i++) {
	prompts.push(properties[i].name);		
	inputs[properties[i].name] = properties[i].default;
}

Prompt.start();

Prompt.get(properties, function (err, result) {
	prompts = result;

	// INITIALIZE VARIABLES
	var input_filename		= prompts.input;
	var output_file_prefix	= prompts.output;
	var output_file_suffix	= '.zwo';

	var template = prompts.template;
	if (prompts.verbose) console.log('Loading Template: '+template);
	
	fs.readFile(template, 'utf8', function (err,data) {
		if (err) {
			console.log(err);
			process.exit(0);
		}
		template = data;
		if (prompts.verbose) console.log('Template Load Complete');
	});

	// CONVERT CSV to JSON
	if (prompts.verbose) console.log('Loading Data: '+input_filename);
	Converter.fromFile(input_filename,function(err,result){
		if (err) {
			console.log(err);
			process.exit(0);
		} else {
			if (prompts.verbose) console.log('Data Load Complete');
		}
		if (prompts.verbose) console.log('Building Views');

		var output = '';
		var output_file = '';
		var output_filename = '';

		var views = WorkoutProcessor(result);
		if (prompts.verbose) console.log('Views Complete');

		var cn, lastphase;
		for(var view in views) {
			if (view.split(':')[0] !== lastphase) cn = 0;
			lastphase = view.split(':')[0];
			
			output_filename = view.split(':')[0]+'-';
			if(cn+1<10) {
				output_filename += '0';
			}
			output_filename += (cn+1);

			output_file = output_file_prefix+output_filename+output_file_suffix;
			if (prompts.verbose) console.log('Writing File: '+output_file);

			output = Mustache.render(template, views[view]);

			require('fs').writeFileSync(output_file, output);
			if (prompts.verbose) console.log('File Saved');
			cn++;
		}

		if (prompts.debug) console.log(TextEvents.dump());
		if (prompts.debug) ErrorHandler.flushErrors();
		process.exit(0);
	});
});

// TODO: Would like to move these into TextEvents library once it's working.

// Phase is required as a global for TextEvents
var phase;

// Classnum is required as a global for TextEvents
var classnum;

// Blocknum is required as a global for TextEvents
var blocknum = -1; // So we can increment it at the beginning of the block loop.

/**
 * csv - csv-to-json conversaion data structure.
 */
function WorkoutProcessor(csv) {
	var phases = {};
	var classname;
	var lastclassnum
	var type, offset;
	var workout_id, workout, workouts;

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
					workouts	= null;
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
						if (prompts.verbose) console.log('Unsupported Type: [' + type + ']');
					}

				// Apply Processed Workouts
					if(typeof workout !== 'undefined' && workout !== null) {
						if (workout) {
							phases[workout_id].workout.push(Comment(type));
							if (workout.length) {
								for(var b=0;b<workout.length;b++) {
									phases[workout_id].workout.push(workout[b]);
								}
							} else {
								phases[workout_id].workout.push(workout);
							}
						}
					} else {
						if (prompts.verbose) console.log(phase+'-'+classnum+': '+type+' was unable to be processed.');
					}
					
				}
			}
		}
	}
	return phases;
}

function getWorkoutId(phase, classnum) {
	return phase+':'+classnum;
}

// BASE WORKOUT DATA STRUCTURES
function Comment(message) {
	return { 'comment': message.toUpperCase() };
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
	if (powerA > powerB) power			= powerB;

	var cadence							= cadenceA;
	if (cadenceA > cadenceB) cadence	= cadenceB;

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
function CoolDown(duration, power_low, power_high, cadence_low, cadence_high, repeat) {
	var workout = Progression(duration, power_low, power_high, cadence_low, cadence_high, duration/60);
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
	workout.push(SteadyState(interval,power,cadence_off,null,0));
	// Approach
	workout.push(SteadyState(interval,power,cadence,null,1));
	// Climb
	workout.push(SteadyState(interval,power,cadence_low,null,2));
	// Descent
	workout.push(SteadyState(interval,power,cadence_high,null,3));

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
		if (r == 0) index = 0;
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