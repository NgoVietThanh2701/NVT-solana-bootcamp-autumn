import React, { useState, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Transaction } from '@solana/web3.js';

const TShirtPurchaseAction = () => {
  const [size, setSize] = useState('');
  const [customSize, setCustomSize] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionData, setActionData] = useState(null);
  const { connection } = useConnection();
  const { publicKey, signTransaction, sendTransaction } = useWallet();
  useEffect(() => {
    fetch('http://localhost:3001/api/actions/purchase-tshirt')
      .then(response => response.json())
      .then(data => setActionData(data));
  }, []);
  const handlePurchase = async () => {
    if (!publicKey) {
      alert('Please connect your wallet first!');
      return;
    }
    setLoading(true);
    try {
      const selectedSize = size === 'custom' ? customSize : size;
      const action = actionData.links.actions.find(a => a.href.includes(selectedSize));
      if (!action) {
        throw new Error('Invalid size selected');
      }
      const response = await fetch(`http://localhost:3001${action.href}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account: publicKey.toString(), size: selectedSize }),
      });
      const { transaction: serializedTransaction } = await response.json();
      const transaction = Transaction.from(Buffer.from(serializedTransaction, 'base64'));
      const signedTransaction = await signTransaction(transaction);
      const signature = await sendTransaction(signedTransaction, connection);
      await connection.confirmTransaction(signature, 'processed');
      alert(`T-shirt purchase successful! Size: ${selectedSize}`);
    } catch (error) {
      console.error('Error during purchase:', error);
      alert('An error occurred during the purchase. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  if (!actionData) return <div>Loading...</div>;
  return (
    <div className="card">
      <h2>{actionData.title}</h2>
      <p>{actionData.description}</p>
      <WalletMultiButton />
      <select value={size} onChange={(e) => setSize(e.target.value)}>
        <option value="">Select Size</option>
        <option value="small">Small</option>
        <option value="medium">Medium</option>
        <option value="large">Large</option>
        <option value="custom">Custom Size</option>
      </select>
      {size === 'custom' && (
        <input
          type="text"
          placeholder="Enter custom size"
          value={customSize}
          onChange={(e) => setCustomSize(e.target.value)}
        />
      )}
      <button onClick={handlePurchase} disabled={loading || (!size && !customSize) || !publicKey}>
        {loading ? 'Processing...' : actionData.label}
      </button>
    </div>
  );
};
export default TShirtPurchaseAction;