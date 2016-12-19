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
	//Context.TextEvents.setMotivationOn('Motivation5', Context.Phase, Context.Classnum, Context.Blocknum, 0);
	
	// Add Text Events
	Context.TextEvents.addEvent(0, 'Progressive Warmup', Context.Phase, Context.Classnum, Context.Blocknum, true);

	// Render Block
	return this.render(	Context.Line.Duration,
						Context.Line.PowerLow,
						Context.Line.PowerHigh,
						Context.Line.CadenceLow,
						Context.Line.CadenceHigh,
						Context.Line.Repeat);
}

/**
 *
 */
Block.prototype.render = function(duration, power_low, power_high, cadence_low, cadence_high, repeat) {
	var Context = getParams();

	// Dependent Blocks.
	var Progression	= Context.Blocks.progression;
	Progression.init(Context);
	
	// Render Block
	var workout = Progression.render(duration,
									 power_low,
									 power_high,
									 cadence_low,
									 cadence_high,
									 repeat);
	return workout;
}

module.exports = Block;
