import time
import csv
import os
import re
import shutil
import urllib2

from selenium import webdriver
from selenium.webdriver import FirefoxProfile
from selenium.common.exceptions import NoSuchElementException
from selenium.webdriver.common.keys import Keys
from selenium.webdriver import DesiredCapabilities


CURRENT_DIR = os.getcwd()
TEMP_FOLDER = CURRENT_DIR + '/tmp/'

ORIGINAL_PAGE = CURRENT_DIR + '/pages/poc_page.html'
GENERATED_PAGE = CURRENT_DIR + '/tmp/generated_page.html'
LOCKING_SCRIPT_TEMPLATE = CURRENT_DIR + '/scripts/lock.js'
LOCKING_SCRIPT_GENERATED = CURRENT_DIR + '/tmp/lock.js'

#Includes for the generated pages
INC_LOGGING_SCRIPT = 'file://' + CURRENT_DIR + '/scripts/logging.js'
INC_LOCKING_SCRIPT = 'file://' + CURRENT_DIR + '/tmp/lock.js'

FIREBUG_PATH = CURRENT_DIR + '/extensions/firebug-2.0.2-fx.xpi';
CONSOLEXP_PATH = CURRENT_DIR + '/extensions/consoleExport-0.5b6.xpi';
LOG_CALLS_PATH = os.path.normpath(CURRENT_DIR + "/tmp/calls.log")
LOG_REQS_PATH = os.path.normpath(CURRENT_DIR + "/tmp/requests.log")

calls = []
requests = []
nd_calls = []
nd_functions = ['random','getHours','getMonth','getDate']


##All implemented -> there is a small bug somewhere...
##Implement some replacement functions for getHours etc
##Graph if there is enough time!
	
class call(object):
	id = ""
	name = ""
	input = ""
	output = ""
	caller = ""
	is_native = ""
	
	def __init__(self, id, name, input, output, caller, is_nati):
		self.id = id
		self.name = name
		self.input = input
		self.output = output
		self.caller= caller
		self.is_native = is_nati
		

def generate_lock(nd_calls, call_obj, script_template, script_generated):
	
	temp_str = ""
	for c in nd_calls:	
		temp_str += 'var temp_entry = new f_called("' + c.id +'","' + c.name + '","' + c.input + '","' + c.output + '","' + c.caller + '","' + c.is_native + '");\n'
		temp_str += 'arr_locked_calls[arr_locked_calls.length] = temp_entry;\n'
	
	
	with open(script_generated, 'w') as generated:
		with open(script_template, 'r') as original:
			for line in original:
				temp_line = line.replace('TAG_INSPECTED_CALL', '"' + call_obj.id + '","' + call_obj.name +'","' + call_obj.input + '","' + call_obj.output +'","' + call_obj.caller + '","' + call_obj.is_native + '"')
				generated.write(temp_line.replace('TAG_LOCKED_CALLS', temp_str))
					

		
def generate_page(new_page_path, or_page_path, or_text, new_text):
		with open(new_page_path, 'w') as generated:
			with open(or_page_path, 'r') as original:
				for line in original:
					generated.write(line.replace(or_text, new_text))

def open_page(str_page, console_enabled):
	proxy = "127.0.0.1"
	port = 8081
	
		
	profile = webdriver.FirefoxProfile()
	
	if (console_enabled == True):	
		try:
			profile.add_extension(extension=FIREBUG_PATH)
			profile.add_extension(extension=CONSOLEXP_PATH)
		except BaseException as e:
			print("Could not load firefox extensions.", e)
				
		domain = "extensions.firebug."
		#Set default Firebug preferences
		#profile.set_preference(domain + "currentVersion", "2.0.2")
		profile.set_preference(domain + "allPagesActivation", "on")
		profile.set_preference(domain + "console.enableSites", True)
		profile.set_preference(domain + "defaultPanelName", "console")
		profile.set_preference(domain + "showFirstRunPage", False)
		profile.set_preference(domain + "console.logLimit", 5000)
		profile.set_preference(domain + "consoleFilterTypes", "info")
		
		#Set default consoleExport preferences
		profile.set_preference(domain + "consoleexport.active", True)
		profile.set_preference(domain + "consoleexport.logFilePath", LOG_CALLS_PATH)
		
	#Script waiting time
	profile.set_preference("dom.max_chrome_script_run_time", 0)
	profile.set_preference("dom.max_script_run_time", 0)

	#Privacy Mode, to avoid cookies
	profile.set_preference("browser.private.browsing.autostart", True)
	profile.set_preference('browser.privatebrowsing.dont_prompt_on_enter', True)
	profile.set_preference('browser.privatebrowsing.autostart', True)
	
	#Proxy Settings
	profile.set_preference('network.proxy.ssl_port', int(port))
	profile.set_preference('network.proxy.ssl', proxy)
	profile.set_preference('network.proxy.http_port', int(port))
	profile.set_preference('network.proxy.http', proxy)
	profile.set_preference('network.proxy.type', 1)
		
	profile.update_preferences()
	driver = webdriver.Firefox(firefox_profile=profile)
	
	#Launching Firefox
	proxy = urllib2.ProxyHandler({'http': '127.0.0.1:8080'})
	opener = urllib2.build_opener(proxy)
	urllib2.install_opener(opener)
	time.sleep(1)
	driver.get('file://' + str_page)
	time.sleep(1);
	urllib2.urlopen('http://mavroudisv.eu/').read()
	
	driver.close() #He is dead Jim.

