# Info
This is a prototype that analyses JavaScript malware samples and detects those that
exhibit non-deterministic behavior in order to evade detection. The most interesting part of it are the two js scripts that lock and log native js functions (see 'scripts' directory). We focused on functions that can be used as sources of randomness but any function can be locked. 

I developed it during my summer internship in 2014 at UCSB Seclab working with Alex Kapravelos, Luca Invernizzi, Giovanni Vigna and Chris Kruegel.




# Installation
* Python 2.7 (If interested in porting it into Python3 let me know!)
* Firefox
* Selenium


 
   
# Usage

In one terminal window run (or run it in the backgroud instead): 
>$ python proxy.py
    
In another terminal:
> $ python main.py


# How it works

## Proxy.py
The proxy captures the requested domains and when a "flag" domain is requested it generates "requests.log", containing all the requests made.

## Main.py
The main.py works as follows:

1. It attaches the logging.js on the examined webpage to capture all the js functions that are executed (each "call" is an object with a unique id, its input, output, caller etc). Additionally, proxy.py captures the network requests

2. From the captured "calls", it creates a list with those which are suspicious for non-deterministic behavior (random etc)

3. It then iterates on this list and attaches lock.js each time. This ensures that all the functions return the same values EXCEPT the one we examine for non-deterministic requests.

4. The requests are compared with the ones captured on step 1. If they are not exactly the same, the non-locked function causes non-deterministic execution.



# Known Shortcomings/Improvements

+ This approach cannot reliably detect all cases where randomness is "fetched" from external sources.

+ Build execution tree based on the call log. Useful for visual inspection of the malware.
