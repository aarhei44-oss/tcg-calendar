// /app/app/admin/db/DbCrudClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { listRows, createRow, updateRow, deleteRow } from "./actions";

type TableName = string;

export default function DbCrudClient() {
  const [tables, setTables] = useState<TableName[]>([]);
  const [table, setTable] = useState<TableName>("");
  const [rows, setRows] = useState<any[]>([]);
  const [take, setTake] = useState(25);
  const [busy, setBusy] = useState(false);

  const [createJson, setCreateJson] = useState("{\n  \n}");
  const [updateWhereJson, setUpdateWhereJson] = useState('{\n  "id": ""\n}');
  const [updateDataJson, setUpdateDataJson] = useState("{\n  \n}");
  const [deleteWhereJson, setDeleteWhereJson] = useState('{\n  "id": ""\n}');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/model-list", { cache: "no-store" });
        const data = await res.json();
        setTables(data.models ?? []);
      } catch (e) {
        console.error("Failed to load model list", e);
      }
    })();
  }, []);

  const canRun = useMemo(() => Boolean(table) && !busy, [table, busy]);

  async function refresh() {
    if (!table) return;
    setBusy(true);
    try {
      const data = await listRows(table, take);
      setRows(data);
    } finally {
      setBusy(false);
    }
  }

  async function doCreate() {
    if (!canRun) return;
    setBusy(true);
    try {
      const payload = JSON.parse(createJson);
      await createRow(table, payload);
      await refresh();
    } catch (e: any) {
      alert(e.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  async function doUpdate() {
    if (!canRun) return;
    setBusy(true);
    try {
      const where = JSON.parse(updateWhereJson);
      const data = JSON.parse(updateDataJson);
      await updateRow(table, where, data);
      await refresh();
    } catch (e: any) {
      alert(e.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  async function doDelete() {
    if (!canRun) return;
    setBusy(true);
    try {
      const where = JSON.parse(deleteWhereJson);
      await deleteRow(table, where);
      await refresh();
    } catch (e: any) {
      alert(e.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <label className="text-sm">Table</label>
        <select
          className="border rounded px-2 py-1"
          value={table}
          onChange={(e) => setTable(e.target.value)}
        >
          <option value="">-- pick --</option>
          {tables.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <label className="text-sm ml-4">Take</label>
        <input
          type="number"
          className="border rounded px-2 py-1 w-20"
          value={take}
          onChange={(e) => setTake(Number(e.target.value))}
        />

        <button
          className="ml-4 px-3 py-1 rounded bg-black text-white disabled:opacity-50"
          onClick={refresh}
          disabled={!canRun}
        >
          List
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div>
          <h3 className="font-semibold mb-2">Create</h3>
          <textarea
            className="w-full h-40 border rounded p-2 font-mono text-sm"
            value={createJson}
            onChange={(e) => setCreateJson(e.target.value)}
          />
          <button
            className="mt-2 px-3 py-1 rounded bg-emerald-600 text-white disabled:opacity-50"
            onClick={doCreate}
            disabled={!canRun}
          >
            Create
          </button>
        </div>

        <div>
          <h3 className="font-semibold mb-2">Update</h3>
          <label className="block text-xs text-gray-600 mb-1">where (JSON)</label>
          <textarea
            className="w-full h-24 border rounded p-2 font-mono text-sm"
            value={updateWhereJson}
            onChange={(e) => setUpdateWhereJson(e.target.value)}
          />
          <label className="block text-xs text-gray-600 mt-2 mb-1">data (JSON)</label>
          <textarea
            className="w-full h-24 border rounded p-2 font-mono text-sm"
            value={updateDataJson}
            onChange={(e) => setUpdateDataJson(e.target.value)}
          />
          <button
            className="mt-2 px-3 py-1 rounded bg-amber-600 text-white disabled:opacity-50"
            onClick={doUpdate}
            disabled={!canRun}
          >
            Update
          </button>
        </div>

        <div>
          <h3 className="font-semibold mb-2">Delete</h3>
          <label className="block text-xs text-gray-600 mb-1">where (JSON)</label>
          <textarea
            className="w-full h-24 border rounded p-2 font-mono text-sm"
            value={deleteWhereJson}
            onChange={(e) => setDeleteWhereJson(e.target.value)}
          />
          <button
            className="mt-2 px-3 py-1 rounded bg-red-600 text-white disabled:opacity-50"
            onClick={doDelete}
            disabled={!canRun}
          >
            Delete
          </button>
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-2">Rows</h3>
        <pre className="text-sm border rounded p-3 overflow-auto max-h-96 bg-gray-50">
{JSON.stringify(rows, null, 2)}
        </pre>
      </div>
    </div>
  );
}