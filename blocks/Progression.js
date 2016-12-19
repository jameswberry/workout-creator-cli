/**
 * params - Object of the form { Phases: {}, TextEvents: {} }
 */
var 	 Params				= {};
function Block()			{}
function setParams(params)	{ return Params = params; }
function getParams()		{ return Params; }


/**
 *
 */
Block.prototype.init = function (params)	{ setParams(params); }

/**
 *
 */
Block.prototype.process = function () {
	var Context = getParams();
	
	// Add Block Options
		// N/A

	// Add Text Events
	TextEvents.addEvent(0, 'Progressive Build', Context.Phase, Context.Classnum, Context.Blocknum, true);
	
	// Render Block
	return this.render(	Context.Line.Duration,
						Context.Line.PowerLow,
						Context.Line.PowerHigh,
						Context.Line.CadenceLow,
						Context.Line.CadenceHigh,
						Context.Line.Repeat,
						0);
}

/**
 *
 */
Block.prototype.render = function(duration, powerA, powerB, cadenceA, cadenceB, repeat, index) {
	var Context = getParams();

	// Dependent Blocks and Context Passing
	var SteadyState	= Context.Blocks.steadystate;
	SteadyState.init(Context);
	
	// Render Block
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
		workout.push(SteadyState.render(interval,
										power+(power_increment*b),
										cadence+(cadence_increment*b),
										null,
										index));
		if (b == 0) index = -1; // Kill subsequent TextEvents
	}
	return workout;
}

module.exports = Block;
