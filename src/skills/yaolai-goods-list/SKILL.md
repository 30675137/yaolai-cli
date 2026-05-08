---
name: yaolai-goods-list
description: 列出耀莱商品（按 status 过滤，默认 ON_SHELF）
version: 0.1.0
mcp_compatible: false
---

# yaolai-goods-list

调用 yaolai CLI 查询商品列表。返回 JSON `{items, total, page, size, has_more}`。

```bash
yaolai goods list --json --status ${STATUS:-ON_SHELF} --page ${PAGE:-1} --size ${SIZE:-20}
```
