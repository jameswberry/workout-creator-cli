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
	
	if (typeof Context.Phases[Context.id].tag	=== 'undefined') {
		Context.Phases[Context.id].tags = true;
		Context.Phases[Context.id].tag	= [];
	}
	if (Context.Line.Value.toLowerCase() == 'recovery' ||
		Context.Line.Value.toLowerCase() == 'intervals' ||
		Context.Line.Value.toLowerCase() == 'ftp' ||
		Context.Line.Value.toLowerCase() == 'tt') {
			Context.Line.Value = Context.Line.Value.toUpperCase();
	}
	Context.Phases[Context.id].tag.push({ 'name': Context.Line.Value });
	Context.TextEvents.deleteBlock(Context.Phase, Context.Classnum, Context.Blocknum);
	return false;	//return this.render(duration, duration_off, power, power_off, power_high, cadence, cadence_off, repeat, flatroad, textevents);
}

module.exports = Block;
