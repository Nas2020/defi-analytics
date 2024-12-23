// src/routes/balance.ts
import { Context } from 'hono'
import db from '../db/db'
import { networkService } from '../services/networkService'

const CACHE_DURATION_MS = 5 * 60 * 1000 // 5 minutes

export const getBalanceRoute = async (c: Context) => {
    const address = c.req.param('address')
    if (!address) {
        return c.json({ error: 'Address parameter is required' }, 400)
    }

    // const network = process.env.NETWORK || 'testnet'
    const network = networkService.getCurrentNetwork();
    const apiUrl = network === 'mainnet'
        ? process.env.VSC_MAINNET_API
        : process.env.VSC_TESTNET_API

    if (!apiUrl) {
        return c.json({ error: 'API URL not configured' }, 500)
    }

    // Check cache first
    const cachedBalance = db.prepare(
        'SELECT balance, fetched_at FROM account_balances WHERE address = ? ORDER BY fetched_at DESC LIMIT 1'
    ).get(address)

    if (cachedBalance) {
        const lastFetched = new Date(cachedBalance.fetched_at).getTime()
        const now = Date.now()

        if (now - lastFetched < CACHE_DURATION_MS) {
            return c.json({
                address,
                balance: cachedBalance.balance,
                source: 'cache'
            })
        }
    }

    try {
        // Updated API URL with required parameters
        const apiEndpoint = `${apiUrl}/api?module=account&action=balance&address=${address}`
        console.log(`🔍 Fetching balance from: ${apiEndpoint}`)

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
                error: 'Failed to fetch address info',
                details: {
                    status: response.status,
                    message: response.statusText,
                    body: errorText
                }
            }, 502)
        }

        const data = await response.json()
        console.log('✅ API Response:', data)

        if (data.status === '0') {
            return c.json({
                error: 'API Error',
                message: data.message || 'Unknown error',
                result: data.result
            }, 400)
        }

        const balanceWei = data.result || '0'
        const balanceBigInt = BigInt(balanceWei)
        const divisor = BigInt(10 ** 18)
        const balanceVSG = Number(balanceBigInt / divisor) +
            Number(balanceBigInt % divisor) / 1e18
        const balanceStr = balanceVSG.toString()

        // Insert new record into the database
        db.prepare(
            'INSERT INTO account_balances (address, balance) VALUES (?, ?)'
        ).run(address, balanceStr)

        return c.json({
            address,
            balance: balanceStr,
            source: 'fresh'
        })

    } catch (err) {
        console.error('🔥 Error fetching balance:', err)
        return c.json({
            error: 'Internal Server Error',
            message: err instanceof Error ? err.message : 'Unknown error'
        }, 500)
    }
}