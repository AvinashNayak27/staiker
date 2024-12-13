"use client";
import {
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownLink,
  WalletDropdownDisconnect,
} from "@coinbase/onchainkit/wallet";
import {
  Avatar,
  Name,
  Identity,
  EthBalance,
  Address as AddressComponent,
} from "@coinbase/onchainkit/identity";
import { useAccount, useSignTypedData, useSwitchChain } from "wagmi";
import { type Address, Hex, parseUnits } from "viem";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function App() {
  const { address } = useAccount();
  const { signTypedDataAsync } = useSignTypedData();
  const { switchChain } = useSwitchChain();
  const router = useRouter();

  const spendPermissionManagerAddress =
    "0xD5Ca2d1818a835B10f78b45Bc1cD5Db305c10fA8";

  const [permissionStatus, setPermissionStatus] = useState<any>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  useEffect(() => {
    if (address && permissionStatus) {
      setCountdown(3);

      const timer = setTimeout(() => {
        router.push("/chat");
      }, 3000);

      const interval = setInterval(() => {
        setCountdown((prevCount) => (prevCount ? prevCount - 1 : 0));
      }, 1000);

      return () => {
        clearTimeout(timer);
        clearInterval(interval);
      };
    }
  }, [address, router, permissionStatus]);

  useEffect(() => {
    switchChain({ chainId: 84532 });
  }, []);

  const getSpendPermission = async () => {
    if (!address) return;

    const request = {
      chainId: "0x14a34", // 84532 in hex for Base Sepolia
      account: address,
      spender: process.env.NEXT_PUBLIC_SPENDER_ADDRESS,
      pageOptions: {
        pageSize: 10,
      },
    };

    const response = await fetch("/permissions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    const result = await response.json();
    setPermissionStatus(result.permissions.length > 0);
    return result;
  };

  useEffect(() => {
    getSpendPermission();
  }, [address]);

  const requestSpendPermission = async () => {
    if (!address) return;
    const spendPermission = {
      account: address,
      spender: process.env.NEXT_PUBLIC_SPENDER_ADDRESS as Address,
      token: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" as Address,
      allowance: parseUnits("10", 18),
      period: 86400,
      start: 0,
      end: 281474976710655,
      salt: BigInt(0),
      extraData: "0x" as Hex,
    };

    const signature = await signTypedDataAsync({
      domain: {
        name: "Spend Permission Manager",
        version: "1",
        chainId: 84532,
        verifyingContract: spendPermissionManagerAddress,
      },
      types: {
        SpendPermission: [
          { name: "account", type: "address" },
          { name: "spender", type: "address" },
          { name: "token", type: "address" },
          { name: "allowance", type: "uint160" },
          { name: "period", type: "uint48" },
          { name: "start", type: "uint48" },
          { name: "end", type: "uint48" },
          { name: "salt", type: "uint256" },
          { name: "extraData", type: "bytes" },
        ],
      },
      primaryType: "SpendPermission",
      message: spendPermission,
    });

    // Proceed with collection using either existing or new permission
    const response = await fetch("/collect", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ signature, spendPermission }, (_, v) =>
        typeof v === "bigint" ? v.toString() : v
      ),
    });

    const result = await response.json();
    console.log(result);

    setPermissionStatus(true);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 text-gray-800">
      <header className="sticky top-0 bg-white shadow-sm p-4">
        <div className="max-w-7xl mx-auto flex justify-center items-center">
          <h1 className="text-2xl font-bold text-blue-600">stAIker</h1>
        </div>
      </header>

      <main className="flex-grow px-4 py-8">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-xl font-semibold mb-6">
              Get Started with stAIker
            </h2>

            <div className="mb-8">
              <div className="flex items-center mb-4">
                <div
                  className={`rounded-full h-8 w-8 flex items-center justify-center ${
                    address
                      ? "bg-green-100 text-green-600"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  1
                </div>
                <h3 className="ml-3 text-base font-medium">
                  Connect Your Wallet
                </h3>
              </div>
              <div className="ml-11">
                <div className="wallet-container max-w-full overflow-hidden">
                  <Wallet>
                    <ConnectWallet>
                      <Avatar className="h-8 w-8" />
                      <Name />
                    </ConnectWallet>
                    <WalletDropdown>
                      <Identity
                        className="px-4 pt-3 pb-2"
                        hasCopyAddressOnClick
                      >
                        <Avatar />
                        <Name />
                        <AddressComponent />
                        <EthBalance />
                      </Identity>
                      <WalletDropdownLink
                        icon="wallet"
                        href="https://keys.coinbase.com"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Wallet
                      </WalletDropdownLink>
                      <WalletDropdownDisconnect />
                    </WalletDropdown>
                  </Wallet>
                </div>
              </div>
            </div>

            <div className="mb-8">
              <div className="flex items-center mb-4">
                <div
                  className={`rounded-full h-8 w-8 flex items-center justify-center ${
                    permissionStatus
                      ? "bg-green-100 text-green-600"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  2
                </div>
                <h3 className="ml-3 text-base font-medium">
                  Grant Spend Permission
                </h3>
              </div>
              <div className="ml-11">
                {address ? (
                  <>
                    {!permissionStatus ? (
                      <button
                        onClick={requestSpendPermission}
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-6 py-2 text-base font-medium transition-colors"
                      >
                        Grant Permission
                      </button>
                    ) : (
                      <div className="text-green-600 flex items-center text-base">
                        <svg
                          className="w-5 h-5 mr-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        Permission Granted
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-gray-500 text-base">
                    Please connect your wallet first
                  </p>
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center mb-4">
                <div
                  className={`rounded-full h-8 w-8 flex items-center justify-center ${
                    address && permissionStatus
                      ? "bg-green-100 text-green-600"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  3
                </div>
                <h3 className="ml-3 text-base font-medium">
                  Ready to Use stAIker
                </h3>
              </div>
              <div className="ml-11">
                {address && permissionStatus ? (
                  <div className="flex items-center">
                    <p className="text-green-600 text-base">
                      You're all set!
                    </p>
                  </div>
                ) : (
                  <p className="text-gray-500 text-base">
                    Complete the steps above to get started
                  </p>
                )}
              </div>
            </div>
          </div>

          {countdown !== null && countdown > 0 && (
            <div className="text-center text-gray-500 text-base">
              Redirecting to stAIker in {countdown}...
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
