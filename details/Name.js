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
	
	if (Context.Line.Class<10) {
		classname = '0'+Context.Line.Class;
	} else { 
		classname = Context.Line.Class;
	}
	Context.Phases[Context.id].name = Context.Line.Phase+' #'+classname+': '+Context.Line.Value;
	Context.TextEvents.deleteBlock(Context.Phase, Context.Classnum, Context.Blocknum);
	return false;	//return this.render(duration, duration_off, power, power_off, power_high, cadence, cadence_off, repeat, flatroad, textevents);
}

module.exports = Block;
