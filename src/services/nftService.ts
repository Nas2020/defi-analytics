// src/services/nftService.ts
import { ethers } from "ethers";

const nftAbi = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function totalSupply() view returns (uint256)",
];

const gasFeeDistributorAbi = [
    "function nftContract() view returns (address)",
    "function viewTotalEarnings() view returns (uint256)",
    "function calculateUserEarnings(uint256 nftId) view returns (uint256)",
    "function totalDistributed() view returns (uint256)",
    "function userWithdrawnPerNFTID(uint256) view returns (uint256)"
];
const provider = new ethers.JsonRpcProvider(process.env.VSC_RPC_MAINNET_API);

// Helper function to safely get checksum address
const getChecksumAddress = (address: string): string => {
    try {
        return ethers.getAddress(address);
    } catch (error) {
        console.warn(`Invalid address format for ${address}, attempting to fix...`);
        try {
            return ethers.getAddress(address.toLowerCase());
        } catch (error) {
            throw new Error(`Invalid address format: ${address}`);
        }
    }
};

export const nftService = {
    async fetchNftDetails() {
        const tokenAddresses = [
            { name: "Diamond NFT", address: process.env.DIAMOND_NFT },
            { name: "Carbon NFT", address: process.env.CARBON_NFT },
            { name: "Green NFT", address: process.env.GREEN_NFT },
            { name: "Gold NFT", address: process.env.GOLD_NFT },
        ];

        const nftDetails = await Promise.all(
            tokenAddresses.map(async (token) => {
                try {
                    if (!token.address) {
                        throw new Error(`Address not configured for ${token.name}`);
                    }

                    const checksumAddress = getChecksumAddress(token.address);
                    const contract = new ethers.Contract(checksumAddress, nftAbi, provider);

                    const [name, symbol, totalSupply] = await Promise.all([
                        contract.name(),
                        contract.symbol(),
                        contract.totalSupply(),
                    ]);

                    return {
                        contractAddress: checksumAddress,
                        name,
                        symbol,
                        totalSupply: totalSupply.toString(),
                    };
                } catch (error) {
                    console.error(`Error fetching details for ${token.name}:`, error);
                    return {
                        contractAddress: token.address,
                        name: token.name,
                        symbol: 'ERROR',
                        totalSupply: '0',
                        error: error instanceof Error ? error.message : 'Unknown error'
                    };
                }
            })
        );

        return nftDetails;
    },

    async fetchGasFeeDistributorDetails() {
        const distributorAddresses = [
            { name: "Diamond Distributor", address: process.env.GAS_DISTRIBUTOR_DIAMOND },
            { name: "Carbon Distributor", address: process.env.GAS_DISTRIBUTOR_CARBON },
            { name: "Green Distributor", address: process.env.GAS_DISTRIBUTOR_GREEN },
            { name: "Gold Distributor", address: process.env.GAS_DISTRIBUTOR_GOLD },
        ];

        const distributorDetails = await Promise.all(
            distributorAddresses.map(async (distributor) => {
                try {
                    if (!distributor.address) {
                        throw new Error(`Address not configured for ${distributor.name}`);
                    }

                    const checksumAddress = getChecksumAddress(distributor.address);
                    const contract = new ethers.Contract(checksumAddress, gasFeeDistributorAbi, provider);

                    // Fetch basic info
                    const [nftContract, totalEarnings, totalDistributed] = await Promise.all([
                        contract.nftContract(),
                        contract.viewTotalEarnings(),
                        contract.totalDistributed()
                    ]);

                    return {
                        distributorAddress: checksumAddress,
                        name: distributor.name,
                        linkedNFTContract: nftContract,
                        totalPoolEarnings: ethers.formatEther(totalEarnings), // Total in pool
                        totalDistributed: ethers.formatEther(totalDistributed), // Total distributed so far
                    };
                } catch (error) {
                    console.error(`Error fetching distributor details for ${distributor.name}:`, error);
                    return {
                        distributorAddress: distributor.address,
                        name: distributor.name,
                        linkedNFTContract: null,
                        totalPoolEarnings: '0',
                        totalDistributed: '0',
                        error: error instanceof Error ? error.message : 'Unknown error'
                    };
                }
            })
        );

        return distributorDetails;
    },

    // New method to get earnings for specific NFT IDs
    async getNFTEarnings(distributorAddress: string, nftIds: number[]) {
        try {
            const checksumAddress = getChecksumAddress(distributorAddress);
            const contract = new ethers.Contract(checksumAddress, gasFeeDistributorAbi, provider);

            const earningsDetails = await Promise.all(
                nftIds.map(async (nftId) => {
                    try {
                        const [currentEarnings, withdrawn] = await Promise.all([
                            contract.calculateUserEarnings(nftId),
                            contract.userWithdrawnPerNFTID(nftId)
                        ]);

                        return {
                            nftId,
                            currentEarnings: ethers.formatEther(currentEarnings),
                            totalWithdrawn: ethers.formatEther(withdrawn),
                            status: 'success'
                        };
                    } catch (error) {
                        return {
                            nftId,
                            currentEarnings: '0',
                            totalWithdrawn: '0',
                            status: 'error',
                            error: error instanceof Error ? error.message : 'Unknown error'
                        };
                    }
                })
            );

            return {
                distributorAddress: checksumAddress,
                nftEarnings: earningsDetails
            };

        } catch (error) {
            throw new Error(`Failed to fetch NFT earnings: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
};

// async fetchGasFeeDistributorDetails() {
//     const distributorAddresses = [
//         { name: "Diamond Distributor", address: process.env.GAS_DISTRIBUTOR_DIAMOND },
//         { name: "Carbon Distributor", address: process.env.GAS_DISTRIBUTOR_CARBON },
//         { name: "Green Distributor", address: process.env.GAS_DISTRIBUTOR_GREEN },
//         { name: "Gold Distributor", address: process.env.GAS_DISTRIBUTOR_GOLD },
//     ];

//     const distributorDetails = await Promise.all(
//         distributorAddresses.map(async (distributor) => {
//             try {
//                 if (!distributor.address) {
//                     throw new Error(`Address not configured for ${distributor.name}`);
//                 }

//                 const checksumAddress = getChecksumAddress(distributor.address);
//                 const contract = new ethers.Contract(checksumAddress, gasFeeDistributorAbi, provider);

//                 const [nftContract, totalEarnings] = await Promise.all([
//                     contract.nftContract(),
//                     contract.viewTotalEarnings(),
//                 ]);

//                 return {
//                     distributorAddress: checksumAddress,
//                     name: distributor.name,
//                     linkedNFTContract: nftContract,
//                     totalEarnings: ethers.formatEther(totalEarnings),
//                 };
//             } catch (error) {
//                 console.error(`Error fetching distributor details for ${distributor.name}:`, error);
//                 return {
//                     distributorAddress: distributor.address,
//                     name: distributor.name,
//                     linkedNFTContract: null,
//                     totalEarnings: '0',
//                     error: error instanceof Error ? error.message : 'Unknown error'
//                 };
//             }
//         })
//     );

//     return distributorDetails;
// },
