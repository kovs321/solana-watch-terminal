
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
      // Instead of returning the URL with the API key, generate a proxy URL for the edge function
      // that will handle the WebSocket connection
      const reqUrl = new URL(req.url);
      const proxyWsUrl = `wss://${reqUrl.hostname}/functions/v1/solana-tracker`;
      
      return new Response(JSON.stringify({ wsUrl: proxyWsUrl }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Handle wallet trades API
    const { walletAddress, cursor } = body
    
    if (walletAddress && !body.wsProxy) {
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
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // WebSocket connection upgrade handling - this part will handle the actual WebSocket connection
    const upgradeHeader = req.headers.get('upgrade') || ''
    if (upgradeHeader.toLowerCase() === 'websocket') {
      // Create WebSocket connection to SolanaTracker with API key
      const actualWsUrl = `${SOLANA_TRACKER_WS_URL}?api_key=${SOLANA_TRACKER_API_KEY}`;
      
      const { socket, response } = Deno.upgradeWebSocket(req);
      const targetSocket = new WebSocket(actualWsUrl);
      
      // Forward messages from client to target
      socket.onmessage = (event) => {
        if (targetSocket.readyState === WebSocket.OPEN) {
          targetSocket.send(event.data);
        }
      };
      
      // Forward messages from target to client
      targetSocket.onmessage = (event) => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(event.data);
        }
      };
      
      // Handle close events
      socket.onclose = () => {
        if (targetSocket.readyState === WebSocket.OPEN) {
          targetSocket.close();
        }
      };
      
      targetSocket.onclose = () => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.close();
        }
      };
      
      // Handle error events
      socket.onerror = (error) => {
        console.error('Client socket error:', error);
        if (targetSocket.readyState === WebSocket.OPEN) {
          targetSocket.close();
        }
      };
      
      targetSocket.onerror = (error) => {
        console.error('Target socket error:', error);
        if (socket.readyState === WebSocket.OPEN) {
          socket.close();
        }
      };
      
      return response;
    }

    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400,
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
