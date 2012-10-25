var StrappLogger = StrappLogger || {
    
};

StrappLogger.version = 2.0;

StrappLogger.Cookies = {
	createCookie: function(name, value) {
		var expires = "";
		var hours = 1;
		
		var date = new Date();
		date.setTime(date.getTime() + (hours * 60 * 60 * 1000));
		expires = "; expires=" + date.toGMTString();
		
		document.cookie = name + "=" + value + expires + "; path=/";
	},

	readCookie: function(name) {
		var nameEQ = name + "=";
		var ca = document.cookie.split(';');
		for(var i=0;i < ca.length;i++) {
			var c = ca[i];
			while (c.charAt(0) == ' ') c = c.substring(1, c.length);
			if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
		}
		
		return null;
	},

	eraseCookie: function(name) {
		StrappLogger.Cookies.createCookie(name, "", -1);
	}
};

StrappLogger.SendStack = function (config) {
    this.init = function (config) {
		this.settings = {
			clientId: null,
			loggingUrl: null,               // URL that accepts complete logging result as JSON
			callingHomeUrl: null,           // URL used for logging incomplete results if the window is closed before the page has completely loaded
			applicationReference: null,     // Top level application reference
			applicationReferences: null,    // List of application references that the logger can use
			initTime: null,					// Timestamp when the stopwatch was started
			cookieName: null,
			expectAsyncRequests: true,		// True if the page load includes AJAX-requests
			exclude : {
				requests: null				// Array of URL patterns to exclude
			},
			debug: {
				results: false				// True if debug information should be logged to console
			}
		};
		
		jQuery.extend(this.settings, config);

        this.outCounter = 0;
        this.inCounter = 0;
        this.outStack = [];
		this.outStackMetaData = [];
        this.inStack = [];
		this.excludeURLs = null;
		
		if (this.settings.exclude.requests) {
		
		}
        
		var startTime = null;
		
		if (this.settings.cookieName) {
			startTime = StrappLogger.Cookies.readCookie(this.settings.cookieName);
			StrappLogger.Cookies.eraseCookie(this.settings.cookieName);
		}
		
		this.startTime = startTime || this.settings.initTime;
        
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

		if (this.settings.callingHomeUrl) {
			window.onbeforeunload = function () {
				var results, json;

				if (!that.complete) {
					results = that.calculateResults(true);
					json = JSON.stringify(results);

					window.open(that.settings.callingHomeUrl + "?result=" + json, "callinghome", "location=1,status=0,scrollbars=0,toolbar=0,resizable=0,width=5,height=5");
				}
			};
		}

		if (this.settings.applicationReferences) {
			jQuery.ajaxPrefilter(function (options) {
				var url = options.url, modifier;

				if (url.indexOf(that.settings.loggingUrl) >= 0) {
					return;
				}

				modifier = "?";

				if (options.url.indexOf(modifier) > 0) {
					modifier = "&";
				}

				var applicationReference = that.settings.applicationReferences.pop();
				
				options.url = options.url + modifier + "appRef=" + applicationReference;
				
				that.outStackMetaData[options.url] = {
					applicationReference: applicationReference
				};
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

        if (url.indexOf(this.settings.loggingUrl) < 0) {
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
                        
						var requestData = {
                            url: url,
                            responseTime: response.time - this.outStack[url],
                            status: response.status
                        };
						
						if (this.outStackMetaData[url]) {
							requestData.applicationReference = this.outStackMetaData[url].applicationReference;
						}
						
                        results.requests.push(requestData);
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
			var logStatement = 'Total response time: ' + result.totalResponseTime + ' ms. # of AJAX-requests: ' + result.requests.length;
			
			if (this.settings.clientId) {
				logStatement += '. ClientId: [' + this.settings.clientId + ']';
			}
			
			this.console.log(logStatement);
		}
    };

    this.init(config);
};

if (StrappLogger.config) {
	new StrappLogger.SendStack(StrappLogger.config);
}