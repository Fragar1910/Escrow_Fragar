import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { Contract } from 'ethers';
import { BrowserProvider } from 'ethers';
import { ESCROW_ADDRESS, EscrowABI } from '../lib/contracts';

export function useEscrowContract() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const getContract = async () => {
    if (!walletClient) return null;

    // Crear provider de ethers desde walletClient de wagmi
    const provider = new BrowserProvider(walletClient as any);
    const signer = await provider.getSigner();

    return new Contract(ESCROW_ADDRESS, EscrowABI, signer);
  };

  const getReadContract = async () => {
    if (!publicClient) return null;

    const provider = new BrowserProvider(publicClient as any);
    return new Contract(ESCROW_ADDRESS, EscrowABI, provider);
  };

  return {
    address,
    getContract,
    getReadContract,
    isConnected: !!address,
  };
}
