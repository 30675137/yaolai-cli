import { httpGet } from "../core/client.js";
import { renderTable, renderJson } from "../core/output.js";

export interface OrdersListOpts {
  endpoint: string;
  token: string;
  json: boolean;
  status?: string;
  memberId?: string;
  from?: string;
  to?: string;
  page?: number;
  size?: number;
}

export async function runOrdersList(o: OrdersListOpts): Promise<string> {
  const p = new URLSearchParams();
  if (o.status) p.set("status", o.status);
  if (o.memberId) p.set("member_id", o.memberId);
  if (o.from) p.set("from", o.from);
  if (o.to) p.set("to", o.to);
  p.set("page", String(o.page ?? 1));
  p.set("size", String(o.size ?? 20));
  const data = await httpGet<any>(`${o.endpoint}/admin/v1/orders?${p}`, o.token);
  if (o.json) return renderJson(data);
  return renderTable(
    ["订单号", "会员", "状态", "金额", "支付", "创建时间"],
    data.items.map((x: any) => [
      String(x.id ?? ""),
      String(x.member_id ?? ""),
      String(x.status ?? ""),
      String(x.total_amount ?? ""),
      x.payment_status ?? "-",
      String(x.created_at ?? ""),
    ]),
  );
}

export interface OrdersGetOpts {
  endpoint: string;
  token: string;
  id: string;
  json: boolean;
}

export async function runOrdersGet(o: OrdersGetOpts): Promise<string> {
  const data = await httpGet<any>(
    `${o.endpoint}/admin/v1/orders/${encodeURIComponent(o.id)}`,
    o.token,
  );
  return o.json ? renderJson(data) : JSON.stringify(data, null, 2);
}
