describe("StrappLogger.Stack", function() {
  describe("when song has been paused", function() {
    beforeEach(function() {
      this.server = sinon.fakeServer.create();
      this.server.respondWith([200, {}, "OK"]);
    });

    afterEach(function() {
      this.server.restore();
    });

    it("when all async requests are complete", function() {
      var completeFnc = sinon.spy();

      var sendStack = new StrappLogger.SendStack({
        initTime : new Date().getTime(),
        loggingUrl : '/logging',
        events : {
          complete : completeFnc
        },
        debug: { results: true }
      });

      sendStack.markAsReady();

      jQuery.ajax({
        url: "/my/page1", 
        success: function(a, b, c) {
          var s = "";
        } 
      });

      jQuery.ajax({
        url: "/my/page2", 
        success: function(a, b, c) {
          var s = "";
        } 
      });
      
      this.server.respond();

      expect(completeFnc.callCount).toEqual(1);
    });
  });
});