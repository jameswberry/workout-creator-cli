// REQUIRE LIBRARIES
var fs = require('fs');
var Prompt = require('prompt');
Prompt.message =		'';
Prompt.delimiter =		' >';
var Optimist = require('optimist');
var Mustache = require('mustache');
var CSVConverter = require('csvtojson').Converter;
var Converter = new CSVConverter({});

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

		process.exit(0);
	});
});

function WorkoutProcessor(csv) {
	var phases		= {};
	var phase;
	var classnum;
	var classname;
	var type;
	var workout, workouts;
	var textevents;

	for(line in csv) {
		// Convert line to an integer for indexing the csv array later. (searching for textevents)
		line = parseInt(line);

		if (csv[line].Phase != '') {
			phase = csv[line].Phase;

			// Initialize Phase
			if (phases[phase] === undefined) {
				phases[phase] = Array();
			}
		
			if (csv[line].Class != '') { 
				classnum = csv[line].Class-1;
			
				// Initialize Class Object
				if (phases[phase][classnum] === undefined) {
					phases[phase][classnum] = {
						'author'		: '',
						'name'			: '',
						'description'	: '',
						'sport'			: '',
						'tags'			: false,
						'workout'		: Array()
					};
				}

				// Initialize TextEvents
				textevents = [];

				// Process Block Text Event
				if (csv[line].Value !== undefined && csv[line].Value !== '') {
					textevents.push(TextEvent(0, csv[line].Value));
				}
				
				// Process additional Block Text Events
				if (csv[line+1] !== undefined) {
					for (var te=1; te<(csv.length-line); te++) { // Only search to the end of the csv array.
						if ( csv[line+te] === undefined ) {
							break;
						} else if(csv[line+te].Type.toLowerCase() === 'textevent') {
							textevents.push(TextEvent(csv[line+te].Offset, csv[line+te].Value));
						} else {
							break;
						}
					}
				}
				
				// Reset for template section if empty
				if (textevents.length == 0) textevents = null;
				
			// Process Workout
				workout		= null;
				workouts	= null;
				type = csv[line].Type.toLowerCase();
				switch (type) {

			// WORKOUT DETAILS
				case 'author':
					phases[phase][classnum].author = csv[line].Value;
					workout = false;
					break;

				case 'name':
					if (csv[line].Class<10) {
						classname = '0'+csv[line].Class;
					} else { 
						classname = csv[line].Class;
					}
					phases[phase][classnum].name = csv[line].Phase+' #'+classname+': '+csv[line].Value;
					workout = false;
					break;

				case 'description':
					phases[phase][classnum].description = csv[line].Value;
					workout = false;
					break;

				case 'sport':
					phases[phase][classnum].sport = csv[line].Value.toLowerCase();
					workout = false;
					break;

				case 'tag':
					// Initialize Tags
					if (phases[phase][classnum].tag	=== undefined) {
						phases[phase][classnum].tags = true;
						phases[phase][classnum].tag = [];
					}
					if (csv[line].Value.toLowerCase() == 'recovery' ||
						csv[line].Value.toLowerCase() == 'intervals' ||
						csv[line].Value.toLowerCase() == 'ftp' ||
						csv[line].Value.toLowerCase() == 'tt') {
							csv[line].Value = csv[line].Value.toUpperCase();
					}
					phases[phase][classnum].tag.push({ 'name': csv[line].Value });
					workout = false;
					break;

				case 'textevent':
					workout = false;
					break;

			// DEFAULT WORKOUT BLOCKS
				case 'warmup':
					workout = WarmUp(		csv[line].Duration,
									 		csv[line].Power,
									 		csv[line].PowerHigh,
									 		csv[line].Cadence,
									 		textevents);
					break;

				case 'ramp':
					workout = Ramp(			csv[line].Duration,
											csv[line].Power,
											csv[line].PowerHigh,
											csv[line].Cadence,
											csv[line].CadenceOff,
											textevents);
					break;

				case 'steadystate':
					workout = SteadyState(	csv[line].Duration,
											csv[line].Power,
											csv[line].Cadence,
											csv[line].CadenceOff,
											textevents);
					break;

				case 'intervalst':
					workout = IntervalsT(	csv[line].Repeat,
											csv[line].Duration,
											csv[line].DurationOff,
											csv[line].Power,
											csv[line].PowerOff,
											csv[line].Cadence,
											csv[line].CadenceOff,
											textevents);
					break;

				case 'freeride':
					workout = FreeRide(		csv[line].Duration,
											1,
											textevents);
					break;
				
			// CUSTOM WORKOUT BLOCKS
				case 'progressivewarmup':
					if (textevents === null) textevents = [];
					textevents.push(TextEvent(0,'Progressive Warmup'));
					
					workout = ProgressiveWarmup(csv[line].Duration,
											csv[line].PowerLow,
											csv[line].PowerHigh,
											csv[line].CadenceLow,
											csv[line].CadenceHigh,
											csv[line].Repeat,
											textevents);
					break;

				case 'steadybuild':
					if (textevents === null) textevents = [];
					textevents.push(TextEvent(0,'Steady Build'));
					
					workout = SteadyBuild(	csv[line].Duration,
											csv[line].DurationOff,
											csv[line].PowerLow,
											csv[line].PowerHigh,
											csv[line].CadenceLow,
											csv[line].CadenceHigh,
											textevents);
					break;

				case 'progressivebuild':
					if (textevents === null) textevents = [];
					textevents.push(TextEvent(0,'Progressive Build'));
					textevents.push(TextEvent(10,'Build power and cadence together'));
					
					workout = ProgressiveBuild(csv[line].Duration,
											csv[line].PowerLow,
											csv[line].PowerHigh,
											csv[line].CadenceLow,
											csv[line].CadenceHigh,
											csv[line].Repeat,
											textevents);
					break;

				case 'progression':
					workout = Progression(	csv[line].Duration,
											csv[line].PowerLow,
											csv[line].PowerHigh,
											csv[line].CadenceLow,
											csv[line].CadenceHigh,
											csv[line].Repeat,
											textevents);
					break;

				case 'rest':
					if (textevents === null) textevents = [];
					textevents.push(TextEvent(0,'Rest. Full Recovery'));
					
					workout = Rest(			csv[line].Duration,
											csv[line].Power,
											textevents);
					break;

				case 'activerest':
					if (textevents === null) textevents = [];
					textevents.push(TextEvent(0,'Active Rest'));
					
					workout = ActiveRest(	csv[line].Duration,
											csv[line].Power,
											csv[line].Cadence,
											textevents);
					break;
					
				case 'alternatingclimb':
					if (textevents === null) textevents = [];
					textevents.push(TextEvent(0,'Alternate Seated Climbing with Standing'));
					textevents.push(TextEvent(5,'Climb (Seated)'));
					textevents.push(TextEvent(0,'Climb (Seated)'));
					textevents.push(TextEvent(0,'Stand'));
					textevents.push(TextEvent(0,'Descent!'));

					workout = Climbing(		csv[line].Duration,
						 					csv[line].Power,
											csv[line].Cadence,
											csv[line].PowerLow,
											csv[line].CadenceLow,
											csv[line].PowerHigh,
											csv[line].CadenceHigh,
											csv[line].DurationOff,
											csv[line].CadenceOff,
											csv[line].Repeat,
											textevents);
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
											csv[line].Repeat,
											textevents);
					break;

				case 'seatedroller':
					if (textevents === null) textevents = [];
					textevents.push(TextEvent(0,'Seated Roller'));
					textevents.push(TextEvent(5,'Mix RPM from smooth seated rollers'));
					textevents.push(TextEvent(10,'Tension on chain'));
					textevents.push(TextEvent(15,'Smooth transitions from climb to descend'));

					workout = SeatedRoller( csv[line].DurationOff,
											csv[line].PowerOff,
											csv[line].CadenceOff,
											csv[line].Duration,
											csv[line].Power,
											csv[line].CadenceLow,
											csv[line].CadenceHigh,
											csv[line].Repeat,
											textevents);
					break;

				case 'standingroller':
					if (textevents === null) textevents = [];
					textevents.push(TextEvent(0,'Standing Roller'));
					textevents.push(TextEvent(5,'Base'));
					textevents.push(TextEvent(0,'Base'));
					textevents.push(TextEvent(0,'Approach'));
					textevents.push(TextEvent(0,'Climbing out of the saddle'));
					textevents.push(TextEvent(0,'Descent'));
					
					workout = StandingRoller(csv[line].Duration,
											csv[line].Power,
											csv[line].CadenceOff,
											csv[line].Cadence,
											csv[line].CadenceLow,
											csv[line].CadenceHigh,
											textevents);
					break;

				case 'paceline':
					if (textevents === null) textevents = [];
					textevents.push(TextEvent(0,'Paceline'));
					textevents.push(TextEvent(5,'Base'));
					textevents.push(TextEvent(0,'Base'));
					textevents.push(TextEvent(0,'Front - Pulling'));
					textevents.push(TextEvent(0,'Drafting'));
					textevents.push(TextEvent(0,'Front - Climbing'));
															
					workout = Paceline(		csv[line].Duration,
											csv[line].Power,
											csv[line].Cadence,
											csv[line].PowerLow,
											csv[line].CadenceLow,
											csv[line].PowerHigh,
											csv[line].CadenceHigh,
											csv[line].PowerOff,
											csv[line].CadenceOff,
											csv[line].Repeat,
											textevents);
					break;

				case 'cooldown':
					// We HATES the default '<RAMP>' implementation, so let's do something better.
					// Swaps PowerHigh and Power
					if (textevents === null) textevents = [];
					textevents.push(TextEvent(0,'Cool Down'));

					workout = CoolDown(		csv[line].Duration,
											csv[line].PowerHigh,
											csv[line].PowerLow,
											csv[line].CadenceHigh,
											csv[line].CadenceLow,
											csv[line].Repeat,
											textevents);
					break;

				case 'bigdaddies':
					if (textevents === null) textevents = [];
					textevents.push(TextEvent(0,'BIG DADDIES!'));
					textevents.push(TextEvent(5,'STAY SEATED'));
					textevents.push(TextEvent(10,'No bouncing'));
					textevents.push(TextEvent(15,'Max RPM from standing start'));
					textevents.push(TextEvent(20,'Complete recovery Rest'));

					workout = BigDaddies(	csv[line].Repeat,
											csv[line].Duration,
											csv[line].DurationOff,
											csv[line].Power,
											csv[line].PowerOff,
											csv[line].Cadence,
											csv[line].CadenceOff,
											textevents);
					break;
				case 'climbingpaceline':
				default:
					if (prompts.verbose) console.log('Unsupported Type: [' + type + ']');
				}

			// Apply Processed Workouts
				if(typeof workout !== 'undefined' && workout !== null) {
					if (workout) {
						phases[phase][classnum].workout.push(Comment(type));
						if (workout.length) {
							for(var b=0;b<workout.length;b++) {
								phases[phase][classnum].workout.push(workout[b]);
							}
						} else {
							phases[phase][classnum].workout.push(workout);
						}
					}
				} else {
					if (prompts.verbose) console.log(phase + '-' + classnum + ': ' + type + ' was unable to be processed.');
				}
				
			}
		}
	}
	return phases;
}

