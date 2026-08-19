/*
 * Loon resource parser for Base64-encoded VLESS Reality subscriptions.
 * The subscription URL and node credentials are provided by Loon at runtime.
 */
(function () {
    "use strict";

    var MAX_SUBSCRIPTION_LENGTH = 2 * 1024 * 1024;

    function parseArguments(value) {
        if (value && typeof value === "object") return value;

        var result = Object.create(null);
        String(value || "")
            .split("&")
            .forEach(function (item) {
                if (!item) return;
                var separator = item.indexOf("=");
                var key = separator < 0 ? item : item.slice(0, separator);
                var rawValue = separator < 0 ? "true" : item.slice(separator + 1);
                try {
                    result[key] = decodeURIComponent(rawValue);
                } catch (_) {
                    result[key] = rawValue;
                }
            });
        return result;
    }

    function decodeBase64(value) {
        var alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        var input = String(value || "")
            .replace(/\s+/g, "")
            .replace(/-/g, "+")
            .replace(/_/g, "/")
            .replace(/=+$/, "");
        if (input.length > MAX_SUBSCRIPTION_LENGTH * 2) {
            throw new Error("订阅内容过大");
        }
        var output = "";
        var bits = 0;
        var bitCount = 0;

        for (var index = 0; index < input.length; index += 1) {
            var digit = alphabet.indexOf(input.charAt(index));
            if (digit < 0) throw new Error("订阅内容不是有效的 Base64");
            bits = (bits << 6) | digit;
            bitCount += 6;
            if (bitCount >= 8) {
                bitCount -= 8;
                output += String.fromCharCode((bits >> bitCount) & 255);
                bits &= (1 << bitCount) - 1;
            }
        }
        var escaped = "";
        for (var byteIndex = 0; byteIndex < output.length; byteIndex += 1) {
            escaped += "%" + ("0" + output.charCodeAt(byteIndex).toString(16)).slice(-2);
        }
        try {
            return decodeURIComponent(escaped);
        } catch (_) {
            return output;
        }
    }

    function decodeComponent(value) {
        try {
            return decodeURIComponent(String(value || "").replace(/\+/g, "%20"));
        } catch (_) {
            return String(value || "");
        }
    }

    function parseQuery(value) {
        var result = Object.create(null);
        String(value || "")
            .split("&")
            .forEach(function (item) {
                if (!item) return;
                var separator = item.indexOf("=");
                var key = decodeComponent(separator < 0 ? item : item.slice(0, separator));
                var queryValue = separator < 0 ? "" : item.slice(separator + 1);
                result[key] = decodeComponent(queryValue);
            });
        return result;
    }

    function quote(value) {
        return '"' + String(value || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
    }

    function cleanName(value, fallback) {
        var name = decodeComponent(value)
            .replace(/[\u0000-\u001f\u007f\u2028\u2029=,"]/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 160);
        return name || fallback;
    }

    function isSafeHost(value) {
        return (
            /^\[[0-9a-f:.]+\]$/i.test(value) ||
            /^(?=.{1,253}$)[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/i.test(value)
        );
    }

    function validateNode(uuid, host, port, query) {
        if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(uuid)) {
            throw new Error("VLESS UUID 格式无效");
        }
        if (!isSafeHost(host)) throw new Error("VLESS 主机名格式无效");
        if (!Number.isInteger(port) || port < 1 || port > 65535) {
            throw new Error("VLESS 端口格式无效");
        }
        if (query.flow !== "xtls-rprx-vision") {
            throw new Error("仅支持 xtls-rprx-vision 流控");
        }
        if (!query.sni && !query.servername) throw new Error("Reality 节点缺少 SNI");
        if (!isSafeHost(query.sni || query.servername)) throw new Error("Reality SNI 格式无效");
        if (!/^[a-z0-9_-]{32,4096}$/i.test(query.pbk || "")) {
            throw new Error("Reality 公钥格式无效");
        }
        if (query.sid && !/^[0-9a-f]{2,32}$/i.test(query.sid)) {
            throw new Error("Reality Short ID 格式无效");
        }
    }

    function parseVlessUri(uri, usedNames) {
        var match = String(uri || "").trim().match(
            /^vless:\/\/([^@]+)@(\[[^\]]+\]|[^:]+):(\d+)\?([^#]*)(?:#(.*))?$/i
        );
        if (!match) throw new Error("VLESS 链接格式不受支持");

        var uuid = decodeComponent(match[1]);
        var host = match[2];
        var port = Number(match[3]);
        var query = parseQuery(match[4]);
        var transport = String(query.type || query.network || "tcp").toLowerCase();
        var security = String(query.security || "").toLowerCase();

        if (transport !== "tcp" && transport !== "raw") {
            throw new Error("仅支持 TCP/RAW 传输的 VLESS Reality 节点");
        }
        if (security !== "reality") throw new Error("仅支持 VLESS Reality 节点");
        if (!query.pbk) throw new Error("Reality 节点缺少公钥");
        validateNode(uuid, host, port, query);

        var fallbackName = "VLESS " + host + ":" + port;
        var baseName = cleanName(match[5], fallbackName);
        var name = baseName;
        var suffix = (usedNames[baseName] || 1) + 1;
        while (usedNames[name]) {
            name = baseName + " (" + suffix + ")";
            suffix += 1;
        }
        usedNames[baseName] = suffix - 1;
        if (name !== baseName) usedNames[name] = 1;

        var options = [
            "transport=tcp",
            "over-tls=true",
            "skip-cert-verify=false",
        ];
        if (query.fp === "chrome") options.push("tls-profile=chrome");
        if (query.fp === "ios") options.push("tls-profile=ios26");
        options.push("flow=" + query.flow);

        var sni = query.sni || query.servername;
        if (sni) options.push("sni=" + sni);
        options.push("public-key=" + quote(query.pbk));
        if (query.sid) options.push("short-id=" + query.sid);
        options.push("udp=true");

        return name + "=VLESS," + host + "," + port + "," + quote(uuid) + "," + options.join(",");
    }

    function normalizeSubscription(raw) {
        var content = String(raw || "").trim();
        if (!content) throw new Error("订阅响应为空");
        if (content.length > MAX_SUBSCRIPTION_LENGTH) throw new Error("订阅内容过大");
        if (!/vless:\/\//i.test(content)) content = decodeBase64(content);
        if (content.length > MAX_SUBSCRIPTION_LENGTH) throw new Error("订阅内容过大");

        var usedNames = Object.create(null);
        var nodes = [];
        var skipped = 0;
        content.split(/\r?\n/).forEach(function (line) {
            if (!/^vless:\/\//i.test(line.trim())) return;
            try {
                nodes.push(parseVlessUri(line, usedNames));
            } catch (error) {
                skipped += 1;
                console.log("跳过一个节点：" + error.message);
            }
        });

        if (!nodes.length) throw new Error("订阅中没有可用的 VLESS Reality TCP 节点");
        console.log("解析完成：" + nodes.length + " 个节点，跳过 " + skipped + " 个节点");
        return nodes.join("\n");
    }

    function run() {
        var args = parseArguments(typeof $argument === "undefined" ? {} : $argument);
        var resourceUrl = typeof $resourceUrl === "undefined" ? "" : $resourceUrl;
        var resourceType = typeof $resourceType === "undefined" ? 1 : Number($resourceType);
        if (resourceType !== 1) {
            console.log("解析失败：该插件仅用于节点订阅");
            $done("");
            return;
        }
        if (!resourceUrl) {
            console.log("解析失败：Loon 未提供订阅地址");
            $done("");
            return;
        }

        var timeout = Math.min(Math.max(Number(args.timeout) || 8000, 1000), 25000);
        var userAgent = String(args.ua || "v2ray");
        if (!userAgent || userAgent.length > 256 || /[\r\n]/.test(userAgent)) userAgent = "v2ray";
        $httpClient.get(
            {
                url: resourceUrl,
                timeout: timeout,
                headers: { "User-Agent": userAgent, Accept: "text/plain,*/*" },
                "auto-redirect": true,
                "auto-cookie": false,
            },
            function (error, response, data) {
                if (error) {
                    console.log("订阅请求失败，请检查网络和订阅可用性");
                    $done("");
                    return;
                }

                var status = response && (response.status || response.statusCode);
                if (status && (status < 200 || status >= 300)) {
                    console.log("订阅请求失败：HTTP " + status);
                    $done("");
                    return;
                }

                try {
                    $done(normalizeSubscription(data));
                } catch (parseError) {
                    console.log("订阅解析失败：" + parseError.message);
                    $done("");
                }
            }
        );
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = {
            decodeBase64: decodeBase64,
            normalizeSubscription: normalizeSubscription,
            parseVlessUri: parseVlessUri,
        };
    }
    if (typeof $done !== "undefined") run();
})();
