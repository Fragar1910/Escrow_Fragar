'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useEthereum } from '../lib/ethereum';
import { ESCROW_ADDRESS, EscrowABI, ERC20ABI } from '../lib/contracts';
import {useAccount, usePublicClient} from 'wagmi';
import {useEscrowContract} from '../hooks/useEscrowContract';
import {useAutoRefresh} from '../hooks/useAutoRefresh';
import {useTokenContract} from '../hooks/useTokenContract';
import { BrowserProvider } from 'ethers';

export default function AddToken() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { getContract, getReadContract } = useEscrowContract();
  const [tokenAddress, setTokenAddress] = useState('');
  const [allowedTokens, setAllowedTokens] = useState<{ address: string; symbol: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadAllowedTokens = async () => {
    if (!publicClient) return;

    try {
      const contract = await getReadContract();
      if (!contract) return;

      const tokens = await contract.getAllowedTokens();

      if (tokens.length === 0) {
        setAllowedTokens([]);
        return;
      }

      const provider = new BrowserProvider(publicClient as any);

      const tokensWithInfo = await Promise.all(
        tokens.map(async (tokenAddr: string) => {
          try {
            const token = new ethers.Contract(tokenAddr, ERC20ABI, provider);
            const symbol = await token.symbol();
            const name = await token.name();
            return { address: tokenAddr, symbol, name };
          } catch (error) {
            console.error('Failed to load token:', error);
            return null;
          }
        })
      );

      // Filter out null values
      const validTokens = tokensWithInfo.filter((t): t is { address: string; symbol: string; name: string } => t !== null);
      setAllowedTokens(validTokens);
    } catch (error) {
      console.error('Failed to load allowed tokens:', error);
      setAllowedTokens([]);
    }
  };

  useEffect(() => {
    loadAllowedTokens();
  }, [address, publicClient]);

  useAutoRefresh(loadAllowedTokens);

  const handleAddToken = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!address) {
      setMessage({ type: 'error', text: 'Please connect your wallet first' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const contract = await getContract();
      if (!contract) throw new Error('Contract not available');

      const tx = await contract.addToken(tokenAddress);
      await tx.wait();

      setMessage({ type: 'success', text: 'Token added successfully!' });
      setTokenAddress('');

      // Reload tokens list
      await loadAllowedTokens();
    } catch (error: any) {
      console.error('Failed to add token:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Failed to add token. Make sure you are the owner.'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!address) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Add Token (Owner Only)</h2>
        <p className="text-gray-500">Please connect your wallet first</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4">Add Token (Owner Only)</h2>

      <div className="mb-4 p-3 bg-blue-50 rounded border border-blue-200">
        <p className="text-sm text-blue-800">
          <strong>Escrow Contract:</strong>
        </p>
        <p className="text-xs text-blue-600 font-mono break-all">{ESCROW_ADDRESS}</p>
      </div>

      <form onSubmit={handleAddToken} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Token Address
          </label>
          <input
            type="text"
            value={tokenAddress}
            onChange={(e) => setTokenAddress(e.target.value)}
            placeholder="0x..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading || !tokenAddress}
          className={`w-full py-2 rounded-lg transition ${
            loading || !tokenAddress
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          {loading ? 'Adding Token...' : 'Add Token'}
        </button>
      </form>

      {message && (
        <div
          className={`mt-4 p-3 rounded ${
            message.type === 'success'
              ? 'bg-green-100 text-green-800 border border-green-300'
              : 'bg-red-100 text-red-800 border border-red-300'
          }`}
        >
          {message.text}
        </div>
      )}

      {allowedTokens.length > 0 && (
        <div className="mt-6">
          <h3 className="font-semibold mb-2">Allowed Tokens ({allowedTokens.length})</h3>
          <div className="space-y-2">
            {allowedTokens.map((token, index) => (
              <div key={index} className="p-3 bg-gray-50 rounded border border-gray-200">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{token.symbol}</p>
                    <p className="text-xs text-gray-500">{token.name}</p>
                  </div>
                  <p className="text-xs text-gray-600 font-mono">
                    {token.address.substring(0, 6)}...{token.address.substring(token.address.length - 4)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
