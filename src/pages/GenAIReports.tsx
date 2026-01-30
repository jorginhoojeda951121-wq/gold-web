/**
 * GenAI Reports Page
 * Paste orders JSON and request a professional AI-generated report via Supabase Edge Function.
 */

import { useState } from 'react';
import { getSupabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function GenAIReports() {
  const [ordersJson, setOrdersJson] = useState<string>('[]');
  const [report, setReport] = useState<string>('');
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    setReport('');
    let orders: unknown[];
    try {
      orders = JSON.parse(ordersJson) as unknown[];
    } catch {
      setReport('Invalid JSON in orders input');
      setLoading(false);
      return;
    }

    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.functions.invoke('generate-ai-report', {
        body: { orders },
      });

      if (error) {
        setReport(error.message || 'Function error');
        setLoading(false);
        return;
      }

      const reportText =
        (data as { report?: string })?.report ||
        (data as { error?: string })?.error ||
        JSON.stringify(data);
      setReport(reportText);
    } catch (err) {
      setReport(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">AI Reports</h1>
      <p className="text-muted-foreground mb-4">
        Paste orders JSON and click Generate to get a professional report (via Google GenAI).
      </p>

      <Card className="p-4 mb-4">
        <label className="block text-sm font-medium mb-2">Orders JSON</label>
        <textarea
          rows={10}
          className="w-full p-3 border rounded-md font-mono text-sm"
          value={ordersJson}
          onChange={(e) => setOrdersJson(e.target.value)}
          placeholder='[{"id":"1","total":99.99,"items":[{"name":"Item","qty":2,"price":49.99}],"created_at":"2024-01-01T12:00:00Z"}]'
        />
        <div className="mt-3">
          <Button onClick={generate} disabled={loading}>
            {loading ? 'Generating...' : 'Generate Report'}
          </Button>
        </div>
      </Card>

      {report && (
        <Card className="p-4">
          <label className="block text-sm font-medium mb-2">Report</label>
          <pre className="whitespace-pre-wrap bg-muted p-3 rounded-md text-sm overflow-auto max-h-96">
            {report}
          </pre>
        </Card>
      )}
    </div>
  );
}
