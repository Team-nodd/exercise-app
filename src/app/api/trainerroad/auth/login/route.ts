import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

interface TrainerRoadLoginRequest {
  email: string
  password: string
}

export async function POST(request: NextRequest) {
  try {
    const { email, password }: TrainerRoadLoginRequest = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email and password are required' },
        { status: 400 }
      )
    }

    console.log('🔄 TRAINERROAD API: Starting ASP.NET authentication flow')

    const cookieStore = await cookies()

    // Get stored cookies and verification token from previous token request
    const storedCookies = Array.from(cookieStore.getAll())
      .filter(cookie => cookie.name.startsWith('tr_'))
      .map(cookie => `${cookie.name.substring(3)}=${cookie.value}`)

    if (storedCookies.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No initial cookies found. Please refresh and try again.' },
        { status: 400 }
      )
    }

    // Get the verification token from the login page first
    const loginPageResponse = await fetch('https://www.trainerroad.com/app/login', {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Cookie': storedCookies.join('; '),
      },
    })

    const loginPageHtml = await loginPageResponse.text()
    const tokenMatch = loginPageHtml.match(/name="__RequestVerificationToken"[^>]*value="([^"]*)"/)
    
    if (!tokenMatch || !tokenMatch[1]) {
      console.error('❌ TRAINERROAD API: Could not find verification token')
      return NextResponse.json(
        { success: false, message: 'Could not extract verification token' },
        { status: 500 }
      )
    }

    const verificationToken = tokenMatch[1]

    // Update cookies from login page response
    const pageSetCookies = loginPageResponse.headers.getSetCookie()
    const updatedCookies = [...storedCookies]

    for (const cookieHeader of pageSetCookies) {
      const [cookieData] = cookieHeader.split(';')
      const [name, value] = cookieData.split('=')
      
      if (name && value) {
        // Update cookie in our store
        cookieStore.set(`tr_${name}`, value, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 30,
        })
        
        // Update in current request cookies
        const existingIndex = updatedCookies.findIndex(c => c.startsWith(`${name}=`))
        if (existingIndex >= 0) {
          updatedCookies[existingIndex] = `${name}=${value}`
        } else {
          updatedCookies.push(`${name}=${value}`)
        }
      }
    }

    console.log('🔄 TRAINERROAD API: Submitting login with verification token')

    // Now submit the login form with the verification token
    const loginResponse = await fetch('https://www.trainerroad.com/app/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://www.trainerroad.com/app/login',
        'Cookie': updatedCookies.join('; '),
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      body: new URLSearchParams({
        'Email': email,
        'Password': password,
        '__RequestVerificationToken': verificationToken,
        'RememberMe': 'false',
      }),
      redirect: 'manual', // Don't follow redirects automatically
    })

    // Check if login was successful
    const isSuccessful = loginResponse.status === 302 && 
                        (loginResponse.headers.get('location')?.includes('/app/home') ||
                         loginResponse.headers.get('location')?.includes('/app/dashboard') ||
                         loginResponse.headers.get('location')?.includes('/app'))

    if (!isSuccessful) {
      console.error('❌ TRAINERROAD API: Login failed - no redirect or wrong redirect')
      
      // Try to extract error message from response
      const responseText = await loginResponse.text()
      let errorMessage = 'Invalid TrainerRoad credentials'
      
      if (responseText.includes('invalid') || responseText.includes('incorrect')) {
        errorMessage = 'Invalid email or password'
      } else if (responseText.includes('locked') || responseText.includes('blocked')) {
        errorMessage = 'Account is locked. Please try again later.'
      }

      return NextResponse.json(
        { success: false, message: errorMessage },
        { status: 401 }
      )
    }

    // Extract all session cookies from the successful login response
    const loginSetCookies = loginResponse.headers.getSetCookie()
    const sessionCookies: string[] = []

    for (const cookieHeader of loginSetCookies) {
      const [cookieData] = cookieHeader.split(';')
      const [name, value] = cookieData.split('=')
      
      if (name && value) {
        // Store session cookies
        cookieStore.set(`tr_${name}`, value, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 30, // 30 days
        })
        
        sessionCookies.push(`${name}=${value}`)
      }
    }

    console.log('✅ TRAINERROAD API: ASP.NET authentication successful')
    
    return NextResponse.json({
      success: true,
      message: 'Successfully authenticated with TrainerRoad',
      sessionCookies,
    })

  } catch (error) {
    console.error('❌ TRAINERROAD API: Authentication error:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: 'Authentication failed due to server error' 
      },
      { status: 500 }
    )
  }
}
