"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
exports.D1TravelMCP = void 0;
var mcp_1 = require("agents/mcp");
var mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
var zod_1 = require("zod");
// Define our D1 Travel Database MCP agent
var D1TravelMCP = /** @class */ (function (_super) {
    __extends(D1TravelMCP, _super);
    function D1TravelMCP() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.server = new mcp_js_1.McpServer({
            name: "D1 Travel Database",
            version: "2.0.0",
        });
        return _this;
    }
    D1TravelMCP.prototype.init = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                // Initialize database schema
                this.server.tool("initialize_travel_schema", {}, function () { return __awaiter(_this, void 0, void 0, function () {
                    var env, error_1;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                env = this.env;
                                _a.label = 1;
                            case 1:
                                _a.trys.push([1, 5, , 6]);
                                // Create searches table
                                return [4 /*yield*/, env.DB.prepare("\n\t\t\t\t\t\tCREATE TABLE IF NOT EXISTS travel_searches (\n\t\t\t\t\t\t\tid INTEGER PRIMARY KEY AUTOINCREMENT,\n\t\t\t\t\t\t\tsearch_type TEXT NOT NULL,\n\t\t\t\t\t\t\torigin TEXT,\n\t\t\t\t\t\t\tdestination TEXT,\n\t\t\t\t\t\t\tdeparture_date TEXT,\n\t\t\t\t\t\t\treturn_date TEXT,\n\t\t\t\t\t\t\tpassengers INTEGER DEFAULT 1,\n\t\t\t\t\t\t\tbudget_limit REAL,\n\t\t\t\t\t\t\tsearch_parameters TEXT,\n\t\t\t\t\t\t\tresults_summary TEXT,\n\t\t\t\t\t\t\tcreated_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n\t\t\t\t\t\t\tuser_id TEXT DEFAULT 'anonymous'\n\t\t\t\t\t\t)\n\t\t\t\t\t").run()];
                            case 2:
                                // Create searches table
                                _a.sent();
                                // Create user preferences table
                                return [4 /*yield*/, env.DB.prepare("\n\t\t\t\t\t\tCREATE TABLE IF NOT EXISTS user_preferences (\n\t\t\t\t\t\t\tid INTEGER PRIMARY KEY AUTOINCREMENT,\n\t\t\t\t\t\t\tuser_id TEXT NOT NULL,\n\t\t\t\t\t\t\tpreference_type TEXT NOT NULL,\n\t\t\t\t\t\t\tpreference_value TEXT,\n\t\t\t\t\t\t\tcreated_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n\t\t\t\t\t\t\tupdated_at DATETIME DEFAULT CURRENT_TIMESTAMP\n\t\t\t\t\t\t)\n\t\t\t\t\t").run()];
                            case 3:
                                // Create user preferences table
                                _a.sent();
                                // Create popular routes view
                                return [4 /*yield*/, env.DB.prepare("\n\t\t\t\t\t\tCREATE VIEW IF NOT EXISTS popular_routes AS\n\t\t\t\t\t\tSELECT\n\t\t\t\t\t\t\torigin,\n\t\t\t\t\t\t\tdestination,\n\t\t\t\t\t\t\tCOUNT(*) as search_count,\n\t\t\t\t\t\t\tAVG(budget_limit) as avg_budget,\n\t\t\t\t\t\t\tMAX(created_at) as last_searched\n\t\t\t\t\t\tFROM travel_searches\n\t\t\t\t\t\tWHERE origin IS NOT NULL AND destination IS NOT NULL\n\t\t\t\t\t\tGROUP BY origin, destination\n\t\t\t\t\t\tORDER BY search_count DESC\n\t\t\t\t\t").run()];
                            case 4:
                                // Create popular routes view
                                _a.sent();
                                return [2 /*return*/, {
                                        content: [{
                                                type: "text",
                                                text: "✅ Travel database schema initialized successfully"
                                            }]
                                    }];
                            case 5:
                                error_1 = _a.sent();
                                return [2 /*return*/, {
                                        content: [{
                                                type: "text",
                                                text: "\u274C Error initializing schema: ".concat(error_1)
                                            }]
                                    }];
                            case 6: return [2 /*return*/];
                        }
                    });
                }); });
                // Store travel search
                this.server.tool("store_travel_search", {
                    search_type: zod_1.z.string().describe("Type of search (flight, hotel, package)"),
                    origin: zod_1.z.string().optional().describe("Origin location"),
                    destination: zod_1.z.string().optional().describe("Destination location"),
                    departure_date: zod_1.z.string().optional().describe("Departure date"),
                    return_date: zod_1.z.string().optional().describe("Return date"),
                    passengers: zod_1.z.number().optional().describe("Number of passengers"),
                    budget_limit: zod_1.z.number().optional().describe("Budget limit"),
                    search_parameters: zod_1.z.string().optional().describe("Full search parameters as JSON"),
                    results_summary: zod_1.z.string().optional().describe("Summary of search results"),
                    user_id: zod_1.z.string().optional().describe("User identifier")
                }, function (params) { return __awaiter(_this, void 0, void 0, function () {
                    var env, result, error_2;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                env = this.env;
                                _a.label = 1;
                            case 1:
                                _a.trys.push([1, 3, , 4]);
                                return [4 /*yield*/, env.DB.prepare("\n\t\t\t\t\t\tINSERT INTO travel_searches\n\t\t\t\t\t\t(search_type, origin, destination, departure_date, return_date,\n\t\t\t\t\t\t passengers, budget_limit, search_parameters, results_summary, user_id)\n\t\t\t\t\t\tVALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\n\t\t\t\t\t").bind(params.search_type, params.origin || null, params.destination || null, params.departure_date || null, params.return_date || null, params.passengers || 1, params.budget_limit || null, params.search_parameters || null, params.results_summary || null, params.user_id || 'anonymous').run()];
                            case 2:
                                result = _a.sent();
                                return [2 /*return*/, {
                                        content: [{
                                                type: "text",
                                                text: "\u2705 Travel search stored with ID: ".concat(result.meta.last_row_id)
                                            }]
                                    }];
                            case 3:
                                error_2 = _a.sent();
                                return [2 /*return*/, {
                                        content: [{
                                                type: "text",
                                                text: "\u274C Error storing search: ".concat(error_2)
                                            }]
                                    }];
                            case 4: return [2 /*return*/];
                        }
                    });
                }); });
                // Get search history
                this.server.tool("get_search_history", {
                    user_id: zod_1.z.string().optional().describe("User ID to filter by"),
                    search_type: zod_1.z.string().optional().describe("Search type to filter by"),
                    limit: zod_1.z.number().optional().describe("Maximum number of results")
                }, function (params) { return __awaiter(_this, void 0, void 0, function () {
                    var env, query, bindings, result, error_3;
                    var _a;
                    return __generator(this, function (_b) {
                        switch (_b.label) {
                            case 0:
                                env = this.env;
                                _b.label = 1;
                            case 1:
                                _b.trys.push([1, 3, , 4]);
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
                                return [4 /*yield*/, (_a = env.DB.prepare(query)).bind.apply(_a, bindings).all()];
                            case 2:
                                result = _b.sent();
                                return [2 /*return*/, {
                                        content: [{
                                                type: "text",
                                                text: "\uD83D\uDCCB Found ".concat(result.results.length, " travel searches:\n\n").concat(JSON.stringify(result.results, null, 2))
                                            }]
                                    }];
                            case 3:
                                error_3 = _b.sent();
                                return [2 /*return*/, {
                                        content: [{
                                                type: "text",
                                                text: "\u274C Error retrieving search history: ".concat(error_3)
                                            }]
                                    }];
                            case 4: return [2 /*return*/];
                        }
                    });
                }); });
                // Get popular routes
                this.server.tool("get_popular_routes", {
                    limit: zod_1.z.number().optional().describe("Maximum number of routes to return")
                }, function (params) { return __awaiter(_this, void 0, void 0, function () {
                    var env, query, result, result, error_4;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                env = this.env;
                                _a.label = 1;
                            case 1:
                                _a.trys.push([1, 6, , 7]);
                                query = "SELECT * FROM popular_routes";
                                if (!params.limit) return [3 /*break*/, 3];
                                query += " LIMIT ?";
                                return [4 /*yield*/, env.DB.prepare(query).bind(params.limit).all()];
                            case 2:
                                result = _a.sent();
                                return [2 /*return*/, {
                                        content: [{
                                                type: "text",
                                                text: "\uD83D\uDD25 Top ".concat(result.results.length, " popular routes:\n\n").concat(JSON.stringify(result.results, null, 2))
                                            }]
                                    }];
                            case 3: return [4 /*yield*/, env.DB.prepare(query).all()];
                            case 4:
                                result = _a.sent();
                                return [2 /*return*/, {
                                        content: [{
                                                type: "text",
                                                text: "\uD83D\uDD25 All popular routes (".concat(result.results.length, " total):\n\n").concat(JSON.stringify(result.results, null, 2))
                                            }]
                                    }];
                            case 5: return [3 /*break*/, 7];
                            case 6:
                                error_4 = _a.sent();
                                return [2 /*return*/, {
                                        content: [{
                                                type: "text",
                                                text: "\u274C Error retrieving popular routes: ".concat(error_4)
                                            }]
                                    }];
                            case 7: return [2 /*return*/];
                        }
                    });
                }); });
                // Store user preference
                this.server.tool("store_user_preference", {
                    user_id: zod_1.z.string().describe("User identifier"),
                    preference_type: zod_1.z.string().describe("Type of preference (airline, seat_type, meal, etc.)"),
                    preference_value: zod_1.z.string().describe("Preference value")
                }, function (params) { return __awaiter(_this, void 0, void 0, function () {
                    var env, existing, error_5;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                env = this.env;
                                _a.label = 1;
                            case 1:
                                _a.trys.push([1, 7, , 8]);
                                return [4 /*yield*/, env.DB.prepare("\n\t\t\t\t\t\tSELECT id FROM user_preferences\n\t\t\t\t\t\tWHERE user_id = ? AND preference_type = ?\n\t\t\t\t\t").bind(params.user_id, params.preference_type).first()];
                            case 2:
                                existing = _a.sent();
                                if (!existing) return [3 /*break*/, 4];
                                return [4 /*yield*/, env.DB.prepare("\n\t\t\t\t\t\t\tUPDATE user_preferences\n\t\t\t\t\t\t\tSET preference_value = ?, updated_at = CURRENT_TIMESTAMP\n\t\t\t\t\t\t\tWHERE user_id = ? AND preference_type = ?\n\t\t\t\t\t\t").bind(params.preference_value, params.user_id, params.preference_type).run()];
                            case 3:
                                _a.sent();
                                return [2 /*return*/, {
                                        content: [{
                                                type: "text",
                                                text: "\u2705 Updated preference for ".concat(params.user_id, ": ").concat(params.preference_type, " = ").concat(params.preference_value)
                                            }]
                                    }];
                            case 4: return [4 /*yield*/, env.DB.prepare("\n\t\t\t\t\t\t\tINSERT INTO user_preferences (user_id, preference_type, preference_value)\n\t\t\t\t\t\t\tVALUES (?, ?, ?)\n\t\t\t\t\t\t").bind(params.user_id, params.preference_type, params.preference_value).run()];
                            case 5:
                                _a.sent();
                                return [2 /*return*/, {
                                        content: [{
                                                type: "text",
                                                text: "\u2705 Stored new preference for ".concat(params.user_id, ": ").concat(params.preference_type, " = ").concat(params.preference_value)
                                            }]
                                    }];
                            case 6: return [3 /*break*/, 8];
                            case 7:
                                error_5 = _a.sent();
                                return [2 /*return*/, {
                                        content: [{
                                                type: "text",
                                                text: "\u274C Error storing preference: ".concat(error_5)
                                            }]
                                    }];
                            case 8: return [2 /*return*/];
                        }
                    });
                }); });
                // Get user preferences
                this.server.tool("get_user_preferences", {
                    user_id: zod_1.z.string().describe("User identifier"),
                    preference_type: zod_1.z.string().optional().describe("Specific preference type to retrieve")
                }, function (params) { return __awaiter(_this, void 0, void 0, function () {
                    var env, query, bindings, result, error_6;
                    var _a;
                    return __generator(this, function (_b) {
                        switch (_b.label) {
                            case 0:
                                env = this.env;
                                _b.label = 1;
                            case 1:
                                _b.trys.push([1, 3, , 4]);
                                query = "SELECT * FROM user_preferences WHERE user_id = ?";
                                bindings = [params.user_id];
                                if (params.preference_type) {
                                    query += " AND preference_type = ?";
                                    bindings.push(params.preference_type);
                                }
                                query += " ORDER BY updated_at DESC";
                                return [4 /*yield*/, (_a = env.DB.prepare(query)).bind.apply(_a, bindings).all()];
                            case 2:
                                result = _b.sent();
                                return [2 /*return*/, {
                                        content: [{
                                                type: "text",
                                                text: "\uD83D\uDC64 Preferences for ".concat(params.user_id, ":\n\n").concat(JSON.stringify(result.results, null, 2))
                                            }]
                                    }];
                            case 3:
                                error_6 = _b.sent();
                                return [2 /*return*/, {
                                        content: [{
                                                type: "text",
                                                text: "\u274C Error retrieving preferences: ".concat(error_6)
                                            }]
                                    }];
                            case 4: return [2 /*return*/];
                        }
                    });
                }); });
                // Execute custom SQL query
                this.server.tool("execute_query", {
                    query: zod_1.z.string().describe("SQL query to execute"),
                    params: zod_1.z.array(zod_1.z.unknown()).optional().describe("Query parameters")
                }, function (params) { return __awaiter(_this, void 0, void 0, function () {
                    var env, trimmedQuery, stmt, result, _a, error_7;
                    return __generator(this, function (_b) {
                        switch (_b.label) {
                            case 0:
                                env = this.env;
                                _b.label = 1;
                            case 1:
                                _b.trys.push([1, 6, , 7]);
                                trimmedQuery = params.query.trim().toLowerCase();
                                if (!trimmedQuery.startsWith('select')) {
                                    return [2 /*return*/, {
                                            content: [{
                                                    type: "text",
                                                    text: "\u274C Only SELECT queries are allowed for security reasons"
                                                }]
                                        }];
                                }
                                stmt = env.DB.prepare(params.query);
                                if (!params.params) return [3 /*break*/, 3];
                                return [4 /*yield*/, stmt.bind.apply(stmt, params.params).all()];
                            case 2:
                                _a = _b.sent();
                                return [3 /*break*/, 5];
                            case 3: return [4 /*yield*/, stmt.all()];
                            case 4:
                                _a = _b.sent();
                                _b.label = 5;
                            case 5:
                                result = _a;
                                return [2 /*return*/, {
                                        content: [{
                                                type: "text",
                                                text: "\uD83D\uDCCA Query results (".concat(result.results.length, " rows):\n\n").concat(JSON.stringify(result.results, null, 2))
                                            }]
                                    }];
                            case 6:
                                error_7 = _b.sent();
                                return [2 /*return*/, {
                                        content: [{
                                                type: "text",
                                                text: "\u274C Error executing query: ".concat(error_7)
                                            }]
                                    }];
                            case 7: return [2 /*return*/];
                        }
                    });
                }); });
                // Get database schema
                this.server.tool("get_database_schema", {}, function () { return __awaiter(_this, void 0, void 0, function () {
                    var env, tables, views, schemaInfo, _i, _a, table, tableInfo, _b, _c, column, _d, _e, view, error_8;
                    return __generator(this, function (_f) {
                        switch (_f.label) {
                            case 0:
                                env = this.env;
                                _f.label = 1;
                            case 1:
                                _f.trys.push([1, 8, , 9]);
                                return [4 /*yield*/, env.DB.prepare("\n\t\t\t\t\t\tSELECT name FROM sqlite_master\n\t\t\t\t\t\tWHERE type='table' AND name NOT LIKE 'sqlite_%'\n\t\t\t\t\t\tORDER BY name\n\t\t\t\t\t").all()];
                            case 2:
                                tables = _f.sent();
                                return [4 /*yield*/, env.DB.prepare("\n\t\t\t\t\t\tSELECT name FROM sqlite_master\n\t\t\t\t\t\tWHERE type='view'\n\t\t\t\t\t\tORDER BY name\n\t\t\t\t\t").all()];
                            case 3:
                                views = _f.sent();
                                schemaInfo = "📋 **Database Schema**\n\n";
                                schemaInfo += "**Tables:**\n";
                                _i = 0, _a = tables.results;
                                _f.label = 4;
                            case 4:
                                if (!(_i < _a.length)) return [3 /*break*/, 7];
                                table = _a[_i];
                                return [4 /*yield*/, env.DB.prepare("\n\t\t\t\t\t\t\tPRAGMA table_info(".concat(table.name, ")\n\t\t\t\t\t\t")).all()];
                            case 5:
                                tableInfo = _f.sent();
                                schemaInfo += "\n\u2022 **".concat(table.name, "**\n");
                                for (_b = 0, _c = tableInfo.results; _b < _c.length; _b++) {
                                    column = _c[_b];
                                    schemaInfo += "  - ".concat(column.name, ": ").concat(column.type).concat(column.notnull ? ' NOT NULL' : '').concat(column.pk ? ' PRIMARY KEY' : '', "\n");
                                }
                                _f.label = 6;
                            case 6:
                                _i++;
                                return [3 /*break*/, 4];
                            case 7:
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
                            case 8:
                                error_8 = _f.sent();
                                return [2 /*return*/, {
                                        content: [{
                                                type: "text",
                                                text: "\u274C Error retrieving schema: ".concat(error_8)
                                            }]
                                    }];
                            case 9: return [2 /*return*/];
                        }
                    });
                }); });
                return [2 /*return*/];
            });
        });
    };
    return D1TravelMCP;
}(mcp_1.McpAgent));
exports.D1TravelMCP = D1TravelMCP;
exports.default = {
    fetch: function (request, env, ctx) {
        var url = new URL(request.url);
        // Standard MCP HTTP endpoints (no 404 workarounds)
        if (url.pathname === "/sse" || url.pathname === "/sse/message") {
            return D1TravelMCP.serveSSE("/sse").fetch(request, env, ctx);
        }
        if (url.pathname === "/mcp") {
            return D1TravelMCP.serve("/mcp").fetch(request, env, ctx);
        }
        // Health check endpoint
        if (url.pathname === "/health") {
            return new Response(JSON.stringify({
                status: "healthy",
                service: "D1 Travel Database MCP v2",
                timestamp: new Date().toISOString()
            }), {
                headers: { "Content-Type": "application/json" }
            });
        }
        return new Response(JSON.stringify({
            error: "Not found",
            available_endpoints: ["/sse", "/mcp", "/health"]
        }), {
            status: 404,
            headers: { "Content-Type": "application/json" }
        });
    },
};
