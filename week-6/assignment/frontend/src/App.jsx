import React, { useMemo, useEffect } from 'react';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import TShirtPurchaseAction from './components/TShirtPurchaseAction';
import '@solana/wallet-adapter-react-ui/styles.css';

function App() {

  const navigate = useNavigate();
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');
    if (action) {
      const decodedAction = decodeURIComponent(action);
      if (decodedAction.startsWith('solana-action:')) {
        const actionUrl = decodedAction.replace('solana-action:', '');
        navigate(actionUrl);
      }
    }
  }, [navigate]);

  const network = WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(() => `https://api.${network}.solana.com`, [network]);
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);
  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
            <div className="App">
              <TShirtPurchaseAction />
            </div>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
export default App;