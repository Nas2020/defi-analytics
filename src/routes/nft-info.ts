import { Context } from 'hono'
import { NftDetail, NftInfoResponse } from '../types/blockchain'
import { networkService } from '../services/networkService'
import { nftService } from '../services/nftService'

// Enhanced type definitions
interface ExternalNftItem {
    address: string
    circulating_market_cap: string | null
    decimals: string | null
    exchange_rate: string | null
    holders: string
    icon_url: string | null
    name: string
    symbol: string
    total_supply: string
    type: string
    volume_24h: string | null
}

interface ExternalNftApiResponse {
    items: ExternalNftItem[]
    next_page_params: string | null
}

// New interfaces for the mainnet response with strict typing
interface BlockchainNFTDetails {
    contractAddress: string
    name: string
    symbol: string
    totalSupply: string
    error?: string
}

// Updated interface to include earnings
interface GasDistributorDetails {
    distributorAddress: string
    name: string
    linkedNFTContract: string | null
    totalPoolEarnings: string
    totalDistributed: string
    perTokenEarnings: string
    totalTypeEarnings: string
    error?: string
}

interface MainnetNFTResponse {
    message: string
    nftInfo: NftInfoResponse
    nftDetails: BlockchainNFTDetails[]
    distributorDetails: GasDistributorDetails[]
}

// Cache implementation for image URLs
const imageUrlCache = new Map<string, string>();

const getNftImageUrl = (nftName: string): string => {
    if (imageUrlCache.has(nftName)) {
        return imageUrlCache.get(nftName)!;
    }

    let imageUrl = '';
    switch (nftName) {
        case 'Carbon NFT':
            imageUrl = 'https://purple-abundant-anaconda-910.mypinata.cloud/ipfs/bafybeid66ramqv5zxhozvigq47lhbexkqigrpvtcd44ddiiikig5rte2ey'
            break;
        case 'Diamond NFT':
            imageUrl = 'https://i.seadn.io/s/raw/files/6c809b2b51afde81ec63e5377cb863e7.gif?auto=format&dpr=1&w=1000'
            break;
        case 'Gold NFT':
            imageUrl = 'https://i.seadn.io/s/raw/files/f21efdf06249f173cf359ff5aafcb216.gif?auto=format&dpr=1&w=1000'
            break;
        case 'Green NFT':
            imageUrl = 'https://i.seadn.io/s/raw/files/51523ca6b0d47ec4d80d1cce7b2fcbac.gif?auto=format&dpr=1&w=1000'
            break;
        default:
            imageUrl = 'https://i.seadn.io/s/raw/files/5efb70d02a93c52c03a99d0de22b39b0.png?auto=format&dpr=1&w=1000'
    }

    imageUrlCache.set(nftName, imageUrl);
    return imageUrl;
}

const fetchWithTimeout = async (url: string, timeout = 5000): Promise<Response> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}

// Type guard functions
const isValidNFTDetail = (detail: any): detail is BlockchainNFTDetails => {
    return typeof detail.contractAddress === 'string' &&
        typeof detail.name === 'string' &&
        typeof detail.symbol === 'string' &&
        typeof detail.totalSupply === 'string';
}

const isValidDistributorDetail = (detail: any): detail is GasDistributorDetails => {
    return typeof detail.distributorAddress === 'string' &&
        typeof detail.name === 'string' &&
        typeof detail.totalPoolEarnings === 'string' &&
        typeof detail.totalDistributed === 'string';
}

// Helper function to create a safe NFT detail
const createSafeNFTDetail = (detail: any): BlockchainNFTDetails => {
    return {
        contractAddress: detail.contractAddress || 'unknown',
        name: detail.name || 'Unknown NFT',
        symbol: detail.symbol || 'UNKNOWN',
        totalSupply: detail.totalSupply?.toString() || '0',
        error: detail.error
    };
};

// Updated helper function to include earnings fields
const createSafeDistributorDetail = (detail: any): GasDistributorDetails => {
    return {
        distributorAddress: detail.distributorAddress || 'unknown',
        name: detail.name || 'Unknown Distributor',
        linkedNFTContract: detail.linkedNFTContract || null,
        totalPoolEarnings: detail.totalPoolEarnings || '0',
        totalDistributed: detail.totalDistributed || '0',
        perTokenEarnings: detail.perTokenEarnings || '0',
        totalTypeEarnings: detail.totalTypeEarnings || '0',
        error: detail.error
    };
};

