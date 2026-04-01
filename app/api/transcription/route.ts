import { NextRequest, NextResponse } from 'next/server';
import { GeminiTranscription } from '@/lib/gemini-transcription';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const audioFormat = formData.get('format') as string || 'webm';

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    const transcriptionService = new GeminiTranscription();
    const arrayBuffer = await audioFile.arrayBuffer();
    const result = await transcriptionService.transcribeAudio(arrayBuffer, audioFormat);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Transcription API error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Transcription failed',
        demo: error instanceof Error && error.message.includes('not configured') 
      },
      { status: 500 }
    );
  }
}
