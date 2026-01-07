"use client";

import React, { useEffect, useMemo, useRef } from "react";
import {
  useAccount,
  useBalance,
  useWriteContract,
  useWaitForTransactionReceipt,
  useDeployContract,
} from "wagmi";
import { useSelector } from "react-redux";
import { parseEventLogs } from "viem";

const ENTRY_POINT_ADDRESS = process.env.NEXT_PUBLIC_ENTRYPOINT_ADDRESS;

export default function Hero() {
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({ address });

  const { abi, factoryByteCode } = useSelector((state) => state.data);
  const [isLoading, setIsLoading] = React.useState(false);

  /* ---------------- Factory Deployment ---------------- */

  const { deployContractAsync: deployFactory, data: deployHash } =
    useDeployContract();

  const {
    data: deployReceipt,
    isSuccess: factoryDeployed,
  } = useWaitForTransactionReceipt({
    hash: deployHash,
  });

  const factoryAddress = deployReceipt?.contractAddress;

  /* ---------------- Account Creation ---------------- */

  const {
    writeContractAsync: createAccount,
    data: createHash,
    error: createError,
  } = useWriteContract();

  const { data: createReceipt } = useWaitForTransactionReceipt({
    hash: createHash,
  });

  /* Prevent duplicate createAccount calls */
  const accountCreatedRef = useRef(false);

  /* ---------------- Effects ---------------- */

  // Trigger createAccount ONLY after factory is deployed
  useEffect(() => {
    if (
      factoryDeployed &&
      factoryAddress &&
      address &&
      !accountCreatedRef.current
    ) {
      accountCreatedRef.current = true;

      createAccount({
        address: factoryAddress,
        abi: abi.AccountFactoryAbi,
        functionName: "createAccount",
        args: [[address], BigInt(1), ENTRY_POINT_ADDRESS],
      });
    }
  }, [factoryDeployed, factoryAddress, address, createAccount, abi]);

  // Stop loading ONLY after account creation tx is mined
  useEffect(() => {
    if (createReceipt) {
      setIsLoading(false);
    }
  }, [createReceipt]);

  /* ---------------- Handlers ---------------- */

  const handleDeploy = async () => {
    if (!address || !factoryByteCode) return;

    setIsLoading(true);
    accountCreatedRef.current = false;

    await deployFactory({
      abi: abi.AccountFactoryAbi,
      bytecode: factoryByteCode,
      args: [],
    });
  };

  /* ---------------- Parse AccountCreated Event ---------------- */

  const newAccountAddress = useMemo(() => {
    if (!createReceipt || !abi.AccountFactoryAbi) return null;

    try {
      const logs = parseEventLogs({
        abi: abi.AccountFactoryAbi,
        eventName: "AccountCreated",
        logs: createReceipt.logs,
      });

      return logs[0]?.args?.account ?? null;
    } catch (err) {
      console.error("Failed to parse AccountCreated event", err);
      return null;
    }
  }, [createReceipt, abi]);

  const setUser = async () => {
    const response = await fetch("/api/user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        owner: address,
        factory: factoryAddress,
        account: newAccountAddress,
      }),
    });

    await response.json();
  }

  useEffect(() => {
    if (factoryAddress && newAccountAddress) {
      setUser();
    }
  }, [factoryAddress, newAccountAddress])

  /* ---------------- UI ---------------- */

  return (
    <div className="bg-green-400 min-h-screen flex items-center justify-center p-4">
      <div className="flex flex-col gap-4 bg-white p-6 rounded-xl shadow-lg w-full max-w-md">
        <h2 className="text-xl font-bold">Account Manager</h2>

        <button
          className="bg-black text-white px-6 py-2 rounded-lg disabled:opacity-50"
          onClick={handleDeploy}
          disabled={!isConnected || isLoading}
        >
          {isLoading ? "Creating Account..." : "Create Account"}
        </button>

        {newAccountAddress && (
          <div className="border-t pt-4">
            <p className="text-sm text-gray-600">Account</p>
            <p className="text-xs font-mono break-all">
              {newAccountAddress}
            </p>
          </div>
        )}

        {createError && (
          <p className="text-red-500 text-xs">
            Error: {createError.shortMessage || createError.message}
          </p>
        )}
      </div>
    </div>
  );
}
