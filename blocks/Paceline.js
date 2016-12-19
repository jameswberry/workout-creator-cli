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
	Context.TextEvents.addEvent(0, 'Paceline', Context.Phase, Context.Classnum, Context.Blocknum, true);
	Context.TextEvents.addEvent(0, 'Base', Context.Phase, Context.Classnum, Context.Blocknum, true);
	Context.TextEvents.addEvent(1, 'Base', Context.Phase, Context.Classnum, Context.Blocknum);
	Context.TextEvents.addEvent(2, 'Front - Pulling', Context.Phase, Context.Classnum, Context.Blocknum);
	Context.TextEvents.addEvent(3, 'Drafting', Context.Phase, Context.Classnum, Context.Blocknum);
	Context.TextEvents.addEvent(4, 'Front - Climbing', Context.Phase, Context.Classnum, Context.Blocknum);

	// Render Block
	return this.render(	Context.Line.Duration,
						Context.Line.Power,
						Context.Line.Cadence,
						Context.Line.PowerLow,
						Context.Line.CadenceLow,
						Context.Line.PowerHigh,
						Context.Line.CadenceHigh,
						Context.Line.PowerOff,
						Context.Line.CadenceOff,
						Context.Line.Repeat);
}

/**
 *
 */
Block.prototype.render = function(duration, power, cadence, power_low, cadence_low, power_high, cadence_high, power_off, cadence_off, repeat) {
	var Context = getParams();

	// Dependent Blocks.
	var SteadyState = Context.Blocks.steadystate;
	SteadyState.init(Context);

	var workout = [];

	if (typeof repeat === 'undefined' || repeat === null || repeat === 0 || repeat === '') repeat = 1;
	
	var interval = Math.round(duration/repeat);

	var index = 0;
	for (var r=0;r<repeat;r++) {
		// Base
		workout.push(SteadyState.render(interval/4,power,cadence,null,index));
		// Approach
		workout.push(SteadyState.render(interval/4,power_low,cadence_low,null,2));
		// Climb
		workout.push(SteadyState.render(interval/4,power_high,cadence_high,null,3));
		// Descent
		workout.push(SteadyState.render(interval/4,power_off,cadence_off,null,4));
		if (r == 0) index = 1;
	}
	
	return workout;
}

module.exports = Block;
