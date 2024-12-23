import { Context } from 'hono'
import db from '../db/db'
import { Ticker, VSGInfo } from '../types/coingecko';

const CACHE_TTL = 1 * 60 * 1000; // 1 minutes in milliseconds

const getCachedVSGInfo = () => {
    const stmt = db.prepare(`
        SELECT data, fetched_at
        FROM vsg_info
        ORDER BY fetched_at DESC
        LIMIT 1
    `);

    const result = stmt.get();
    if (!result) return null;

    const { data, fetched_at } = result;
    const fetchedAt = new Date(fetched_at);
    const now = new Date();

    // Check if cache is still valid
    if (now.getTime() - fetchedAt.getTime() < CACHE_TTL) {
        return JSON.parse(data);
    }

    return null;
};

const updateVSGInfoCache = (data: VSGInfo) => {
    const stmt = db.prepare(`
        INSERT INTO vsg_info (data, fetched_at)
        VALUES (?, CURRENT_TIMESTAMP)
    `);

    stmt.run(JSON.stringify(data));
};


export const getVSGInfoRoute = async (c: Context) => {
    try {
        //Check cache first
        const cachedData = getCachedVSGInfo();
        if (cachedData) {
            console.log('📦 Returning cached VSG data');
            return c.json(cachedData);
        }

        console.log('🔄 Cache miss, fetching fresh VSG data');
        const apiEndpoint = `https://api.coingecko.com/api/v3/coins/vitalik-smart-gas`;
        console.log(`🔍 Fetching VSG data from: ${apiEndpoint}`);

        const response = await fetch(apiEndpoint);
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ External API Error:', {
                status: response.status,
                statusText: response.statusText,
                body: errorText,
            });
            return c.json(
                {
                    error: 'Failed to fetch VSG info',
                    details: errorText,
                },
                502
            );
        }

        const data = await response.json();

        // Transform the data into our enhanced frontend-friendly format
        const vsgInfo: VSGInfo = {
            price: {
                current: data.market_data.current_price.usd,
                change24h: data.market_data.price_change_percentage_24h,
                change7d: data.market_data.price_change_percentage_7d,
                change30d: data.market_data.price_change_percentage_30d,
                change60d: data.market_data.price_change_percentage_60d,
                change200d: data.market_data.price_change_percentage_200d,
                ath: data.market_data.ath.usd,
                athDate: data.market_data.ath_date.usd,
                atl: data.market_data.atl.usd,
                atlDate: data.market_data.atl_date.usd,
                high24h: data.market_data.high_24h.usd,
                low24h: data.market_data.low_24h.usd,
                priceInBtc: data.market_data.current_price.btc,
                priceInEth: data.market_data.current_price.eth
            },
            supply: {
                total: data.market_data.total_supply,
                circulating: data.market_data.circulating_supply,
                max: data.market_data.max_supply,
                locked: data.market_data.total_supply - data.market_data.circulating_supply,
                circulationChange24h: data.market_data.circulating_supply_change_24h
            },
            market: {
                marketCap: data.market_data.market_cap.usd,
                marketCapRank: data.market_data.market_cap_rank,
                volume24h: data.market_data.total_volume.usd,
                marketCapChange24h: data.market_data.market_cap_change_percentage_24h,
                volumeToMarketCap: data.market_data.total_volume.usd / data.market_data.market_cap.usd,
                fullyDilutedValuation: data.market_data.fully_diluted_valuation?.usd,
                totalValueLocked: data.market_data.total_value_locked,
                mcapToTvlRatio: data.market_data.mcap_to_tvl_ratio
            },
            community: {
                twitterFollowers: data.community_data.twitter_followers,
                telegramUsers: data.community_data.telegram_channel_user_count,
                redditSubscribers: data.community_data.reddit_subscribers,
                sentimentVotesUpPercentage: data.sentiment_votes_up_percentage,
                sentimentVotesDownPercentage: data.sentiment_votes_down_percentage
            },
            developer: {
                forks: data.developer_data.forks,
                stars: data.developer_data.stars,
                subscribers: data.developer_data.subscribers,
                totalIssues: data.developer_data.total_issues,
                closedIssues: data.developer_data.closed_issues,
                pullRequestsMerged: data.developer_data.pull_requests_merged,
                commitCount4Weeks: data.developer_data.commit_count_4_weeks
            },
            exchanges: data.tickers.map((ticker: Ticker) => ({
                name: ticker.market.name,
                volume24h: ticker.converted_volume.usd,
                trustScore: ticker.trust_score,
                lastTraded: ticker.last_traded_at
            })),
            lastUpdated: data.last_updated
        };

        // Update cache with new data
        updateVSGInfoCache(vsgInfo);
        console.log('💾 VSG data cached successfully');

        return c.json(vsgInfo);
    } catch (err) {
        console.error('🔥 Failed to get VSG info:', err);
        return c.json(
            {
                error: 'Failed to fetch VSG info',
                message: err instanceof Error ? err.message : 'Unknown error',
            },
            500
        );
    }
};