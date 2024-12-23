// src/services/networkService.ts
let currentNetwork = process.env.NETWORK || 'testnet';

export const networkService = {
    getCurrentNetwork: () => currentNetwork,
    setNetwork: (network: 'mainnet' | 'testnet') => {
        currentNetwork = network;
        return currentNetwork;
    }
};