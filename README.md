# surge-list

仅限个人研究使用。

## 规则维护说明

- 根目录 `.list` 文件作为 Surge 远程 `RULE-SET` 使用，列表内只保留规则声明，不在规则行内追加策略。
- 策略统一在 `yeafel.sgmodule` 的 `RULE-SET` 行指定，例如 `adblock.list` 由模块指定为 `REJECT`。
- 维护规则时需要去除同一列表内的重复项，并避免同一域名同时出现在 `DIRECT`、`Proxy`、`openAI` 等不同策略列表中造成前置规则遮蔽。

## 2026-06-14 核查记录

- `Proxy.list`：删除重复规则、修正逗号后空格、统一 `bing` 关键字大小写，并移除已由 `DIRECT.list` 前置覆盖的 Microsoft 与 Apple TestFlight 规则。
- `openAI.list`：删除重复 `gemini` 与 `openaiapi-site.azureedge.net`，修正 `perplexity`、`oaistatic.com` 拼写，并补充 `chatgpt.com`。
- `DIRECT.list`：删除重复直连规则，去除被 `alicdn.com` 覆盖的 `appdownload.alicdn.com`，并移除会遮蔽广告拦截 URL 规则的 `snssdk.com`。
- `adblock.list`：删除重复广告域名，将误写成 `DOMAIN-SUFFIX` 的小红书广告 URL 改为 `URL-REGEX`，并移除远程规则集内不应内联的 `REJECT` 策略字段。
