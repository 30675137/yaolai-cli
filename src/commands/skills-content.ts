// AUTO-GENERATED — run build.ts to regenerate
export const SKILL_FILES: Record<string, string> = {
  "yaolai-goods-get/SKILL.md": "---\nname: yaolai-goods-get\ndescription: 查询单个商品详情（按 SPU ID）\nversion: 0.1.0\nmcp_compatible: false\n---\n\n# yaolai-goods-get\n\n```bash\nyaolai goods get ${SPU_ID} --json\n```\n",
  "yaolai-payments-status/SKILL.md": "---\nname: yaolai-payments-status\ndescription: 查询支付意图状态（按 PaymentIntent ID）\nversion: 0.1.0\nmcp_compatible: false\n---\n\n# yaolai-payments-status\n\n```bash\nyaolai payments get ${INTENT_ID} --json\n```\n",
  "yaolai-orders-list/SKILL.md": "---\nname: yaolai-orders-list\ndescription: 列出耀莱订单（按 status / member_id / 时间范围过滤）\nversion: 0.1.0\nmcp_compatible: false\n---\n\n# yaolai-orders-list\n\n```bash\nyaolai orders list --json [--status STATUS] [--member-id ID] [--from ISO] [--to ISO] [--page N] [--size N]\n```\n",
  "yaolai-goods-list/SKILL.md": "---\nname: yaolai-goods-list\ndescription: 列出耀莱商品（按 status 过滤，默认 ON_SHELF）\nversion: 0.1.0\nmcp_compatible: false\n---\n\n# yaolai-goods-list\n\n调用 yaolai CLI 查询商品列表。返回 JSON `{items, total, page, size, has_more}`。\n\n```bash\nyaolai goods list --json --status ${STATUS:-ON_SHELF} --page ${PAGE:-1} --size ${SIZE:-20}\n```\n"
};
