
/*Objects*/
var functionLogger = {};
window.allresults = '';
window.linecount =0;

/*Function called object*/
function f_called(name, input, output, is_native) {
    'thisfunctionisprotected';
    this.name = name;
    this.input = input;
    this.output = output;
    this.is_native = is_native;
}
var native_called = [];
var custom_called = [];


/*Filters*/
var arr_ignore_functions = ["XPC", "Object", "constructor", "f_called", "is_protected", "debugout", "sampleout", "valueOf", "prototype", "Function", "__defineGetter__", "__defineSetter__", "__lookupGetter__", "__lookupSetter__", "contained", "getOwnPropertyNames", "debugout", "displayLog", "HideLog", "downloadLog", "execute", "getLoggableFunction", "addLoggingToNamespace"];
var arr_ignore_objects = ["native_called", "constructor", "custom_called", "WrappedNative ", "XPC", "console", "debugout", "sampleout", "str_protected", "nodes_arr", "temp_arr", "functionLogger", "allresults", "arr_ignore", "arr_ignore_objects", "arr_ignore_functions"];

var str_protected = 'thisfunctionisprotected';
var str_native = 'thisfunctionisnative';

var op = 0;

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
				
                //console.log('func: ' + func);
                //console.log('name: ' + name);
                result = func.apply(this, arguments);
                if (functionLogger.log === true) {
					//alert('d');
					functionLogger.log = false; 
					//console.log ('------native-----');
					//console.log('name: ' + name);
					//console.log(nati.caller);
					var temp_caller = "Null";
					try{
						temp_caller = nati.caller.name;
					}catch(abc){
						//alert('no caller');
					}
					
				
					linecount += 1;
                    var logText = '<call>' + linecount +'#' + name + '#';

                    for (var i = 0; i < arguments.length; i++) {
                        if (i > 0) {
                            logText += ',';
                            log_input += ',';
                        }
                        logText += arguments[i];
                        log_input += arguments[i]; //logging call
                    }
                    logText += '#' + result + '#' + temp_caller + '#True' + '</call>\r\n';
                    allresults += result;
                    log_output = result; //logging call


                    console.info(logText);
										
                   // var temp_entry = new f_called(log_name, log_input, log_output, log_is_native); // make a logging entry
                   // native_called[native_called.length] = temp_entry; //push is problematic here...
					functionLogger.log = true; 
                }
                return result;
            };

        } else {
            return function cust() {
				
                'thisfunctionisprotected';

                result = func.apply(this, arguments);
                if (functionLogger.log === true) {
					//alert('d');
					functionLogger.log = false; 
					//console.log ('------native-----');
					//console.log('name: ' + name);
					//console.log(nati.caller);
					var temp_caller = "Null";
					try{
						temp_caller = nati.caller.name;
					}catch(abc){
						//alert('no caller');
					}
					
				
					linecount += 1;
                    var logText = '<call>' + linecount +'#' + name + '#';

                    for (var i = 0; i < arguments.length; i++) {
                        if (i > 0) {
                            logText += ',';
                            log_input += ',';
                        }
                        logText += arguments[i];
                        log_input += arguments[i]; //logging call
                    }
                    logText += '#' + result + '#' + temp_caller + '#True' + '</call>\r\n';
                    allresults += result;
                    log_output = result; //logging call


                    console.info(logText);
										
                   // var temp_entry = new f_called(log_name, log_input, log_output, log_is_native); // make a logging entry
                   // native_called[native_called.length] = temp_entry; //push is problematic here...
					functionLogger.log = true; 
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
functionLogger.log = true; //capturing the calls