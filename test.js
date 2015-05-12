describe("Single Mask to Connections tests", function() {
	it("mask to connection", function() {
		expect("both").toEqual(
			SelfmaskPluginManager.maskToConnection(0xffffffff, (1<<16) + 1)
		);
		expect("own").toEqual(
			SelfmaskPluginManager.maskToConnection(0x20000, (2<<16))
		);
	});
});

describe("Connections to bitmasks conversion tests", function() {

	it("masks to connections test #"+i, function() {
		expect({1: {2: "both"}}).toEqual(
			SelfmaskPluginManager.masksToConnections(
				{
					selfmasks: {
						1: (1 << 16) + 1,
						2: (1 << 17) + 2
					},
					othermasks: {
						1: (1 << 17) + 2,
						2: (1 << 16) + 1
					}
				}, 2
			)
		);
	});

	function randomConnections(popSize) {
		var possible = ["none", "both", "own", "std"];
		var connections = {};
		for (var i = 1; i <= popSize; ++i) {
			var conns = {};
			for (var j = i; j <= popSize; ++j) {
				var connection = possible[Math.floor(Math.random()*possible.length)];
				if (connection == "none") continue;
				conns[j] = connection;
			}
			if (!$.isEmptyObject(conns))
				connections[i] = conns;
		}
		return connections;
	}

	for (var i = 1; i <= 20; ++i) {
		it("random test #"+i, function() {
			var popSize = 4;
			var connections = randomConnections(popSize);
			expect(connections).toEqual(
				SelfmaskPluginManager.masksToConnections(
					SelfmaskPluginManager.connectionsToMasks(connections, popSize), popSize
				)
			);
		});
	}
});

describe("Selfmask utils functions", function() {
    it("int to hex test 1", function() {
        expect("0x000000ff").toEqual(SelfmaskPluginManager.intToHex(255));
    });
    it("int to hex test 2", function () {
        expect("0x00000000").toEqual(SelfmaskPluginManager.intToHex(0));
    });
    it("int to hex test 3", function () {
        expect("0xffffffff").toEqual(SelfmaskPluginManager.intToHex(4294967295));
    });
});