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
      return new Response(JSON.stringify({ games: [], error: 'API key missing' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const url = new URL(req.url)
    const category = url.searchParams.get('category') || ''
    const platform = url.searchParams.get('platform') || 'pc'
    const sortBy = url.searchParams.get('sort-by') || 'relevance'

    let apiUrl = `https://free-to-play-games-database.p.rapidapi.com/api/games?platform=${platform}&sort-by=${sortBy}`
    if (category) {
      apiUrl += `&category=${category}`
    }

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-rapidapi-host': 'free-to-play-games-database.p.rapidapi.com',
        'x-rapidapi-key': apiKey,
      },
    })

    if (!response.ok) {
      const text = await response.text()
      console.error('Games API error:', response.status, text)
      return new Response(JSON.stringify({ games: [], error: `API error: ${response.status}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const data = await response.json()

    const games = (Array.isArray(data) ? data : []).slice(0, 30).map((g: any) => ({
      id: g.id,
      title: g.title,
      thumbnail: g.thumbnail,
      short_description: g.short_description,
      game_url: g.game_url,
      genre: g.genre,
      platform: g.platform,
      publisher: g.publisher,
      developer: g.developer,
      release_date: g.release_date,
    }))

    return new Response(JSON.stringify({ games }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Games edge function error:', error)
    return new Response(JSON.stringify({ games: [], error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
