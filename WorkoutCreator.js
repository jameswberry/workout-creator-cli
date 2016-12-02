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

		for(view in views) {
		
			for(var cn=0; cn<views[view].length; cn++) {
				output_filename = view+'-';
				if(cn+1<10) {
					output_filename += '0';
				}
				output_filename += (cn+1);
				output_file = output_file_prefix+output_filename+output_file_suffix;
				if (prompts.verbose) console.log('Writing File: '+output_file);

				output = Mustache.render(template, views[view][cn]);

				require('fs').writeFileSync(output_file, output);
				if (prompts.verbose) console.log('File Saved');
			}
		}

		//console.log(TextEvents.dump());
		ErrorHandler.flushErrors();
		process.exit(0);
	});
});

// Phase is required as a global for TextEvents
var phase;

// Classnum is required as a global for TextEvents
var classnum;

/**
 * csv - csv-to-json conversaion data structure.
 */
function WorkoutProcessor(csv) {
	var phases = {};
	var classname;
	var type;
	var workout_id, workout, workouts;

	for(line in csv) {
		// Convert line to an integer for indexing the csv array later. (searching for adjacent textevents)
		line = parseInt(line);

		if (csv[line].Phase != '') {
			phase = csv[line].Phase;

			if (csv[line].Class != '' ) {
				type = csv[line].Type.toLowerCase();

				// Skip TextEvents since they are already processed as part of blocks.
				if (type !== 'textevent') {

					// Reset Class Set Number when moving between Classes.
					if (csv[line].Class-1 != classnum) TextEvents.resetSetNum(phase,csv[line].Class-1);
				
					classnum = csv[line].Class-1;
					
					workout_id = getWorkoutId(phase,classnum);

					// Increment Class Set Number for sets
					 TextEvents.incrementSetNum(phase,classnum);
			
					// Initialize Class Object
					if (typeof  phases[workout_id] === 'undefined' ) {
						phases[workout_id] = {
							'author'		: '',
							'name'			: '',
							'description'	: '',
							'sport'			: '',
							'tags'			: false,
							'workout'		: Array()
						};
					}

					// Process Block Text Event
						TextEvents.addEvent(csv[line].Value, phase,classnum);
					}
				
					// Process additional Block Text Events
						for ( var te=1; te<(csv.length-line); te++ ) { // Only search to the end of the csv array.
								break;
							} else if( csv[line+te].Type.toLowerCase() === 'textevent' ) {
								TextEvents.addEvent(csv[line+te].Value, phase,classnum);
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
						TextEvents.deleteSet(phase,classnum);
						break;

					case 'name':
						if (csv[line].Class<10) {
							classname = '0'+csv[line].Class;
						} else { 
							classname = csv[line].Class;
						}
						phases[workout_id].name = csv[line].Phase+' #'+classname+': '+csv[line].Value;
						workout = false;
						TextEvents.deleteSet(phase,classnum);
						break;

					case 'description':
						phases[workout_id].description = csv[line].Value;
						workout = false;
						TextEvents.deleteSet(phase,classnum);
						break;

					case 'sport':
						phases[workout_id].sport = csv[line].Value.toLowerCase();
						workout = false;
						TextEvents.deleteSet(phase,classnum);
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
						TextEvents.deleteSet(phase,classnum);
						break;

					case 'textevent':
						// NOTE: Should never get here because we have already skipped this processing for TextEvents.
						workout = false;
						break;

				// DEFAULT WORKOUT BLOCKS
					case 'warmup':
						workout = WarmUp(		csv[line].Duration,
										 		csv[line].Power,
										 		csv[line].PowerHigh,
										 		csv[line].Cadence);
						break;

					case 'ramp':
						workout = Ramp(			csv[line].Duration,
												csv[line].Power,
												csv[line].PowerHigh,
												csv[line].Cadence,
												csv[line].CadenceOff);
						break;

					case 'steadystate':
						workout = SteadyState(	csv[line].Duration,
												csv[line].Power,
												csv[line].Cadence,
												csv[line].CadenceOff);
						break;

					case 'intervalst':
						workout = IntervalsT(	csv[line].Repeat,
												csv[line].Duration,
												csv[line].DurationOff,
												csv[line].Power,
												csv[line].PowerOff,
												csv[line].Cadence,
												csv[line].CadenceOff);
						break;

					case 'freeride':
						workout = FreeRide(		csv[line].Duration,
												1);
						break;
				
				// CUSTOM WORKOUT BLOCKS
					case 'progressivewarmup':
						TextEvents.addEvent('Progressive Warmup',phase,classnum);
					
						workout = ProgressiveWarmup(csv[line].Duration,
												csv[line].PowerLow,
												csv[line].PowerHigh,
												csv[line].CadenceLow,
												csv[line].CadenceHigh,
												csv[line].Repeat);
						break;

					case 'steadybuild':
						TextEvents.addEvent('Steady Build',phase,classnum);
						
						workout = SteadyBuild(	csv[line].Duration,
												csv[line].DurationOff,
												csv[line].PowerLow,
												csv[line].PowerHigh,
												csv[line].CadenceLow,
												csv[line].CadenceHigh);
						break;

					case 'progressivebuild':
						TextEvents.addEvent('Progressive Build',phase,classnum);
						TextEvents.addEvent('Build power and cadence together',phase,classnum);
					
						workout = ProgressiveBuild(csv[line].Duration,
												csv[line].PowerLow,
												csv[line].PowerHigh,
												csv[line].CadenceLow,
												csv[line].CadenceHigh,
												csv[line].Repeat);
						break;

					case 'progression':
						workout = Progression(	csv[line].Duration,
												csv[line].PowerLow,
												csv[line].PowerHigh,
												csv[line].CadenceLow,
												csv[line].CadenceHigh,
												csv[line].Repeat);
						break;

					case 'rest':
						TextEvents.addEvent('Full Recovery',phase,classnum);
					
						workout = Rest(			csv[line].Duration,
												csv[line].Power);
						break;

					case 'activerest':
						TextEvents.addEvent('Active Rest',phase,classnum);
					
						workout = ActiveRest(	csv[line].Duration,
												csv[line].Power,
												csv[line].Cadence);
						break;
					
					case 'alternatingclimb':
						TextEvents.addEvent('Alternate Seated Climbing with Standing',phase,classnum);
						TextEvents.addEvent('Climb (Seated)',phase,classnum);
						TextEvents.addEvent('Climb (Seated)',phase,classnum);
						TextEvents.addEvent('Stand',phase,classnum);
						TextEvents.addEvent('Descent!',phase,classnum);

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
						TextEvents.addEvent('Seated Roller',phase,classnum);
						TextEvents.addEvent('Mix RPM from smooth seated rollers',phase,classnum);
						TextEvents.addEvent('Tension on chain',phase,classnum);
						TextEvents.addEvent('Smooth transitions from climb to descend',phase,classnum);

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
						TextEvents.addEvent('Standing Roller',phase,classnum);
						TextEvents.addEvent('Base',phase,classnum);
						TextEvents.addEvent('Base',phase,classnum);
						TextEvents.addEvent('Approach',phase,classnum);
						TextEvents.addEvent('Climbing out of the saddle',phase,classnum);
						TextEvents.addEvent('Descent',phase,classnum);

						workout = StandingRoller(csv[line].Duration,
												csv[line].Power,
												csv[line].CadenceOff,
												csv[line].Cadence,
												csv[line].CadenceLow,
												csv[line].CadenceHigh);
						break;

					case 'paceline':
						TextEvents.addEvent('Paceline',phase,classnum);
						TextEvents.addEvent('Base',phase,classnum);
						TextEvents.addEvent('Base',phase,classnum);
						TextEvents.addEvent('Front - Pulling',phase,classnum);
						TextEvents.addEvent('Drafting',phase,classnum);
						TextEvents.addEvent('Front - Climbing',phase,classnum);

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
						TextEvents.addEvent('Cool Down',phase,classnum);

						workout = CoolDown(		csv[line].Duration,
												csv[line].PowerHigh,
												csv[line].PowerLow,
												csv[line].CadenceHigh,
												csv[line].CadenceLow,
												csv[line].Repeat);
						break;

					case 'bigdaddies':
						TextEvents.addEvent('BIG DADDIES!',phase,classnum);
						TextEvents.addEvent('STAY SEATED',phase,classnum);
						TextEvents.addEvent('No bouncing',phase,classnum);
						TextEvents.addEvent('Max RPM from standing start',phase,classnum);
						TextEvents.addEvent('Complete recovery Rest',phase,classnum);

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
						if (prompts.verbose) console.log(phase + '-' + classnum + ': ' + type + ' was unable to be processed.');
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

function TextEvent(offset, message) {
	return { 'offset': offset, 'message': message };
}

function WorkoutBlock(type, duration, duration_off, power, power_off, power_high, cadence, cadence_off, repeat, flatroad) {
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
	workout[type][0]['textevent']									= TextEvents.getTextEvents(phase,classnum);
	return workout;	
}

// DEFAULT WORK BLOCKS
function WarmUp(duration, power_low, power_high, cadence) {
	var workout = WorkoutBlock('warmup',duration,null,power_low,null,power_high);
	return workout;
}
function Ramp(duration, power_low, power_high, cadence, cadence_off) {
	var workout = WorkoutBlock('ramp',duration,null,power_low,null,power_high,cadence,cadence_off);
	return workout;
}
function SteadyState(duration, power, cadence, cadence_off) {
	var workout = WorkoutBlock('steadystate',duration,null,power,null,null,cadence,cadence_off);
	return workout;
}
function IntervalsT(repeat, duration, duration_off, power_on, power_off, cadence, cadence_off) {
	var workout = WorkoutBlock('intervalst',duration,duration_off,power_on,power_off,null,cadence,cadence_off,repeat);
	return workout;
}
function FreeRide(duration, flatroad) {
	var workout = WorkoutBlock('freeride',duration,null,null,null,null,null,null,null,flatroad);
	return workout;
}

// CUSTOM WORK BLOCKS
function Progression(duration, powerA, powerB, cadenceA, cadenceB, repeat) {
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
		workout.push(SteadyState(interval,power+(power_increment*b),cadence+(cadence_increment*b),null));
	}
	return workout;
}
function SteadyBuild(duration, duration_off, power_low, power_high, cadence_low, cadence_high) {
	var workout = Progression(duration, power_low, power_high, cadence_low, cadence_high, duration/60, null);
	workout.splice(0,0,SteadyState(duration_off,power_low,cadence_low,null));
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
	var workout = SteadyState(duration,power,null,null);
	return workout;
}
function ActiveRest(duration, power, cadence) {
	var workout = SteadyState(duration,power,cadence,null);
	return workout;
}
function SeatedRoller(duration_off, power_off, cadence_off, duration, power, cadence_low, cadence_high, repeat) {
	var workout = [];

	if (typeof repeat === 'undefined' || repeat === null || repeat === 0 || repeat === '') repeat = 4;

	// Base
	workout.push(SteadyState(duration_off,power_off,cadence_off,null));

	var interval = Math.round(duration/repeat);	

	for (var r=0;r<repeat;r++) {
		// Climb
		workout.push(SteadyState(interval/2,power,cadence_low,null));
		// Descent
		workout.push(SteadyState(interval/2,power,cadence_high,null));		
	}
	return workout;
}
function StandingRoller(duration, power, cadence_off, cadence, cadence_low, cadence_high) {
	var workout = [];
	var interval = Math.round(duration/4);

	// Base
	workout.push(SteadyState(interval,power,cadence_off,null));
	// Approach
	workout.push(SteadyState(interval,power,cadence,null));
	// Climb
	workout.push(SteadyState(interval,power,cadence_low,null));
	// Descent
	workout.push(SteadyState(interval,power,cadence_high,null));

	return workout;
}
function Paceline(duration, power, cadence, power_low, cadence_low, power_high, cadence_high, power_off, cadence_off, repeat) {
	var workout = [];

	if (typeof repeat === 'undefined' || repeat === null || repeat === 0 || repeat === '') repeat = 4;
	
	var interval = Math.round(duration/repeat);

	for (var r=0;r<repeat;r++) {
		// Base
		workout.push(SteadyState(interval,power,cadence,null));
		// Approach
		workout.push(SteadyState(interval,power_low,cadence_low,null));
		// Climb
		workout.push(SteadyState(interval,power_high,cadence_high,null));
		// Descent
		workout.push(SteadyState(interval,power_off,cadence_off,null));
	}	
	return workout;
}
function Climbing(duration, power, cadence, power_low, cadence_low, power_high, cadence_high, duration_off, cadence_off, repeat) {
	var workout = [];

	if (typeof repeat === 'undefined' || repeat === null || repeat === 0 || repeat === '') repeat = 4;
	var interval = Math.round(duration/repeat)/2;
	
 	var power_progression = power_low;
		power_progression = power_high;
	}

 	var cadence_progression	= cadence_low;
		cadence_progression = cadence_high;
	}

	for (var r=0;r<repeat;r++) {
		// Phase 1
		workout.push(SteadyState(interval,power,cadence,null));
		// Phase 2
		if(repeat > 0) {
			workout.push(SteadyState(interval,power_progression,cadence_progression,null));
		} else {
			workout.push(SteadyState(interval,power_low,cadence_low,null));
		}
	}
	
	// Descent
		workout.push(SteadyState(duration_off,power,cadence_off,null));
	}
	return workout;
}
function BigDaddies(repeat, duration, duration_off, power_on, power_off, cadence, cadence_off) {
	var workout = IntervalsT(repeat, duration, duration_off, power_on, power_off, cadence, cadence_off);
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