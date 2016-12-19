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
	Context.TextEvents.addEvent(0, 'Seated Roller', Context.Phase, Context.Classnum, Context.Blocknum, true);
	Context.TextEvents.addEvent(0, 'Mix RPM from smooth seated rollers', Context.Phase, Context.Classnum, Context.Blocknum);
	Context.TextEvents.addEvent(0, 'Tension on chain', Context.Phase, Context.Classnum, Context.Blocknum);
	Context.TextEvents.addEvent(0, 'Smooth transitions from climb to descend', Context.Phase, Context.Classnum, Context.Blocknum);

	// Render Block
	return this.render(	Context.Line.DurationOff,
						Context.Line.PowerOff,
						Context.Line.CadenceOff,
						Context.Line.Duration,
						Context.Line.Power,
						Context.Line.CadenceLow,
						Context.Line.CadenceHigh,
						Context.Line.Repeat);
}

/**
 *
 */
Block.prototype.render = function(duration_off, power_off, cadence_off, duration, power, cadence_low, cadence_high, repeat) {
	var Context = getParams();

	// Dependent Blocks.
	var SteadyState = Context.Blocks.steadystate;
	SteadyState.init(Context);

	var workout = [];

	if (typeof repeat === 'undefined' || repeat === null || repeat === 0 || repeat === '') repeat = 4;

	// Base
	workout.push(SteadyState.render(duration_off,power_off,cadence_off,null,0));

	var interval = Math.round(duration/repeat,0);	
	for (var r=0;r<repeat;r++) {
		// Climb
		workout.push(SteadyState.render(interval/2,power,cadence_low,null,1));
		// Descent
		workout.push(SteadyState.render(interval/2,power,cadence_high,null,2));		
	}
	
	return workout;
}

module.exports = Block;
