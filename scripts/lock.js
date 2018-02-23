/*
 * @author Vasilios Mavroudis, 2014
 */

/*Locking stuff*/
var arr_locked_calls = [];

/*TO BE REPLACED*/
var inspected_call = new f_called(TAG_INSPECTED_CALL); //var temp_entry = new f_called(log_name, log_input, log_output, log_is_native);
//function replacement_func = TAG_REPLACEMENT_FUNCTION;
TAG_LOCKED_CALLS



/*TO BE REPLACED*/

function f_called(id, name, input, output, caller, native_func) {
    'thisfunctionisprotected';
	this.id = id;
    this.name = name;
    this.input = input;
    this.output = output;
	this.caller = caller;
    this.native_func = native_func;
}


function randomizer(insp_call){

	var result;
	if (insp_call.name === "random"){ new_random(insp_call);}
	else if (insp_call.name === "getDate"){ new_getDate(insp_call);}
	else if (insp_call.name === "getHours"){ new_getHours(insp_call);}
	else if (insp_call.name === "getMonth"){ new_getMonth(insp_call);}
	else if (insp_call.name === "getSeconds"){ new_getSeconds(insp_call);}
	
	
	function new_random(insp_call){
		do{
			result = Math.random();
		}while (Math.abs(result - parseFloat(insp_call.output))<0.5);
	}
	
	function new_getDate(insp_call){
		var num = 30;
		do{
			result = Math.round(Math.random()*num + 1);
		}while (Math.abs(result - parseFloat(insp_call.output))<((num+1)/2));
	}
	
	function new_getHours(insp_call){
		var num = 23;
		do{
			result = Math.round(Math.random()*num + 1);
		}while (Math.abs(result - parseFloat(insp_call.output))<((num+1)/2));
		//alert(result + " " + insp_call.output);
	}

	function new_getMonth(insp_call){
		var num = 11;
		do{
			result = Math.round(Math.random()*num + 1);
		}while (Math.abs(result - parseFloat(insp_call.output))<((num+1)/2));
	}

	function new_getSeconds(insp_call){
		var num = 58;
		do{
			result = Math.round(Math.random()*num + 1);
		}while (Math.abs(result - parseFloat(insp_call.output))<((num+1)/2));
	}
	//console.log(result);
	//console.log(parseFloat(insp_call.output));
	console.log(parseFloat(result).toFixed(2) - parseFloat(insp_call.output).toFixed(2));
	return result;
	
}


/*Objects*/
var functionLogger = {};
window.allresults = '';
window.calls_counter = 1;

var native_called = [];
var custom_called = [];


/*Filters*/
var arr_ignore_functions = ["XPC", "Object", "constructor", "f_called", "is_protected", "debugout", "sampleout", "valueOf", "prototype", "Function", "__defineGetter__", "__defineSetter__", "__lookupGetter__", "__lookupSetter__", "contained", "getOwnPropertyNames", "debugout", "displayLog", "HideLog", "downloadLog", "execute", "getLoggableFunction", "addLoggingToNamespace"];
var arr_ignore_objects = ["native_called", "constructor", "custom_called", "WrappedNative ", "XPC", "console", "debugout", "sampleout", "str_protected", "nodes_arr", "temp_arr", "functionLogger", "allresults", "arr_ignore", "arr_ignore_objects", "arr_ignore_functions"];


var str_protected = 'thisfunctionisprotected';
var str_native = 'thisfunctionisnative';

/*Options*/
functionLogger.log = false; //Set this to false to disable logging 


/**
 * Gets a function that when called will log information about itself if logging is turned on.
 *
 * @param func The function to add logging to.
 * @param name The name of the function.
 *
 * @return A function that will perform logging and then call the function.
 */
