import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const start = searchParams.get('start')
    const end = searchParams.get('end')
    let username = searchParams.get('username')

    if (!start || !end) {
      return NextResponse.json({ error: 'Missing required query params: start, end' }, { status: 400 })
    }

    // Auto-discover username from TrainerRoad if not provided (needs cookies first)
    // Prefer DB-stored bundle; fallback to request cookies
    const cookieStore = await cookies()
    let trCookies: string[] = []
    try {
      const supabase = await createServerClient()
      const { data: auth } = await supabase.auth.getUser()
      const userId = auth.user?.id
      if (userId) {
        const { data: sess } = await supabase
          .from('trainerroad_sessions')
          .select('cookies,is_active')
          .eq('user_id', userId)
          .eq('is_active', true)
          .maybeSingle()
        if (sess?.cookies) {
          trCookies = [sess.cookies]
        }
      }
    } catch {}
    if (trCookies.length === 0) {
      trCookies = Array.from(cookieStore.getAll())
        .filter((c) => c.name.startsWith('tr_'))
        .map((c) => `${c.name.substring(3)}=${c.value}`)
    }

    if (!username) {
      const careerResp = await fetch('https://www.trainerroad.com/app/career', {
        method: 'GET',
        redirect: 'follow',
        headers: {
          Cookie: trCookies.join('; '),
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'User-Agent': 'Mozilla/5.0',
          Referer: 'https://www.trainerroad.com/',
        },
      })

      if (careerResp.ok) {
        // Prefer the final URL
        const finalUrl = careerResp.url || ''
        const m = finalUrl.match(/\/app\/career\/([^/?#]+)/)
        if (m && m[1]) {
          username = decodeURIComponent(m[1])
        } else {
          // Fallback: parse HTML for any /app/career/<handle> occurrence
          const html = await careerResp.text().catch(() => '')
          const m2 = html.match(/\/(?:app|career)\/career\/([^\"'\s]+)/)
          if (m2 && m2[1]) {
            username = decodeURIComponent(m2[1])
          }
        }
      }
    }

    if (!username) {
      return NextResponse.json({ error: 'Unable to resolve TrainerRoad username. Try to login first.' }, { status: 400 })
    }

    if (trCookies.length === 0) {
      return NextResponse.json({ error: 'Not authenticated with TrainerRoad' }, { status: 401 })
    }

    const url = `https://www.trainerroad.com/app/api/react-calendar/${encodeURIComponent(
      username,
    )}/activities?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`

    const resp = await fetch(url, {
      method: 'GET',
      headers: {
        Cookie: trCookies.join('; '),
        Accept: 'application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0',
        Referer: `https://www.trainerroad.com/app/career/${encodeURIComponent(username)}`,
      },
    })

    if (!resp.ok) {
      if (resp.status === 401 || resp.status === 403) {
        return NextResponse.json({ error: 'TrainerRoad session expired' }, { status: 401 })
      }
      const text = await resp.text().catch(() => '')
      return NextResponse.json(
        { error: 'Failed to fetch activities', status: resp.status, details: text.substring(0, 500) },
        { status: resp.status },
      )
    }

    const data = await resp.json()
    if (!Array.isArray(data)) {
      return NextResponse.json({ error: 'Invalid TrainerRoad response' }, { status: 500 })
    }
    return NextResponse.json(data)
  } catch (err) {
    console.error('❌ TRAINERROAD: calendar by-date error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


