# surge-list

仅限个人研究使用。

## 规则维护说明

- 根目录 `.list` 文件作为 Surge 远程 `RULE-SET` 使用，列表内只保留规则声明，不在规则行内追加策略；`IP-CIDR`/`IP-CIDR6` 可保留 `no-resolve` 参数。
- 策略由订阅方在 Surge 配置的 `RULE-SET` 行指定，例如将 `adblock.list` 指定为 `REJECT`，将 `DIRECT.list` 指定为 `DIRECT`。
- 维护规则时需要去除同一列表内的重复项，并优先避免通用策略列表与专用策略列表之间出现同一域名造成前置规则遮蔽；同策略拦截库或共享 CDN 可按场景保留。
- 当前仅保留 `dfcf.sgmodule` 作为独立重写模块，其余规则以远程 `.list` 方式维护。

## Loon VLESS Reality 订阅解析器

用于处理机场按 `User-Agent` 返回空订阅、但使用 `v2ray` 可以获取 Base64 VLESS Reality 节点的情况。插件不会保存或上传订阅地址、UUID、公钥等信息；订阅地址由 Loon 在刷新时传给本地脚本。

在 Loon 3.5.0(969) 或以上版本中添加以下插件：

```text
https://raw.githubusercontent.com/yeafel/surge-list/master/loon-vless-reality-parser.plugin
```

编辑节点订阅并选择 `VLESS Reality 订阅解析器`。默认参数通常无需修改；插件目前仅转换 `VLESS + TCP/RAW + Reality` 节点，其他协议和传输方式会被忽略并写入 Loon 日志。

本地验证：

```bash
node tests/loon-vless-reality-parser.test.js
```

## 2026-06-14 核查记录

- `Proxy.list`：删除重复规则、修正逗号后空格、统一 `bing` 关键字大小写，并移除已由 `DIRECT.list` 前置覆盖的 Microsoft 与 Apple TestFlight 规则。
- `openAI.list`：删除重复 `gemini` 与 `openaiapi-site.azureedge.net`，修正 `perplexity`、`oaistatic.com` 拼写，并补充 `chatgpt.com`。
- `DIRECT.list`：删除重复直连规则，去除被 `alicdn.com` 覆盖的 `appdownload.alicdn.com`，并移除会遮蔽广告拦截 URL 规则的 `snssdk.com`。
- `adblock.list`：删除重复广告域名，将误写成 `DOMAIN-SUFFIX` 的小红书广告 URL 改为 `URL-REGEX`，并移除远程规则集内不应内联的 `REJECT` 策略字段。
- 补充核查：移除已废弃 `.sgmodule` 的文档引用，修正 `telegram.list` 的 `no-resolve` 拼写和重复 CIDR，清理 `XPTV.list` 行内策略字段，并移除通用列表中会遮蔽专用列表的交叉重复项。
