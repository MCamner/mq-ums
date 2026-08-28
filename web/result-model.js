(function expose(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.UmsResultModel = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function build() {
  "use strict";

  function normalizeDevices(data) {
    if (Array.isArray(data)) return data;
    if (!data || typeof data !== "object") return [];
    for (const key of ["devices", "items", "result", "data"]) {
      if (Array.isArray(data[key])) return data[key];
    }
    return Object.keys(data).length ? [data] : [];
  }

  function filterAndPaginate(devices, { query = "", page = 1, pageSize = 25 } = {}) {
    const needle = String(query).trim().toLowerCase();
    const filtered = needle
      ? devices.filter(device => JSON.stringify(device).toLowerCase().includes(needle))
      : [...devices];
    const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const safePage = Math.min(Math.max(Number(page) || 1, 1), pages);
    const start = (safePage - 1) * pageSize;
    return { items: filtered.slice(start, start + pageSize), total: filtered.length, page: safePage, pages };
  }

  function shortSummary(outcome) {
    if (!outcome || outcome.schema !== "ums_command_result.v1") return "No command result";
    const count = normalizeDevices(outcome.data).length;
    const suffix = outcome.command_id === "get-device" ? ` · ${count} device result(s)` : "";
    return `${outcome.command_id} · ${outcome.status} · ${outcome.source} · ${outcome.duration_ms} ms${suffix}`;
  }

  return { normalizeDevices, filterAndPaginate, shortSummary };
});
