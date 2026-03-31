import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || cloudName === 'your_cloud_name') {
      return NextResponse.json({ error: 'Cloudinary Cloud Name missing' }, { status: 500 });
    }
    
    if (!apiKey || apiKey === 'your_api_key' || !apiSecret || apiSecret === 'your_api_secret') {
      return NextResponse.json({ error: 'Cloudinary API Key or Secret missing' }, { status: 500 });
    }

    // Step 1: Generate Signature for Signed Upload
    const timestamp = Math.round(new Date().getTime() / 1000);
    
    // For a simple signed upload, we only need the timestamp.
    // Cloudinary signature formula: alphabetical params -> joined with '&' -> append API_SECRET -> SHA1
    // Example: "timestamp=1234567890API_SECRET"
    const paramsToSign = `timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash('sha1').update(paramsToSign).digest('hex');

    // Step 2: Prepare Cloudinary Upload Data
    const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;
    
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);
    uploadFormData.append('api_key', apiKey);
    uploadFormData.append('timestamp', timestamp.toString());
    uploadFormData.append('signature', signature);

    const res = await fetch(cloudinaryUrl, {
      method: 'POST',
      body: uploadFormData,
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('Cloudinary Signed Upload Error:', data);
      return NextResponse.json({ 
        error: data.error?.message || 'Upload failed',
        details: data.error
      }, { status: res.status });
    }

    return NextResponse.json({
      url: data.secure_url,
      type: data.resource_type,
      format: data.format,
      original_filename: data.original_filename
    });

  } catch (error) {
    console.error('Upload API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
