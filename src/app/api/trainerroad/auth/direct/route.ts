import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@/lib/supabase/server'

interface DirectAuthRequest {
  email: string
  password: string
}

export async function POST(request: NextRequest) {
  try {
    const { email, password }: DirectAuthRequest = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email and password are required' },
        { status: 400 }
      )
    }

    console.log('🔄 TRAINERROAD API: Starting direct ASP.NET authentication flow for:', email)

    // Step 1: Get the login page and extract verification token
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
        { success: false, message: 'Failed to access TrainerRoad login page' },
        { status: 500 }
      )
    }

    const loginPageHtml = await loginPageResponse.text()
    // Debug: Let's see what form fields are available
    const formMatch = loginPageHtml.match(/<form[^>]*>(.*?)<\/form>/g)
    if (formMatch) {
      console.log('🔍 TRAINERROAD API: Form content preview:', formMatch[1].substring(0, 1000))
    }

    // Extract the __RequestVerificationToken from the HTML
    const tokenMatch = loginPageHtml.match(/name="__RequestVerificationToken"[^>]*value="([^"]*)"/)
    
    if (!tokenMatch || !tokenMatch[1]) {
      console.error('❌ TRAINERROAD API: Could not find verification token in login page')
      console.log('🔍 TRAINERROAD API: HTML preview for debugging:', loginPageHtml.substring(0, 2000))
      return NextResponse.json(
        { success: false, message: 'Could not extract verification token' },
        { status: 500 }
      )
    }

    const verificationToken = tokenMatch[1]
    console.log('🔍 TRAINERROAD API: Extracted verification token:', verificationToken.substring(0, 20) + '...')

    // Extract initial cookies from the response
    const pageSetCookies = loginPageResponse.headers.getSetCookie()
    const initialCookies: string[] = []

    for (const cookieHeader of pageSetCookies) {
      const [cookieData] = cookieHeader.split(';')
      const [name, value] = cookieData.split('=')
      
      if (name && value) {
        initialCookies.push(`${name}=${value}`)
      }
    }

    console.log('🔍 TRAINERROAD API: Extracted', initialCookies.length, 'initial cookies')
    console.log('🔄 TRAINERROAD API: Submitting login with verification token directly to TrainerRoad')

    // Step 2: Submit the login form directly to TrainerRoad with the verification token
    const loginResponse = await fetch('https://www.trainerroad.com/app/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://www.trainerroad.com/app/login',
        'Cookie': initialCookies.join('; '),
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      body: new URLSearchParams({
        'Username': email,
        'Password': password,
        'ReturnUrl': '',
        '__RequestVerificationToken': verificationToken,
      }),
      redirect: 'manual', // Don't follow redirects automatically
    })

    // Check if login was successful
    const redirectLocation = loginResponse.headers.get('location')
    console.log('🔍 TRAINERROAD API: All response headers:', Object.fromEntries(loginResponse.headers.entries()))
    
    // Let's be more flexible about what constitutes success
    const isSuccessful = loginResponse.status === 302 && redirectLocation && 
                        !redirectLocation.includes('/login')

    console.log('🔍 TRAINERROAD API: Login response status:', loginResponse.status)
    console.log('🔍 TRAINERROAD API: Redirect location:', redirectLocation)

    if (!isSuccessful) {
      console.error('❌ TRAINERROAD API: Login failed - Status:', loginResponse.status, 'Location:', redirectLocation)
      
      // Try to extract error message from response
      const responseText = await loginResponse.text()
      console.log('🔍 TRAINERROAD API: Response body preview:', responseText.substring(0, 1000))
      
      // Look for validation errors in the response
      if (responseText.includes('validation-summary-errors') || responseText.includes('field-validation-error')) {
        console.log('🔍 TRAINERROAD API: Found validation errors in response')
        // Try to extract specific validation messages
        const validationErrors = responseText.match(/field-validation-error[^>]*>([^<]+)</g)
        if (validationErrors) {
          console.log('🔍 TRAINERROAD API: Validation errors:', validationErrors.map(e => e.replace(/[^>]*>/, '')))
        }
      }
      
      let errorMessage = 'Invalid TrainerRoad credentials'
      
      if (responseText.includes('invalid') || responseText.includes('incorrect')) {
        errorMessage = 'Invalid email or password'
      } else if (responseText.includes('locked') || responseText.includes('blocked')) {
        errorMessage = 'Account is locked. Please try again later.'
      } else if (responseText.includes('validation-summary-errors')) {
        // Extract ASP.NET validation errors (avoid 's' flag; use [\s\S])
        const ulMatch = responseText.match(/<div[^>]*validation-summary-errors[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/)
        if (ulMatch && ulMatch[1]) {
          const listItems = ulMatch[1].match(/<li[^>]*>([\s\S]*?)<\/li>/g)
          if (listItems && listItems.length > 0) {
            errorMessage = listItems[0].replace(/<[^>]*>/g, '').trim()
          }
        }
      }

      return NextResponse.json(
        { success: false, message: errorMessage },
        { status: 401 }
      )
    }

    // Extract all session cookies from the successful login response
    const loginSetCookies = loginResponse.headers.getSetCookie()
    const sessionCookies: string[] = []
    const cookieStore = await cookies()

    for (const cookieHeader of loginSetCookies) {
      const [cookieData] = cookieHeader.split(';')
      const [name, value] = cookieData.split('=')
      
      if (name && value) {
        // Store session cookies in our backend with tr_ prefix
        cookieStore.set(`tr_${name}`, value, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 30, // 30 days
        })
        
        sessionCookies.push(`${name}=${value}`)
      }
    }

    console.log(`✅ TRAINERROAD API: Direct authentication successful, stored ${sessionCookies.length} session cookies`)

    // Persist cookies bundle to DB for seamless reuse
    try {
      const supabase = await createServerClient()
      const { data: auth } = await supabase.auth.getUser()
      const userId = auth.user?.id
      if (userId) {
        const bundle = sessionCookies.join('; ')
        await supabase
          .from('trainerroad_sessions')
          .upsert({ user_id: userId, cookies: bundle, is_active: true, updated_at: new Date().toISOString() })
      }
    } catch (e) {
      console.error('❌ TRAINERROAD API: Failed to save cookies to DB:', e)
    }
    
    return NextResponse.json({
      success: true,
      message: 'Successfully authenticated with TrainerRoad using direct request',
      sessionCookies,
    })

  } catch (error) {
    console.error('❌ TRAINERROAD API: Direct authentication error:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: 'Authentication failed due to server error' 
      },
      { status: 500 }
    )
  }
}
