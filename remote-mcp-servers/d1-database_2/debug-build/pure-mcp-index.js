"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
// Direct JSON Schema definitions (no more Zod complexity!)
var toolSchemas = {
    initialize_travel_schema: {
        type: 'object',
        properties: {},
        required: []
    },
    store_travel_search: {
        type: 'object',
        properties: {
            search_type: {
                type: 'string',
                description: 'Type of search (flight, hotel, package)'
            },
            origin: {
                type: 'string',
                description: 'Origin location'
            },
            destination: {
                type: 'string',
                description: 'Destination location'
            },
            departure_date: {
                type: 'string',
                description: 'Departure date'
            },
            return_date: {
                type: 'string',
                description: 'Return date'
            },
            passengers: {
                type: 'number',
                description: 'Number of passengers'
            },
            budget_limit: {
                type: 'number',
                description: 'Budget limit'
            },
            search_parameters: {
                type: 'string',
                description: 'Full search parameters as JSON'
            },
            results_summary: {
                type: 'string',
                description: 'Summary of search results'
            },
            user_id: {
                type: 'string',
                description: 'User identifier'
            }
        },
        required: ['search_type']
    },
    get_search_history: {
        type: 'object',
        properties: {
            user_id: {
                type: 'string',
                description: 'User ID to filter by'
            },
            search_type: {
                type: 'string',
                description: 'Search type to filter by'
            },
            limit: {
                type: 'number',
                description: 'Maximum number of results'
            }
        },
        required: []
    },
    get_popular_routes: {
        type: 'object',
        properties: {
            limit: {
                type: 'number',
                description: 'Maximum number of routes to return'
            }
        },
        required: []
    },
    store_user_preference: {
        type: 'object',
        properties: {
            user_id: {
                type: 'string',
                description: 'User identifier'
            },
            preference_type: {
                type: 'string',
                description: 'Type of preference (airline, seat_type, meal, etc.)'
            },
            preference_value: {
                type: 'string',
                description: 'Preference value'
            }
        },
        required: ['user_id', 'preference_type', 'preference_value']
    },
    get_user_preferences: {
        type: 'object',
        properties: {
            user_id: {
                type: 'string',
                description: 'User identifier'
            },
            preference_type: {
                type: 'string',
                description: 'Specific preference type to retrieve'
            }
        },
        required: ['user_id']
    },
    execute_query: {
        type: 'object',
        properties: {
            query: {
                type: 'string',
                description: 'SQL query to execute'
            },
            params: {
                type: 'array',
                items: {},
                description: 'Query parameters'
            }
        },
        required: ['query']
    },
    get_database_schema: {
        type: 'object',
        properties: {},
        required: []
    }
};
// No conversion needed - we use direct JSON schemas!
// Tool implementations
var D1DatabaseTools = /** @class */ (function () {
    function D1DatabaseTools(env) {
        this.env = env;
    }
    D1DatabaseTools.prototype.initialize_travel_schema = function () {
        return __awaiter(this, void 0, void 0, function () {
            var error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 4, , 5]);
                        // Create searches table
                        return [4 /*yield*/, this.env.DB.prepare("\n\t\t\t\tCREATE TABLE IF NOT EXISTS travel_searches (\n\t\t\t\t\tid INTEGER PRIMARY KEY AUTOINCREMENT,\n\t\t\t\t\tsearch_type TEXT NOT NULL,\n\t\t\t\t\torigin TEXT,\n\t\t\t\t\tdestination TEXT,\n\t\t\t\t\tdeparture_date TEXT,\n\t\t\t\t\treturn_date TEXT,\n\t\t\t\t\tpassengers INTEGER DEFAULT 1,\n\t\t\t\t\tbudget_limit REAL,\n\t\t\t\t\tsearch_parameters TEXT,\n\t\t\t\t\tresults_summary TEXT,\n\t\t\t\t\tcreated_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n\t\t\t\t\tuser_id TEXT DEFAULT 'anonymous'\n\t\t\t\t)\n\t\t\t").run()];
                    case 1:
                        // Create searches table
                        _a.sent();
                        // Create user preferences table
                        return [4 /*yield*/, this.env.DB.prepare("\n\t\t\t\tCREATE TABLE IF NOT EXISTS user_preferences (\n\t\t\t\t\tid INTEGER PRIMARY KEY AUTOINCREMENT,\n\t\t\t\t\tuser_id TEXT NOT NULL,\n\t\t\t\t\tpreference_type TEXT NOT NULL,\n\t\t\t\t\tpreference_value TEXT,\n\t\t\t\t\tcreated_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n\t\t\t\t\tupdated_at DATETIME DEFAULT CURRENT_TIMESTAMP\n\t\t\t\t)\n\t\t\t").run()];
                    case 2:
                        // Create user preferences table
                        _a.sent();
                        // Create popular routes view
                        return [4 /*yield*/, this.env.DB.prepare("\n\t\t\t\tCREATE VIEW IF NOT EXISTS popular_routes AS\n\t\t\t\tSELECT\n\t\t\t\t\torigin,\n\t\t\t\t\tdestination,\n\t\t\t\t\tCOUNT(*) as search_count,\n\t\t\t\t\tAVG(budget_limit) as avg_budget,\n\t\t\t\t\tMAX(created_at) as last_searched\n\t\t\t\tFROM travel_searches\n\t\t\t\tWHERE origin IS NOT NULL AND destination IS NOT NULL\n\t\t\t\tGROUP BY origin, destination\n\t\t\t\tORDER BY search_count DESC\n\t\t\t").run()];
                    case 3:
                        // Create popular routes view
                        _a.sent();
                        return [2 /*return*/, {
                                content: [{
                                        type: "text",
                                        text: "✅ Travel database schema initialized successfully"
                                    }]
                            }];
                    case 4:
                        error_1 = _a.sent();
                        return [2 /*return*/, {
                                content: [{
                                        type: "text",
                                        text: "\u274C Error initializing schema: ".concat(error_1)
                                    }]
                            }];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    D1DatabaseTools.prototype.store_travel_search = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            var result, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.env.DB.prepare("\n\t\t\t\tINSERT INTO travel_searches\n\t\t\t\t(search_type, origin, destination, departure_date, return_date,\n\t\t\t\t passengers, budget_limit, search_parameters, results_summary, user_id)\n\t\t\t\tVALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\n\t\t\t").bind(params.search_type, params.origin || null, params.destination || null, params.departure_date || null, params.return_date || null, params.passengers || 1, params.budget_limit || null, params.search_parameters || null, params.results_summary || null, params.user_id || 'anonymous').run()];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, {
                                content: [{
                                        type: "text",
                                        text: "\u2705 Travel search stored with ID: ".concat(result.meta.last_row_id)
                                    }]
                            }];
                    case 2:
                        error_2 = _a.sent();
                        return [2 /*return*/, {
                                content: [{
                                        type: "text",
                                        text: "\u274C Error storing search: ".concat(error_2)
                                    }]
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    D1DatabaseTools.prototype.get_search_history = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            var query, bindings, result, error_3;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        query = "SELECT * FROM travel_searches WHERE 1=1";
                        bindings = [];
                        if (params.user_id) {
                            query += " AND user_id = ?";
                            bindings.push(params.user_id);
                        }
                        if (params.search_type) {
                            query += " AND search_type = ?";
                            bindings.push(params.search_type);
                        }
                        query += " ORDER BY created_at DESC";
                        if (params.limit) {
                            query += " LIMIT ?";
                            bindings.push(params.limit);
                        }
                        return [4 /*yield*/, (_a = this.env.DB.prepare(query)).bind.apply(_a, bindings).all()];
                    case 1:
                        result = _b.sent();
                        return [2 /*return*/, {
                                content: [{
                                        type: "text",
                                        text: "\uD83D\uDCCB Found ".concat(result.results.length, " travel searches:\n\n").concat(JSON.stringify(result.results, null, 2))
                                    }]
                            }];
                    case 2:
                        error_3 = _b.sent();
                        return [2 /*return*/, {
                                content: [{
                                        type: "text",
                                        text: "\u274C Error retrieving search history: ".concat(error_3)
                                    }]
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    D1DatabaseTools.prototype.get_popular_routes = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            var query, result, result, error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 5, , 6]);
                        query = "SELECT * FROM popular_routes";
                        if (!params.limit) return [3 /*break*/, 2];
                        query += " LIMIT ?";
                        return [4 /*yield*/, this.env.DB.prepare(query).bind(params.limit).all()];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, {
                                content: [{
                                        type: "text",
                                        text: "\uD83D\uDD25 Top ".concat(result.results.length, " popular routes:\n\n").concat(JSON.stringify(result.results, null, 2))
                                    }]
                            }];
                    case 2: return [4 /*yield*/, this.env.DB.prepare(query).all()];
                    case 3:
                        result = _a.sent();
                        return [2 /*return*/, {
                                content: [{
                                        type: "text",
                                        text: "\uD83D\uDD25 All popular routes (".concat(result.results.length, " total):\n\n").concat(JSON.stringify(result.results, null, 2))
                                    }]
                            }];
                    case 4: return [3 /*break*/, 6];
                    case 5:
                        error_4 = _a.sent();
                        return [2 /*return*/, {
                                content: [{
                                        type: "text",
                                        text: "\u274C Error retrieving popular routes: ".concat(error_4)
                                    }]
                            }];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    D1DatabaseTools.prototype.store_user_preference = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            var existing, error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 6, , 7]);
                        return [4 /*yield*/, this.env.DB.prepare("\n\t\t\t\tSELECT id FROM user_preferences\n\t\t\t\tWHERE user_id = ? AND preference_type = ?\n\t\t\t").bind(params.user_id, params.preference_type).first()];
                    case 1:
                        existing = _a.sent();
                        if (!existing) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.env.DB.prepare("\n\t\t\t\t\tUPDATE user_preferences\n\t\t\t\t\tSET preference_value = ?, updated_at = CURRENT_TIMESTAMP\n\t\t\t\t\tWHERE user_id = ? AND preference_type = ?\n\t\t\t\t").bind(params.preference_value, params.user_id, params.preference_type).run()];
                    case 2:
                        _a.sent();
                        return [2 /*return*/, {
                                content: [{
                                        type: "text",
                                        text: "\u2705 Updated preference for ".concat(params.user_id, ": ").concat(params.preference_type, " = ").concat(params.preference_value)
                                    }]
                            }];
                    case 3: return [4 /*yield*/, this.env.DB.prepare("\n\t\t\t\t\tINSERT INTO user_preferences (user_id, preference_type, preference_value)\n\t\t\t\t\tVALUES (?, ?, ?)\n\t\t\t\t").bind(params.user_id, params.preference_type, params.preference_value).run()];
                    case 4:
                        _a.sent();
                        return [2 /*return*/, {
                                content: [{
                                        type: "text",
                                        text: "\u2705 Stored new preference for ".concat(params.user_id, ": ").concat(params.preference_type, " = ").concat(params.preference_value)
                                    }]
                            }];
                    case 5: return [3 /*break*/, 7];
                    case 6:
                        error_5 = _a.sent();
                        return [2 /*return*/, {
                                content: [{
                                        type: "text",
                                        text: "\u274C Error storing preference: ".concat(error_5)
                                    }]
                            }];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    D1DatabaseTools.prototype.get_user_preferences = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            var query, bindings, result, error_6;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        query = "SELECT * FROM user_preferences WHERE user_id = ?";
                        bindings = [params.user_id];
                        if (params.preference_type) {
                            query += " AND preference_type = ?";
                            bindings.push(params.preference_type);
                        }
                        query += " ORDER BY updated_at DESC";
                        return [4 /*yield*/, (_a = this.env.DB.prepare(query)).bind.apply(_a, bindings).all()];
                    case 1:
                        result = _b.sent();
                        return [2 /*return*/, {
                                content: [{
                                        type: "text",
                                        text: "\uD83D\uDC64 Preferences for ".concat(params.user_id, ":\n\n").concat(JSON.stringify(result.results, null, 2))
                                    }]
                            }];
                    case 2:
                        error_6 = _b.sent();
                        return [2 /*return*/, {
                                content: [{
                                        type: "text",
                                        text: "\u274C Error retrieving preferences: ".concat(error_6)
                                    }]
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    D1DatabaseTools.prototype.execute_query = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            var trimmedQuery, stmt, result, _a, error_7;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 5, , 6]);
                        trimmedQuery = params.query.trim().toLowerCase();
                        if (!trimmedQuery.startsWith('select')) {
                            return [2 /*return*/, {
                                    content: [{
                                            type: "text",
                                            text: "\u274C Only SELECT queries are allowed for security reasons"
                                        }]
                                }];
                        }
                        stmt = this.env.DB.prepare(params.query);
                        if (!params.params) return [3 /*break*/, 2];
                        return [4 /*yield*/, stmt.bind.apply(stmt, params.params).all()];
                    case 1:
                        _a = _b.sent();
                        return [3 /*break*/, 4];
                    case 2: return [4 /*yield*/, stmt.all()];
                    case 3:
                        _a = _b.sent();
                        _b.label = 4;
                    case 4:
                        result = _a;
                        return [2 /*return*/, {
                                content: [{
                                        type: "text",
                                        text: "\uD83D\uDCCA Query results (".concat(result.results.length, " rows):\n\n").concat(JSON.stringify(result.results, null, 2))
                                    }]
                            }];
                    case 5:
                        error_7 = _b.sent();
                        return [2 /*return*/, {
                                content: [{
                                        type: "text",
                                        text: "\u274C Error executing query: ".concat(error_7)
                                    }]
                            }];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    D1DatabaseTools.prototype.get_database_schema = function () {
        return __awaiter(this, void 0, void 0, function () {
            var tables, views, schemaInfo, _i, _a, table, tableInfo, _b, _c, column, _d, _e, view, error_8;
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0:
                        _f.trys.push([0, 7, , 8]);
                        return [4 /*yield*/, this.env.DB.prepare("\n\t\t\t\tSELECT name FROM sqlite_master\n\t\t\t\tWHERE type='table' AND name NOT LIKE 'sqlite_%'\n\t\t\t\tORDER BY name\n\t\t\t").all()];
                    case 1:
                        tables = _f.sent();
                        return [4 /*yield*/, this.env.DB.prepare("\n\t\t\t\tSELECT name FROM sqlite_master\n\t\t\t\tWHERE type='view'\n\t\t\t\tORDER BY name\n\t\t\t").all()];
                    case 2:
                        views = _f.sent();
                        schemaInfo = "📋 **Database Schema**\n\n";
                        schemaInfo += "**Tables:**\n";
                        _i = 0, _a = tables.results;
                        _f.label = 3;
                    case 3:
                        if (!(_i < _a.length)) return [3 /*break*/, 6];
                        table = _a[_i];
                        return [4 /*yield*/, this.env.DB.prepare("\n\t\t\t\t\tPRAGMA table_info(".concat(table.name, ")\n\t\t\t\t")).all()];
                    case 4:
                        tableInfo = _f.sent();
                        schemaInfo += "\n\u2022 **".concat(table.name, "**\n");
                        for (_b = 0, _c = tableInfo.results; _b < _c.length; _b++) {
                            column = _c[_b];
                            schemaInfo += "  - ".concat(column.name, ": ").concat(column.type).concat(column.notnull ? ' NOT NULL' : '').concat(column.pk ? ' PRIMARY KEY' : '', "\n");
                        }
                        _f.label = 5;
                    case 5:
                        _i++;
                        return [3 /*break*/, 3];
                    case 6:
                        if (views.results.length > 0) {
                            schemaInfo += "\n**Views:**\n";
                            for (_d = 0, _e = views.results; _d < _e.length; _d++) {
                                view = _e[_d];
                                schemaInfo += "\u2022 ".concat(view.name, "\n");
                            }
                        }
                        return [2 /*return*/, {
                                content: [{
                                        type: "text",
                                        text: schemaInfo
                                    }]
                            }];
                    case 7:
                        error_8 = _f.sent();
                        return [2 /*return*/, {
                                content: [{
                                        type: "text",
                                        text: "\u274C Error retrieving schema: ".concat(error_8)
                                    }]
                            }];
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    return D1DatabaseTools;
}());
// Pure MCP JSON-RPC 2.0 Handler
var PureMCPServer = /** @class */ (function () {
    function PureMCPServer(env) {
        this.tools = new D1DatabaseTools(env);
    }
    PureMCPServer.prototype.handleRequest = function (request) {
        return __awaiter(this, void 0, void 0, function () {
            var method, params, id, _a, toolName, toolArgs, result, error_9;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        method = request.method, params = request.params, id = request.id;
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 9, , 10]);
                        _a = method;
                        switch (_a) {
                            case 'initialize': return [3 /*break*/, 2];
                            case 'tools/list': return [3 /*break*/, 3];
                            case 'tools/call': return [3 /*break*/, 4];
                            case 'ping': return [3 /*break*/, 6];
                        }
                        return [3 /*break*/, 7];
                    case 2: return [2 /*return*/, {
                            jsonrpc: '2.0',
                            id: id,
                            result: {
                                protocolVersion: '2024-11-05',
                                capabilities: {
                                    tools: {}
                                },
                                serverInfo: {
                                    name: 'D1 Travel Database',
                                    version: '3.0.0'
                                }
                            }
                        }];
                    case 3:
                        // DEBUG: Log schemas to see what's happening
                        console.log('DEBUG: toolSchemas object keys:', Object.keys(toolSchemas));
                        console.log('DEBUG: store_travel_search schema:', JSON.stringify(toolSchemas.store_travel_search, null, 2));
                        return [2 /*return*/, {
                                jsonrpc: '2.0',
                                id: id,
                                result: {
                                    tools: [
                                        {
                                            name: 'initialize_travel_schema',
                                            description: 'Initialize the travel database schema with tables and views',
                                            inputSchema: toolSchemas.initialize_travel_schema
                                        },
                                        {
                                            name: 'store_travel_search',
                                            description: 'Store a travel search in the database',
                                            inputSchema: toolSchemas.store_travel_search
                                        },
                                        {
                                            name: 'get_search_history',
                                            description: 'Retrieve travel search history',
                                            inputSchema: toolSchemas.get_search_history
                                        },
                                        {
                                            name: 'get_popular_routes',
                                            description: 'Get popular travel routes based on search history',
                                            inputSchema: toolSchemas.get_popular_routes
                                        },
                                        {
                                            name: 'store_user_preference',
                                            description: 'Store or update a user preference',
                                            inputSchema: toolSchemas.store_user_preference
                                        },
                                        {
                                            name: 'get_user_preferences',
                                            description: 'Retrieve user preferences',
                                            inputSchema: toolSchemas.get_user_preferences
                                        },
                                        {
                                            name: 'execute_query',
                                            description: 'Execute a custom SQL SELECT query',
                                            inputSchema: toolSchemas.execute_query
                                        },
                                        {
                                            name: 'get_database_schema',
                                            description: 'Get the database schema information',
                                            inputSchema: toolSchemas.get_database_schema
                                        }
                                    ]
                                }
                            }];
                    case 4:
                        toolName = params.name;
                        toolArgs = params.arguments || {};
                        // Validate tool exists
                        if (!(toolName in toolSchemas)) {
                            throw new Error("Unknown tool: ".concat(toolName));
                        }
                        return [4 /*yield*/, this.tools[toolName](toolArgs)];
                    case 5:
                        result = _b.sent();
                        return [2 /*return*/, {
                                jsonrpc: '2.0',
                                id: id,
                                result: result
                            }];
                    case 6: return [2 /*return*/, {
                            jsonrpc: '2.0',
                            id: id,
                            result: {}
                        }];
                    case 7: throw new Error("Unknown method: ".concat(method));
                    case 8: return [3 /*break*/, 10];
                    case 9:
                        error_9 = _b.sent();
                        return [2 /*return*/, {
                                jsonrpc: '2.0',
                                id: id,
                                error: {
                                    code: -32603,
                                    message: 'Internal error',
                                    data: String(error_9)
                                }
                            }];
                    case 10: return [2 /*return*/];
                }
            });
        });
    };
    return PureMCPServer;
}());
// Cloudflare Worker Export
exports.default = {
    fetch: function (request, env, ctx) {
        return __awaiter(this, void 0, void 0, function () {
            var url, corsHeaders, server, body, response, error_10;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        url = new URL(request.url);
                        corsHeaders = {
                            'Access-Control-Allow-Origin': '*',
                            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                        };
                        // Handle CORS preflight
                        if (request.method === 'OPTIONS') {
                            return [2 /*return*/, new Response(null, { headers: corsHeaders })];
                        }
                        if (!(url.pathname === '/sse')) return [3 /*break*/, 6];
                        server = new PureMCPServer(env);
                        if (!(request.method === 'POST')) return [3 /*break*/, 5];
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 4, , 5]);
                        return [4 /*yield*/, request.json()];
                    case 2:
                        body = _a.sent();
                        return [4 /*yield*/, server.handleRequest(body)];
                    case 3:
                        response = _a.sent();
                        // Return SSE-formatted response
                        return [2 /*return*/, new Response("data: ".concat(JSON.stringify(response), "\n\n"), {
                                headers: __assign({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' }, corsHeaders)
                            })];
                    case 4:
                        error_10 = _a.sent();
                        return [2 /*return*/, new Response("data: ".concat(JSON.stringify({
                                jsonrpc: '2.0',
                                error: {
                                    code: -32700,
                                    message: 'Parse error',
                                    data: String(error_10)
                                }
                            }), "\n\n"), {
                                headers: __assign({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' }, corsHeaders)
                            })];
                    case 5: 
                    // For GET requests, return a simple SSE connection
                    return [2 /*return*/, new Response("data: {\"jsonrpc\":\"2.0\",\"method\":\"ping\",\"result\":{}}\n\n", {
                            headers: __assign({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' }, corsHeaders)
                        })];
                    case 6:
                        // Health check endpoint
                        if (url.pathname === '/health') {
                            return [2 /*return*/, new Response(JSON.stringify({
                                    status: 'healthy',
                                    service: 'Pure D1 Travel Database MCP v3',
                                    timestamp: new Date().toISOString()
                                }), {
                                    headers: __assign({ 'Content-Type': 'application/json' }, corsHeaders)
                                })];
                        }
                        // Default response
                        return [2 /*return*/, new Response(JSON.stringify({
                                error: 'Not found',
                                available_endpoints: ['/sse', '/health']
                            }), {
                                status: 404,
                                headers: __assign({ 'Content-Type': 'application/json' }, corsHeaders)
                            })];
                }
            });
        });
    }
};
