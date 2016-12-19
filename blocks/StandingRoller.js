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
	Context.TextEvents.addEvent(0, 'Standing Roller', Context.Phase, Context.Classnum, Context.Blocknum, true);
	Context.TextEvents.addEvent(0, 'Base', Context.Phase, Context.Classnum, Context.Blocknum, true);
	Context.TextEvents.addEvent(1, 'Approach', Context.Phase, Context.Classnum, Context.Blocknum);
	Context.TextEvents.addEvent(2, 'Climbing out of the saddle', Context.Phase, Context.Classnum, Context.Blocknum);
	Context.TextEvents.addEvent(3, 'Descent', Context.Phase, Context.Classnum, Context.Blocknum);

	// Render Block
	return this.render(	Context.Line.Duration,
						Context.Line.Power,
						Context.Line.CadenceOff,
						Context.Line.Cadence,
						Context.Line.CadenceLow,
						Context.Line.CadenceHigh);
}

/**
 *
 */
Block.prototype.render = function(duration, power, cadence_off, cadence, cadence_low, cadence_high) {
	var Context = getParams();

	// Dependent Blocks.
	var SteadyState = Context.Blocks.steadystate;
	SteadyState.init(Context);

	var workout = [];
	var interval = Math.round(duration/4);

	// Base
	workout.push(SteadyState.render(interval,power,cadence,null,0));
	// Approach
	workout.push(SteadyState.render(interval,power,cadence_low,null,1));
	// Climb
	workout.push(SteadyState.render(interval,power,cadence_high,null,2));
	// Descent
	workout.push(SteadyState.render(interval,power,cadence_off,null,3));
	
	return workout;
}

module.exports = Block;
