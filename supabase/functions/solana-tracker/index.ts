
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
        console.error(`WS_URL exists: ${!!SOLANA_TRACKER_WS_URL}, API_KEY exists: ${!!SOLANA_TRACKER_API_KEY}`)
        return new Response(JSON.stringify({ error: "Server configuration error - missing environment variables" }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      
      try {
        // Format the actual WebSocket URL with API key
        const actualWsUrl = `${SOLANA_TRACKER_WS_URL}?api_key=${SOLANA_TRACKER_API_KEY}`
        console.log("Creating proxy WebSocket connection to:", SOLANA_TRACKER_WS_URL.split('?')[0])
        
        // Upgrade the connection
        const { socket, response } = Deno.upgradeWebSocket(req)
        console.log("Client WebSocket connection upgraded successfully")
        
        // Connect to the target WebSocket
        const targetSocket = new WebSocket(actualWsUrl)
        console.log("Target WebSocket connection initiated with API key")
        
        // Set up event handlers
        targetSocket.onopen = () => {
          console.log("Target WebSocket connection opened successfully")
          // Send initial message to confirm connection
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
              type: 'system',
              message: 'WebSocket proxy connection established successfully',
              timestamp: new Date().toISOString()
            }))
          }
        }
        
        socket.onmessage = (event) => {
          const isString = typeof event.data === 'string'
          console.log("Message from client:", isString ? event.data.substring(0, 100) : "[binary data]")
          if (targetSocket.readyState === WebSocket.OPEN) {
            targetSocket.send(event.data)
          } else {
            console.warn(`Cannot forward client message, target socket not ready (state: ${targetSocket.readyState})`)
            if (socket.readyState === WebSocket.OPEN) {
              socket.send(JSON.stringify({
                type: 'error',
                message: 'Target WebSocket not ready, message could not be delivered',
                timestamp: new Date().toISOString()
              }))
            }
          }
        }
        
        targetSocket.onmessage = (event) => {
          const isString = typeof event.data === 'string'
          console.log("Message from target:", isString ? event.data.substring(0, 100) : "[binary data]")
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(event.data)
          } else {
            console.warn(`Cannot forward target message, client socket not ready (state: ${socket.readyState})`)
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
            socket.send(JSON.stringify({
              type: 'error',
              message: `Target WebSocket closed (code: ${event.code})`,
              timestamp: new Date().toISOString()
            }))
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
            socket.send(JSON.stringify({
              type: 'error',
              message: 'Error in target WebSocket connection',
              timestamp: new Date().toISOString()
            }))
            socket.close()
          }
        }
        
        return response
      } catch (wsError) {
        console.error("WebSocket connection error:", wsError)
        return new Response(JSON.stringify({ 
          error: "WebSocket connection failed", 
          details: wsError.message || "Unknown error" 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }
    
    // Handle regular HTTP requests
    const body = await req.json()
    
    // If request is just to get WebSocket URL
    if (body.getWsUrl) {
      // Validate that secrets exist before returning the URL
      if (!SOLANA_TRACKER_API_KEY || !SOLANA_TRACKER_WS_URL) {
        console.error("Missing required environment variables for WebSocket")
        console.error(`WS_URL exists: ${!!SOLANA_TRACKER_WS_URL}, API_KEY exists: ${!!SOLANA_TRACKER_API_KEY}`)
        return new Response(JSON.stringify({ 
          error: "Server configuration error - missing environment variables",
          wsUrlExists: !!SOLANA_TRACKER_WS_URL,
          apiKeyExists: !!SOLANA_TRACKER_API_KEY
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      
      const reqUrl = new URL(req.url)
      const proxyWsUrl = `wss://${reqUrl.hostname}/functions/v1/solana-tracker`
      
      console.log("Returning proxy WebSocket URL:", proxyWsUrl)
      return new Response(JSON.stringify({ 
        wsUrl: proxyWsUrl,
        configValid: true,
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Wallet trades API logic
    const { walletAddress, cursor } = body
    
    if (walletAddress && !body.wsProxy) {
      if (!SOLANA_TRACKER_API_KEY) {
        console.error("Missing API key for wallet trades request")
        return new Response(JSON.stringify({ 
          error: "Server configuration error - missing API key" 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      
      const url = new URL(`/wallet/${walletAddress}/trades`, 'https://data.solanatracker.io')
      if (cursor) {
        url.searchParams.append('cursor', cursor.toString())
      }

      console.log("Fetching trades for wallet:", walletAddress)
      
      const response = await fetch(url.toString(), {
        headers: {
          'x-api-key': SOLANA_TRACKER_API_KEY,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        console.error(`API request failed with status: ${response.status}`)
        const errorText = await response.text()
        console.error("Error response:", errorText)
        return new Response(JSON.stringify({ 
          error: "API request failed", 
          status: response.status,
          details: errorText
        }), {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const data = await response.json()
      return new Response(JSON.stringify({
        trades: data.trades || [],
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
    return new Response(JSON.stringify({ 
      error: error.message || "Unknown error",
      stack: error.stack,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
