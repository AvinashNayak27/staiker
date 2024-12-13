const { CdpAgentkit } = require("@coinbase/cdp-agentkit-core");
const { CdpToolkit, CdpTool } = require("@coinbase/cdp-langchain");
const { HumanMessage } = require("@langchain/core/messages");
const { MemorySaver } = require("@langchain/langgraph");
const { createReactAgent } = require("@langchain/langgraph/prebuilt");
const { ChatOpenAI } = require("@langchain/openai");
const { WebSocketServer } = require("ws");
const dotenv = require("dotenv");
const { z } = require("zod");
const express = require("express");
const cors = require("cors");
const { ReclaimProofRequest, verifyProof } = require("@reclaimprotocol/js-sdk");
const mongoose = require("mongoose");

const challengeSchema = new mongoose.Schema({
  challengeId: {
    type: String,
    required: true,
    unique: true,
  },
  targetWpm: {
    type: Number,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  completed: {
    type: Boolean,
    default: false,
  },
});

const Challenge = mongoose.model("Challenge", challengeSchema);

dotenv.config();

const PORT = process.env.PORT || 3001;

function validateEnvironment() {
  const missingVars = [];
  const requiredVars = [
    "OPENAI_API_KEY",
    "CDP_API_KEY_NAME",
    "CDP_API_KEY_PRIVATE_KEY",
  ];

  requiredVars.forEach((varName) => {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  });

  if (missingVars.length > 0) {
    console.error("Error: Required environment variables are not set");
    missingVars.forEach((varName) => {
      console.error(`${varName}=your_${varName.toLowerCase()}_here`);
    });
    process.exit(1);
  }

  if (!process.env.NETWORK_ID) {
    console.warn(
      "Warning: NETWORK_ID not set, defaulting to base-sepolia testnet"
    );
  }
}

const TRANSFER_AMOUNT_INPUT = z
  .object({
    amount: z
      .string()
      .describe(
        "The amount to transfer in wei. e.g. '1000000000000000' for 0.001 ETH"
      ),
  })
  .strip()
  .describe("Instructions for transferring ETH to the agent");

const depositFromUserToAgent = async (wallet, args) => {
  try {
    const spendPermissionManagerAddress =
      "0xD5Ca2d1818a835B10f78b45Bc1cD5Db305c10fA8";
    const spendPermissionManagerAbi = [
      {
        inputs: [
          {
            components: [
              { internalType: "address", name: "account", type: "address" },
              { internalType: "address", name: "spender", type: "address" },
              { internalType: "address", name: "token", type: "address" },
              { internalType: "uint160", name: "allowance", type: "uint160" },
              { internalType: "uint48", name: "period", type: "uint48" },
              { internalType: "uint48", name: "start", type: "uint48" },
              { internalType: "uint48", name: "end", type: "uint48" },
              { internalType: "uint256", name: "salt", type: "uint256" },
              { internalType: "bytes", name: "extraData", type: "bytes" },
            ],
            internalType: "struct SpendPermissionManager.SpendPermission",
            name: "spendPermission",
            type: "tuple",
          },
          { internalType: "bytes", name: "signature", type: "bytes" },
        ],
        name: "approveWithSignature",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
      },
      {
        inputs: [
          {
            components: [
              { internalType: "address", name: "account", type: "address" },
              { internalType: "address", name: "spender", type: "address" },
              { internalType: "address", name: "token", type: "address" },
              { internalType: "uint160", name: "allowance", type: "uint160" },
              { internalType: "uint48", name: "period", type: "uint48" },
              { internalType: "uint48", name: "start", type: "uint48" },
              { internalType: "uint48", name: "end", type: "uint48" },
              { internalType: "uint256", name: "salt", type: "uint256" },
              { internalType: "bytes", name: "extraData", type: "bytes" },
            ],
            internalType: "struct SpendPermissionManager.SpendPermission",
            name: "spendPermission",
            type: "tuple",
          },
          { internalType: "uint160", name: "value", type: "uint160" },
        ],
        name: "spend",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
      },
    ];

    const request = {
      chainId: "0x14a34", // 84532 in hex for Base Sepolia
      account: "0x0D1400D75C5Ba4C8168E86A3e40db8A8510B33d3",
      spender: "0xB9Cf11e1dd8547a8f03Ac922E894938F666CD935",
      pageOptions: {
        pageSize: 10,
      },
    };

    const spendPermissionResponse = await fetch(
      "http://localhost:3001/permissions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      }
    );

    if (!spendPermissionResponse.ok) {
      throw new Error(
        `Failed to fetch permissions: ${spendPermissionResponse.statusText}`
      );
    }

    const spendPermissionData = await spendPermissionResponse.json();
    const spendPermission = spendPermissionData.permissions[0].spendPermission;
    const signature = spendPermissionData.permissions[0].signature;

    // const approval = await wallet.invokeContract({
    //   contractAddress: spendPermissionManagerAddress,
    //   abi: spendPermissionManagerAbi,
    //   method: "approveWithSignature",
    //   args: {
    //     spendPermission: [
    //       String(spendPermission.account),
    //       String(spendPermission.spender),
    //       String(spendPermission.token),
    //       String(spendPermission.allowance),
    //       String(spendPermission.period),
    //       String(spendPermission.start),
    //       String(spendPermission.end),
    //       String(spendPermission.salt),
    //       String(spendPermission.extraData),
    //     ],
    //     signature: signature,
    //   },
    // });

    // const receipt = await approval.wait();
    // const approvalHash = await receipt.getTransactionHash();

    // console.log("Approval Hash:", approvalHash);

    const transferFunction = await wallet.invokeContract({
      contractAddress: spendPermissionManagerAddress,
      abi: spendPermissionManagerAbi,
      method: "spend",
      args: {
        spendPermission: [
          String(spendPermission.account),
          String(spendPermission.spender),
          String(spendPermission.token),
          String(spendPermission.allowance),
          String(spendPermission.period),
          String(spendPermission.start),
          String(spendPermission.end),
          String(spendPermission.salt),
          String(spendPermission.extraData),
        ],
        value: args.amount || "1000000000000000",
      },
    });

    const data = await transferFunction.wait();
    return data.getTransactionLink();
  } catch (error) {
    console.error("Error in depositFromUserToAgent:", error);
    throw new Error(`Failed to deposit funds: ${error.message}`);
  }
};

const withdrawFromAgentToUser = async (wallet, args) => {
  let transfer = await wallet.createTransfer({
    amount: args.amount / 1e18,
    assetId: "eth",
    destination: "0xf7d4041e751E0b4f6eA72Eb82F2b200D278704A4",
  });

  const data = await transfer.wait();
  return data.getTransactionLink();
};

const createChallenge = async (wallet, args) => {
  const txHash = await depositFromUserToAgent(wallet, {
    amount: "1000000000000000",
  });

  const challenge = await Challenge.create({
    targetWpm: args.targetWpm,
    challengeId: args.challengeId,
  });
  return { challenge, txHash };
};

const generateReclaimProof = async (wallet, args) => {
  console.log("Looking for challenge:", args.challengeId);
  const challenge = await Challenge.findOne({ challengeId: args.challengeId });
  console.log("Found challenge:", challenge);

  if (!challenge) {
    throw new Error(`Challenge not found with ID: ${args.challengeId}`);
  }

  const reclaimProofRequest = await ReclaimProofRequest.init(
    process.env.RECLAIM_APP_ID,
    process.env.RECLAIM_APP_SECRET,
    process.env.RECLAIM_PROVIDER_ID
  );
  reclaimProofRequest.addContext("challengeId", args.challengeId);

  reclaimProofRequest.setAppCallbackUrl(
    "https://concise-actively-macaque.ngrok-free.app/receive-proofs"
  );

  const reclaimProofRequestConfig = reclaimProofRequest.toJsonString();
  return reclaimProofRequestConfig;
};

const checkWPMAndReward = async (wallet, args) => {
  const wpm = args.wpm;
  const challenge = await Challenge.findOne({ challengeId: args.challengeId });
  console.log("Challenge:", challenge);
  if (wpm > challenge.targetWpm) {
    const rewardAmount = "1000000000000000";
    const transfer = await withdrawFromAgentToUser(wallet, {
      amount: rewardAmount,
    });
    // delete the challenge
    await Challenge.deleteOne({ _id: challenge._id });
    return `Congratulations! Your typing speed of ${wpm} WPM qualifies for a reward. Transaction: ${transfer}`;
  }
  return `Your typing speed of ${wpm} WPM does not qualify for a reward. You need more than 40 WPM.`;
};

async function initializeAgent() {
  try {
    const llm = new ChatOpenAI({
      model: "gpt-4o-mini",
      apiKey: process.env.OPENAI_API_KEY,
    });

    const walletData = {
      walletId: process.env.WALLET_ID,
      seed: process.env.WALLET_SEED,
      defaultAddressId: "0xB9Cf11e1dd8547a8f03Ac922E894938F666CD935",
    };

    const walletDataStr = JSON.stringify(walletData);

    const config = {
      cdpWalletData: walletDataStr || undefined,
      networkId: process.env.NETWORK_ID || "base-sepolia",
    };

    const agentkit = await CdpAgentkit.configureWithWallet(config);
    const cdpToolkit = new CdpToolkit(agentkit);
    const tools = cdpToolkit.getTools();

    const depositTool = new CdpTool(
      {
        name: "deposit_funds",
        description: "Deposits ETH from user to agent wallet",
        argsSchema: TRANSFER_AMOUNT_INPUT,
        func: depositFromUserToAgent,
      },
      agentkit
    );

    const withdrawTool = new CdpTool(
      {
        name: "withdraw_funds",
        description: "Withdraws ETH from agent wallet back to user",
        argsSchema: TRANSFER_AMOUNT_INPUT,
        func: withdrawFromAgentToUser,
      },
      agentkit
    );

    const reclaimProofTool = new CdpTool(
      {
        name: "generate_reclaim_proof",
        description: "Generates a Reclaim proof",
        func: generateReclaimProof,
        argsSchema: z.object({
          challengeId: z
            .string()
            .describe("Unique identifier for the challenge"),
        }),
      },
      agentkit
    );

    const checkWPMRewardTool = new CdpTool(
      {
        name: "check_wpm_reward",
        description:
          "Checks if the user's typing speed qualifies for a reward and sends it",
        func: checkWPMAndReward,
        argsSchema: z
          .object({
            wpm: z
              .number()
              .describe("The words per minute achieved in the typing test"),
            challengeId: z
              .string()
              .describe("Unique identifier for the challenge"),
          })
          .strip(),
      },
      agentkit
    );

    const createChallengeTool = new CdpTool(
      {
        name: "create_challenge",
        description:
          "Creates a new typing challenge and deposits initial funds",
        func: createChallenge,
        argsSchema: z
          .object({
            targetWpm: z.number().describe("Target WPM for the challenge"),
            challengeId: z
              .string()
              .describe("Unique identifier for the challenge"),
          })
          .strip(),
      },
      agentkit
    );

    const listChallengesTool = new CdpTool(
      {
        name: "list_challenges",
        description: "Lists all available typing challenges",
        func: async () => {
          const challenges = await Challenge.find({});
          return challenges
            .map(
              (challenge) =>
                `Challenge ID: ${challenge.challengeId}, Target WPM: ${challenge.targetWpm}, Completed: ${challenge.completed}`
            )
            .join("\n");
        },
        argsSchema: z.object({}).strip(),
      },
      agentkit
    );

    tools.push(
      depositTool,
      withdrawTool,
      reclaimProofTool,
      checkWPMRewardTool,
      createChallengeTool,
      listChallengesTool
    );

    const memory = new MemorySaver();
    const agentConfig = {
      configurable: { thread_id: "CDP AgentKit Chatbot Example!" },
    };

    const agent = createReactAgent({
      llm,
      tools,
      checkpointSaver: memory,
      messageModifier:
        "You are a helpful agent with wallet address 0xB9Cf11e1dd8547a8f03Ac922E894938F666CD935 that can interact onchain using the Coinbase Developer Platform AgentKit. You can use the following tools: " +
        tools.map((tool) => tool.name).join(", ") +
        ". When users want to create a new typing challenge, use the `create_challenge` tool with their target WPM. To list all challenges, use the `list_challenges` tool. When users want to attempt a challenge, use the `generate_reclaim_proof` tool with the specific challengeId. For deposits and withdrawals, use the respective tools as before. Do not use the check_wpm_reward tool directly - this is only used internally by the system after proof verification.",
    });

    return { agent, config: agentConfig };
  } catch (error) {
    console.error("Failed to initialize agent:", error);
    throw error;
  }
}

async function startServers() {
  validateEnvironment();

  // Add MongoDB connection
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/typing-challenges"
    );
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }

  const { agent, config } = await initializeAgent();

  // Initialize Express app
  const app = express();

  app.use(express.json());
  app.use(express.text({ type: "*/*", limit: "50mb" })); // This is to parse the urlencoded proof object that is returned to the callback url
  app.use(cors());

  // Add POST route
  app.post("/permissions", async (req, res) => {
    try {
      const response = await fetch("https://rpc.wallet.coinbase.com", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "coinbase_fetchPermissions",
          params: [req.body],
        }),
      });

      const data = await response.json();

      if (data.error) {
        return res.status(400).json({ error: data.error.message });
      }

      return res.json(data.result);
    } catch (error) {
      console.error("Error fetching permissions:", error);
      return res.status(500).json({ error: "Failed to fetch permissions" });
    }
  });

  // Route to receive proofs
  app.post("/receive-proofs", async (req, res) => {
    try {
      const encodedProof = req.body;
      console.log("Encoded Proof:", encodedProof);
      const decodedProof = decodeURIComponent(encodedProof);
      console.log("Decoded Proof:", decodedProof);
      const jsObject = JSON.parse(decodedProof);
      console.log("JS Object:", jsObject);

      // Validate proof structure before verification
      if (!jsObject.claimData || !jsObject.signatures || !jsObject.witnesses) {
        return res.status(400).json({ error: "Invalid proof structure" });
      }

      const isVerified = await verifyProof(jsObject);
      console.log("Is Verified:", isVerified);

      if (!isVerified) {
        return res.status(400).json({ error: "Invalid proof" });
      }

      // Safely parse parameters and extract WPM
      try {
        const parameters = JSON.parse(jsObject.claimData.parameters);
        const wpm = parameters.paramValues?.wpm;
        const challengeId = JSON.parse(jsObject.claimData.context).contextMessage;

        if (!wpm) {
          return res
            .status(400)
            .json({ error: "WPM value not found in proof" });
        }

        // Get the agent and config
        const { agent, config } = await initializeAgent();

        // Create a message to check WPM reward
        const message = `User completed typing challenge ${challengeId} with ${wpm} WPM. Please check if they qualify for a reward.`;

        // Call the agent with the message
        const stream = await agent.stream(
          { messages: [new HumanMessage(message)] },
          config
        );

        // Process the stream and send to websocket
        for await (const chunk of stream) {
          if ("agent" in chunk) {
            wss.clients.forEach((client) => {
              client.send(
                JSON.stringify({
                  type: "agent",
                  content: chunk.agent.messages[0].content,
                })
              );
            });
          } else if ("tools" in chunk) {
            wss.clients.forEach((client) => {
              client.send(
                JSON.stringify({
                  type: "tools",
                  content: chunk.tools.messages[0].content,
                })
              );
            });
          }
        }

        return res.sendStatus(200);
      } catch (parseError) {
        console.error("Error parsing parameters:", parseError);
        return res.status(400).json({ error: "Invalid parameters format" });
      }
    } catch (error) {
      console.error("Error processing proof:", error);
      return res.status(500).json({ error: "Failed to process proof" });
    }
  });

  // Add this near your other Express routes
  app.get("/challenge/:id", async (req, res) => {
    try {
      const challenge = await Challenge.findOne({ challengeId: req.params.id });
      if (!challenge) {
        return res.status(404).json({ error: "Challenge not found" });
      }
      return res.json(challenge);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  });

  // Start HTTP server
  app.listen(PORT, () => {
    console.log(`HTTP server is running on port ${PORT}`);
  });

  // Start WebSocket server
  const wss = new WebSocketServer({ port: PORT + 1 });
  console.log(`WebSocket server is running on port ${PORT + 1}`);

  wss.on("connection", (ws) => {
    console.log("Client connected");

    ws.on("message", async (message) => {
      try {
        const userInput = message.toString();
        const stream = await agent.stream(
          { messages: [new HumanMessage(userInput)] },
          config
        );

        for await (const chunk of stream) {
          if ("agent" in chunk) {
            ws.send(
              JSON.stringify({
                type: "agent",
                content: chunk.agent.messages[0].content,
              })
            );
          } else if ("tools" in chunk) {
            ws.send(
              JSON.stringify({
                type: "tools",
                content: chunk.tools.messages[0].content,
              })
            );
          }
        }
      } catch (error) {
        ws.send(
          JSON.stringify({
            type: "error",
            content: error.message,
          })
        );
      }
    });

    ws.on("close", () => {
      console.log("Client disconnected");
    });
  });
}

if (require.main === module) {
  console.log("Starting HTTP and WebSocket Servers...");
  startServers().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}
