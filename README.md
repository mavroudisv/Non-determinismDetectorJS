# Info
This project is a PoC on the detection of non-deterministic behaviour in JS.


# Installation

No installation is needed. Just install the missing python modules and you are done.
   
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

See also schema.png


# Known Shortcomings/Improvements

+ This approach cannot reliably detect all cases where randomness is "fetched" from external sources.

+ Build execution tree based on the call log. Useful for visual inspection of the malware.

# License
WTFPL (WTFPL.net)