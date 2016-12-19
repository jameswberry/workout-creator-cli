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
	Context.TextEvents.addEvent(0, 'Warm Up', Context.Phase, Context.Classnum, Context.Blocknum, true);
	
	// Render Block
	return this.render(	Context.Line.Duration,
						Context.Line.Power,
						Context.Line.PowerHigh,
						Context.Line.Cadence,
						0);
}

/**
 *
 */
Block.prototype.render = function(duration, power_low, power_high, cadence, index) {
	var Context = getParams();

	// Dependent Blocks.
	var WorkoutBlock = require('../libs/WorkoutBlock');
	
	// Render Block
	var workout = WorkoutBlock('warmup',
			 					duration,
								null,
								power_low,
								null,
								power_high,
								cadence,
								null,
								null,
								null,
								Context.TextEvents.getTextEvents(index, Context.Phase, Context.Classnum, Context.Blocknum, duration));
	return workout;
}

module.exports = Block;