def same_arr(arr1, arr2):
	result = True
	if len(arr1) != len(arr2):
		result = False
	else:
		for el1 in arr1:
			exists = False
			for el2 in arr2:
				if (el1 == el2):
					exists = True
			
			if exists == False:
				result = False
	
	
	return result
	
def main():

	try:
		
		#Clean tmp
		if not os.path.exists(TEMP_FOLDER):
			os.makedirs(TEMP_FOLDER)
		fileList = os.listdir(TEMP_FOLDER)
		for fileName in fileList:
			os.remove(TEMP_FOLDER+"/"+fileName)
		
		print 'Non-determinism detector started...'
		start_time = time.time()
		
		generate_page(GENERATED_PAGE, ORIGINAL_PAGE, '<head>', '<head>\r\n<script  type="text/javascript" src=' + INC_LOGGING_SCRIPT + '></script>\r\n')
	
		open_page(GENERATED_PAGE, True)
		
		#Extract requests
		with open (LOG_REQS_PATH, "r") as file:
			for r in file:
				requests.append(r.replace('\n', ''))
		
		if len(requests)==0:
			print 'No requests. Nothing to do here...'
			exit(0)
		
		
		#Extract all calls
		r = re.compile('#$#(.*?)#$#')
		
		with open (LOG_CALLS_PATH, "r") as file:
			data = file.read().replace('\r\n', '')
		
		
		#Add checking object
		temp_obj = call("-1","random","","0","lock_test", "true")
		calls.append(temp_obj)
		
		for item in data.split("</call>"):
			if "<call>" in item:
				#Parse string to call objects
				temp_str = item [ item.find("<call>")+len("<call>") : ]
				temp_arr = temp_str.split("#")
				
				temp_obj = call(temp_arr[0],temp_arr[1],temp_arr[2],temp_arr[3],temp_arr[4], temp_arr[5])
				calls.append(temp_obj)
		
		
		#Extract the non-deterministic calls
		for c in calls:
			if c.name in nd_functions:
				nd_calls.append(c)
		
		if len(nd_calls)==0:
			print 'No non-determinism. Nothing to do here...'
			exit(0)
		
		
		#Clean tmp
		fileList = os.listdir(TEMP_FOLDER)
		for fileName in fileList:
			os.remove(TEMP_FOLDER+"/"+fileName)
		
		
		#Loop on each 
		for c in nd_calls:
			
			#Generate locking script etc
			generate_lock(nd_calls, c, LOCKING_SCRIPT_TEMPLATE, LOCKING_SCRIPT_GENERATED)
			generate_page(GENERATED_PAGE, ORIGINAL_PAGE, '<head>', '<head>\r\n<script  type="text/javascript" src=' + INC_LOCKING_SCRIPT + '></script>\r\n')
		
			open_page(GENERATED_PAGE, False)
			
			temp_requests = []
			with open (LOG_REQS_PATH, "r") as file:
				for r in file:
					temp_requests.append(r.replace('\n', ''))
			
			if (not same_arr(requests, temp_requests)):
				
				if (c.id == "-1"):
					print 'The page is not fully locked. Check for unknown non-determinism sources';
				elif (c.id != "-1"):
					print '-------------------'
					print 'Non Deterministic!';
					print c.id + ' ' + c.name + ' ' + c.output;
					
				
					print 'Requests:'
					for r in requests:
						print r
					
					
					print 'Sample Requests:'
					for r in temp_requests:
						print r
			
					print '-------------------'
			
				
			#Clean tmp
			fileList = os.listdir(TEMP_FOLDER)
			for fileName in fileList:
				os.remove(TEMP_FOLDER+"/"+fileName)


		print 'Execution Time: ' + str(time.time() - start_time)
		print 'Non-determinism detector ended.'

		
	except Exception as e:
		print 'Error: ' + str(e)


		
if __name__ == "__main__":
		main()

	
		
		