// BASE DATA STRUCTURES
function Comment(message) {
	return { 'comment': message.toUpperCase() };
}

function TextEvent(offset, message) {
	return { 'offset': offset, 'message': message };
}

function WorkoutBlock(type, textevents, duration, duration_off, power, power_off, power_high, cadence, cadence_off, repeat, flatroad) {
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
	if (textevents !== null)	workout[type][0]['textevent']		= textevents;	
	return workout;	
}

// DEFAULT WORK BLOCKS
function WarmUp(duration, power_low, power_high, cadence, textevents) {
	var workout = WorkoutBlock('warmup',textevents,duration,null,power_low,null,power_high);
	return workout;
}
function Ramp(duration, power_low, power_high, cadence, cadence_off, textevents) {
	var workout = WorkoutBlock('ramp',textevents,duration,null,power_low,null,power_high,cadence,cadence_off);
	return workout;
}
function SteadyState(duration, power, cadence, cadence_off, textevents) {
	var workout = WorkoutBlock('steadystate',textevents,duration,null,power,null,null,cadence,cadence_off);
	return workout;
}
function IntervalsT(repeat, duration, duration_off, power_on, power_off, cadence, cadence_off, textevents) {
	var workout = WorkoutBlock('intervalst',textevents,duration,duration_off,power_on,power_off,null,cadence,cadence_off,repeat);
	return workout;
}
function FreeRide(duration, flatroad, textevents) {
	var workout = WorkoutBlock('freeride',textevents,duration,null,null,null,null,null,null,null,flatroad);
	return workout;
}

