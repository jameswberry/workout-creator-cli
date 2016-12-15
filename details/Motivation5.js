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
	
	if (Context.Line.Value === true) {
		Context.TextEvents.setMotivationAllOn('Motivation5', Context.Phase, Context.Classnum);
	}
	Context.TextEvents.deleteBlock(Context.Phase, Context.Classnum, Context.Blocknum);
	return false;	//return this.render(duration, duration_off, power, power_off, power_high, cadence, cadence_off, repeat, flatroad, textevents);
}

/**
 *
 */
Block.prototype.render = function(duration, duration_off, power, power_off, power_high, cadence, cadence_off, repeat, flatroad, textevents) {
	var Context = getParams();

	// Dependent Blocks and Context Passing
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
										textevents);
	return workout;
}

module.exports = Block;