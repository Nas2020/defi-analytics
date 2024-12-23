import { Context } from 'hono';
import { networkService } from '../services/networkService';

export const getNetworkRoute = (c: Context) => {
    return c.json({
        network: networkService.getCurrentNetwork(),
        timestamp: new Date().toISOString()
    });
};

export const setNetworkRoute = async (c: Context) => {
    try {
        const { network } = await c.req.json();

        if (network !== 'mainnet' && network !== 'testnet') {
            return c.json({ error: 'Invalid network' }, 400);
        }

        const updatedNetwork = networkService.setNetwork(network);

        return c.json({
            network: updatedNetwork,
            message: `Network switched to ${updatedNetwork}`,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        return c.json({ error: 'Invalid request body' }, 400);
    }
};