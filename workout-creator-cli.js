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

var WorkoutCreator = require('./libs/WorkoutCreator.js');
WorkoutProcessor = new WorkoutCreator();


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

		var views = WorkoutProcessor.process(result);
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