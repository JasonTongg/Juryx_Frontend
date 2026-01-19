<img width="1050" height="718" alt="image" src="https://github.com/user-attachments/assets/ebd5e929-4cbe-4aea-87b1-5ab731e8b725" />

# Juryx | Multi-Signature Wallet

Juryx is a secure, decentralized multi-signature wallet platform that allows teams and individuals to manage digital assets with collective authorization. By requiring multiple approvals for transactions, Juryx eliminates single points of failure and enhances the security of on-chain funds.

- **Smart Contract using Hardhat:** [JURYX](https://github.com/JasonTongg/Juryx)

## Features & Functionality

The completed system allows users to:

* **Multi-Sig Account Creation:** Deploy new smart contract wallets with customizable signer lists and required confirmation thresholds (e.g., 2-of-3 signatures).
* **Transaction Management:** Create, sign, and execute various transaction types including ETH transfers, Token approvals, and custom contract interactions.
* **Dashboard Overview:** Real-time visualization of wallet balances (ETH), pending transactions requiring your signature, and your active roles as a signer.
* **Transaction Queue:** Categorized views for transactions that are Pending (awaiting signatures), Ready to Execute (threshold met), and Executed (history).
* **Dynamic UI:** A clean, responsive interface built for both desktop and mobile web3 browsers.

## Technical Stack

* **Frontend:** Next.js (React).
* **Styling:** Tailwind CSS (Modular components & custom layouts).
* **Blockchain Interaction:** Viem & Wagmi (Optimized for Sepolia/Mainnet RPCs) and Rainbowkit as Wallet Connect.
* **State Management:** Store-based architecture for managing wallet connections and transaction status.

## Core Functionality

### Account Setup
Users can define multiple **Signer Addresses** and set a **Required Threshold**. This logic interfaces with a **Factory Contract** to deploy a unique multi-sig instance on-chain.

### Signing Workflow
* **Initiate**: Any signer can propose a new transaction.
* **Approve**: Other signers view the transaction in their "Pending" tab and can select "Sign & Approve."
* **Execute**: Once the threshold is met, the transaction moves to the "Ready" state and can be broadcast to the network.

## Author  

**Jason Tong**  

- **GitHub:** [JasonTongg](https://github.com/JasonTongg).
- **Linkedin:** [Jason Tong](https://www.linkedin.com/in/jason-tong-42600319a/).
