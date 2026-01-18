import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http } from 'wagmi';
import { localhost } from 'wagmi/chains';

// Custom Anvil chain configuration
export const anvilChain = {
  ...localhost,
  id: 31337,
  name: 'Anvil Local',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['http://127.0.0.1:8545'],
    },
    public: {
      http: ['http://127.0.0.1:8545'],
    },
  },
} as const;

export const config = getDefaultConfig({
  appName: 'Escrow DApp',
  projectId: 'YOUR_PROJECT_ID', // Puedes usar un projectId de WalletConnect o dejar este
  chains: [anvilChain],
  transports: {
    [anvilChain.id]: http('http://127.0.0.1:8545'),
  },
  ssr: true,
});
