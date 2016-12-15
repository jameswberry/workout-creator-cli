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
	Context.TextEvents.setMotivationOn('Motivation5', Context.Phase, Context.Classnum, Context.Blocknum, 0);
	Context.TextEvents.setMotivationOn('Motivation30', Context.Phase, Context.Classnum, Context.Blocknum, 0);
	
	// Add Text Events
	Context.TextEvents.addEvent(0, 'Steady State', Context.Phase, Context.Classnum, Context.Blocknum, true);

	// Render Block
	return this.render(	Context.Line.Duration,
						Context.Line.Power,
						Context.Line.Cadence,
						Context.Line.CadenceOff,
						0);
}

/**
 *
 */
Block.prototype.render = function(duration, power, cadence, cadence_off, index) {
	Context = getParams();

	// Dependent Blocks and Context Passing
	var WorkoutBlock = require('../libs/WorkoutBlock');
	
	// Render Block
	var workout = WorkoutBlock('steadystate',
								duration,
								null,
								power,
								null,
								null,
								cadence,
								cadence_off,
								null,
								null,
								Context.TextEvents.getTextEvents(index, Context.Phase, Context.Classnum, Context.Blocknum, duration));
	return workout;
}

module.exports = Block;
