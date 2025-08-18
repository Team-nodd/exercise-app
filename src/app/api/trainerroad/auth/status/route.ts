import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    const cookieStore = await cookies()
    
    // Check if we have TrainerRoad session cookies
    const trCookies = Array.from(cookieStore.getAll())
      .filter(cookie => cookie.name.startsWith('tr_'))
      .map(cookie => `${cookie.name.substring(3)}=${cookie.value}`)
    
    if (trCookies.length === 0) {
      return NextResponse.json({ authenticated: false }, { status: 401 })
    }

    // Test the session by making a simple API call to TrainerRoad
    const testResponse = await fetch('https://www.trainerroad.com/app/api/career/self/recent-activities', {
      headers: {
        'Cookie': trCookies.join('; '),
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    })

    const isAuthenticated = testResponse.ok

    if (!isAuthenticated) {
      // Clear invalid session cookies
      const cookieStore = await cookies()
      const trCookies = Array.from(cookieStore.getAll())
        .filter(cookie => cookie.name.startsWith('tr_'))
      
      for (const cookie of trCookies) {
        cookieStore.delete(cookie.name)
      }
    }

    return NextResponse.json({ 
      authenticated: isAuthenticated 
    }, { 
      status: isAuthenticated ? 200 : 401 
    })

  } catch (error) {
    console.error('❌ TRAINERROAD API: Auth status check error:', error)
    return NextResponse.json({ authenticated: false }, { status: 500 })
  }
}
