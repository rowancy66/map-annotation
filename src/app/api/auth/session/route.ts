import { NextResponse } from 'next/server';
import { isLoggedIn } from '@/lib/server/auth';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const loggedIn = await isLoggedIn();
    return NextResponse.json({ loggedIn });
  } catch (error) {
    console.error('Session error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}