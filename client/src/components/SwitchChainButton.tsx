
import { useEffect } from 'react';
import { useChainId, useSwitchChain } from 'wagmi';
import { polygon, mainnet } from 'wagmi/chains';
import { useChain, ChainType } from '@/lib/chainContext';
import { showToast } from './Toast';

export function SwitchChainButton() {
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { chain, setChain } = useChain();

  useEffect(() => {
    document.body.classList.remove('eth-chain', 'brg-chain');
    
    if (chain === 'ETH') {
      document.body.classList.add('eth-chain');
      document.documentElement.style.setProperty('--accent-1', '#4589ff');
      document.documentElement.style.setProperty('--accent-2', '#1370ff');
    } else if (chain === 'BRG') {
      document.body.classList.add('brg-chain');
      document.documentElement.style.setProperty('--accent-1', '#ffb545');
      document.documentElement.style.setProperty('--accent-2', '#ff9f13');
    } else {
      document.documentElement.style.setProperty('--accent-1', '#b445ff');
      document.documentElement.style.setProperty('--accent-2', '#7013ff');
    }
  }, [chain]);

  const handleSwitch = async () => {
    if (chain === 'POL') {
      try {
        await switchChain({ chainId: mainnet.id });
        setChain('ETH');
        showToast('Switching to Ethereum...', { type: 'info' });
      } catch (error: any) {
        if (error.code === 4001) {
          showToast('Chain switch cancelled', { type: 'warn' });
        } else {
          showToast('Failed to switch chain', { type: 'error' });
        }
      }
    } else if (chain === 'ETH') {
      setChain('BRG');
      showToast('Bridge mode activated', { type: 'info' });
    } else {
      try {
        await switchChain({ chainId: polygon.id });
        setChain('POL');
        showToast('Switching to Polygon...', { type: 'info' });
      } catch (error: any) {
        if (error.code === 4001) {
          showToast('Chain switch cancelled', { type: 'warn' });
        } else {
          showToast('Failed to switch chain', { type: 'error' });
        }
      }
    }
  };

  const getClassName = () => {
    if (chain === 'ETH') return 'switch-chain-button eth-active';
    if (chain === 'BRG') return 'switch-chain-button brg-active';
    return 'switch-chain-button';
  };

  const getAriaLabel = () => {
    if (chain === 'POL') return 'Switch to Ethereum';
    if (chain === 'ETH') return 'Switch to Bridge mode';
    return 'Switch to Polygon';
  };

  return (
    <div
      className={getClassName()}
      onClick={handleSwitch}
      role="button"
      aria-label={getAriaLabel()}
      data-testid="button-switch-chain"
    >
      <div className="switch-chain-arrows">⇅</div>
      <div className="switch-chain-label">{chain}</div>
    </div>
  );
}
