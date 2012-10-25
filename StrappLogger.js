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

StrappLogger.Stack = function(config) {
	this.init = function(config) {
		this.id = config.id;
		this.outCounter = 0;
        this.inCounter = 0;
        this.outStack = [];
		this.inStack = [];
		this.complete = false;
		this.ready = false;
		this.results = null;	
		
		this.settings = {
			id: null,
			excludes: null
		};
		
		jQuery.extend(this.settings, config);
		
		this.excludes = null;
		
		if (this.settings.excludes) {
			this.excludes = [];
			
			for (var i = 0; i < this.settings.excludes.length; i++) {
				this.excludes.push(new RegExp(this.settings.excludes[i]));
			}
		}
	};
	
	this.getOutStack = function() {
		return this.outStack;
	};
	
	this.getInStack = function() {
		return this.inStack;
	};
	
	this.getFirstRequestTime = function() {
		return this.firstRequestTime;
	};
	
	this.markAsComplete = function() {
		this.complete = true;
	};
	
	this.markAsReady = function() {
		this.ready = true;
	};
	
	this.setResults = function(results) {
		this.results = results;
	};
	
	this.getResults = function() {
		return this.results;
	};
	
	this.includeUrl = function(url) {
		var include = true;
			
		if (this.excludes) {
			for (var i = 0; i < this.excludes.length; i++) {
				var result = this.excludes[i].exec(url);
			
				if  (result) {
					include = false;
				}
			}
		}
		
		return include;
	};
	
	this.out = function (e, jqxhr, settings) {
        var url = settings.url;

        if (url.indexOf(this.settings.loggingUrl) < 0) {
            if (this.includeUrl(url)) {
				this.outStack[url] = new Date().getTime();
				this.outCounter++;
			}
        }
        
        if (!this.firstRequestTime) {
            this.firstRequestTime = new Date().getTime();
        }
    };

    this.inbound = function (e, jqxhr, settings) {        
        var url = settings.url;
		
		if (this.includeUrl(url)) {
			this.inStack[settings.url] = {
				time: new Date().getTime(),
				status: jqxhr.status
			};

			this.inCounter++;
		}
    };

	this.isComplete = function() {
		return this.ready && (this.outCounter == this.inCounter);
	};
	
	this.init(config);
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
			profiles : null,				// Array of profiles
			debug: {
				results: false				// True if debug information should be logged to console
			}
		};
		
		jQuery.extend(this.settings, config);

		var startTime = null;
		
		if (this.settings.cookieName) {
			startTime = StrappLogger.Cookies.readCookie(this.settings.cookieName);
			StrappLogger.Cookies.eraseCookie(this.settings.cookieName);
		}
		
		this.outStackMetaData = [];
		this.excludeURLs = null;
		
		if (this.settings.profiles) {
			var profiles = this.settings.profiles;
			
			this.profiles = [];
			
			for (var i = 0; i < profiles.length; i++) {
				var profileConfig = profiles[i];
				
				profileConfig.loggingUrl = this.settings.loggingUrl;
				
				var profile = new StrappLogger.Stack(profileConfig);
				
				this.profiles.push(profile);
			}
		} else {
			var defaultProfile = new StrappLogger.Stack({
				id: 'default',
				loggingUrl: this.settings.loggingUrl
			});
			
			this.profiles = [defaultProfile];
		}
		
		this.startTime = startTime || this.settings.initTime;
        
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
            for (var i = 0; i < that.profiles.length; i++) {
				that.profiles[i].out(e, jqxhr, settings);
			}
        });

        jQuery(document).ajaxComplete(function (e, jqxhr, settings) {
            that.inbound(e, jqxhr, settings);
        });

        jQuery(document).ajaxError(function (e, jqxhr, settings) {
            if (jqxhr.status > 0 && 200 != jqxhr.status) {
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
		
		jQuery(window).load(function() {
			for (var i = 0; i < that.profiles.length; i++) {
				var profile = that.profiles[i];
				profile.markAsReady();
				
				if (!that.settings.expectAsyncRequests) {
					that.checkStatus(profile);
				}
			}
		});
    };

	this.inbound = function(e, jqxhr, settings) {
		for (var i = 0; i < this.profiles.length; i++) {
			var profile = this.profiles[i];
			
			if (!profile.isComplete()) {				
				profile.inbound(e, jqxhr, settings);
				this.checkStatus(profile);
			}
		}
	};
	
	this.isAllProfilesComplete = function() {
		var allProfilesComplete = true;
			
		for (var i = 0; i < this.profiles.length; i++) {
			var profile = this.profiles[i];
			
			if (!profile.complete) {
				allProfilesComplete = false;
				break;
			}
		}
		
		return allProfilesComplete;
	};
	
    this.checkStatus = function (profile) {
        if (profile.isComplete()) {
            var results = this.calculateResults(profile);
            profile.markAsComplete();
			profile.setResults(results);
			
			if (this.isAllProfilesComplete()) {
				this.logAllProfilesToStrapp();
			}
			
			return true;
        }
		
		return false;
    };

    this.calculateResults = function (profile, premature) {
        var total, results, url, response, now, firstRequestTime, idleTime;

        now = new Date().getTime();

        total = now - this.startTime;
		idleTime = 0;
		firstRequestTime = profile.getFirstRequestTime();
		
		if (firstRequestTime)
		{
			idleTime = firstRequestTime - this.startTime;
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
		
		if (profile.id !== 'default') {
			results.profileId = profile.id;
		}

        if (!premature) {
            var outStack = profile.getOutStack();
			var inStack = profile.getInStack();
			
			for (url in outStack) {
                if (outStack.hasOwnProperty(url)) {
                    if (inStack[url]) {
                        response = inStack[url];
                        
						var requestData = {
                            url: url,
                            responseTime: response.time - outStack[url],
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

	this.logAllProfilesToStrapp = function() {
		for (var i = 0; i < this.profiles.length; i++) {
			var profile = this.profiles[i];
			var results = profile.getResults();
			
			this.logResultsToStrapp(profile.id, results);
		}
	};
	
    this.logResultsToStrapp = function (profileId, result, callback) {
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
			
			logStatement += '. Profile: [' + profileId + ']';
			
			this.console.log(logStatement);
		}
    };

    this.init(config);
};

if (StrappLogger.config) {
	new StrappLogger.SendStack(StrappLogger.config);
}