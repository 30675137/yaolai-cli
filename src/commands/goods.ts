import { httpGet } from "../core/client.js";
import { renderTable, renderJson } from "../core/output.js";

export interface GoodsListOpts {
  endpoint: string;
  token: string;
  json: boolean;
  status?: string;
  page?: number;
  size?: number;
}

export async function runGoodsList(o: GoodsListOpts): Promise<string> {
  const params = new URLSearchParams();
  if (o.status) params.set("status", o.status);
  params.set("page", String(o.page ?? 1));
  params.set("size", String(o.size ?? 20));
  const data = await httpGet<any>(`${o.endpoint}/admin/v1/spu?${params}`, o.token);
  if (o.json) return renderJson(data);
  return renderTable(
    ["ID", "名称", "状态", "价格"],
    data.items.map((s: any) => [
      String(s.id ?? ""),
      String(s.name ?? ""),
      String(s.status ?? ""),
      String(s.price ?? ""),
    ]),
  );
}

export interface GoodsGetOpts {
  endpoint: string;
  token: string;
  id: string;
  json: boolean;
}

export async function runGoodsGet(o: GoodsGetOpts): Promise<string> {
  const data = await httpGet<any>(
    `${o.endpoint}/admin/v1/spu/${encodeURIComponent(o.id)}`,
    o.token,
  );
  return o.json ? renderJson(data) : JSON.stringify(data, null, 2);
}
