import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    if (!id || !id.match(/^scene-\d+$/)) {
      return NextResponse.json(
        { success: false, error: 'Invalid scene ID' },
        { status: 400 }
      );
    }
    
    const scenePath = path.join(process.cwd(), 'data/scenes', `${id}.json`);
    
    try {
      const content = await readFile(scenePath, 'utf-8');
      const sceneData = JSON.parse(content);
      return NextResponse.json({
        success: true,
        ...sceneData,
      });
    } catch {
      // Fallback to old TSX files for backward compatibility
      const tsxPath = path.join(process.cwd(), 'app/play', `${id}.tsx`);
      try {
        await readFile(tsxPath, 'utf-8');
        return NextResponse.json({
          success: true,
          id,
          legacy: true,
          note: 'This is a legacy TSX scene'
        });
      } catch {
        return NextResponse.json(
          { success: false, error: 'Scene not found' },
          { status: 404 }
        );
      }
    }
    
  } catch (error) {
    console.error('Get scene error:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
