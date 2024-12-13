"use client";
import { useState, useEffect, useRef } from 'react';
import { Send, Loader2, Trash2 } from 'lucide-react';
import { useAccount } from 'wagmi';
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
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { ReclaimProofRequest } from '@reclaimprotocol/js-sdk';
import QRCode from "react-qr-code";

interface Message {
  type: 'user' | 'agent' | 'tools' | 'error' | 'qr';
  content: string;
  timestamp: string;
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const { address } = useAccount();
  const router = useRouter();

  useEffect(() => {
    if (!address) {
      router.push("/onboard");
    }
  }, [address, router]);

  useEffect(() => {
    wsRef.current = new WebSocket('ws://localhost:3002');

    wsRef.current.onopen = () => {
      setIsConnected(true);
      console.log('Connected to WebSocket');
    };

    wsRef.current.onclose = () => {
      setIsConnected(false);
      console.log('Disconnected from WebSocket');
    };

    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log(data);
      
      if (data.content.includes('0x0B33eaEEe94CCD92aF49329ADABEBB0AB357b4A6')) {
        try {
          const jsonData = JSON.parse(data.content);
          if (jsonData) {
            generateReclaimProofRequest(jsonData).then((url) => {
              if (url) {
                setMessages(prev => [...prev, {
                  type: 'qr',
                  content: url,
                  timestamp: new Date().toISOString()
                }]);
              }
              setIsLoading(false);
            });
          }
        } catch (error) {
          console.error('Error parsing Reclaim proof config:', error);
        }
        return;
      }

      setMessages(prev => [...prev, {
        type: data.type,
        content: data.content,
        timestamp: new Date().toISOString()
      }]);
      setIsLoading(false);
    };

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !isConnected || !wsRef.current) return;

    setMessages(prev => [...prev, {
      type: 'user',
      content: input,
      timestamp: new Date().toISOString()
    }]);
    
    wsRef.current.send(input);
    setInput('');
    setIsLoading(true);
  };

  const getMessageStyle = (type: Message['type']): string => {
    switch (type) {
      case 'user':
        return 'bg-blue-500 text-white self-end';
      case 'agent':
        return 'bg-gray-200 text-gray-800 self-start';
      case 'tools':
        return 'bg-green-100 text-gray-800 self-start';
      case 'error':
        return 'bg-red-100 text-red-800 self-start';
      default:
        return 'bg-gray-200 text-gray-800 self-start';
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  const generateReclaimProofRequest = async (jsonData: any) => {
    console.log("Generating Reclaim Proof Request");
    const jsonString = JSON.stringify(jsonData);
    const reclaimProofRequest = await ReclaimProofRequest.fromJsonString(
      jsonString
    );
    const requestUrl = await reclaimProofRequest.getRequestUrl();
    await reclaimProofRequest.startSession({
      onSuccess: (proofs) => {
        if (proofs) {
          if (typeof proofs === "string") {
            console.log("SDK Message:", proofs);
          } else if (typeof proofs !== "string") {
            console.log("Verification success", proofs?.claimData.context);
          }
        }
      },
      onError: (error) => {
        console.error("Verification failed", error);
      },
    });
    return requestUrl;
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 text-transparent bg-clip-text hover:from-purple-600 hover:to-blue-500 transition-all duration-300">stAIker</h1>
          <button
            onClick={clearChat}
            className="p-2 text-gray-500 hover:text-red-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            title="Clear chat history"
          >
             <Trash2 className="w-5 h-5" />
          </button>
        </div>
        <div className={`flex items-center ${isConnected ? 'text-green-500' : 'text-red-500'}`}>
          <div className={`w-3 h-3 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          {isConnected ? 'Connected' : 'Disconnected'}
        </div>
        <div className="wallet-container">
            <Wallet>
              <ConnectWallet>
                <Avatar className="h-6 w-6" />
              </ConnectWallet>
              <WalletDropdown>
                <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
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

      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto mb-4 space-y-4 p-4 bg-gray-50 rounded-lg"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <p className="text-lg">No messages yet</p>
            <p className="text-sm">Start a conversation by typing a message below</p>
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <div
                key={index}
                className={`max-w-[80%] p-3 rounded-lg ${getMessageStyle(message.type)}`}
              >
                {message.type === 'qr' ? (
                  <div className="flex flex-col items-center justify-center">
                    <h3 className="mb-4 text-lg font-semibold">Scan QR Code to Verify</h3>
                    <QRCode value={message.content} />
                    <p className="mt-4 text-sm text-gray-600">
                      Scan this QR code with your mobile device to complete verification
                    </p>
                  </div>
                ) : message.type === 'agent' ? (
                  <ReactMarkdown 
                    className="whitespace-pre-wrap break-words prose prose-sm max-w-none"
                    components={{
                      a: ({node, ...props}) => (
                        <a target="_blank" rel="noopener noreferrer" {...props} />
                      )
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                ) : (
                  <p className="whitespace-pre-wrap break-words">{message.content}</p>
                )}
                <span className="text-xs opacity-50 mt-1 block">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </>
        )}
        {isLoading && (
          <div className="flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={!isConnected}
        />
        <button
          type="submit"
          disabled={!isConnected || !input.trim()}
          className="p-2 bg-blue-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
}