// CUSTOM WORK BLOCKS
function Progression(duration, powerA, powerB, cadenceA, cadenceB, repeat, textevents) {
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
		workout.push(SteadyState(interval,power+(power_increment*b),cadence+(cadence_increment*b),null,textevents));
		if (b === 0) textevents = null;
	}
	return workout;
}
function SteadyBuild(duration, duration_off, power_low, power_high, cadence_low, cadence_high, textevents) {
	var workout = Progression(duration, power_low, power_high, cadence_low, cadence_high, duration/60, null);
	workout.splice(0,0,SteadyState(duration_off,power_low,cadence_low,null,textevents));
	return workout;
}
function ProgressiveWarmup(duration, power_low, power_high, cadence_low, cadence_high, repeat, textevents) {
	var workout = Progression(duration, power_low, power_high, cadence_low, cadence_high, repeat, textevents);
	return workout;
}
function ProgressiveBuild(duration, power_low, power_high, cadence_low, cadence_high, repeat, textevents) {
	var workout = Progression(duration, power_low, power_high, cadence_low, cadence_high, repeat, textevents);
	return workout;
}
function CoolDown(duration, power_low, power_high, cadence_low, cadence_high, repeat, textevents) {
	var workout = Progression(duration, power_low, power_high, cadence_low, cadence_high, duration/60, textevents);
	return workout;
}
function Rest(duration, power, textevents) {
	var workout = SteadyState(duration,power,null,null,textevents);
	return workout;
}
function ActiveRest(duration, power, cadence, textevents) {
	var workout = SteadyState(duration,power,cadence,null,textevents);
	return workout;
}
function SeatedRoller(duration_off, power_off, cadence_off, duration, power, cadence_low, cadence_high, repeat, textevents) {
	var workout = [];

	if (typeof repeat === 'undefined' || repeat === null || repeat === 0 || repeat === '') repeat = 4;

	// Base
	textevents.push(TextEvent(textevents.length*5,'Base'));
	workout.push(SteadyState(duration_off,power_off,cadence_off,null,textevents));

	var interval = Math.round(duration/repeat);	

	for (var r=0;r<repeat;r++) {
		// Climb
		workout.push(SteadyState(interval/2,power,cadence_low,null,TextEvent(0,'Climb')));
		// Descent
		workout.push(SteadyState(interval/2,power,cadence_high,null,TextEvent(0,'Descent')));		
	}
	return workout;
}
function StandingRoller(duration, power, cadence_off, cadence, cadence_low, cadence_high, textevents) {
	var workout = [];
	var interval = Math.round(duration/4);

	// Base
	workout.push(SteadyState(interval,power,cadence_off,null,textevents.slice(0,2)));
	// Approach
	workout.push(SteadyState(interval,power,cadence,null,textevents[3]));
	// Climb
	workout.push(SteadyState(interval,power,cadence_low,null,textevents[4]));
	// Descent
	workout.push(SteadyState(interval,power,cadence_high,null,textevents[5]));

	return workout;
}
function Paceline(duration, power, cadence, power_low, cadence_low, power_high, cadence_high, power_off, cadence_off, repeat, textevents) {
	var workout = [];

	if (typeof repeat === 'undefined' || repeat === null || repeat === 0 || repeat === '') repeat = 4;
	
	var interval = Math.round(duration/repeat);

	var textevent_intro = textevents.slice(0,2);
	for (var r=0;r<repeat;r++) {
		// Base
		workout.push(SteadyState(interval,power,cadence,null,textevent_intro));
		// Approach
		workout.push(SteadyState(interval,power_low,cadence_low,null,textevents[3]));
		// Climb
		workout.push(SteadyState(interval,power_high,cadence_high,null,textevents[4]));
		// Descent
		workout.push(SteadyState(interval,power_off,cadence_off,null,textevents[5]));
		
		if (r === 0) textevent_intro = textevents[2];
	}	
	return workout;
}
function ClimbingPaceLine(duration, power, cadence, textevents) {
	if (textevents === null) textevents = [];
	textevents.push(TextEvent(0,'Active Rest'));

	var workout = SteadyState(duration,power,cadence,null,textevents);
	return workout;
}
function Climbing(duration, power, cadence, power_low, cadence_low, power_high, cadence_high, duration_off, cadence_off, repeat, textevents) {
	var workout = [];

	if (typeof repeat === 'undefined' || repeat === null || repeat === 0 || repeat === '') repeat = 4;
	var interval = Math.round(duration/repeat)/2;
	
 	var power_progression = power_low;
	if (power_high !== 'undefined' || power_high !== null) {
		power_progression = power_high;
	}

 	var cadence_progression	= cadence_low;
	if (cadence_high !== 'undefined' || cadence_high !== null) {
		cadence_progression = cadence_high;
	}

	var textevent_intro = textevents.slice(0,2);
	for (var r=0;r<repeat;r++) {
		// Phase 1
		workout.push(SteadyState(interval,power,cadence,null,textevent_intro));
		// Phase 2
		if(repeat > 0) {
			workout.push(SteadyState(interval,power_progression,cadence_progression,null,textevents[3]));
		} else {
			workout.push(SteadyState(interval,power_low,cadence_low,null,textevents[3]));
		}
		if (r === 0) textevent_intro = textevents[2];
	}
	
	// Descent
	if (duration_off !== 'undefined' || duration_off !== null) {
		workout.push(SteadyState(duration_off,power,cadence_off,null,textevents[4]));
	}
	return workout;
}
function BigDaddies(repeat, duration, duration_off, power_on, power_off, cadence, cadence_off, textevents) {
	var workout = IntervalsT(repeat, duration, duration_off, power_on, power_off, cadence, cadence_off, textevents);
	return workout;
}

