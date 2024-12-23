import { Context } from 'hono'
import db from '../db/db'
import { networkService } from '../services/networkService';

interface CachedAddressData {
    address: string;
    data: string;
    fetched_at: string;
}

interface TokenInfo {
    name: string;
    symbol: string;
    type: string;
    decimals: number;
    address: string;
    balance: string;
}

const CACHE_DURATION_MS = 5 * 60 * 1000 // 5 minutes

export const getAddressInfoRoute = async (c: Context) => {
    const address = c.req.param('address')
    if (!address) {
        return c.json({ error: 'Address parameter is required' }, 400)
    }

    // Check cache first
    const cachedData = db.prepare<CachedAddressData>(
        'SELECT data, fetched_at FROM address_info WHERE address = ? ORDER BY fetched_at DESC LIMIT 1'
    ).get(address)

    if (cachedData) {
        const lastFetched = new Date(cachedData.fetched_at).getTime()
        const now = Date.now()

        if (now - lastFetched < CACHE_DURATION_MS) {
            return c.json({
                ...JSON.parse(cachedData.data),
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
        // Fixed API endpoint to match your other routes
        const apiEndpoint = `${apiUrl}/v2/addresses/${address}`
        console.log(`🔍 Fetching address info from: ${apiEndpoint}`)

        const response = await fetch(apiEndpoint, {
            headers: {
                'accept': 'application/json'
            }
        })

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

        // Format the response to match your needs
        const formattedData = {
            address: data.hash,
            balance: data.coin_balance,
            lastUpdatedBlock: data.block_number_balance_updated_at,
            isContract: data.is_contract,
            hasTokens: data.has_tokens,
            hasTokenTransfers: data.has_token_transfers,
            isVerified: data.is_verified,
            creationTxHash: data.creation_tx_hash,
            creatorAddress: data.creator_address_hash
        }

        // Cache the new data
        db.prepare(
            'INSERT INTO address_info (address, data) VALUES (?, ?)'
        ).run(address, JSON.stringify(formattedData))

        return c.json({
            ...formattedData,
            source: 'fresh'
        })

    } catch (err) {
        console.error('🔥 Error fetching address info:', err)
        return c.json({
            error: 'Internal Server Error',
            message: err instanceof Error ? err.message : 'Unknown error'
        }, 500)
    }
}

export const getAddressTokensRoute = async (c: Context) => {
    const address = c.req.param('address')
    if (!address) {
        return c.json({ error: 'Address parameter is required' }, 400)
    }

    // Check cache first
    const cachedData = db.prepare<CachedAddressData>(
        'SELECT data, fetched_at FROM address_tokens WHERE address = ? ORDER BY fetched_at DESC LIMIT 1'
    ).get(address)

    if (cachedData) {
        const lastFetched = new Date(cachedData.fetched_at).getTime()
        const now = Date.now()

        if (now - lastFetched < CACHE_DURATION_MS) {
            return c.json({
                ...JSON.parse(cachedData.data),
                source: 'cache'
            })
        }
    }

    const network = process.env.NETWORK || 'testnet'
    const apiUrl = network === 'mainnet'
        ? process.env.VSC_MAINNET_API
        : process.env.VSC_TESTNET_API

    if (!apiUrl) {
        return c.json({ error: 'API URL not configured' }, 500)
    }

    try {
        // Fixed API endpoint to use the v2 API
        const apiEndpoint = `${apiUrl}/v2/addresses/${address}/tokens`
        console.log(`🔍 Fetching token balances from: ${apiEndpoint}`)

        const response = await fetch(apiEndpoint, {
            headers: {
                'accept': 'application/json'
            }
        })

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

        const data = await response.json()
        console.log('✅ API Response:', data)

        const tokens = Array.isArray(data) ? data : []
        const formattedData = {
            address,
            tokens: tokens.map((token: TokenInfo) => ({
                address: token.address,
                name: token.name,
                symbol: token.symbol,
                decimals: token.decimals,
                balance: token.balance,
                type: token.type
            }))
        }

        // Cache the new data
        db.prepare(
            'INSERT INTO address_tokens (address, data) VALUES (?, ?)'
        ).run(address, JSON.stringify(formattedData))

        return c.json({
            ...formattedData,
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