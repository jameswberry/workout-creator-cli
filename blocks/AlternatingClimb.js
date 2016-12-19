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
	Context.TextEvents.addEvent(0, 'Alternate Seated Climbing with Standing', Context.Phase, Context.Classnum, Context.Blocknum, true);
	Context.TextEvents.addEvent(0, 'Climb (Seated)', Context.Phase, Context.Classnum, Context.Blocknum, true);
	Context.TextEvents.addEvent(1, 'Climb (Seated)', Context.Phase, Context.Classnum, Context.Blocknum);
	Context.TextEvents.addEvent(2, 'Stand', Context.Phase, Context.Classnum, Context.Blocknum);
	Context.TextEvents.addEvent(3, 'Descent!', Context.Phase, Context.Classnum, Context.Blocknum);

	console.log(Context.Line);

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
	var Climbing = Context.Blocks.climbing;
	Climbing.init(Context);
		
	// Render Block
	var workout = Climbing.render(	duration,
		 							power_low,
									cadence_low,
									power_low,
									cadence_low,
									power_high,
									cadence_high,
									duration_off,
									cadence_off,
									repeat);
	return workout;
}

module.exports = Block;
