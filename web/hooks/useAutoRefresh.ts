import { useEffect } from 'react';
import { useAccount } from 'wagmi';

/**
 * Hook que refresca el componente cuando cambia la cuenta conectada
 */
export function useAutoRefresh(callback: () => void | Promise<void>) {
  const { address } = useAccount();

  useEffect(() => {
    if (address) {
      callback();
    }
  }, [address]);

  return { address };
}
