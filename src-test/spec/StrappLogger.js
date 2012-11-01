describe("StrappLogger.Stack", function() {
    beforeEach(function() {
      this.server = sinon.fakeServer.create();
      this.server.respondWith([200, {}, "OK"]);	  
    });

    afterEach(function() {
      this.server.restore();
    });

	describe("for a page load without async requests", function() {
		describe("when the page is loaded", function() {
			beforeEach(function() {
				this.cookieName = "strapp-cookie";
				this.clock = sinon.useFakeTimers();			
			});
			
			afterEach(function() {
				this.clock.restore();
			});
			
			it("the logger should flag complete", function() {
				var completeFnc = sinon.spy();

				var sendStack = new StrappLogger.SendStack({
					initTime : new Date().getTime(),
					loggingUrl : '/logging',
					profiles : [
						{
							id: 'load-without-async'
						}
					],
					events : {
						complete : completeFnc
					},
					debug: { results: true }
				});
				
				sendStack.flagReady();
				sendStack.flagLoaded();
				
				this.clock.tick(3000);
				
				expect(completeFnc.callCount).toEqual(2);
				
				var args = completeFnc.args[0];
				expect(args[0]).toEqual('load-without-async');
				
				var results = args[1];
				expect(results.totalResponseTime).toBeLessThan(200);
			});
		});
		
		describe("when a page is loaded and init time is stored in a cookie", function() {
			var cookieName = "strapp-cookie";
			
			beforeEach(function() {
				this.cookieName = "strapp-cookie";
				this.clock = sinon.useFakeTimers(new Date().getTime());	

				var time = new Date().getTime();				
				StrappLogger.Cookies.createCookie(cookieName, time);				
			});
			
			afterEach(function() {
				this.clock.restore();
			});
			
			it("cookie should be available", function() {
				var cookieValue = StrappLogger.Cookies.readCookie(cookieName);
				expect(cookieValue).not.toBeNull();
			});
		
			it("the logger should flag complete and use the value from the cookie as init time", function() {				
				var completeFnc = sinon.spy();

				this.clock.tick(2000);
				
				var sendStack = new StrappLogger.SendStack({
					initTime : new Date().getTime(),
					loggingUrl : '/logging',
					"cookieName" : cookieName,
					profiles : [
						{
							id: 'load-from-cookie'
						}
					],
					events : {
						complete : completeFnc
					},
					debug: { results: true }
				});
				
				sendStack.flagReady();
				sendStack.flagLoaded();
				
				this.clock.tick(3000);
				
				expect(completeFnc.callCount).toEqual(1);
				
				var args = completeFnc.args[0];
				expect(args[0]).toEqual('load-from-cookie');
				
				var results = args[1];
				expect(results.totalResponseTime).toEqual(2000);
				
				var cookieValue = StrappLogger.Cookies.readCookie(cookieName);				
				expect(cookieValue).toBeNull();
			});
		});
	});
	
	describe("for a page load with async requests", function() {	
		describe("when all async requests for a single profile are complete and the load event fires before the async requests", function() {
			it("the logger should flag complete", function() {
				var completeFnc = sinon.spy();

				var sendStack = new StrappLogger.SendStack({
					initTime : new Date().getTime(),
					loggingUrl : '/logging',
					profiles : [
						{
							id: 'load-before'
						}
					],
					events : {
						complete : completeFnc
					},
					debug: { results: true }
				});

				sendStack.flagReady();
				sendStack.flagLoaded();

				jQuery.ajax({url: "/my/page1"});
				jQuery.ajax({url: "/my/page2"});

				this.server.respond();

				expect(completeFnc.callCount).toEqual(1);

				var args = completeFnc.args[0];
				expect(args[0]).toEqual('load-before');

				var results = args[1];
				var requests = results.requests;

				expect(requests.length).toEqual(2);
				expect(requests[0].url).toEqual('/my/page1');
				expect(requests[1].url).toEqual('/my/page2');
			});
		});
		
		describe("when all async requests for two profiles are complete", function() {
			it("the logger should flag complete", function() {
				var completeFnc = sinon.spy();

				var sendStack = new StrappLogger.SendStack({
					initTime : new Date().getTime(),
					loggingUrl : '/logging',
					profiles : [
						{
							id: 'p1'
						},
						{
							id: 'p2',
							excludes: ['.*p1/.*']
						}
					],
					events : {
						complete : completeFnc
					},
					debug: { results: true }
				});

				sendStack.flagReady();
				sendStack.flagLoaded();

				jQuery.ajax({url: "/p1/page1"});
				jQuery.ajax({url: "/p1/page2"});
				jQuery.ajax({url: "/p2/page2"});

				this.server.respond();

				expect(completeFnc.callCount).toEqual(2);

				// p1
				var args = completeFnc.args[0];
				expect(args[0]).toEqual('p1');

				var results = args[1];
				var requests = results.requests;

				expect(requests.length).toEqual(3);
				expect(requests[0].url).toEqual('/p1/page1');
				expect(requests[1].url).toEqual('/p1/page2');
				expect(requests[2].url).toEqual('/p2/page2');
				
				// p2
				args = completeFnc.args[1];
				expect(args[0]).toEqual('p2');

				results = args[1];
				requests = results.requests;

				expect(requests.length).toEqual(1);
				expect(requests[0].url).toEqual('/p2/page2');
			});
		});
		
		describe("when all async requests for a single profile are complete and the load event fires after the async requests", function() {
			it("the logger should flag complete", function() {
				var completeFnc = sinon.spy();

				var sendStack = new StrappLogger.SendStack({
					initTime : new Date().getTime(),
					loggingUrl : '/logging',
					profiles : [
						{
							id: 'load-after'
						}
					],
					events : {
						complete : completeFnc
					},
					debug: { results: true }
				});

				jQuery.ajax({url: "/my/page3"});

				jQuery.ajax({url: "/my/page4"});

				jQuery.ajax({url: "/my/page5"});

				this.server.respond();

				sendStack.flagLoaded();

				expect(completeFnc.callCount).toEqual(1);

				var args = completeFnc.args[0];
				expect(args[0]).toEqual('load-after');

				var results = args[1];
				var requests = results.requests;

				expect(requests.length).toEqual(3);
				expect(requests[0].url).toEqual('/my/page3');
				expect(requests[1].url).toEqual('/my/page4');
				expect(requests[2].url).toEqual('/my/page5');
			});
		});
	});
});