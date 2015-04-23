var SelfmaskPluginManager;

$(function () {
    function Point (x, y) {
        this.x = x || 0;
        this.y = y || 0;
    };
    Point.prototype.x = null;
    Point.prototype.y = null;
    Point.prototype.add = function (p2, p3) {
        if (p2 instanceof Point)
            return new Point(this.x + p2.x, this.y + p2.y);
        else 
            return new Point(this.x + p2, this.y + p3);
    };
    Point.prototype.offset = function (p2) {
        this.x += p2.x;
        this.y += p2.y;
    }
    Point.prototype.clone = function () {
        return new Point(this.x, this.y);
    };
    Point.prototype.normalizedVector = function (p2) {
        var x = p2.x - this.x;
        var y = p2.y - this.y;
        var dist = this.distance(p2);
        return new Point(x/dist, y/dist);
    };
    Point.prototype.leftOrtogonal = function () {
        return new Point(this.y, -this.x);
    }
    Point.prototype.distance = function (p2) {
        var x = this.x - p2.x;
        var y = this.y - p2.y;
        return Math.sqrt(x * x + y * y);
    };
    Point.prototype.multiply = function (scalar) {
        return new Point(this.x * scalar, this.y * scalar);
    };


    /**
     * offset = 0.0 - 1.0
     */
    function pointOnCircle(center, radius, offset) {
        return new Point(
            Math.sin(offset * Math.PI * 2) * radius + center.x,
            Math.cos(offset * Math.PI * 2) * radius + center.y
        );
    }

    function CanvasNetworkPlugin() {
        this.canvas = document.getElementById("network-graph")
        this.context = this.canvas.getContext("2d");
        this.zoomingFactor = 2.223277;
        this.dashedColor = "#c00";
        this.dashedLineWidth = 2.5 * this.zoomingFactor;
        this.dashedLineLength = 10;
        this.waveColor = "#aaa";
        this.waveLineLength = 15;
        this.waveLineWidth = 3 * this.zoomingFactor;
    };
    CanvasNetworkPlugin.prototype.resize = function () {
        this.canvas.style.width='100%';
        this.canvas.style.height='400pt';
        this.canvas.width = this.canvas.offsetWidth * this.zoomingFactor;
        this.canvas.height = this.canvas.offsetHeight * this.zoomingFactor;
    };
    CanvasNetworkPlugin.prototype.getSize = function () {
        return Math.min(this.canvas.height, this.canvas.width);
    };
    CanvasNetworkPlugin.prototype.getOffset = function () {
        var size = this.getSize();
        return new Point((this.canvas.width - size) / 2, (this.canvas.height - size) / 2);
    };
    CanvasNetworkPlugin.prototype.getNodeRadius = function () {
        return this.getSize() * 0.075;
    }
    CanvasNetworkPlugin.prototype.getPositions = function (populationsCount) {
        var offset = this.getOffset();
        var size = this.getSize();
        var positions = {
            2: [
                new Point(size * 0.25, size * 0.5),
                new Point(size * 0.75, size * 0.5)
            ],
            3: [
                new Point(size * 0.50, size * 0.2835),
                new Point(size * 0.25, size * 0.7165),
                new Point(size * 0.75, size * 0.7165)
            ],
            4: [
                new Point(size * 0.25, size * 0.25),
                new Point(size * 0.75, size * 0.25),
                new Point(size * 0.25, size * 0.75),
                new Point(size * 0.75, size * 0.75)
            ]
        }[populationsCount];
        for (var i = 0; i < populationsCount; i++) {
            positions[i].offset(offset);
        }
        return positions;
    };
    CanvasNetworkPlugin.prototype.drawDashedLine = function(p1, p2) {
        this.context.strokeStyle = this.dashedColor;
        this.context.lineWidth = this.dashedLineWidth;
        var offset = p1.normalizedVector(p2).multiply(this.dashedLineLength);
        var curr = p1.clone();
        var dist = p1.distance(p2);
        while (p1.distance(curr) < dist) {
            this.context.beginPath();
            this.context.moveTo(curr.x, curr.y);
            curr.offset(offset);
            this.context.lineTo(curr.x, curr.y);
            this.context.stroke();
            curr.offset(offset);
        }
    };
    CanvasNetworkPlugin.prototype.drawDashedCircle = function(p1, radius) {
        this.context.strokeStyle = this.dashedColor;
        this.context.lineWidth = this.dashedLineWidth;
        var offset = this.dashedLineLength / (2 * Math.PI * radius);
        var curr = 0.0;
        while (curr < 1.0) {
            this.context.beginPath();
            var point = pointOnCircle(p1, radius, curr);
            this.context.moveTo(point.x, point.y);
            curr += offset;
            point = pointOnCircle(p1, radius, curr);
            this.context.lineTo(point.x, point.y)
            this.context.stroke();
            curr += offset;
        }
    };
    CanvasNetworkPlugin.prototype.drawWaveLine = function(p1, p2) {
        this.context.strokeStyle = this.waveColor;
        this.context.lineWidth = this.waveLineWidth;
        var offset = p1.normalizedVector(p2).multiply(this.waveLineLength);
        var left = offset.leftOrtogonal().multiply(2);
        var right = p1.add(left.multiply(-1)).add(offset);
        var center = p1.clone();
        left = p1.add(left).add(offset);
        var dist = p1.distance(p2);
        offset = offset.multiply(2);
        var doubleOffset = offset.multiply(2);
        right.offset(offset);
        while (p1.distance(center) < dist) {
            this.context.beginPath();
            this.context.moveTo(center.x, center.y);
            center.offset(offset);
            this.context.quadraticCurveTo(left.x, left.y, center.x, center.y);
            left.offset(doubleOffset);
            center.offset(offset);
            this.context.quadraticCurveTo(right.x, right.y, center.x, center.y);
            right.offset(doubleOffset);
            this.context.stroke();
        }
    };
    CanvasNetworkPlugin.prototype.drawNode = function (position, name) {
        this.context.fillStyle = "#999";
        this.context.beginPath();
        this.context.arc(position.x, position.y, this.getNodeRadius(), 0, Math.PI * 2, false);
        this.context.closePath();
        this.context.fill();
        this.context.fillStyle = "#fff";
        this.context.font = "bold 36px sans-serif";
        this.context.textAlign = "center";
        this.context.textBaseline = "middle";
        this.context.fillText(name, position.x, position.y);

    };
    CanvasNetworkPlugin.prototype.drawNodes = function (populationsCount, names, positions) {
        for (var i = 0; i < populationsCount; i++) {
            this.drawNode(positions[i], names[i]);
        }
    };
    CanvasNetworkPlugin.prototype.drawConnections = function (connections, positions) {
        for (var from in connections) {
            for (var to in connections[from]) {
                if (connections[from][to] == "both" || connections[from][to] == "own")
                    if (to == from)
                        this.drawDashedCircle(
                            positions[from - 1].add(
                                -this.getNodeRadius()*0.8,
                                -this.getNodeRadius()*0.8
                            ),
                            this.getNodeRadius()*0.8
                        );
                    else
                        this.drawDashedLine(
                            positions[from - 1],
                            positions[to - 1]
                        );
                if (connections[from][to] == "both" || connections[from][to] == "std")
                    this.drawWaveLine(positions[from - 1], positions[to - 1]);
            }
        }
    };
    CanvasNetworkPlugin.prototype.rebuild = function (populationsCount,
                                                        names,
                                                        connections) {
        this.resize();
        var positions = this.getPositions(populationsCount);
        this.drawConnections(connections, positions);
        this.drawNodes(populationsCount, names, positions);
    };


    /**
	 * TablePlugin
	 */
    function TablePlugin() { };
    TablePlugin.prototype.buildHeader = function (panel,
												 populationsCount,
												 names) {
        var table = $('<table class="table"/>');
        panel.empty().append(table);

        var headerRow = $("<tr><td/></tr>");
        for (var i = 0; i < populationsCount; ++i) {
            headerRow.append($("<td/>", {
                text: names[i]
            }));
        }

        table.append(headerRow);

        return table;
    };

    /** 
	 * ComboboxPlugin
	 */
    function ComboboxSelfmaskPlugin() {
        this.options = [
			$('<option value="none">None</option>'),
			$('<option value="std" class="connection-std">Standard</option>'),
			$('<option value="own" class="connection-own">Custom</option>'),
			$('<option value="both" class="connection-both">Both</option>')
        ];
    };

    ComboboxSelfmaskPlugin.prototype = new TablePlugin;
    ComboboxSelfmaskPlugin.prototype.buildForm = function (populationsCount,
														  names) {
        var comboboxTable = this.buildHeader(
			$('#combobox-panel'),
			populationsCount,
			names
		);

        for (var i = 0; i < populationsCount; ++i) {
            var row = $("<tr/>").append($("<td/>", {
                text: names[i]
            }));
            for (var j = 0; j < populationsCount; ++j) {
                var cell = $("<td/>");
                if (j >= i) {
                    var select = $("<select class='select combobox form-control input-sm'/>")
						.data("first", i + 1)
						.data("second", j + 1)
                        .change($.proxy(this.selectChanged, this));
                    this.options.forEach(function (elem) {
                        select.append(elem.clone());
                    });
                    cell.append(select);
                }
                row.append(cell);
            }
            comboboxTable.append(row);
        }
    };

    ComboboxSelfmaskPlugin.prototype.selectChanged = function () {
        var connections = {};
        $('select.combobox').each(function(key, val) {
            var $select = $(val),
                first = $select.data('first'),
                second = $select.data('second'),
                val = $select.val();
            if (val == "none") return;
            if (!(first in connections))
                connections[first] = {}
            connections[first][second] = val;
        });
        SelfmaskPluginManager.setConnections(connections);
    };

    ComboboxSelfmaskPlugin.prototype.fillForm = function (populationsCount,
														 connections) {
        $("select.combobox").each(function (ind, val) {
            var $select = $(val);
            var first = $select.data('first'), second = $select.data('second');
            if (first in connections && second in connections[first]) {
                $select.val(connections[first][second]);
            } else {
                $select.val('none');
            }
        });
    };

    ComboboxSelfmaskPlugin.prototype.rebuild = function (populationsCount,
														names,
														connections) {
        this.buildForm(populationsCount, names);
        this.fillForm(populationsCount, connections);
    };

    /*
	 * HexesPlugin
	 */
    function HexesSelfmaskPlugin() { };

    HexesSelfmaskPlugin.prototype = new TablePlugin;
    HexesSelfmaskPlugin.prototype.buildForm = function (populationsCount,
														names) {
        var hexesTable = this.buildHeader(
			$('#hexes-panel'),
			populationsCount,
			names
		);

        function createRow(rowName) {
            var row = $("<tr/>").append($("<td/>", {
                text: rowName
            }));
            for (var i = 1; i <= populationsCount; ++i) {
                row.append($("<td/>").append(
					$('<input class="form-control input-small hexes" type="text"/>')
						.data("number", i)
						.data("rowName", rowName)
                        .change($.proxy(this.inputValueChanged, this)))
				);
            }
            return row;
        }

        hexesTable.append(createRow.call(this, "Selfmask"));
        hexesTable.append(createRow.call(this, "Othermask"));
    };

    /**
     * Read masks from input and return converted to connections.
     * If masks are not valid, get connections from SelfmaskPluginManager.
     */
    HexesSelfmaskPlugin.prototype.getConnections = function () {
        var masks = { selfmasks: {}, othermasks: {} };
        var valid = true;
        $("input.hexes").each(function (key, val) {
            var $input = $(val),
                num = $input.data("number"),
                rowName = $input.data("rowName");
            var mask = parseInt($input.val(), 16);
            if (isNaN(mask)) valid = false;
            masks[rowName == "Othermask" ? "othermasks" : "selfmasks"][num] = mask;
        });
        if (valid) {
            var connections = SelfmaskPluginManager.masksToConnections(
                masks,
                SelfmaskPluginManager.populationsCount
            );
            return connections;
        }
        return null;
    };

    HexesSelfmaskPlugin.prototype.inputValueChanged = function () {
        var connections = this.getConnections();
        if (connections == null) {
            this.fillForm(
                SelfmaskPluginManager.populationsCount,
                SelfmaskPluginManager.connections
            );
        } else {
            SelfmaskPluginManager.setConnections(connections);
        }
    };

    HexesSelfmaskPlugin.prototype.fillForm = function (populationsCount,
														connections) {
        var masks = SelfmaskPluginManager.connectionsToMasks(
												connections, populationsCount);

        $("input.hexes").each(function (key, val) {
            var $input = $(val);
            var num = $input.data('number');
            if ($input.data('rowName') == 'Othermask') {
                $input.val(SelfmaskPluginManager.intToHex(masks.othermasks[num]));
            } else if ($input.data('rowName') == 'Selfmask') {
                $input.val(SelfmaskPluginManager.intToHex(masks.selfmasks[num]));
            }
        });
    };

    HexesSelfmaskPlugin.prototype.rebuild = function (populationsCount,
													  names,
													  connections) {
        console.log("Hexes plugin");
        this.buildForm(populationsCount, names);
        this.fillForm(populationsCount, connections);
    };

    /*
     * Singleton plugin manager
     */
    SelfmaskPluginManager = {
        names: [],
        populationsCount: 4,
        // first key should always be less or equal second
        connections: { 1: { 2: "own" }, 2: { 2: "std", 3: "std" }, 3: { 4: "both" } },
        plugins: [
			new ComboboxSelfmaskPlugin(),
			new HexesSelfmaskPlugin(),
            new CanvasNetworkPlugin()
			// insert here new plugins
        ],

        connectionToMask: function (to, connection) {
            var offset = (to - 1);
            var mask = 1 << offset;

            if (connection == "both") {
                mask = (mask << 16) | mask;
            } else if (connection == "own") {
                mask = (mask << 16);
            } else if (connection == "none") {
                mask = 0;
            }
            return mask;
        },

        maskToConnection: function (to, mask) {
            var lowmask = 1 << (to - 1);
            var highmask = lowmask << 16;
            var isCustom = mask & highmask,
				isStandard = mask & lowmask;

            if (isCustom && isStandard) {
                return "both";
            } else if (isCustom) {
                return "own";
            } else if (isStandard) {
                return "std";
            }
            return "none";
        },

        connectionsToMasks: function (connections, populationsCount) {
            var masks = { selfmasks: {}, othermasks: {} };
            for (var i = 1; i <= populationsCount; ++i) {
                masks.selfmasks[i] = this.connectionToMask(i, "both");
                masks.othermasks[i] = 0;
            }

            for (var from in connections) {
                var fromInt = parseInt(from);
                if (!isNaN(fromInt)) {
                    for (var to in connections[from]) {
                        var toInt = parseInt(to);
                        if (!isNaN(toInt)) {
                            masks.othermasks[from] |= this.connectionToMask(
								toInt, connections[from][to]
							);
                            masks.othermasks[to] |= this.connectionToMask(
								fromInt, connections[from][to]
							);
                        }
                    }
                }
            }
            return masks;
        },

        masksToConnections: function (masks, populationsCount) {
            var connections = {};
            for (var i = 1; i <= populationsCount; ++i) {
                var conns = {};
                for (var j = i; j <= populationsCount; ++j) {
                    var connection = this.maskToConnection(i,
									  	  	  	masks.othermasks[j]);
                    if (connection != "none") {
                        conns[j] = connection;
                    }
                }
                if (!$.isEmptyObject(conns)) {
                    connections[i] = conns;
                }
            }
            return connections;
        },

        connectionToName: function(connection) {
            if (connection == "both") {
                return "Both";
            } else if (connection == "own") {
                return "Custom";
            } else if (connection == "std") {
                return "Standard";
            }
            return "None";
        },

        resetInputNamesValues: function() {
            var names = this.names;
            $(".name-input").each(function (key, val) {
                var $this = $(this);
                var num = $this.data('number');
                $this.val(names[num-1]);
            });
        },

        rebuildNamesPanel: function() {
            var panel = $("#populations-names-panel");
            panel.empty();

            for (var i = 1; i <= this.populationsCount; ++i) {
                var wrapper = $('<div class="col-md-3"/>');
                var input = $('<input type="text" class="form-control input-sm name-input"/>');
                input.data('number', i);
                wrapper.append(input);
                panel.append(wrapper);
            }
            this.resetInputNamesValues();
            $('.name-input').change($.proxy(SelfmaskPluginManager.namesChanged, SelfmaskPluginManager));
        },

        rebuild: function () {
            this.rebuildNamesPanel();

            this.plugins.forEach(function (elem) {
                console.log("initializing plugin: ", elem);
                elem.rebuild(this.populationsCount, this.names, this.connections);
            }, this);
        },

        namesChanged: function() {
            if ($('.name-input').is(function() {
                    return $(this).val() == '';
                })) {
                resetInputNamesValues();
            } else {
                var names = [];
                $('.name-input').each( function(key, val) {
                    names[$(this).data('number')-1] = $(this).val();
                });
                this.names = names;
                this.rebuild();
            }
        },

        setConnections: function (connections) {
            this.connections = connections;
            this.rebuild();
        },

        trimConnections: function () {
            var connections = {};
            for (var from in this.connections) {
                if (from <= this.populationsCount) {
                    var conns = {};
                    for (var to in this.connections[from])
                        if (to <= this.populationsCount)
                            conns[to] = this.connections[from][to];
                    if (!$.isEmptyObject(conns))
                        connections[from] = conns;
                }
            }
            this.connections = connections;
        },

        setPopulationsCount: function (populationsCount) {
            this.populationsCount = parseInt(populationsCount);
            this.trimConnections();
            this.rebuild();
        },


        intToHex: function (num) {
            return "0x" + (("00000000" + num.toString(16)).substr(-8));
        },

        connectionToColor: function (connection) {
            return {
                both: '#2196F3',
                own: '#8BC34A',
                std: '#FF9800',
                none: 'gray'
            }[connection];
        },

        init: function () {
            this.populationsCount = 4;
            $("#populations-count-select").val(this.populationsCount);

            this.names = [];
            for (var i = 1; i <= this.populationsCount; ++i) {
                this.names.push("Pop " + i);
            }

            this.rebuild();
        }
    };

    SelfmaskPluginManager.init();

    $("#populations-count-select").change(function () {
        SelfmaskPluginManager.setPopulationsCount($(this).val());
    });
});
