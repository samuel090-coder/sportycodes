const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const apiKey = Deno.env.get('RAPIDAPI_KEY')
    
    if (!apiKey) {
      console.error('RAPIDAPI_KEY not found')
      return new Response(JSON.stringify({ matches: [], error: 'API key missing' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const response = await fetch(
      'https://free-api-live-football-data.p.rapidapi.com/football-current-live',
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-rapidapi-host': 'free-api-live-football-data.p.rapidapi.com',
          'x-rapidapi-key': apiKey,
        },
      }
    )

    if (!response.ok) {
      const text = await response.text()
      console.error('API error:', response.status, text)
      const fallback = await loadAdminMatches()
      return new Response(JSON.stringify({ matches: fallback, error: `API error: ${response.status}`, source: 'admin' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const data = await response.json()
    
    const liveMatches = data?.response?.live || []
    
    const matches = liveMatches.map((m: any) => ({
      home: m.home?.name || 'Home',
      away: m.away?.name || 'Away',
      homeScore: m.home?.score ?? '-',
      awayScore: m.away?.score ?? '-',
      status: m.status?.ongoing ? 'IN_PLAY' : m.status?.finished ? 'FINISHED' : m.status?.cancelled ? 'CANCELLED' : 'SCHEDULED',
      minute: m.status?.liveTime?.short?.replace(/[^\d+']/g, '') || null,
      competition: '',
    }))

    return new Response(JSON.stringify({ matches }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(JSON.stringify({ matches: [], error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
