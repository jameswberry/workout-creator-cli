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
	Context.TextEvents.addEvent(0, 'Free Ride', Context.Phase, Context.Classnum, Context.Blocknum, true);
	
	// Render Block
	return this.render(	Context.Line.Duration,
						1,
						0);
}

/**
 *
 */
Block.prototype.render = function(duration, flatroad, index) {
	var Context = getParams();

	// Dependent Blocks.
	var WorkoutBlock = require('../libs/WorkoutBlock');

	// Render Block
	var workout = WorkoutBlock('freeride',
			 					duration,
								null,
								null,
								null,
								null,
								null,
								null,
								null,
								flatroad,
								Context.TextEvents.getTextEvents(index, Context.Phase, Context.Classnum, Context.Blocknum, duration));
	return workout;
}

module.exports = Block;
