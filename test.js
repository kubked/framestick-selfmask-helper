describe("Single Mask to Connections tests", function() {
	it("mask to connection", function() {
		expect("both").toEqual(
			SelfmaskPluginManager.maskToConnection(1, (1<<16) + 1)
		);
		expect("own").toEqual(
			SelfmaskPluginManager.maskToConnection(2, (2<<16))
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

	for (var i = 1; i <= 10; ++i) {
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