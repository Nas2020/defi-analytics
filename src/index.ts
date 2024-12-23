import { Hono } from 'hono'
import db from './db/db';
import { getBalanceRoute } from './routes/balance'
import { blockchainService } from './services/blockchain'
import { getTransactionsRoute } from './routes/transactions'
import { getTokenBalancesRoute } from './routes/tokens'
import { getAddressInfoRoute, getAddressTokensRoute } from './routes/address'
import { getNftInfoRoute } from './routes/nft-info';
import { getNetworkRoute, setNetworkRoute } from './routes/network';
import { networkService } from './services/networkService';
import { getVSGInfoRoute } from './routes/vsg-info';

const app = new Hono()

const corsConfig = {
  origins: process.env.NODE_ENV === 'production'
    ? ['https://production-domain.com']
    : ['http://localhost:5173', 'http://localhost:3000'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  maxAge: 3600,
  credentials: true
}

app.use('/*', async (c, next) => {
  const origin = c.req.header('Origin')

  // Check if origin is allowed
  if (origin && corsConfig.origins.includes(origin)) {
    c.res.headers.set('Access-Control-Allow-Origin', origin)
    c.res.headers.set('Access-Control-Allow-Methods', corsConfig.allowMethods.join(', '))
    c.res.headers.set('Access-Control-Allow-Headers', corsConfig.allowHeaders.join(', '))
    c.res.headers.set('Access-Control-Max-Age', corsConfig.maxAge.toString())

    if (corsConfig.credentials) {
      c.res.headers.set('Access-Control-Allow-Credentials', 'true')
    }
  }

  // Handle preflight requests
  if (c.req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: c.res.headers
    })
  }

  await next()
})

// Rest of your code remains the same...

// Add this test route temporarily
app.get('/test-db', (c) => {
  const tables = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table'
  `).all();

  const indices = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='index'
  `).all();

  return c.json({
    tables,
    indices,
    message: 'Database initialized successfully'
  });
});

// Define routes
app.get('/', (c) => c.text('Hello Hono!'))
// API test route
app.get('/api/test', async (c) => {
  const isConnected = await blockchainService.testConnection()
  // const network = process.env.NETWORK || 'testnet'
 const network = networkService.getCurrentNetwork();
  const apiUrl = blockchainService['baseUrl']

  return c.json({
    status: isConnected ? 'connected' : 'error',
    network,
    apiUrl,
    timestamp: new Date().toISOString()
  })
})

app.get('/api/network', getNetworkRoute);
app.post('/api/network', setNetworkRoute);
app.get('/api/balance/:address', getBalanceRoute)
app.get('/api/transactions/:address', getTransactionsRoute)
app.get('/api/token-balances/:address', getTokenBalancesRoute)
app.get('/api/address/:address', getAddressInfoRoute)
app.get('/api/address/:address/tokens', getAddressTokensRoute)

// For DeFI 
app.get('/api/nft-info', getNftInfoRoute)
app.get('/api/vsg-info', getVSGInfoRoute)

// Available routes for logging
const routes = [
  '/',
  '/api/network',
  '/api/balance/:address',
  '/api/transactions/:address',
  '/api/token-balances/:address',
  '/api/address/:address/tokens',
  '/api/nft-info',
  '/api/vsg-info'
]

// Server configuration
const port = Number(process.env.PORT) || 3002
const network = process.env.NETWORK || 'testnet'

// Clear console
console.clear()

// Start server
const server = Bun.serve({
  fetch: app.fetch,
  port,
  development: process.env.NODE_ENV !== 'production',
  hostname: 'localhost',
  error(error: Error) {
    return new Response(`Server error: ${error.message}`, { status: 500 })
  },
})

// Log server info
if (server.hostname) {
  console.log('\n🚀 Server started successfully!\n')
  console.log('📡 Environment:', network.toUpperCase())
  console.log('🌍 URL:', `http://${server.hostname}:${port}`)
  console.log('\n📍 Available Routes:')
  routes.forEach(route => {
    console.log(`   ${route}`)
  })
  console.log('\n⚡ Press Ctrl + C to stop the server\n')
}