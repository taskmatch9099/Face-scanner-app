// Typed client for skin health API
import axios from 'axios';

export interface FaceAnalysis {
  // Define expected response structure
  // e.g. age, gender, skin_conditions, etc.
  [key: string]: any;
}

export async function analyzeImage(file: File | Blob): Promise<{ face_analyses: FaceAnalysis[] }> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await axios.post('/api/skin-health/api/analysis/face', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}
