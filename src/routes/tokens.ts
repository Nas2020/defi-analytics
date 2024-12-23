import { Context } from 'hono'
import db from '../db/db'
import { APIResponse, TokenBalance } from '../types/blockchain'
import { networkService } from '../services/networkService'


const CACHE_DURATION_MS = 5 * 60 * 1000 // 5 minutes

export const getTokenBalancesRoute = async (c: Context) => {
    const address = c.req.param('address')
    if (!address) {
        return c.json({ error: 'Address parameter is required' }, 400)
    }

    // Check cache first
    const cachedTokens = db.prepare(`
        SELECT data, fetched_at 
        FROM address_tokens 
        WHERE address = ? 
        ORDER BY fetched_at DESC LIMIT 1
    `).get(address)

    if (cachedTokens) {
        const lastFetched = new Date(cachedTokens.fetched_at).getTime()
        const now = Date.now()

        if (now - lastFetched < CACHE_DURATION_MS) {
            const tokens = JSON.parse(cachedTokens.data)
            return c.json({
                address,
                tokens,
                source: 'cache'
            })
        }
    }

    // const network = process.env.NETWORK || 'testnet'
    const network = networkService.getCurrentNetwork();
    const apiUrl = network === 'mainnet'
        ? process.env.VSC_MAINNET_API
        : process.env.VSC_TESTNET_API

    if (!apiUrl) {
        return c.json({ error: 'API URL not configured' }, 500)
    }

    try {
        // Updated API URL to match the balance route structure
        const apiEndpoint = `${apiUrl}/api?module=account&action=tokenlist&address=${address}`
        console.log(`🔍 Fetching token balances from: ${apiEndpoint}`)

        const response = await fetch(apiEndpoint)
        if (!response.ok) {
            const errorText = await response.text()
            console.error('❌ API Error:', {
                status: response.status,
                statusText: response.statusText,
                body: errorText,
                url: apiEndpoint
            })
            return c.json({
                error: 'Failed to fetch token balances',
                details: {
                    status: response.status,
                    message: response.statusText,
                    body: errorText
                }
            }, 502)
        }

        const data: APIResponse<TokenBalance[]> = await response.json()
        console.log('✅ API Response:', data)

        if (data.status === '0') {
            return c.json({
                error: 'API Error',
                message: data.message || 'Unknown error',
                result: data.result
            }, 400)
        }

        const tokens = data.result || []

        // Store in cache
        db.prepare(`
            INSERT INTO address_tokens (address, data) 
            VALUES (?, ?)
        `).run(address, JSON.stringify(tokens))

        return c.json({
            address,
            tokens,
            source: 'fresh'
        })

    } catch (err) {
        console.error('🔥 Error fetching token balances:', err)
        return c.json({
            error: 'Internal Server Error',
            message: err instanceof Error ? err.message : 'Unknown error'
        }, 500)
    }
}