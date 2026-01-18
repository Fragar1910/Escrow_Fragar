import { useWalletClient, usePublicClient } from 'wagmi';
import { Contract } from 'ethers';
import { BrowserProvider } from 'ethers';
import { ERC20ABI } from '../lib/contracts';

export function useTokenContract(tokenAddress: string) {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const getContract = async () => {
    if (!walletClient || !tokenAddress) return null;

    const provider = new BrowserProvider(walletClient as any);
    const signer = await provider.getSigner();

    return new Contract(tokenAddress, ERC20ABI, signer);
  };

  const getReadContract = async () => {
    if (!publicClient || !tokenAddress) return null;

    const provider = new BrowserProvider(publicClient as any);
    return new Contract(tokenAddress, ERC20ABI, provider);
  };

  return {
    getContract,
    getReadContract,
  };
}
