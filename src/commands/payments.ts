import { httpGet } from "../core/client.js";
import { renderJson } from "../core/output.js";

export interface PaymentsGetOpts {
  endpoint: string;
  token: string;
  intentId: string;
  json: boolean;
}

export async function runPaymentsGet(o: PaymentsGetOpts): Promise<string> {
  const data = await httpGet<any>(
    `${o.endpoint}/admin/v1/payments/${encodeURIComponent(o.intentId)}`,
    o.token,
  );
  if (o.json) return renderJson(data);
  return [
    `Intent: ${data.intent_id ?? "-"}`,
    `Order: ${data.order_id ?? "-"}`,
    `金额: ${data.amount ?? "-"}`,
    `状态: ${data.status ?? "-"}`,
    `渠道: ${data.channel ?? "-"}`,
    `支付时间: ${data.paid_at ?? "-"}`,
    `三方流水: ${data.third_party_no ?? "-"}`,
  ].join("\n");
}
