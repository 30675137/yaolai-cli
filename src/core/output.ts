import Table from "cli-table3";

export function renderTable(headers: string[], rows: string[][]): string {
  const t = new Table({ head: headers });
  rows.forEach((r) => t.push(r));
  return t.toString();
}

export function renderJson(data: unknown): string {
  return JSON.stringify(data);
}