functionLogger.getLoggableFunction = function(func, name) {
    'thisfunctionisprotected';

	//#$#call_id#name#input#output#caller#$#
	
    //details to log
    var log_name = name; //logging call
    var log_input = null;
    var log_output = null;
    var log_is_native = null;

    var is_native;
    if (func.toSource().indexOf('native') > -1) {
        is_native = true;
    } else {
		//console.log('This is not native: ' +name);
        is_native = false;
		
    }

    log_is_native = is_native; //logging call

    try {
        if (is_native) {
	
            return function nati() {
                'thisfunctionisprotected';
                'thisfucntionisnative';
            
				if (functionLogger.log === true) {//we are locking now!
					functionLogger.log = false;
					
					if (inspected_call.id == calls_counter){ //Is the one we inspect
						result = randomizer(inspected_call);	
					}else{ //if not
						var is_nd_call = false;
						for (var i=0; i<arr_locked_calls.length; i++){ //check if it is non-deterministic call
							if (arr_locked_calls[i].id == calls_counter){ //== since it is str == int
								//console.log(arr_locked_calls[i].id);
								temp_obj = arr_locked_calls[i];
								is_nd_call = true;
							}
						}
						
						if(is_nd_call === true){//if "randomness" source
							result = temp_obj.output;
						}else{//else treat as normal function
							result = func.apply(this, arguments);
						}
					}
					calls_counter += 1;
					functionLogger.log = true; 
				}else{//dont lock yet
					result = func.apply(this, arguments);
				}
				return result;
            };
        } else {
            return function cust() {
                'thisfunctionisprotected';

				if (functionLogger.log === true) {//we are locking now!
					functionLogger.log = false;
					
					if (inspected_call.id === calls_counter){

						result = func.apply(this, arguments);
					}else{
						var is_nd_call = false;
						for (var i=0; i<arr_locked_calls.length; i++){ //check if it is non-det.
							//console.log(arr_locked_calls[i].id);
							if (arr_locked_calls[i].id == calls_counter){ //== since it is str == int
								console.log(arr_locked_calls[i].id);
								temp_obj = arr_locked_calls[i];
								is_nd_call = true;
							}
						}
						
						if(is_nd_call === true){//if "randomness" source
							
							result = temp_obj.output;
						}else{//else treat as normal function
							result = func.apply(this, arguments);
						}
					}
					calls_counter += 1;
					functionLogger.log = true; 
				}else{//dont lock yet
					result = func.apply(this, arguments);
				}
				return result;
            };
        }
    } catch (err) {
        //console.log("ERROR in function: " + name + " The error is: " + err);
    }
};

functionLogger.addLoggingToNamespace = function(namesp) {
    'thisfunctionisprotected';
    var nodes_arr = [namesp];
    var temp_arr = [];
    var namespaceObject;


counter = 0;
    while (nodes_arr.length > 0) { //while nodes_arr is not empty
	
	//counter += 1; if (counter>3){break;}
        //console.log("Length of nodes_arr: " + nodes_arr.length);
        try {
			temp_arr = [];
            temp_arr = nodes_arr.slice(0); //copy of arr
            nodes_arr = []; //nodes arr clean
            //for each element of copy of arr
            for (var i = 0; i < temp_arr.length; i++) { //outer loop

                try {

                    namespaceObject = temp_arr[i];
                  //   console.log("(" + i + "): " + namespaceObject);
                   // console.log('len? ' + temp_arr.length);
                   // console.log("Type (" + i + "): " + typeof namespaceObject);  
                   // console.log("Parent (" + i + "): " + namespaceObject);                           
                   //  console.log('------------------');

                    var properties = [];
                    var prop_length = 0;

                    try {
                        properties = Object.getOwnPropertyNames(namespaceObject);
                        prop_length = properties.length;
                    } catch (err) {
                        //console.log('Not an object: ' + namespaceObject);
                    }

                    for (var j = 0; j < prop_length; j++) { //inner loop

						
                        try {
                            if (is_good(namespaceObject, properties[j]) === true) {
                                /*OBJECT*/
                                try {
                                    //console.log(namespaceObject[properties[j]].toSource());

                                    var is_object = false;
                                    //console.log('namespace: ' + namespaceObject);
                                    //console.log('property: ' + properties[j]);
                                    //console.log('all: ' + namespaceObject[properties[j]]);

                                    if (is_contained(properties[j].toString(), arr_ignore_objects) === false) {
									
									//if (namespaceObject.toString().indexOf('Element')>-1)alert(" " + namespaceObject[properties[j]]['prototype'].toSource());
									
									//(namespaceObject[properties[j]].toSource().indexOf('native') > -1))
	
										if ((typeof namespaceObject[properties[j]] === 'object') 
											|| (namespaceObject[properties[j]].hasOwnProperty('caller')===false)) {
                                            is_object = true;
											
										}else if (namespaceObject[properties[j]].hasOwnProperty('prototype')){
											if (namespaceObject[properties[j]]['prototype'].toSource() != '({})'){
												is_object = true;
											}
										}
											
										if (is_object === true){
											if (!is_protected(namespaceObject[properties[j]])) {
												//console.log("--------Object (" + j + "): " + properties[j] + " (" + namespaceObject + ")");
												//console.log('I am pushing: --/>' + namespaceObject[properties[j]] + ' --/> ' + properties[j]);
												nodes_arr.push(namespaceObject[properties[j]]);
											}
										}
									}
                       
                                } catch (err) {
                                    //console.log("-----------------------\nERROR in inner loop (part 1):\n" + 'namespace: ' + namespaceObject + '\nproperty: ' + properties[j] + "\nThe error is: " + err + "\n-----------------------");
                                }


                                /*FUNCTION*/
                                try {
									//console.log('prop: ' + properties[j] + ' namesp: ' + namespaceObject);
                                    if (is_contained(properties[j], arr_ignore_functions) === false) {
                                        if (typeof namespaceObject[properties[j]] === 'function') {
                                            if ((is_protected(namespaceObject[properties[j]]) === false) && (is_object === false)) {
                                               namespaceObject[properties[j]] = functionLogger.getLoggableFunction(namespaceObject[properties[j]], properties[j]);
                                            }
                                        }
                                    }
                                } catch (err) {
                                    //console.log("-----------------------\nERROR in inner loop (part 2):\n" + 'namespace: ' + namespaceObject + '\nproperty: ' + properties[j] + "\nThe error is: " + err + "\n-----------------------");
                                }
                            }

                        } catch (err_inner) {
                            //console.log("ERROR in inner loop (whole): " + namespaceObject + " The error is: " + err_inner + "");
                        }
                    }

                    properties = [];

                } catch (err) {
                    //console.log("ERROR in outer loop: " + namespaceObject + " The error is: " + err + "");
                }
            }
        } catch (err) {
            //console.log("ERROR (Meltdown) in: " + namespaceObject + " The error is: " + err + "");
        }
		
    }
};