export const getNftInfoRoute = async (c: Context) => {
    const network = networkService.getCurrentNetwork();
    const apiUrl = network === 'mainnet' ? process.env.VSC_MAINNET_API : process.env.VSC_TESTNET_API;

    if (!apiUrl) {
        return c.json({ error: 'API URL not configured' }, 500);
    }

    try {
        // Fetch and process basic NFT info
        const apiEndpoint = `${apiUrl}/v2/tokens?type=ERC-721`;
        console.log(`🔍 Fetching NFT data from: ${apiEndpoint}`);

        const response = await fetchWithTimeout(apiEndpoint);
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ External API Error:', {
                status: response.status,
                statusText: response.statusText,
                body: errorText,
            });
            return c.json(
                {
                    error: 'Failed to fetch NFT info',
                    details: errorText,
                },
                502
            );
        }

        const data: ExternalNftApiResponse = await response.json();
        const items = data.items ?? [];

        const groupedByName = items.reduce<Record<string, NftDetail>>((acc, item) => {
            const supplyNum = parseInt(item.total_supply ?? '0', 10) || 0;
            const holdersNum = parseInt(item.holders ?? '0', 10) || 0;
            const uniqueKey = `${item.name}-${item.symbol}`;

            if (!acc[uniqueKey]) {
                acc[uniqueKey] = {
                    name: item.name,
                    symbol: item.symbol,
                    totalSupply: 0,
                    holders: 0,
                    imageUrl: getNftImageUrl(item.name)
                };
            }

            acc[uniqueKey].totalSupply += supplyNum;
            acc[uniqueKey].holders += holdersNum;

            return acc;
        }, {});

        const aggregatedResult = Object.values(groupedByName);
        const nftInfo: NftInfoResponse = {
            totalNftTypes: aggregatedResult.length,
            data: aggregatedResult,
        };
        if (network === 'mainnet') {
            try {
                // Distributor address mapping with type guard
                const distributorMapping = [
                    { name: "Diamond NFT", distributorName: "Diamond NFT Distributor", address: process.env.GAS_DISTRIBUTOR_DIAMOND },
                    { name: "Carbon NFT", distributorName: "Carbon NFT Distributor", address: process.env.GAS_DISTRIBUTOR_CARBON },
                    { name: "Green NFT", distributorName: "Green NFT Distributor", address: process.env.GAS_DISTRIBUTOR_GREEN },
                    { name: "Gold NFT", distributorName: "Gold NFT Distributor", address: process.env.GAS_DISTRIBUTOR_GOLD }
                ].filter((item): item is { name: string; distributorName: string; address: string } =>
                    Boolean(item.address)
                );

                // Fetch NFT and distributor details
                const [rawNftDetails, rawDistributorDetails] = await Promise.all([
                    nftService.fetchNftDetails(),
                    nftService.fetchGasFeeDistributorDetails()
                ]);

                console.log('Raw NFT Details:', rawNftDetails);
                console.log('Raw Distributor Details:', rawDistributorDetails);

                // Fetch earnings for ID #1 for each distributor
                const earningsPromises = distributorMapping.map(async ({ name, distributorName, address }) => {
                    try {
                        const earnings = await nftService.getNFTEarnings(address, [1]);
                        console.log(`Earnings for ${name}:`, earnings);

                        const matchingDist = rawDistributorDetails.find(d =>
                            d.name === distributorName || d.name.includes(name)
                        );
                        console.log(`Matching distributor for ${name}:`, matchingDist);

                        const matchingNft = rawNftDetails.find(n => n.name === name);
                        console.log(`Matching NFT for ${name}:`, matchingNft);

                        if (!earnings.nftEarnings?.[0]?.currentEarnings) {
                            throw new Error(`No earnings data for ${name}`);
                        }

                        const perTokenEarnings = earnings.nftEarnings[0].currentEarnings;
                        // Use totalSupply from either matchingNft or find it in nftInfo
                        const nftInfoMatch = nftInfo.data.find(n => n.name === name);
                        const totalSupply = nftInfoMatch ? nftInfoMatch.totalSupply : 0;

                        const totalTypeEarnings = (parseFloat(perTokenEarnings) * totalSupply).toString();

                        return createSafeDistributorDetail({
                            distributorAddress: address,
                            name: distributorName,
                            linkedNFTContract: matchingDist?.linkedNFTContract || null,
                            totalPoolEarnings: matchingDist?.totalPoolEarnings || '0',
                            totalDistributed: matchingDist?.totalDistributed || '0',
                            perTokenEarnings,
                            totalTypeEarnings
                        });
                    } catch (error) {
                        console.error(`Error processing ${name}:`, error);
                        return createSafeDistributorDetail({
                            distributorAddress: address,
                            name: distributorName,
                            linkedNFTContract: null,
                            totalPoolEarnings: '0',
                            totalDistributed: '0',
                            perTokenEarnings: '0',
                            totalTypeEarnings: '0',
                            error: error instanceof Error ? error.message : 'Unknown error'
                        });
                    }
                });

                const distributorsWithEarnings = await Promise.all(earningsPromises);

                // Process NFT details
                const nftDetails: BlockchainNFTDetails[] = rawNftDetails.map(detail =>
                    isValidNFTDetail(detail) ? detail : createSafeNFTDetail(detail)
                );

                const mainnetResponse: MainnetNFTResponse = {
                    message: "NFT and Gas Fee Distributor details fetched successfully",
                    nftInfo,
                    nftDetails,
                    distributorDetails: distributorsWithEarnings,
                };

                return c.json(mainnetResponse);

            } catch (error) {
                console.error("🔥 Error fetching blockchain data:", error);
                return c.json({
                    message: "Partial data available - blockchain data fetch failed",
                    nftInfo,
                    error: error instanceof Error ? error.message : "Unknown error",
                });
            }
        }

        // Return basic info for testnet
        return c.json(nftInfo);
    }
    catch (error) {
        console.error('🔥 Failed to get NFT info:', error);
        return c.json(
            {
                error: 'Failed to fetch NFT info',
                message: error instanceof Error ? error.message : 'Unknown error',
            },
            500
        );
    }
};