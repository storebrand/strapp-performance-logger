var StrappLogger = StrappLogger || {
    
};

StrappLogger.version = 2.0;

StrappLogger.SendStack = function (config) {
    this.init = function (config) {
		this.settings = {
			clientId: null,
			loggingUrl: null,               // URL that accepts complete logging result as JSON
			callingHomeUrl: null,           // URL used for logging incomplete results if the window is closed before the page has completely loaded
			applicationReference: null,     // Top level application reference
			applicationReferences: null,    // List of application references that the logger can use
			initTime: null,					// Timestamp when the stopwatch was started
			expectAsyncRequests: true,		// True if the page load includes AJAX-requests
			debug: {
				results: false				// True if debug information should be logged to console
			}
		};
		
		jQuery.extend(this.settings, config);

        this.outCounter = 0;
        this.inCounter = 0;
        this.outStack = [];
        this.inStack = [];
        this.startTime = this.settings.initTime;
        this.firstRequestTime = null;
        this.complete = false;
        
		this.console = window.console || {
            log: function () {
            },
            info: function () {
            },
            error: function () {
            }
        };

        var that = this;

        jQuery(document).ajaxSend(function (e, jqxhr, settings) {
            that.out(e, jqxhr, settings);
        });

        jQuery(document).ajaxComplete(function (e, jqxhr, settings) {
            that.inbound(e, jqxhr, settings);
        });

        jQuery(document).ajaxError(function (e, jqxhr, settings) {
            if (200 != jqxhr.status) {
                that.inbound(e, jqxhr, settings);
            }
        });

        window.onbeforeunload = function () {
            var results, json;

            if (!that.complete) {
                results = that.calculateResults(true);
                json = JSON.stringify(results);

                window.open(that.settings.callingHomeUrl + "?result=" + json, "callinghome", "location=1,status=0,scrollbars=0,toolbar=0,resizable=0,width=5,height=5");
            }
        };

		if (this.settings.applicationReferences) {
			jQuery.ajaxPrefilter(function (options) {
				var url = options.url, modifier;

				if (url.indexOf(this.settings.loggingUrl) >= 0) {
					return;
				}

				modifier = "?";

				if (options.url.indexOf(modifier) > 0) {
					modifier = "&";
				}

				options.url = options.url + modifier + "appRef=" + this.settings.applicationReferences.pop();
			});
		}
		
		if (!this.settings.expectAsyncRequests) {
			jQuery(window).load(function() {
				that.checkStatus();
			});
		}
    };

    this.out = function (e, jqxhr, settings) {
        var url = settings.url;

        if (url.indexOf(this.logToStrappUrl) < 0) {
            this.outStack[settings.url] = new Date().getTime();
            this.outCounter++;
        }
        
        if (!this.firstRequestTime) {
            this.firstRequestTime = new Date().getTime();
        }
    };

    this.inbound = function (e, jqxhr, settings) {        
        this.inStack[settings.url] = {
            time: new Date().getTime(),
            status: jqxhr.status
        };

        this.inCounter++;
        this.checkStatus();
    };

	this.isComplete = function() {
		return this.outCounter == this.inCounter && !this.complete;
	};
	
    this.checkStatus = function () {
        if (this.isComplete()) {
            var results = this.calculateResults();
            this.complete = true;
            this.logResultsToStrapp(results);
        }
    };

    this.logDebugStatus = function () {
        var missing, url;

        if (this.outCounter > 30)
        {
            this.console.info(this.outCounter + " - " + this.inCounter);

            missing = null;

            for (url in this.outStack) {
                if (this.outStack.hasOwnProperty(url)) {
                    if (!this.inStack[url]) {
                        if (!missing) {
                            missing = "";
                        }
                        missing += url + ";";
                    }
                }
            }
            
            if (missing) {
                this.console.info(missing);
            }
        }
    };

    this.calculateResults = function (premature) {
        var total, results, url, response, now;

        now = new Date().getTime();

        total = now - this.startTime;
		var idleTime = 0;
		
		if (this.firstRequestTime)
		{
			idleTime = this.firstRequestTime - this.startTime;
		}
		
        results = {
            totalResponseTime: total,
            idleTime: idleTime,
            premature: premature || false,
            requests: []
        };
		
		if (this.settings.applicationReference) {
			results.applicationReference = this.settings.applicationReference;
		}
		
		if (this.settings.clientId) {
			results.clientId = this.settings.clientId;
		}

        if (!premature) {
            for (url in this.outStack) {
                if (this.outStack.hasOwnProperty(url)) {
                    if (this.inStack[url]) {
                        response = this.inStack[url];
                        
                        results.requests.push({
                            url: url,
                            responseTime: response.time - this.outStack[url],
                            status: response.status
                        });
                    }
                    else {
                        this.console.error("Did not find [" + url + "]");
                    }
                }
            }
        }

        return results;
    };

    this.printResultToConsole = function (result) {
        var requests, request, i;

        this.console.info("Total time: " + result.totalResponseTime + " ms");

        requests = result.requests;

        for (i = 0; i < requests.length; i++) {
            request = requests[i];
            this.console.info(request.responseTime + " ms\t\t" + request.url);
        }
    };

    this.logResultsToStrapp = function (result, callback) {
        var json, that;
        
        json = JSON.stringify(result);
        that = this;

        callback = callback || function () {
            
        };

        jQuery.ajax({
            url: this.settings.loggingUrl,
            type: 'POST',
            dataType: 'json',
            data: json,
            contentType: 'application/json; charset=utf-8',
            success: function (data) {
                if (data.ok) {
                    that.console.info("Results logged to Strapp with application reference [" + data.applicationReference + "]");
                }

                callback(data);
            },
            error: function (jqXHR, textStatus, errorThrown) {
                callback({
                    ok: false
                });
            }
        });
		
		if (this.settings.debug.results) {
			this.console.log('Total response time: ' + result.totalResponseTime + ' ms. # of AJAX-requests: ' + result.requests.length);
		}
    };

    this.init(config);
};