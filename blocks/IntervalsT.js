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
	Context.TextEvents.addEvent(0, 'Interval', Context.Phase, Context.Classnum, Context.Blocknum, true);
	
	// Render Block
	return this.render(	Context.Line.Repeat,
						Context.Line.Duration,
						Context.Line.DurationOff,
						Context.Line.Power,
						Context.Line.PowerOff,
						Context.Line.Cadence,
						Context.Line.CadenceOff,
						0);
}

/**
 *
 */
Block.prototype.render = function(repeat, duration, duration_off, power_on, power_off, cadence, cadence_off, index) {
	var Context = getParams();

	// Dependent Blocks.
	var WorkoutBlock = require('../libs/WorkoutBlock');

	// Render Block
	var workout = WorkoutBlock('intervalst',
			 					duration,
								duration_off,
								power_on,
								power_off,
								null,
								cadence,
								cadence_off,
								repeat,
								null,
								Context.TextEvents.getTextEvents(index, Context.Phase, Context.Classnum, Context.Blocknum, duration));
	return workout;
}

module.exports = Block;
