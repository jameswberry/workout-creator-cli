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
	//Context.TextEvents.setMotivationOn('Motivation5', Context.Phase, Context.Classnum, Context.Blocknum, 0);
	
	// Add Text Events
	//Context.TextEvents.addEvent(0, 'Template Block', Context.Phase, Context.Classnum, Context.Blocknum, true);

	// Render Block
	return this.render(	'type',
		 				Context.Duration,
						Context.Duration_Off,
						Context.Power,
						Context.Power_Off,
						Context.Power_High,
						Context.Cadence,
						Context.Cadence_Off,
						Context.Repeat,
						Context.Flatroad,
						0);
}

/**
 *
 */
Block.prototype.render = function(duration, duration_off, power, power_off, power_high, cadence, cadence_off, repeat, flatroad, index) {
	var Context = getParams();

	// Dependent Blocks.
	var WorkoutBlock = require('../libs/WorkoutBlock');
	
	// Render Block
	var workout = WorkoutBlock.render('type',
		 					 	duration,
								duration_off,
								power,
								power_off,
								power_high,
								cadence,
								cadence_off,
								repeat,
								flatroad,
								Context.TextEvents.getTextEvents(index, Context.Phase, Context.Classnum, Context.Blocknum, duration));
	return workout;
}

module.exports = Block;
