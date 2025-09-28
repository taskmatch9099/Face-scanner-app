import React, { useState } from 'react';
import { analyzeImage, AnalyzeResponse } from '@/services/skinHealthApi';

export default function SkinHealthDemo() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] ?? null);
    setResult(null);
    setError(null);
  };

  const onAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const res = await analyzeImage(file);
      setResult(res);
    } catch (e: any) {
      setError(e?.message ?? 'Unexpected error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: '40px auto', padding: 16 }}>
      <h1>Skin Health AI Demo</h1>
      <p>Upload a face image to analyze acne spots and severity. The backend is proxied at <code>/api/skin-health</code>.</p>

      <input type="file" accept="image/*" onChange={onChange} />
      <button onClick={onAnalyze} disabled={!file || loading} style={{ marginLeft: 8 }}>
        {loading ? 'Analyzing...' : 'Analyze'}
      </button>

      {error && <p style={{ color: 'red' }}>Error: {error}</p>}

      {result && (
        <div style={{ marginTop: 24 }}>
          <h2>Results</h2>
          {result.face_analyses?.map((fa) => (
            <div key={fa.face_id} style={{ border: '1px solid #ddd', padding: 12, marginBottom: 12 }}>
              <div><strong>Face {fa.face_id}</strong></div>
              <div>Acne Count: {fa.acne_count}</div>
              {'density_per_100px' in fa && fa.density_per_100px !== undefined && (
                <div>Density (per 100x100): {fa.density_per_100px}</div>
              )}
              <div>Severity: {fa.severity}</div>
              <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
                {fa.overlays?.annotated && (
                  <div>
                    <div>Annotated</div>
                    <img src={fa.overlays.annotated} alt="annotated" style={{ maxWidth: 320 }} />
                  </div>
                )}
                {fa.overlays?.heatmap && (
                  <div>
                    <div>Heatmap</div>
                    <img src={fa.overlays.heatmap} alt="heatmap" style={{ maxWidth: 320 }} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}