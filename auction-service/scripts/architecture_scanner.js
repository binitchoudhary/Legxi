"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var path = require("path");
// A simple static analysis script to verify architecture layer purity
var DOMAIN_DIR = path.join(__dirname, '../src/domain');
var FORBIDDEN_IMPORTS = [
    'prisma',
    '@prisma/client',
    'redis',
    'ioredis',
    'bullmq',
    'fastify',
    'socket.io',
    'firebase',
    'shopify',
    'process.env'
];
var violations = 0;
function scanDirectory(dir) {
    var files = fs.readdirSync(dir);
    for (var _i = 0, files_1 = files; _i < files_1.length; _i++) {
        var file = files_1[_i];
        var fullPath = path.join(dir, file);
        var stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            scanDirectory(fullPath);
        }
        else if (fullPath.endsWith('.ts')) {
            scanFile(fullPath);
        }
    }
}
function scanFile(filePath) {
    var content = fs.readFileSync(filePath, 'utf-8');
    var lines = content.split('\n');
    lines.forEach(function (line, index) {
        // Check forbidden imports
        if (line.includes('import ') || line.includes('require(')) {
            FORBIDDEN_IMPORTS.forEach(function (forbidden) {
                if (line.toLowerCase().includes(forbidden)) {
                    console.error("[VIOLATION] Forbidden import '".concat(forbidden, "' found in Domain Layer: ").concat(filePath, ":").concat(index + 1));
                    violations++;
                }
            });
        }
        // Check forbidden primitives
        if (line.includes('new Date()') || line.includes('Date.now()') || line.includes('Math.random()')) {
            // Exception for TimeProvider logic if any exists, but Domain shouldn't have it
            console.error("[VIOLATION] Forbidden primitive (time/random) found in Domain Layer: ".concat(filePath, ":").concat(index + 1));
            violations++;
        }
    });
}
console.log('Starting Architecture Verification Scan...');
scanDirectory(DOMAIN_DIR);
if (violations === 0) {
    console.log('✅ Architecture Scan Passed. Domain is pure.');
    process.exit(0);
}
else {
    console.error("\u274C Architecture Scan Failed with ".concat(violations, " violations."));
    process.exit(1);
}
