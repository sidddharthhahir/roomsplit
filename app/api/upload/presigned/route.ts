export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { generatePresignedUploadUrl, getFileUrl } from '@/lib/s3';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fileName, contentType, isPublic } = await request.json();

    if (!fileName || !contentType) {
      return NextResponse.json({ error: 'fileName and contentType required' }, { status: 400 });
    }

    // Bill photos and avatars are stored permanently (public for easy access)
    const { uploadUrl, cloud_storage_path } = await generatePresignedUploadUrl(
      fileName,
      contentType,
      isPublic !== false
    );

    return NextResponse.json({ uploadUrl, cloud_storage_path });
  } catch (error) {
    console.error('Presigned URL error:', error);
    return NextResponse.json({ error: 'Failed to generate upload URL' }, { status: 500 });
  }
}

// GET - Get public/signed URL for a file
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const cloud_storage_path = searchParams.get('cloud_storage_path');
    const isPublic = searchParams.get('isPublic') === 'true';

    if (!cloud_storage_path) {
      return NextResponse.json({ error: 'cloud_storage_path required' }, { status: 400 });
    }

    const url = await getFileUrl(cloud_storage_path, isPublic);
    return NextResponse.json({ url });
  } catch (error) {
    console.error('Get file URL error:', error);
    return NextResponse.json({ error: 'Failed to get file URL' }, { status: 500 });
  }
}