function is_good(str_namespace, str_prop) {
    'thisfunctionisprotected';
	//alert(functionLogger.log);
	functionLogger.log = false;
    var response = false;

    if (is_buggy(str_namespace, str_prop) === false) {
        if (str_namespace != null && str_namespace[str_prop] != null && str_namespace[str_prop] != str_namespace)

            if ((typeof str_namespace[str_prop]).toString() != 'number' && (typeof str_namespace[str_prop]).toString() != 'boolean' && (typeof str_namespace[str_prop]).toString() != 'string') {
                response = true;
            };
    };
	functionLogger.log = false;
    return response;
}

function is_buggy(str_namespace, str_prop) {
    'thisfunctionisprotected';

    /*If you don't understand what this function is doing
     * try: typeof MessagePort.prototype.onmessage()
     * in your browser.
     */
	var response;
    try {
        typeof str_namespace[str_prop];
        //console.log("Object " + str + ' Type: ' + typeof str);
        response = false; //we get here only if it doesn't crash.
    } catch (err) {
        //console.log("Buggy! " + err + ' namespace: ' + str_namespace + ' value: ' + str_prop);
        response = true;
    }

	 return response;
}

function is_protected(str) {
    'thisfunctionisprotected';
    var response = false;

    //console.log('Protected: ' + str);

    try {
        //alert(str);
        if (str.toString().toLowerCase().indexOf(str_protected.toLowerCase()) > -1) {
            response = true;
            //console.log('This is protected: ' + str);
        }
    } catch (err) {
        //console.log("ERROR in is_protected " + err + ' To: ' + str);
        response = false;
    }
	  return response;
}

function is_contained(str, arr_to_ignore) {
    'thisfunctionisprotected';
	
	
    var response = false;
    try {

        //  console.log('Contained: ' + str);

        if (str === "") {
            response = false;
        }else{
			for (temp_str in arr_to_ignore) {
				if (str.toLowerCase().indexOf(arr_to_ignore[temp_str].toLowerCase()) > -1 || arr_to_ignore[temp_str].toLowerCase().indexOf(str.toLowerCase()) > -1) {
					response = true;
					//console.log('Contained: ' + str);
				}
			}
		}
        //console.log('-----' + response);

    } catch (err) {
        //console.log("WTF! ERROR in is_contained " + err);
        response = true;
    }
	
	
	return response;
}

function Add_hooks() {
    'thisfunctionisprotected';
    //console.log('Started placing hooks...');
    functionLogger.addLoggingToNamespace(window);
    //console.log('Done placing hooks...');
}


functionLogger.log = false; 
Add_hooks(); //Place the hooks
functionLogger.log = true; //Just to make sure we are capturing the calls
