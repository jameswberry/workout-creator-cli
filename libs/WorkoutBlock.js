/**
 *
 */
module.exports = function(type, duration, duration_off, power, power_off, power_high, cadence, cadence_off, repeat, flatroad, textevents) {
	var workout			= {};
		workout[type]	= [{ 'duration': duration }];

	if (duration_off !== null)	workout[type][0]['duration_off']	= duration_off;
	if (power !== null)			workout[type][0]['power']			= power;	
	if (power_off !== null)		workout[type][0]['power_off']		= power_off;	
	if (power_high !== null)	workout[type][0]['power_high']		= power_high;	
	if (cadence !== null)		workout[type][0]['cadence']			= cadence;	
	if (cadence_off !== null)	workout[type][0]['cadence_off']		= cadence_off;	
	if (repeat !== null)		workout[type][0]['repeat']			= repeat;	
	if (flatroad !== null)		workout[type][0]['flatroad']		= flatroad;
	workout[type][0]['textevent']									= textevents;
	
	return workout;	
}