"use strict";

var assert = require("assert");
var fs = require("fs");
var vm = require("vm");
var parser = require("../loon-vless-reality-parser");

var plugin = fs.readFileSync(require.resolve("../loon-vless-reality-parser.plugin"), "utf8");
assert.match(plugin, /^#!type=parser$/m);
assert.match(plugin, /^#!loon_version=3\.5\.0\(969\)$/m);
assert.match(plugin, /^\[Argument\]$/m);
assert.match(plugin, /^\[Script\]$/m);
assert.match(
    plugin,
    /script-path=https:\/\/raw\.githubusercontent\.com\/yeafel\/surge-list\/master\/loon-vless-reality-parser\.js/
);

var uuid = "11111111-2222-3333-8444-555555555555";
var publicKey = "abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG";
var first =
    "vless://" +
    uuid +
    "@example.com:443?security=reality&type=tcp&flow=xtls-rprx-vision" +
    "&pbk=" +
    publicKey +
    "&sid=0123456789abcdef&sni=www.apple.com&fp=chrome#%E6%B5%8B%E8%AF%95%E8%8A%82%E7%82%B9";
var duplicate = first.replace("example.com:443", "example.net:8443");
var unsupported = first.replace("type=tcp", "type=ws").replace("#", "#WS-");
var unsafeName = first
    .replace("example.com:443", "example.org:9443")
    .replace("#", "#%5BProxy%5D%0Ainjected%3DVLESS%2C");
var raw = [first, duplicate, unsafeName, unsupported].join("\n");
var encoded = Buffer.from(raw, "utf8").toString("base64");

var output = parser.normalizeSubscription(encoded);
var lines = output.split("\n");

assert.strictEqual(lines.length, 3);
assert.match(lines[0], /^测试节点=VLESS,example\.com,443,/);
assert.match(lines[1], /^测试节点 \(2\)=VLESS,example\.net,8443,/);
assert.match(lines[2], /^\[Proxy\] injected VLESS 测试节点=VLESS,example\.org,9443,/);
assert.ok(lines[0].includes("flow=xtls-rprx-vision"));
assert.ok(lines[0].includes("sni=www.apple.com"));
assert.ok(lines[0].includes('public-key="' + publicKey + '"'));
assert.ok(lines[0].includes("short-id=0123456789abcdef"));
assert.ok(lines[0].includes("tls-profile=chrome"));
assert.ok(lines[0].includes("udp=true"));
assert.strictEqual(parser.decodeBase64(Buffer.from("节点", "utf8").toString("base64")), "节点");
assert.throws(function () {
    parser.normalizeSubscription("not-a-subscription");
});
assert.throws(function () {
    parser.parseVlessUri(first.replace("xtls-rprx-vision", "injected%0Avalue"), Object.create(null));
});
assert.throws(function () {
    parser.parseVlessUri(first.replace("security=reality", "security=tls"), Object.create(null));
});
assert.throws(function () {
    parser.parseVlessUri(first.replace("www.apple.com", "www.apple.com%0Ainjected"), Object.create(null));
});
assert.doesNotThrow(function () {
    parser.parseVlessUri(first.replace(/#.*$/, "#__proto__"), Object.create(null));
});

var runtimeOutput = null;
var runtimeLogs = [];
var runtime = {
    console: {
        log: function (message) {
            runtimeLogs.push(String(message));
        },
    },
    $argument: { ua: "v2ray", timeout: 8000 },
    $resourceUrl: "https://example.invalid/private-subscription",
    $resourceType: 1,
    $httpClient: {
        get: function (options, callback) {
            assert.strictEqual(options.url, runtime.$resourceUrl);
            assert.strictEqual(options.headers["User-Agent"], "v2ray");
            callback(null, { status: 200 }, encoded);
        },
    },
    $done: function (value) {
        runtimeOutput = value;
    },
};
vm.createContext(runtime);
vm.runInContext(fs.readFileSync(require.resolve("../loon-vless-reality-parser"), "utf8"), runtime);
assert.strictEqual(runtimeOutput.split("\n").length, 3);
assert.ok(
    runtimeLogs.every(function (message) {
        return !message.includes(runtime.$resourceUrl);
    })
);

console.log("loon-vless-reality-parser tests passed");
