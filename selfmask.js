var cy;
var SelfmaskPluginManager;

$(function () {
    cy = cytoscape({
        /* ... */

        container: document.getElementById('network-graph'),

        zoomingEnabled: false,
        panningEnabled: false,
        bexSelectionEnabled: true,
        hideLabelsOnViewport: false,
        nodeLabelsVisible: true,
        edgeLabelsVisible: true,

        motionBlur: true,

        style: [
            {
                selector: 'node',
                css: {
                    'content': 'data(name)',
                    'width': 80,
                    'height': 80,
                    'text-valign': 'center',
                    'color': 'white'
                }
            },
            {
                selector: 'edge',
                css: {
                    'width': '5',
                    'content': 'data(name)',
                    'color': 'white',
                    'line-color': 'data(color)',
                    'text-outline-width': 5,
                    'text-outline-color': 'data(color)'
                }
            }
        ]
    });

    function CytoscapeNetworkPlugin() {}
    CytoscapeNetworkPlugin.prototype.generateNodes = function (populationsCount, names) {
        var nodes = [];

        // TODO positions dependent of populationsCount

        for (var i = 0; i < populationsCount; ++i) {
            nodes.push({
                group: "nodes",
                data: {
                    id: names[i],
                    name: names[i],
                    col: i%2,
                    row: i > 1 ? 1 : 0
                },
                grabbable: false
            });
        }

        return nodes;
    }

    CytoscapeNetworkPlugin.prototype.generateEdges = function (populationsCount, names, connections) {
        var edges = [];
        for (var from in connections) {
            for (var to in connections[from]) {
                edges.push({
                    group: "edges",
                    data: {
                        // id
                        source: names[from - 1],
                        target: names[to - 1],
                        color: SelfmaskPluginManager.connectionToColor(connections[from][to]),
                        name: SelfmaskPluginManager.connectionToName(connections[from][to])
                    },
                    classes: 'network-connection ' + connections[from][to]
                });
            }
        }
        return edges;
    }

    CytoscapeNetworkPlugin.prototype.rebuild = function (populationsCount,
                                                        names,
                                                        connections) {
        var elems = this.generateNodes(populationsCount, names).concat(
            this.generateEdges(populationsCount, names, connections)
        );
        cy.batch(function () {
            cy.remove("edge");
            cy.remove("node");
            cy.$('edge').clearQueue();
            cy.$('node').clearQueue();
            cy.add(elems);
        });
        cy.layout({
            name: 'grid',
            padding: 30,
            fit: true,
            rows: 2, // force num of rows in the grid
            columns: 2, // force num of cols in the grid
            position: function( node ) {
                return {row: node.data('row'), col: node.data('col')};
            }, // returns { row, col } for element
            //animate: false, // whether to transition the node positions
        });
    }

    /**
	 * TablePlugin
	 */
    function TablePlugin() { }
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
    }

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
    }

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
    }

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
    }

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
    }

    /*
	 * HexesPlugin
	 */
    function HexesSelfmaskPlugin() { }

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
    }

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
    }

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
    }

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
    }

    HexesSelfmaskPlugin.prototype.rebuild = function (populationsCount,
													  names,
													  connections) {
        console.log("Hexes plugin");
        this.buildForm(populationsCount, names);
        this.fillForm(populationsCount, connections);
    }

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
            new CytoscapeNetworkPlugin()
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
    })
});