/* TODO:
- Support new predefined Types
	DONE: ProgressiveWarmup:	SteadyState Warmup Block
	DONE: SeatedRoller:		SteadyState Roller block

	DONE: StandingRoller:		SteadyState Roller block

	DONE: PaceLine:			SteadyState Pace Line block

	DONE: ClimbingPaceLine:	SteadyState Pace Line block

	DONE: Rest: 			SteadyState Rest block
	DONE: ActiveRest: 		SteadyState Active Rest block

	DONE: BigDaddy:			SteadyState Max Effort block

	Intro: 				TextEvent(s) of initial block instruction prompt(s).
						- 100char max line length
						- ';' delimited

	MotivationFull: 	TextEvent(s) of motivational prompts for full block duration.
						- 100char max line length
						- ';' delimited
						- Defaults
							"XXX Seconds to go!"
							"Doing Great!"
							"Keep it up!"
							"Nie and Steady"
							"Technique!"

	Motivation30: 		TextEvent(s) of motivational prompts for the last 30s of block.
						- 100char max line length
						- ';' delimited
						- Defaults
							"30 Seconds to go!"
							"You can do it!"
							"Keep Going!"
							"All the way through!"

	Motivation5: 		TextEvent(s) of motivational prompts for the last 30s of block.
						- Default: "5;4;3;2;1";

	Cadence:			TextEvent(s) of cadence changes in a block

*/

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
		{ 'warmup': 	[{
			'duration':			'',
			'power_low':		'',
			'power_high':		'',
			'cadence':			'',
			'cadence_resting':	'',
			'textevent':		[
				{ 'offset': '', 'message': '' }
			]
		}]},
		{ 'steadystate': [{
			'duration':			'',
			'power':			'',
			'cadence':			'',
			'cadence_resting':	'',
			'textevent':		[
				{ 'offset': '', 'message': '' }
			]
		}]},
		{ 'intervals': 			[{
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
		{ramp: [{
			'duration':			'',
			'power_low':		'',
			'power_high':		'',
			'cadence':			'',
			'cadence_resting':	'',
			'textevent': [
				{ 'offset': '', 'message': '' }
			]
		}]},
		{freeride: [{
			'duration':		'',
			'flatroad': 	1,
			'textevent': [
				{ 'offset': '', 'message': '' }
			]
		}]}
	]
}
*/