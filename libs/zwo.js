function ZWO() {
	this.phases = {};
	var workout, workouts;
	var textevents;
	this.workouts	= [];
	this.workout	= {};
		workout[type] = [{ 'duration': duration }];
	if (duration_off !== null)	workout[type][0]['duration_off']	= duration_off;	
	if (power !== null)			workout[type][0]['power']			= power;	
	if (power_off !== null)		workout[type][0]['power_off']		= power_off;	
	if (power_high !== null)	workout[type][0]['power_high']		= power_high;	
	if (cadence !== null)		workout[type][0]['cadence']			= cadence;	
	if (cadence_off !== null)	workout[type][0]['cadence_off']		= cadence_off;	
	if (repeat !== null)		workout[type][0]['repeat']			= repeat;	
	if (flatroad !== null)		workout[type][0]['flatroad']		= flatroad;	
	if (textevents !== null)	workout[type][0]['textevent']		= textevents;	
}
var private_var = null;

ZWO.prototype.processWorkouts = function(csv) {
	var phases = this.phase;
	var phase;
	var class_num;
	var class_name;
	var type = this.current_type;

	return true;
}

ZWO.prototype.clone = function() {
  var obj = Object.create(this);
  var newZWO = new ZWO();
  for (var key in obj) {
    newZWO[key] = obj[key];
  }
  return newZWO;
};

module.exports = ZWO;
