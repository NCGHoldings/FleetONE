"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var fs_1 = __importDefault(require("fs"));
var supabase_js_1 = require("@supabase/supabase-js");
var envFile = fs_1.default.readFileSync('.env', 'utf8');
var env = {};
envFile.split('\n').forEach(function (line) {
    if (line.includes('=')) {
        var _a = line.split('='), key = _a[0], rest = _a.slice(1);
        env[key.trim()] = rest.join('=').trim().replace(/['"]/g, '');
    }
});
var supabase = (0, supabase_js_1.createClient)(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
function run() {
    return __awaiter(this, void 0, void 0, function () {
        var _a, txs, error, _b, jes, jeError, jeMap, mismatches, _i, txs_1, tx, jeDate, i, m, res, res2;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    console.log("Fetching payments...");
                    return [4 /*yield*/, supabase
                            .from('school_payment_transactions')
                            .select('id, payment_date, journal_entry_id')];
                case 1:
                    _a = _c.sent(), txs = _a.data, error = _a.error;
                    if (error) {
                        console.error("Error fetching txs", error);
                        return [2 /*return*/];
                    }
                    console.log("Found ".concat(txs.length, " payment transactions. Fetching journal entries..."));
                    return [4 /*yield*/, supabase
                            .from('journal_entries')
                            .select('id, entry_date')];
                case 2:
                    _b = _c.sent(), jes = _b.data, jeError = _b.error;
                    if (jeError) {
                        console.error("Error fetching JEs", jeError);
                        return [2 /*return*/];
                    }
                    jeMap = new Map(jes.map(function (je) { return [je.id, je.entry_date]; }));
                    mismatches = [];
                    for (_i = 0, txs_1 = txs; _i < txs_1.length; _i++) {
                        tx = txs_1[_i];
                        if (tx.journal_entry_id) {
                            jeDate = jeMap.get(tx.journal_entry_id);
                            if (jeDate && jeDate !== tx.payment_date) {
                                mismatches.push({
                                    tx_id: tx.id,
                                    je_id: tx.journal_entry_id,
                                    tx_date: tx.payment_date,
                                    je_date: jeDate
                                });
                            }
                        }
                    }
                    console.log("Found ".concat(mismatches.length, " records where JE date does not match TX date."));
                    if (!(mismatches.length > 0)) return [3 /*break*/, 8];
                    console.log("Starting bulk sync...");
                    i = 0;
                    _c.label = 3;
                case 3:
                    if (!(i < mismatches.length)) return [3 /*break*/, 7];
                    m = mismatches[i];
                    process.stdout.write("Syncing ".concat(i + 1, "/").concat(mismatches.length, " (JE: ").concat(m.je_id, " -> ").concat(m.tx_date, ")... "));
                    return [4 /*yield*/, supabase.from('journal_entries').update({ entry_date: m.tx_date }).eq('id', m.je_id)];
                case 4:
                    res = _c.sent();
                    if (res.error) {
                        console.log("Failed! ".concat(res.error.message));
                        return [3 /*break*/, 6];
                    }
                    return [4 /*yield*/, supabase.from('ar_receipts').update({ receipt_date: m.tx_date }).eq('journal_entry_id', m.je_id)];
                case 5:
                    res2 = _c.sent();
                    if (res2.error) {
                        console.log("Failed AR sync! ".concat(res2.error.message));
                        return [3 /*break*/, 6];
                    }
                    console.log('Success.');
                    _c.label = 6;
                case 6:
                    i++;
                    return [3 /*break*/, 3];
                case 7:
                    console.log("Bulk sync complete!");
                    return [3 /*break*/, 9];
                case 8:
                    console.log("Everything is already perfectly synced!");
                    _c.label = 9;
                case 9: return [2 /*return*/];
            }
        });
    });
}
run();
