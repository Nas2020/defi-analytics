export interface Market {
    name: string;
    identifier: string;
    has_trading_incentive: boolean;
}

export interface ConvertedVolume {
    btc: number;
    eth: number;
    usd: number;
}

export interface Ticker {
    base: string;
    target: string;
    market: Market;
    last: number;
    volume: number;
    converted_volume: ConvertedVolume;
    trust_score: string;
    bid_ask_spread_percentage: number;
    timestamp: string;
    last_traded_at: string;
    last_fetch_at: string;
    is_anomaly: boolean;
    is_stale: boolean;
    trade_url: string | null;
    token_info_url: string | null;
    coin_id: string;
    target_coin_id: string;
}

export interface VSGInfo {
    price: {
        current: number;
        change24h: number;
        change7d: number;
        change30d: number;
        change60d: number;
        change200d: number;
        ath: number;
        athDate: string;
        atl: number;
        atlDate: string;
        sparkline7d?: number[];
        high24h: number;
        low24h: number;
        priceInBtc: number;
        priceInEth: number;
    };
    supply: {
        total: number;
        circulating: number;
        max: number;
        locked: number;
        circulationChange24h?: number;
    };
    market: {
        marketCap: number;
        marketCapRank: number;
        volume24h: number;
        marketCapChange24h: number;
        volumeToMarketCap: number;
        fullyDilutedValuation: number;
        totalValueLocked?: number;
        mcapToTvlRatio?: number;
    };
    community: {
        twitterFollowers: number;
        telegramUsers: number;
        redditSubscribers: number;
        sentimentVotesUpPercentage: number;
        sentimentVotesDownPercentage: number;
    };
    developer: {
        forks: number;
        stars: number;
        subscribers: number;
        totalIssues: number;
        closedIssues: number;
        pullRequestsMerged: number;
        commitCount4Weeks: number;
    };
    exchanges: {
        name: string;
        volume24h: number;
        trustScore: string;
        lastTraded: string;
    }[];
    lastUpdated: string;
}