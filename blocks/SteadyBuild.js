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
	Context = getParams();
	
	// Add Block Options
		// N/A
	
	// Add Text Events
	Context.TextEvents.addEvent(0, 'Steady Build', Context.Phase, Context.Classnum, Context.Blocknum, true);

	// Render Block
	return this.render(	Context.Line.Duration,
						Context.Line.DurationOff,
						Context.Line.PowerLow,
						Context.Line.PowerHigh,
						Context.Line.CadenceLow,
						Context.Line.CadenceHigh);
}

/**
 *
 */
Block.prototype.render = function(duration, duration_off, power_low, power_high, cadence_low, cadence_high) {
	Context = getParams();

	// Dependent Blocks and Context Passing
	var Progression	= Context.Blocks['progression'];
	Progression.init(Context);

	var SteadyState	= Context.Blocks['steadystate'];
	SteadyState.init(Context);
	
	// Render Block
	var workout = Progression.render(	Context.Line.Duration,
		 								Context.Line.Power_Low,
			 							Context.Line.Power_High,
										Context.Line.Cadence_Low,
										Context.Line.Cadence_High,
										Context.Line.Duration/60,
										1);

	workout.splice(0,0,SteadyState.render(	Context.Line.Duration_Off,
											Context.Line.Power_Low,
											Context.Line.Cadence_Low,
											null,
											0));
	return workout;
}

module.exports = Block;
