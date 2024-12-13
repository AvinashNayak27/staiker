# Staiker: An Accountability AI Agent

Staiker is an AI-powered accountability assistant built with Coinbase's CDP AgentKit. It acts as a third-party signer, helping users stay accountable by facilitating bets and verifying outcomes through the Reclaim Protocol. Below is an overview of the user flow and key features.

---

## User Flow

### 1. Landing Page
- **Entry Point**: Users arrive on the Staiker landing page.
- **Action**: Click "Start Your Journey" to begin onboarding.

### 2. Onboarding Process
#### a. Wallet Connection
- **Purpose**: Connects a user's Web3 wallet via Coinbase’s OnchainKit.
- **Functionality**:
  - Integrates with Coinbase Wallet and other Web3 providers.
  - Initiates a seamless wallet connection.

#### b. Spend Permissions
- **Action**: Users sign typed data to grant spend permissions.
- **Technical Details**:
  - Utilizes EIP-712 for secure signing.
  - Permissions are granted on the Base Sepolia chain.

#### c. Redirect to Chat Interface
- **Result**: After permissions are granted, users are automatically redirected to the chat interface.

### 3. Chat Interface
The chat interface serves as the core interaction hub. Key components:

#### a. Idle State
- **Initial Condition**: The chat is idle until the user types a message.

#### b. Message Handling
- **Process**:
  - Users type a message, triggering WebSocket processing.
  - The agent processes the input and responds based on context.

#### c. Agent Responses
- **Capabilities**:
  - Direct responses.
  - Requests for identity verification.
  - Activation of tools for goal tracking or task management.

#### d. Verification Process
- **Identity Proof**:
  - Powered by the Reclaim Protocol.
  - Includes QR code generation, user scanning, and proof validation.

#### e. Continuation
- **Outcome**: Successful verifications allow the chat to continue seamlessly.

#### f. Interaction Types
- **Features**:
  - Text-based chat.
  - QR verification for secure identity checks.
  - Goal tracking and progress updates.

---


## Following features to be built soon

### **1. Publishing Daily Blogs**
- **Goal:** Publish a 500-word blog daily on Hashnode for 5 days.
- **Verification:** Integrates with Hashnode to check blog content and timestamps.
- **Outcome:** Proof of writing streak validated via Reclaim Protocol.

### **2. Reducing Food Orders**
- **Goal:** Place less than 5 Swiggy orders in a month.
- **Verification:** Fetches order data using Swiggy integration to verify the count.
- **Outcome:** Proof of reduced orders is resolved on-chain.

### **3. Managing Transportation**
- **Goal:** Take no more than 30 Uber rides in a month.
- **Verification:** Pulls ride count data from Uber APIs.
- **Outcome:** Verified proof of ride count compliance.

### **4. Submitting a Project**
- **Goal:** Submit a project at ETH India before the event deadline.
- **Verification:** Validates submission timestamp and content with event organizers.
- **Outcome:** On-chain proof of project submission.

---

## Key Integrations

### 1. **Coinbase CDP AgentKit**
Staiker leverages the CDP AgentKit for blockchain operations, including:
- Wallet connections.
- Managing spend permissions.
- Smart contract interactions.

Learn more: [Coinbase CDP AgentKit Quickstart](https://docs.cdp.coinbase.com/agentkit/docs/quickstart)

### 2. **Spend Permissions**
- Allows Staiker to act as a third-party signer.
- Provides granular control over wallet spending.

Learn more: [Spend Permissions Overview](https://www.smartwallet.dev/guides/spend-permissions/overview)

### 3. **Reclaim Protocol**
- Facilitates identity verification and proof generation.
- Ensures privacy and security through zero-knowledge proofs.

Learn more: [Reclaim Protocol](https://reclaimprotocol.org/)

---

Staiker combines the power of AI and blockchain technology to provide a secure and effective accountability platform for users. Start your journey with Staiker today!
