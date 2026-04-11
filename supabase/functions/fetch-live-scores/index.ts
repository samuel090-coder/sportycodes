const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Use football-data.org free API (no subscription required, 10 req/min free)
    const apiKey = Deno.env.get('FOOTBALL_DATA_API_KEY')
    
    // Fetch today's matches from football-data.org
    const today = new Date().toISOString().split('T')[0]
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    
    // If API key is available, use authenticated endpoint for more data
    if (apiKey) {
      headers['X-Auth-Token'] = apiKey
    }

    const response = await fetch(
      `https://api.football-data.org/v4/matches?date=${today}`,
      { headers }
    )

    if (!response.ok) {
      const text = await response.text()
      console.error('Football-data.org error:', response.status, text)
      return new Response(JSON.stringify({ error: 'Failed to fetch scores', status: response.status }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const data = await response.json()
    
    // Normalize the response to a consistent format
    const matches = (data.matches || []).map((m: any) => ({
      home: m.homeTeam?.shortName || m.homeTeam?.name || 'Home',
      away: m.awayTeam?.shortName || m.awayTeam?.name || 'Away',
      homeScore: m.score?.fullTime?.home ?? m.score?.halfTime?.home ?? '-',
      awayScore: m.score?.fullTime?.away ?? m.score?.halfTime?.away ?? '-',
      status: m.status || 'SCHEDULED',
      minute: m.minute || null,
      competition: m.competition?.name || '',
      utcDate: m.utcDate || null,
    }))

    return new Response(JSON.stringify({ matches }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
