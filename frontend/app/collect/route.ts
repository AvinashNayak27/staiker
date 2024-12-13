import { NextRequest, NextResponse } from "next/server";
import {
  spendPermissionManagerAbi,
  spendPermissionManagerAddress,
} from "../../lib/contants";
import { getAgentWallet } from "../../lib/getAgentWallet";
export async function POST(req: NextRequest) {
  try {
    let spenderAccount;
    try {
      spenderAccount = await getAgentWallet();
    } catch (error) {
      return NextResponse.json({
        status: "ERROR",
        error: "Failed to initialize clients",
        details: error instanceof Error ? error.message : String(error),
      });
    }

    // Parse request body
    let signature, spendPermission;
    try {
      ({ signature, spendPermission } = await req.json());
      console.log(signature);
      console.log(spendPermission);
    } catch (error) {
      return NextResponse.json({
        status: "ERROR",
        error: "Failed to parse request body",
        details: error instanceof Error ? error.message : String(error),
      });
    }

    // // First try-catch for approval
    let approvalHash;
    try {
      const approval = await spenderAccount.invokeContract({
        contractAddress: spendPermissionManagerAddress,
        abi: spendPermissionManagerAbi,
        method: "approveWithSignature",
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
          signature: signature,
        },
      });

      const receipt = await approval.wait();
      approvalHash = await receipt.getTransactionHash();
    } catch (error) {
      console.log(error);
      return NextResponse.json({
        status: "ERROR",
        error: "Failed to approve spend permission",
        details: error instanceof Error ? error.message : String(error),
      });
    }

    // Second try-catch for transfer
    try {
      const transferFunction = await spenderAccount.invokeContract({
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
          value: "100",
        },
      });

      const transferReceipt = await transferFunction.wait();
      const transferHash = await transferReceipt.getTransactionHash();

      return NextResponse.json({
        status: "OK",
        approvalHash,
        transferHash,
      });
    } catch (error) {
      console.log("error in transfer");
      console.log(error);
      return NextResponse.json({
        status: "ERROR",
        error: "Failed to execute transfer",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  } catch (error) {
    // Catch any unexpected errors
    return NextResponse.json({
      status: "ERROR",
      error: "Unexpected error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
