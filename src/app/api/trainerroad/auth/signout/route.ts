import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST() {
  try {
    const cookieStore = await cookies()
    
    // Clear all TrainerRoad cookies
    const trCookies = Array.from(cookieStore.getAll())
      .filter(cookie => cookie.name.startsWith('tr_'))
    
    for (const cookie of trCookies) {
      cookieStore.delete(cookie.name)
    }

    console.log('✅ TRAINERROAD API: Session cleared')
    
    return NextResponse.json({
      success: true,
      message: 'Successfully signed out from TrainerRoad',
    })

  } catch (error) {
    console.error('❌ TRAINERROAD API: Signout error:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to sign out' 
      },
      { status: 500 }
    )
  }
}