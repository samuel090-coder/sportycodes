const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0]

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return new Response(JSON.stringify({ error: 'Invalid date format. Use YYYY-MM-DD' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const apiKey = Deno.env.get('RAPIDAPI_KEY')
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const response = await fetch(
      `https://football-score-api.p.rapidapi.com/api/v1/scores/${date}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-rapidapi-host': 'football-score-api.p.rapidapi.com',
          'x-rapidapi-key': apiKey,
        },
      }
    )

    if (!response.ok) {
      const text = await response.text()
      console.error('RapidAPI error:', response.status, text)
      return new Response(JSON.stringify({ error: 'Failed to fetch scores', status: response.status }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const data = await response.json()

    return new Response(JSON.stringify(data), {
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
