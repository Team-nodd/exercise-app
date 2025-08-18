import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const ids = searchParams.get('ids')
    if (!ids) {
      return NextResponse.json({ error: 'Missing ids' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const trCookies = Array.from(cookieStore.getAll())
      .filter((c) => c.name.startsWith('tr_'))
      .map((c) => `${c.name.substring(3)}=${c.value}`)

    if (trCookies.length === 0) {
      return NextResponse.json({ error: 'Not authenticated with TrainerRoad' }, { status: 401 })
    }

    const url = `https://www.trainerroad.com/app/api/workout-information?ids=${encodeURIComponent(ids)}`
    const resp = await fetch(url, {
      method: 'GET',
      headers: {
        Cookie: trCookies.join('; '),
        Accept: 'application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0',
        Referer: 'https://www.trainerroad.com/',
      },
    })

    if (!resp.ok) {
      if (resp.status === 401 || resp.status === 403) {
        return NextResponse.json({ error: 'TrainerRoad session expired' }, { status: 401 })
      }
      const text = await resp.text().catch(() => '')
      return NextResponse.json(
        { error: 'Failed to fetch workout info', status: resp.status, details: text.substring(0, 500) },
        { status: resp.status },
      )
    }

    const data = await resp.json()
    if (!Array.isArray(data)) {
      return NextResponse.json({ error: 'Invalid TrainerRoad response' }, { status: 500 })
    }
    return NextResponse.json(data)
  } catch (err) {
    console.error('❌ TRAINERROAD: workout information error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


