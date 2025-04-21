
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// Securely retrieve environment variables
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
    // Check if this is a WebSocket upgrade request
    const upgradeHeader = req.headers.get('upgrade') || ''
    if (upgradeHeader.toLowerCase() === 'websocket') {
      console.log("WebSocket upgrade request detected")
      
      if (!SOLANA_TRACKER_WS_URL || !SOLANA_TRACKER_API_KEY) {
        console.error("Missing required environment variables for WebSocket proxy")
        return new Response(JSON.stringify({ error: "Server configuration error" }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      
      try {
        // Format the actual WebSocket URL with API key
        const actualWsUrl = `${SOLANA_TRACKER_WS_URL}?api_key=${SOLANA_TRACKER_API_KEY}`
        console.log("Creating proxy WebSocket connection")
        
        // Upgrade the connection
        const { socket, response } = Deno.upgradeWebSocket(req)
        console.log("Client WebSocket connection upgraded")
        
        // Connect to the target WebSocket
        const targetSocket = new WebSocket(actualWsUrl)
        console.log("Target WebSocket connection initiated")
        
        // Set up event handlers
        targetSocket.onopen = () => {
          console.log("Target WebSocket connection opened successfully")
        }
        
        socket.onmessage = (event) => {
          console.log("Message from client:", typeof event.data === 'string' ? event.data.substring(0, 100) : "[binary data]")
          if (targetSocket.readyState === WebSocket.OPEN) {
            targetSocket.send(event.data)
          }
        }
        
        targetSocket.onmessage = (event) => {
          console.log("Message from target:", typeof event.data === 'string' ? event.data.substring(0, 100) : "[binary data]")
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(event.data)
          }
        }
        
        socket.onclose = (event) => {
          console.log(`Client socket closed: code=${event.code}, reason=${event.reason}`)
          if (targetSocket.readyState === WebSocket.OPEN) {
            targetSocket.close()
          }
        }
        
        targetSocket.onclose = (event) => {
          console.log(`Target socket closed: code=${event.code}, reason=${event.reason}`)
          if (socket.readyState === WebSocket.OPEN) {
            socket.close()
          }
        }
        
        socket.onerror = (error) => {
          console.error('Client socket error:', error)
          if (targetSocket.readyState === WebSocket.OPEN) {
            targetSocket.close()
          }
        }
        
        targetSocket.onerror = (error) => {
          console.error('Target socket error:', error)
          if (socket.readyState === WebSocket.OPEN) {
            socket.close()
          }
        }
        
        return response
      } catch (wsError) {
        console.error("WebSocket connection error:", wsError)
        return new Response(JSON.stringify({ error: "WebSocket connection failed" }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }
    
    // Handle regular HTTP requests
    const body = await req.json()
    
    // If request is just to get WebSocket URL
    if (body.getWsUrl) {
      const reqUrl = new URL(req.url)
      const proxyWsUrl = `wss://${reqUrl.hostname}/functions/v1/solana-tracker`
      
      console.log("Returning proxy WebSocket URL:", proxyWsUrl)
      return new Response(JSON.stringify({ wsUrl: proxyWsUrl }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Wallet trades API logic
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
