import { Context } from 'hono'
import db from '../db/db'
import { APIResponse, Transaction } from '../types/blockchain'
import { networkService } from '../services/networkService'


const CACHE_DURATION_MS = 5 * 60 * 1000 // 5 minutes

export const getTransactionsRoute = async (c: Context) => {
    const address = c.req.param('address')
    if (!address) {
        return c.json({ error: 'Address parameter is required' }, 400)
    }

    const page = c.req.query('page') || '1'
    const pageSize = c.req.query('limit') || '50'

    // Check cache first
    const cachedTransactions = db.prepare(`
        SELECT data, fetched_at 
        FROM address_transactions 
        WHERE address = ? AND page_number = ? AND page_size = ?
        ORDER BY fetched_at DESC LIMIT 1
    `).get(address, page, pageSize)

    if (cachedTransactions) {
        const lastFetched = new Date(cachedTransactions.fetched_at).getTime()
        const now = Date.now()

        if (now - lastFetched < CACHE_DURATION_MS) {
            const transactions = JSON.parse(cachedTransactions.data)
            return c.json({
                address,
                page: parseInt(page),
                limit: parseInt(pageSize),
                transactions,
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
        const apiEndpoint = `${apiUrl}/api?module=account&action=txlist&address=${address}&page=${page}&offset=${pageSize}`
        console.log(`🔍 Fetching transactions from: ${apiEndpoint}`)

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
                error: 'Failed to fetch transactions',
                details: {
                    status: response.status,
                    message: response.statusText,
                    body: errorText
                }
            }, 502)
        }

        const data: APIResponse<Transaction[]> = await response.json()
        console.log('✅ API Response:', data)

        if (data.status === '0') {
            return c.json({
                error: 'API Error',
                message: data.message || 'Unknown error',
                result: data.result
            }, 400)
        }

        const transactions = data.result || []

        // Store in cache
        db.prepare(`
            INSERT INTO address_transactions (address, page_number, page_size, data) 
            VALUES (?, ?, ?, ?)
        `).run(address, page, pageSize, JSON.stringify(transactions))

        return c.json({
            address,
            page: parseInt(page),
            limit: parseInt(pageSize),
            transactions,
            source: 'fresh'
        })

    } catch (err) {
        console.error('🔥 Error fetching transactions:', err)
        return c.json({
            error: 'Internal Server Error',
            message: err instanceof Error ? err.message : 'Unknown error'
        }, 500)
    }
}