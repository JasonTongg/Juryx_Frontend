"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  useAccount,
  useBalance,
  useWriteContract,
  useWaitForTransactionReceipt,
  useDeployContract,
  useSignMessage
} from "wagmi";
import { useSelector } from "react-redux";
import { parseEventLogs, encodeAbiParameters, parseAbiParameters, encodeFunctionData } from "viem";
import { IoMdCloseCircleOutline, IoMdAddCircleOutline } from "react-icons/io";
import { encode } from "punycode";
import { createPublicClient, http, toHex } from "viem";
import { sepolia } from "viem/chains";
import { parseUnits, parseEther, getAddress } from "viem";

const ENTRY_POINT_ADDRESS = process.env.NEXT_PUBLIC_ENTRYPOINT_ADDRESS;

export default function Hero() {
  const { address, isConnected } = useAccount();
  const { abi, factoryByteCode } = useSelector((state) => state.data);
  const { signMessageAsync } = useSignMessage();

  // State for dynamic signers and threshold
  const [signerAddresses, setSignerAddresses] = useState([""]);
  const [threshold, setThreshold] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [deployedAccount, setDeployedAccount] = useState("");
  const [signerFor, setSignerFor] = useState([]);
  const [myRequests, setMyRequests] = useState([]);

  // --- New State for Execution Section ---
  const [target, setTarget] = useState("");
  const [value, setValue] = useState("0");
  const [callData, setCallData] = useState("0x");
  const [isExecuting, setIsExecuting] = useState(false);

  const { writeContractAsync: executeTx } = useWriteContract();
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(),
  });

  // Set the connected wallet as the first signer by default when it connects
  useEffect(() => {
    if (address && signerAddresses[0] === "") {
      const newSigners = [...signerAddresses];
      newSigners[0] = address;
      setSignerAddresses(newSigners);
    }
  }, [address]);

  /* ---------------- Factory Deployment ---------------- */
  const { deployContractAsync: deployFactory, data: deployHash } = useDeployContract();
  const { data: deployReceipt, isSuccess: factoryDeployed } = useWaitForTransactionReceipt({
    hash: deployHash,
  });

  const factoryAddress = deployReceipt?.contractAddress;

  /* ---------------- Account Creation ---------------- */
  const {
    writeContractAsync: createAccount,
    data: createHash,
    error: createError,
  } = useWriteContract();

  const { data: createReceipt } = useWaitForTransactionReceipt({ hash: createHash });
  const accountCreatedRef = useRef(false);

  useEffect(() => {
    if (factoryDeployed && factoryAddress && address && !accountCreatedRef.current) {
      accountCreatedRef.current = true;

      const validSigners = signerAddresses.filter((s) => s.trim() !== "");

      createAccount({
        address: factoryAddress,
        abi: abi.AccountFactoryAbi,
        functionName: "createAccount",
        args: [validSigners, BigInt(threshold), ENTRY_POINT_ADDRESS],
      });
    }
  }, [factoryDeployed, factoryAddress, address, createAccount, abi, signerAddresses, threshold]);

  useEffect(() => {
    if (createReceipt) setIsLoading(false);
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

  // --- New Execute Handler ---
  // const handleExecute = async () => {
  //   const accountToUse = deployedAccount || newAccountAddress;
  //   if (!accountToUse) return;

  //   setIsExecuting(true);
  //   try {
  //     await executeTx({
  //       address: accountToUse,
  //       abi: abi.AccountAbi,
  //       functionName: "execute",
  //       args: [target, BigInt(value), callData],
  //     });
  //   } catch (err) {
  //     console.error("Execution failed", err);
  //   } finally {
  //     setIsExecuting(false);
  //   }
  // };

  const handleRequest = async () => {
    const payload = {
      accountAddress: deployedAccount,
      target: target,
      value: value,
      data: callData,
      reason: "Payment for services",
      note: "Initial test request"
    };

    try {
      await fetch("/api/createRequest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error("Error submitting request:", error);
    }
  };

  const updateSigner = (index, val) => {
    const newSigners = [...signerAddresses];
    newSigners[index] = val;
    setSignerAddresses(newSigners);
  };

  const addSignerField = () => setSignerAddresses([...signerAddresses, ""]);

  const removeSignerField = (index) => {
    if (signerAddresses.length > 1) {
      setSignerAddresses(signerAddresses.filter((_, i) => i !== index));
    }
  };

  /* ---------------- Parse Event & API ---------------- */
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
      return null;
    }
  }, [createReceipt, abi]);

  useEffect(() => {
    if (factoryAddress && newAccountAddress) {
      const setUser = async () => {
        await fetch("/api/user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ owner: address, factory: factoryAddress, account: newAccountAddress }),
        });
      };

      const addOwner = async () => {
        await fetch("/api/addOwner", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ account: newAccountAddress, owners: signerAddresses }),
        });
      }
      setUser();
      addOwner();
    }
  }, [factoryAddress, newAccountAddress, address]);

  const loadRequests = async (userAddress) => {
    const response = await fetch(`/api/getUserRequests?address=${userAddress}`);
    const data = await response.json();
    if (data.success) {
      setMyRequests(data.requests);
    }
  };

  useEffect(() => {
    const fetchUserData = async (userAddress) => {
      if (!userAddress) return;
      try {
        const response = await fetch(`/api/getUserData?address=${userAddress}`);
        const result = await response.json();

        if (result.success) {
          setDeployedAccount(result.deployedAccounts);
          setSignerFor(result.ownerOf);
        }
      } catch (error) {
        console.error("Fetch error:", error);
      }
    };

    fetchUserData(address);
    loadRequests(address);
  }, [address]);

  const handleSign = async (accountAddress, target, value, data, currentSignatures, threshold) => {
    try {
      const message = `Authorize Transaction:
Account: ${accountAddress}
Target: ${target}
Value: ${value}
Data: ${data}`;

      const signature = await signMessageAsync({ message });

      console.log("Signature received:", signature);

      await fetch("/api/addSignature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account: accountAddress,
          owner: address,
          signature: signature
        }),
      });

      if (currentSignatures + 1 >= threshold) {
        await updateStatus(accountAddress, "Ready")
      }
      loadRequests(address);
    } catch (err) {
      console.error("Signing failed:", err);
    }
  };

  const updateStatus = async (accountAddr, status) => {
    try {
      const response = await fetch("/api/updateRequestStatus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountAddress: accountAddr,
          newStatus: status, // e.g., "executed"
        }),
      });

      const data = await response.json();
      if (data.success) {
        alert(`Status updated to ${status}`);
      }
    } catch (error) {
      console.error("Failed to update status", error);
    }
  };

  const getHexNonce = async (senderAddress) => {
    try {
      const nonce = await publicClient.readContract({
        address: process.env.NEXT_PUBLIC_ENTRYPOINT_ADDRESS,
        abi: abi.EntryPointAbi,
        functionName: "getNonce",
        args: ["0x1201d0c0ceaec08076a8a685f8fca1e7688bf7bf", BigInt(0)],
      });
      return toHex(nonce);
    } catch (error) {
      console.error("Error fetching nonce:", error);
    }
  };

  const handleExecute = async (req) => {
    setIsLoading(true);
    try {

      const hexNonce = (await getHexNonce(req.account)).toString(16);

      const userOp = {
        sender: "0x1201d0c0ceaec08076a8a685f8fca1e7688bf7bf",
        nonce: hexNonce,
        initCode: "0x",
        callData: encodeFunctionData({
          abi: abi.AccountAbi,
          functionName: "execute",
          args: [
            req.targetAddress,
            req.value,
            req.data
          ],
        }),
        paymasterAndData: "0x0A61DEfe814e78eB8eB95aFb4d18Ab24Ae85E443",
        signature: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa55555555555555555555555555555555555555555555555555555555555555551b",
      };

      userOp.verificationGasLimit = toHex(1500000n);
      userOp.preVerificationGas = toHex(500000n);
      userOp.callGasLimit = toHex(200000n);
      userOp.maxFeePerGas = "0x0bebc200";
      userOp.maxPriorityFeePerGas = "0x0bebc200";

      const sortedSignatures = [...req.signatures].sort((a, b) =>
        getAddress(a.signerAddress).toLowerCase().localeCompare(getAddress(b.signerAddress).toLowerCase())
      );

      const sigsArray = sortedSignatures.map(s => s.signature);

      const encodedSignatures = encodeAbiParameters(
        parseAbiParameters('bytes[]'),
        [sigsArray]
      );

      userOp.signature = encodedSignatures;

      console.log(userOp);

      handleFinalExecution(userOp);

      // await updateStatus(req.account, "Executed");
      // loadRequests(address);

    } catch (err) {
      console.error("Execution failed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const { writeContractAsync: writeContractExecute } = useWriteContract();

  const handleFinalExecution = async (userOp) => {
    setIsLoading(true);
    try {
      const txHash = await writeContractExecute({
        address: process.env.NEXT_PUBLIC_ENTRYPOINT_ADDRESS,
        abi: abi.EntryPointAbi,
        functionName: "handleOps",
        args: [
          [userOp],
          address
        ],
      });

      console.log("Transaction Hash:", txHash);
    } catch (err) {
      console.error("handleOps failed:", err);
      alert("Blockchain execution failed. Check console for details.");
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="bg-slate-50 min-h-screen flex items-center justify-center p-4 flex-col gap-4">

      {/* Creation Section */}
      {!deployedAccount && (
        <div className="flex flex-col gap-4 bg-white p-6 rounded-xl shadow-lg w-full max-w-md border border-gray-100">
          <h2 className="text-xl font-bold text-gray-800">Create Multi-Sig Account</h2>

          <div className="space-y-3">
            <label className="text-sm font-semibold text-gray-700">Signer Addresses</label>
            {signerAddresses.map((signer, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="0x..."
                  value={signer}
                  onChange={(e) => updateSigner(index, e.target.value)}
                  className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
                {signerAddresses.length > 1 && (
                  <button onClick={() => removeSignerField(index)} className="text-red-500 hover:text-red-700">
                    <IoMdCloseCircleOutline size={24} />
                  </button>
                )}
              </div>
            ))}

            <button
              onClick={addSignerField}
              className="flex items-center gap-1 text-sm text-blue-600 font-medium hover:underline"
            >
              <IoMdAddCircleOutline size={18} /> Add Signer
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Required Threshold</label>
            <input
              type="number"
              min="1"
              max={signerAddresses.length}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm outline-none"
            />
          </div>

          <button
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-lg disabled:opacity-50 transition-colors mt-2"
            onClick={handleDeploy}
            disabled={!isConnected || isLoading || !signerAddresses[0]}
          >
            {isLoading ? "Processing..." : "Deploy & Create Account"}
          </button>
        </div>
      )}

      {/* Execution Section: Displays the Deployed Account and Transaction Inputs */}
      {(deployedAccount || newAccountAddress) && (
        <div className="flex flex-col gap-4 bg-white p-6 rounded-xl shadow-lg w-full max-w-md border border-gray-100">
          <div className="border-b pb-3">
            <h2 className="text-xl font-bold text-gray-800">My Smart Account</h2>
            <p className="text-[10px] font-mono text-blue-600 bg-blue-50 p-2 rounded mt-2 break-all">
              {deployedAccount || newAccountAddress}
            </p>
          </div>

          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-600 uppercase">Target Address</label>
              <input
                type="text"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm outline-none focus:ring-2 focus:ring-green-500"
                placeholder="0x..."
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-600 uppercase">Value (Wei)</label>
              <input
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm outline-none"
                placeholder="0"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-600 uppercase">Data (Hex)</label>
              <textarea
                value={callData}
                onChange={(e) => setCallData(e.target.value)}
                className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm font-mono h-20 outline-none"
                placeholder="0x..."
              />
            </div>

            <button
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-colors shadow-md disabled:opacity-50"
              onClick={handleRequest}
            >
              Request Transaction
            </button>
          </div>
        </div>
      )}

      {signerFor.length > 0 && (
        <div className="w-full max-w-md bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-xs font-bold text-gray-400 uppercase mb-2">Signer For</h3>
          <div className="flex flex-col gap-1">
            {signerFor.map((acc, i) => (
              <p key={i} className="text-[10px] font-mono bg-gray-50 p-1 rounded truncate border border-gray-200">{acc}</p>
            ))}
          </div>
        </div>
      )}

      {/* Pending Transactions Section */}
      {myRequests.length > 0 && (
        <div className="w-full max-w-md bg-white p-4 rounded-xl shadow-lg border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Pending Transactions
            </h3>
            <span className="bg-orange-100 text-orange-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
              {myRequests.filter(item => item.status.toLowerCase() === "pending").length} Action Required
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {myRequests.filter(item => item.status.toLowerCase() === "pending").map((req, i) => (
              <div
                key={i}
                className="p-3 bg-slate-50 rounded-lg border border-slate-200 hover:border-blue-300 transition-colors"
              >
                {/* Header: Smart Account Source */}
                <div className="mb-2">
                  <p className="text-[9px] text-gray-400 font-bold uppercase">From Smart Account</p>
                  <p className="text-[10px] font-mono text-slate-700 truncate">{req.account}</p>
                </div>

                {/* Body: Transaction Details */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-white p-2 rounded border border-slate-100">
                    <p className="text-[9px] text-gray-400 font-bold">Target</p>
                    <p className="text-[10px] font-mono truncate">{req.targetAddress}</p>
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-100">
                    <p className="text-[9px] text-gray-400 font-bold">Value</p>
                    <p className="text-[10px] font-mono">{req.value} Wei</p>
                  </div>
                </div>

                {/* Reason & Status */}
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-[10px] text-gray-600 italic">"{req.reason || "No reason provided"}"</p>
                    <p className="text-[9px] text-blue-500 font-semibold mt-1">
                      Required: {req.currentSignatures}/{req.threshold} Signatures
                    </p>
                  </div>

                  <button
                    className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold py-1.5 px-3 rounded shadow-sm transition-all disabled:opacity-50"
                    onClick={() => {
                      handleSign(req.account, req.targetAddress, req.value, req.data, req.currentSignatures, req.threshold);
                    }}
                    disabled={req.signatures.some(
                      (item) => item.signerAddress.toLowerCase() === address?.toLowerCase()
                    )}
                  >
                    {req.signatures.some(
                      (item) => item.signerAddress.toLowerCase() === address?.toLowerCase()
                    ) ? "Your Already Sign" : "Sign & Approve"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {myRequests.length > 0 && (
        <div className="w-full max-w-md bg-white p-4 rounded-xl shadow-lg border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Ready To Execute
            </h3>
            <span className="bg-orange-100 text-orange-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
              {myRequests.filter(item => item.status.toLowerCase() === "ready").length} Action Required
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {myRequests.filter(item => item.status.toLowerCase() === "ready").map((req, i) => (
              <div
                key={i}
                className="p-3 bg-slate-50 rounded-lg border border-slate-200 hover:border-blue-300 transition-colors"
              >
                {/* Header: Smart Account Source */}
                <div className="mb-2">
                  <p className="text-[9px] text-gray-400 font-bold uppercase">From Smart Account</p>
                  <p className="text-[10px] font-mono text-slate-700 truncate">{req.account}</p>
                </div>

                {/* Body: Transaction Details */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-white p-2 rounded border border-slate-100">
                    <p className="text-[9px] text-gray-400 font-bold">Target</p>
                    <p className="text-[10px] font-mono truncate">{req.targetAddress}</p>
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-100">
                    <p className="text-[9px] text-gray-400 font-bold">Value</p>
                    <p className="text-[10px] font-mono">{req.value} Wei</p>
                  </div>
                </div>

                {/* Reason & Status */}
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-[10px] text-gray-600 italic">"{req.reason || "No reason provided"}"</p>
                    <p className="text-[9px] text-blue-500 font-semibold mt-1">
                      Required: {req.currentSignatures}/{req.threshold} Signatures
                    </p>
                  </div>

                  <button
                    className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold py-1.5 px-3 rounded shadow-sm transition-all"
                    onClick={() => {
                      handleExecute(req)
                    }}
                  >
                    Execute
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {myRequests.length > 0 && (
        <div className="w-full max-w-md bg-white p-4 rounded-xl shadow-lg border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Executed Transactions
            </h3>
            <span className="bg-orange-100 text-orange-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
              {myRequests.filter(item => item.status.toLowerCase() === "executed").length} Action Required
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {myRequests.filter(item => item.status.toLowerCase() === "executed").map((req, i) => (
              <div
                key={i}
                className="p-3 bg-slate-50 rounded-lg border border-slate-200 hover:border-blue-300 transition-colors"
              >
                {/* Header: Smart Account Source */}
                <div className="mb-2">
                  <p className="text-[9px] text-gray-400 font-bold uppercase">From Smart Account</p>
                  <p className="text-[10px] font-mono text-slate-700 truncate">{req.account}</p>
                </div>

                {/* Body: Transaction Details */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-white p-2 rounded border border-slate-100">
                    <p className="text-[9px] text-gray-400 font-bold">Target</p>
                    <p className="text-[10px] font-mono truncate">{req.targetAddress}</p>
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-100">
                    <p className="text-[9px] text-gray-400 font-bold">Value</p>
                    <p className="text-[10px] font-mono">{req.value} Wei</p>
                  </div>
                </div>

                {/* Reason & Status */}
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-[10px] text-gray-600 italic">"{req.reason || "No reason provided"}"</p>
                    <p className="text-[9px] text-blue-500 font-semibold mt-1">
                      Required: {req.currentSignatures}/{req.threshold} Signatures
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}