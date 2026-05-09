import { httpGet } from "../../core/client.js";

export interface PublicVerifyOptions {
  endpoint: string;
  token: string;
  spuId: number;
  categoryId: number;
}

export interface PublicVerifyResult {
  home: boolean;
  category: boolean;
  detail: boolean;
}

export async function verifyPublicVisibility(options: PublicVerifyOptions): Promise<PublicVerifyResult> {
  const home = await httpGet<any>(`${options.endpoint}/public/v1/home/recommendations`, options.token);
  const category = await httpGet<any>(
    `${options.endpoint}/public/v1/categories/${encodeURIComponent(String(options.categoryId))}/products`,
    options.token,
  );
  const detail = await httpGet<any>(
    `${options.endpoint}/public/v1/products/${encodeURIComponent(String(options.spuId))}/detail`,
    options.token,
  );
  return {
    home: containsProduct(home, options.spuId),
    category: containsProduct(category, options.spuId),
    detail: detail?.productStatus === "ON_SHELF" && Array.isArray(detail?.skus) && detail.skus.length > 0,
  };
}

function containsProduct(payload: any, spuId: number): boolean {
  const items = Array.isArray(payload?.items) ? payload.items : [];
  return items.some((item: any) => Number(item.productId ?? item.id ?? item.spuId) === spuId);
}
