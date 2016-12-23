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
	Context.TextEvents.addEvent(0, 'BIG DADDIES!', Context.Phase, Context.Classnum, Context.Blocknum, true);
	Context.TextEvents.addEvent(0, 'STAY SEATED', Context.Phase, Context.Classnum, Context.Blocknum, true);
	Context.TextEvents.addEvent(0, 'No bouncing', Context.Phase, Context.Classnum, Context.Blocknum, true);
	Context.TextEvents.addEvent(0, 'Max RPM from standing start', Context.Phase, Context.Classnum, Context.Blocknum, true);
	Context.TextEvents.addEvent(0, 'Complete recovery Rest', Context.Phase, Context.Classnum, Context.Blocknum, true);

	// Render Block
	return this.render(	Context.Line.Repeat,
						Context.Line.Duration,
						Context.Line.DurationOff,
						Context.Line.Power,
						Context.Line.PowerOff,
						Context.Line.Cadence,
						Context.Line.CadenceOff);
}

const cEFFORT_DURATION = 20;

/**
 *
 */
Block.prototype.render = function(repeat, duration, duration_off, power_on, power_off, cadence, cadence_off) {
	var Context = getParams();

	if (typeof duration_off === 'undefined' || duration_off === null) {
		duration_off = ((duration*60)/repeat)-cEFFORT_DURATION;
		duration = cEFFORT_DURATION;

	// Dependent Blocks.
	var IntervalsT = Context.Blocks.intervalst;
	IntervalsT.init(Context);
	
	// Render Block
	var workout = IntervalsT.render(repeat,
									duration,
									duration_off,
									power_on,
									power_off,
									cadence,
									cadence_off,
									0);
	return workout;
}

module.exports = Block;
