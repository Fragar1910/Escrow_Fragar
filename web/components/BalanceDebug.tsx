'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useEthereum } from '../lib/ethereum';
import { ESCROW_ADDRESS, EscrowABI, ERC20ABI, TEST_ACCOUNTS } from '../lib/contracts';
import {useAccount, usePublicClient} from 'wagmi';
import {useEscrowContract} from '../hooks/useEscrowContract';
import {useAutoRefresh} from '../hooks/useAutoRefresh';
import { BrowserProvider } from 'ethers';
interface Balance {
  address: string;
  label: string;
  eth: string;
  tokens: { symbol: string; balance: string }[];
}

export default function BalanceDebug() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { getReadContract } = useEscrowContract();
  const [balances, setBalances] = useState<Balance[]>([]);
  const [loading, setLoading] = useState(false);

  const loadBalances = async () => {
    if (!publicClient) return;
    const provider = new BrowserProvider(publicClient as any);

    setLoading(true);

    try {
      const escrow = await getReadContract();
      if (!escrow) return;
      const allowedTokens = await escrow.getAllowedTokens();

      const accounts = [
        { address: ESCROW_ADDRESS, label: 'Escrow Contract', isContract: true },
        { address: TEST_ACCOUNTS.account0, label: 'Account #0', isContract: false },
        { address: TEST_ACCOUNTS.account1, label: 'Account #1', isContract: false },
        { address: TEST_ACCOUNTS.account2, label: 'Account #2', isContract: false },
      ];

      const balancesData: Balance[] = [];

      for (const acc of accounts) {
        // Get ETH balance
        const ethBalance = await provider.getBalance(acc.address);

        // Get token balances
        const tokenBalances = await Promise.all(
          allowedTokens.map(async (tokenAddr: string) => {
            try {
              const token = new ethers.Contract(tokenAddr, ERC20ABI, provider);
              const balance = await token.balanceOf(acc.address);
              const symbol = await token.symbol();
              return {
                symbol,
                balance: ethers.formatEther(balance),
              };
            } catch (error) {
              console.error(`Failed to load token ${tokenAddr} for ${acc.label}:`, error);
              return {
                symbol: 'Unknown',
                balance: '0.0',
              };
            }
          })
        );

        balancesData.push({
          address: acc.address,
          label: acc.label,
          eth: ethers.formatEther(ethBalance),
          tokens: tokenBalances,
        });
      }

      setBalances(balancesData);
    } catch (error) {
      console.error('Failed to load balances:', error);
    } finally {
      setLoading(false);
    }
  };
 
  useAutoRefresh(loadBalances); 


  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Balance Debug</h2>
        <button
          onClick={loadBalances}
          disabled={loading}
          className={`px-3 py-1 text-sm rounded transition ${
            loading
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-gray-200 hover:bg-gray-300'
          }`}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {!address && publicClient ? (
        <p className="text-gray-500">Please connect your wallet first</p>
      ) : balances.length === 0 ? (
        <p className="text-gray-500">Loading balances...</p>
      ) : (
        <div className="space-y-4">
          {balances.map((balance, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border ${
                balance.label.includes('Escrow')
                  ? 'bg-blue-50 border-blue-300'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="mb-2">
                <h3 className="font-semibold text-lg">{balance.label}</h3>
                <p className="text-xs text-gray-600 font-mono">
                  {formatAddress(balance.address)}
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center py-1">
                  <span className="text-sm text-gray-600">ETH</span>
                  <span className="font-mono text-sm">
                    {parseFloat(balance.eth).toFixed(4)}
                  </span>
                </div>

                {balance.tokens.length > 0 ? (
                  balance.tokens.map((token, tokenIndex) => (
                    <div
                      key={tokenIndex}
                      className="flex justify-between items-center py-1 border-t border-gray-200"
                    >
                      <span className="text-sm text-gray-600">{token.symbol}</span>
                      <span className="font-mono text-sm">
                        {parseFloat(token.balance).toFixed(2)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-gray-500 italic pt-1 border-t border-gray-200">
                    No tokens added yet
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
