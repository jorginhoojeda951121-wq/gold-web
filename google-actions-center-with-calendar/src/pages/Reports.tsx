import React, { useState } from 'react';

export default function ReportsPage() {
  const [ordersJson, setOrdersJson] = useState<string>('[]');
  const [report, setReport] = useState<string>('');
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    setReport('');
    let orders;
    try {
      orders = JSON.parse(ordersJson);
    } catch (err) {
      setReport('Invalid JSON in orders input');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/generate-ai-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orders }),
      });
      const json = await res.json();
      setReport(json.report || json.error || JSON.stringify(json));
    } catch (err: any) {
      setReport(String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold">AI Reports</h1>
      <p className="my-2">Paste orders JSON and click Generate to get a professional report.</p>
      <textarea rows={10} className="w-full p-2 border" value={ordersJson} onChange={e=>setOrdersJson(e.target.value)} />
      <div className="mt-2">
        <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={generate} disabled={loading}>{loading ? 'Generating...' : 'Generate Report'}</button>
      </div>
      <pre className="mt-4 whitespace-pre-wrap bg-gray-50 p-3 border">{report}</pre>
    </div>
  );
}
