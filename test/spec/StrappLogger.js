describe("StrappLogger.Stack", function() {
    beforeEach(function() {
      this.server = sinon.fakeServer.create();
      this.server.respondWith([200, {}, "OK"]);
    });

    afterEach(function() {
      this.server.restore();
    });

	/*describe("for a page load without async requests", function() {
		describe("when the page is loaded", function() {
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
				
				sendStack.flagLoaded();
				
				expect(completeFnc.callCount).toEqual(1);
			});
		});
	});*/
	
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

				sendStack.flagLoaded();

				jQuery.ajax({
					url: "/my/page1"
				});

				jQuery.ajax({
					url: "/my/page2"
				});

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