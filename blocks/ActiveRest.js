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
	Context.TextEvents.addEvent(0, 'Active Rest', Context.Phase, Context.Classnum, Context.Blocknum, true);

	// Render Block
	return this.render(	Context.Line.Duration,
						Context.Line.Power,
						Context.Line.Cadence);
}

/**
 *
 */
Block.prototype.render = function(duration, power, cadence) {
	var Context = getParams();

	// Dependent Blocks.
	var SteadyState = Context.Blocks.steadystate;
	SteadyState.init(Context);
	
	// Render Block
	var workout = SteadyState.render(duration,
									 power,
									 cadence,
									 null,
									 0);
	return workout;
}

module.exports = Block;
