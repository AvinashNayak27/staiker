import { Coinbase, Wallet } from "@coinbase/coinbase-sdk";

export async function getAgentWallet() {
  if (!process.env.WALLET_SEED || !process.env.WALLET_ID || !process.env.CDP_API_KEY_NAME || !process.env.CDP_API_KEY_PRIVATE_KEY) {
    throw new Error("Missing required environment variables for wallet import");
  }

  let coinbase = Coinbase.configure({
    apiKeyName: process.env.CDP_API_KEY_NAME,
    privateKey: process.env.CDP_API_KEY_PRIVATE_KEY,
  });

  return await Wallet.import({
    seed: process.env.WALLET_SEED,
    walletId: process.env.WALLET_ID,
  });
}
