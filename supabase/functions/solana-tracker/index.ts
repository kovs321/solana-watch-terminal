
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const SOLANA_TRACKER_API_KEY = Deno.env.get('SOLANA_TRACKER_API_KEY')
const SOLANA_TRACKER_WS_URL = Deno.env.get('SOLANA_TRACKER_WS_URL')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    
    // If request is just to get WebSocket URL
    if (body.getWsUrl) {
      return new Response(JSON.stringify({ wsUrl: SOLANA_TRACKER_WS_URL }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { walletAddress, cursor } = body
    const url = new URL(`/wallet/${walletAddress}/trades`, 'https://data.solanatracker.io')
    if (cursor) {
      url.searchParams.append('cursor', cursor.toString())
    }

    const response = await fetch(url.toString(), {
      headers: {
        'x-api-key': SOLANA_TRACKER_API_KEY!,
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()
    return new Response(JSON.stringify({
      trades: data.trades,
      nextCursor: data.nextCursor,
      hasNextPage: data.hasNextPage,
      wsUrl: SOLANA_TRACKER_WS_URL
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error in solana-tracker function:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
