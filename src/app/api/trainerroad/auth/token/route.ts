import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    console.log('🔄 TRAINERROAD API: Fetching login token and initial cookies')

    // First, get the login page to extract the __RequestVerificationToken
    const loginPageResponse = await fetch('https://www.trainerroad.com/app/login', {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
    })

    if (!loginPageResponse.ok) {
      console.error('❌ TRAINERROAD API: Failed to fetch login page:', loginPageResponse.status)
      return NextResponse.json(
        { success: false, message: 'Failed to fetch login page' },
        { status: 500 }
      )
    }

    const loginPageHtml = await loginPageResponse.text()

    // Extract the __RequestVerificationToken from the HTML
    const tokenMatch = loginPageHtml.match(/name="__RequestVerificationToken"[^>]*value="([^"]*)"/)
    
    if (!tokenMatch || !tokenMatch[1]) {
      console.error('❌ TRAINERROAD API: Could not find verification token in login page')
      return NextResponse.json(
        { success: false, message: 'Could not extract verification token' },
        { status: 500 }
      )
    }

    const verificationToken = tokenMatch[1]

    // Extract initial cookies from the response
    const setCookieHeaders = loginPageResponse.headers.getSetCookie()
    const initialCookies: string[] = []

    if (setCookieHeaders.length > 0) {
      const cookieStore = await cookies()
      
      for (const cookieHeader of setCookieHeaders) {
        const [cookieData] = cookieHeader.split(';')
        const [name, value] = cookieData.split('=')
        
        if (name && value) {
          // Store initial cookies with tr_ prefix
          cookieStore.set(`tr_${name}`, value, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 30, // 30 days
          })
          
          initialCookies.push(`${name}=${value}`)
        }
      }
    }

    console.log('✅ TRAINERROAD API: Successfully extracted verification token and initial cookies')
    
    return NextResponse.json({
      success: true,
      token: verificationToken,
      cookies: initialCookies,
    })

  } catch (error) {
    console.error('❌ TRAINERROAD API: Error getting login token:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to get login token' },
      { status: 500 }
    )
  }
}
