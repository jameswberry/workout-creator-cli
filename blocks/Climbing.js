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
	Context.TextEvents.addEvent(0, 'Climbing', Context.Phase, Context.Classnum, Context.Blocknum, true);
	Context.TextEvents.addEvent(0, 'Base', Context.Phase, Context.Classnum, Context.Blocknum, true);
	Context.TextEvents.addEvent(1, 'Approach', Context.Phase, Context.Classnum, Context.Blocknum);
	Context.TextEvents.addEvent(2, 'Climbing out of the saddle', Context.Phase, Context.Classnum, Context.Blocknum);
	Context.TextEvents.addEvent(3, 'Descent', Context.Phase, Context.Classnum, Context.Blocknum);

	// Render Block
	return this.render(	Context.Line.Duration,
						Context.Line.Power,
						Context.Line.Cadence,
						Context.Line.PowerLow,
						Context.Line.CadenceLow,
						Context.Line.PowerHigh,
						Context.Line.CadenceHigh,
						Context.Line.DurationOff,
						Context.Line.CadenceOff,
						Context.Line.Repeat);
}

/**
 *
 */
Block.prototype.render = function(duration, power, cadence, power_low, cadence_low, power_high, cadence_high, duration_off, cadence_off, repeat) {
	var Context = getParams();

	// Dependent Blocks.
	var SteadyState = Context.Blocks.steadystate;
	SteadyState.init(Context);

	var workout = [];

	if (typeof repeat === 'undefined' || repeat === null || repeat === 0 || repeat === '') repeat = 4;

	var interval = Math.round(duration/repeat)/2;

 	var power_progression = power_low;
	if (typeof power_high !== 'undefined' || power_high !== null) {
		power_progression = power_high;
	}

 	var cadence_progression	= cadence_low;
	if (typeof cadence_high !== 'undefined' || cadence_high !== null) {
		cadence_progression = cadence_high;
	}

	var index = 0;
	for (var r=0;r<repeat;r++) {
		// Phase 1
		workout.push(SteadyState.render(interval,power,cadence,null,index));

		// Phase 2
		if(repeat > 0) {
			workout.push(SteadyState.render(interval,power_progression,cadence_progression,null,2));
		} else {
			workout.push(SteadyState.render(interval,power_low,cadence_low,null,3));
		}
		if (r == 0) index = 1;
	}

	// Descent
	if (typeof duration_off !== 'undefined' || duration_off !== null) {
		workout.push(SteadyState.render(duration_off,power,cadence_off,null,4));
	}
	
	return workout;
}

module.exports = Block;
