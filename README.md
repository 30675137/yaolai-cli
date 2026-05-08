# yaolai-cli

耀莱电子商城运营 CLI（REQ-052 v0.1）+ 4 个 Claude Code Skill。

ops 在终端 / 自然语言两种入口查询商品 / 订单 / 支付。

## 快速上手

### 安装（macOS arm64 示例）

```bash
# 下载（v0.1.0 release 后）
curl -L -o ~/bin/yaolai \
  https://github.com/30675137/yaolai-cli/releases/download/v0.1.0/yaolai-cli-darwin-arm64
chmod +x ~/bin/yaolai

# macOS Gatekeeper 首次放行
xattr -d com.apple.quarantine ~/bin/yaolai

# 验证
yaolai version    # → v0.1.0
```

Linux x64 / Windows x64 同理，下载对应资产（`yaolai-cli-linux-x64` / `yaolai-cli-windows-x64.exe`）。

### 配置 + 登录

```bash
yaolai config set endpoint https://admin.yaolai.example.com
yaolai login                      # 交互输入 username + password
yaolai whoami
```

CI / 自动化场景：

```bash
echo "$YAOLAI_PWD" | yaolai login --username ops_alice --password-stdin
# 或：
YAOLAI_PASSWORD="$YAOLAI_PWD" yaolai login --username ops_alice
```

### 命令清单

| 命令 | 说明 |
|---|---|
| `yaolai login [--username u] [--password-stdin]` | 登录 admin（凭据存 `~/.yaolai/credentials.json` chmod 600）|
| `yaolai logout` / `whoami` | 清凭据 / 显示当前身份 |
| `yaolai goods list [--status] [--page] [--size]` | 商品列表 |
| `yaolai goods get <spu-id>` | 商品详情 |
| `yaolai orders list [--status] [--member-id] [--from] [--to] [--page] [--size]` | 订单列表 |
| `yaolai orders get <order-id>` | 订单详情（items + payment + address + timeline）|
| `yaolai payments get <intent-id>` | 支付意图详情 |
| `yaolai config get/set <key> [value]` | 读写本地配置（endpoint / profile）|
| `yaolai skills install` | 安装 4 个 markdown skill 到 `~/.claude/skills/yaolai-*/` |
| `yaolai version` | 显示版本 |

### 全局 flags

| Flag | 行为 |
|---|---|
| `--json` | 输出 JSON（错误也走 JSON 信封 `{code,message,trace_id,details}`）|
| `--verbose` | 展开 trace_id / request id |
| `--endpoint <url>` | 临时覆盖 endpoint（仅本次）|

### 退出码

`0` = success / `1` = generic error / `2` = invalid argument / `3` = auth expired / `4` = not found / `5` = conflict

## Claude Code Skill

跑 `yaolai skills install` 后重启 Claude Code，即可用自然语言查询：

> 「查一下耀莱在售商品」 → Claude Code 自动调 `yaolai goods list --json --status ON_SHELF`
> 「查订单 O-XXX 的详情」 → 自动调 `yaolai orders get O-XXX --json`

4 个 skill：`yaolai-goods-list` / `yaolai-goods-get` / `yaolai-orders-list` / `yaolai-payments-status`。

## 故障排查

| 现象 | 原因 | 处理 |
|---|---|---|
| `exit 3 NOT_LOGGED_IN` | 没 login 或 JWT 过期 | `yaolai login` |
| `exit 1 + ECONNREFUSED` | endpoint 错或后端宕 | `yaolai config get endpoint` 校验 |
| `CERT_HAS_EXPIRED` / `UNABLE_TO_VERIFY_LEAF_SIGNATURE` | 自签 CA | `NODE_EXTRA_CA_CERTS=/path/ca.pem yaolai ...` |
| 启动报 `not allowed`（macOS）| Gatekeeper 隔离 | `xattr -d com.apple.quarantine ~/bin/yaolai` |

## 安全

- 凭据 `~/.yaolai/credentials.json` 明文存（`chmod 600`，与 `~/.aws/credentials` 同模型）
- HTTPS only，TLS 严格校验系统 CA bundle，**不**提供 `--insecure`
- 自签证书走 `NODE_EXTRA_CA_CERTS` env

## 设计 / Spec

完整 spec / OpenAPI contract / ADR 在 umbrella 仓：`30675137/yaolai-weixin-mall-opertiaon/specs/REQ-052-yaolai-cli/`。

## 技术栈

TypeScript 5 + bun 1.x runtime + `bun build --compile` 三平台单二进制。

## License

MIT
