# STX Faucet 🚰

A modern, full-stack Stacks blockchain application that allows users to claim STX tokens and contributors to fund the faucet. Built with Clarity smart contracts and a Next.js frontend.

## 🌟 Key Features
- **Secure Claims:** Integrated with Stacks wallets (Leather/Xverse).
- **Anti-Spam:** 24-hour cooldown logic built directly into the smart contract.
- **Transparency:** Real-time faucet balance tracking.
- **Community Funded:** Simple interface for anyone to top up the faucet.

## 🏗 Project Structure

This repository is organized as a full-stack workspace:

- **/contracts**: Contains the Clarity smart contracts and Clarinet configuration.
- **/frontend**: The Next.js web application, styled with Tailwind CSS and Framer Motion.
- **/tests**: Clarinet test suites for contract validation.

## 📜 Smart Contract Logic

The faucet is governed by a Clarity smart contract that ensures fair distribution:

- **Claim Amount:** 0.05 STX per request.
- **Cooldown Period:** 144 blocks (approx. 24 hours).
- **Security:** Uses `tx-sender` verification to prevent unauthorized contract calls.
- **Read-Only Functions:** Includes helpers to check faucet balance and remaining blocks for a specific user.

## 🛠 Local Development

### 1. Smart Contracts
Ensure you have [Clarinet](https://github.com/hirosystems/clarinet) installed.
```bash
# Check contract integrity
clarinet check
# Run tests
clarinet test

```bash
cd frontend
npm install
npm run dev

### Phase 5: Deployment & Environment
**Task:** Finalize with the Vercel and Mainnet details.
```markdown
## 🚀 Deployment

The frontend is deployed on **Vercel**.

### Environment Variables
To run this project, you will need to add the following variables to your `.env` or Vercel dashboard:
- `NEXT_PUBLIC_CONTRACT_ADDRESS`: The deployed contract principal.
- `NEXT_PUBLIC_CONTRACT_NAME`: The name of the faucet contract.

### Mainnet Details
- **Contract:** `SP...` (Update with your actual address)

---

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/sargesmith/stx-faucet-app/issues).

## 👨‍💻 Author
**sargesmith**
- GitHub: [@sargesmith](https://github.com/shittuisrael004)
- Built for the Stacks Ecosystem 🧱

## ⚖️ License
This project is [MIT](https://choosealicense.com/licenses/mit/) licensed.

