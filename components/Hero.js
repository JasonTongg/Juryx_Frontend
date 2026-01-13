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
import { parseEventLogs, encodeAbiParameters, parseAbiParameters, encodeFunctionData, keccak256 } from "viem";
import { IoMdCloseCircleOutline, IoMdAddCircleOutline } from "react-icons/io";
import { encode } from "punycode";
import { createPublicClient, http, toHex } from "viem";
import { sepolia } from "viem/chains";
import { parseUnits, parseEther, getAddress } from "viem";
import { toast } from "react-toastify";

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
  const [isLoadingSign, setIsLoadingSign] = useState(false);
  const [isLoadingExecute, setIsLoadingExecute] = useState(false);

  // --- New State for Execution Section ---
  const [target, setTarget] = useState("");
  const [value, setValue] = useState("");
  const [callData, setCallData] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);
  const [value2, setValue2] = React.useState(0);

  const handleChange = (event, newValue) => {
    setValue2(newValue);
  };

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

  const [executedHistory, setExecutedHistory] = useState({});

  const loadHistory = async (userAddress) => {
    const response = await fetch(`/api/getUserExecutedRequests?address=${userAddress}`);
    const data = await response.json();
    if (data.success) {
      setExecutedHistory(data.history);
    }
  };

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
    const run = async () => {
      if (factoryDeployed && factoryAddress && address && !accountCreatedRef.current) {
        accountCreatedRef.current = true;

        const validSigners = signerAddresses.filter((s) => s.trim() !== "");

        try {
          await createAccount({
            address: factoryAddress,
            abi: abi.AccountFactoryAbi,
            functionName: "createAccount",
            args: [validSigners, BigInt(threshold), ENTRY_POINT_ADDRESS],
          });
        } catch (error) {
          setIsLoading(false);
          const message =
            error?.shortMessage ||
            error?.message ||
            "Unknown error";

          toast.dark(message);
        }
      }
    }

    run();
  }, [factoryDeployed, factoryAddress, address, createAccount, abi, signerAddresses, threshold]);

  useEffect(() => {
    if (createReceipt) {
      setIsLoading(false);
      setUserApi();
      toast.dark("Account successfully created...");
    }
  }, [createReceipt]);

  /* ---------------- Handlers ---------------- */
  const handleDeploy = async () => {
    if (!address || !factoryByteCode) return;
    setIsLoading(true);
    accountCreatedRef.current = false;

    try {
      toast.dark("Creating Account...");
      await deployFactory({
        abi: abi.AccountFactoryAbi,
        bytecode: factoryByteCode,
        args: [],
      });
    } catch (error) {
      const message =
        error?.shortMessage ||
        error?.message ||
        "Unknown error";

      toast.dark(message);
      setIsLoading(false);
    }
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

  const handleRequest = async (accountAddress) => {
    if (myRequests.some(item => item.account === (deployedAccount || newAccountAddress))) return;

    fetchUserData(address);

    const payload = {
      accountAddress: accountAddress,
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

      loadRequests(address);
      loadHistory(address);
    } catch (error) {
      console.error("Error submitting request:", error);
      toast.dark("Error submitting request");
    } finally {
      toast.dark("Transaction request submitted");
      setTarget("");
      setValue("");
      setCallData("");
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

  async function setUserApi() {
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
      fetchUserData(address);
    }
  }

  const loadRequests = async (userAddress) => {
    const response = await fetch(`/api/getUserRequests?address=${userAddress}`);
    const data = await response.json();
    if (data.success) {
      setMyRequests(data.requests);
    }
  };

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

  useEffect(() => {
    fetchUserData(address);
    loadRequests(address);
    loadHistory(address);
  }, [address]);

  const handleSign = async (accountAddress, target, value, data, currentSignatures, threshold) => {
    try {
      setIsLoadingSign(true);
      toast.dark("Signing Message...");
      const plainString = "Hello Multisig";
      const messageHash = keccak256(toHex(plainString));

      const signature = await signMessageAsync({
        message: { raw: messageHash }
      });

      toast.dark("Message signed successfully!");

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
        await updateStatus(accountAddress, "Ready");
      }
      loadRequests(address);
      loadHistory(address);
      setIsLoadingSign(false);
    } catch (err) {
      const message =
        err?.shortMessage ||
        err?.message ||
        "Unknown error";

      toast.dark(message);
      setIsLoadingSign(false);
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
        toast.dark(`Status updated to ${status}`);
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
        args: [senderAddress, BigInt(0)],
      });
      return toHex(nonce);
    } catch (error) {
      console.error("Error fetching nonce:", error);
    }
  };

  const handleExecute = async (req) => {
    setIsLoading(true);
    try {
      toast.dark("Executing Transaction...");

      const hexNonce = (await getHexNonce(req.account)).toString(16);

      const userOp = {
        sender: getAddress(req.account),
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

      handleFinalExecution(userOp, req);

    } catch (err) {
      const message =
        err?.shortMessage ||
        err?.message ||
        "Unknown error";

      toast.dark(message);
    } finally {
      setIsLoading(false);

    }
  };

  const { writeContractAsync: writeContractExecute } = useWriteContract();

  const handleFinalExecution = async (userOp, req) => {
    setIsLoading(true);
    setIsLoadingExecute(true);
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

      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash
      });

      console.log("Transaction confirmed in block:", receipt.blockNumber);

      console.log("Receipt:", receipt);

      if (receipt.status === "success") {
        await updateStatus(req.account, "Executed");

        await Promise.all([
          loadRequests(address),
          loadHistory(address)
        ]);

        toast.dark("Transaction Executed Successfully!");
      } else {
        throw new Error("Transaction reverted on-chain");
      }
    } catch (err) {
      const message =
        err?.shortMessage ||
        err?.message ||
        "Unknown error";

      toast.dark(message);
    } finally {
      setIsLoading(false);
      setIsLoadingExecute(false);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen flex items-center justify-center p-4 flex-col gap-4">

      {/* Creation Section */}
      {!(deployedAccount || newAccountAddress) && (
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
                type="text"
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
              onClick={() => handleRequest(deployedAccount || newAccountAddress)}
              disabled={myRequests.some(item => item.account === (deployedAccount || newAccountAddress))}
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
                  {isLoadingSign ? "Signing..." : req.signatures.some(
                    (item) => item.signerAddress.toLowerCase() === address?.toLowerCase()
                  ) ? "Your Already Sign" : "Sign & Approve"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

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
                  {isLoadingExecute ? "Executing..." : "Execute"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="w-full max-w-md bg-white p-4 rounded-xl shadow-lg border border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            Executed Transactions
          </h3>
        </div>

        <div className="flex flex-col gap-3">
          {Object.entries(executedHistory).map(([account, transactions]) => (
            transactions.map((tx, idx) => (
              <div
                key={idx}
                className="p-3 bg-slate-50 rounded-lg border border-slate-200 hover:border-blue-300 transition-colors"
              >
                {/* Header: Smart Account Source */}
                <div className="mb-2">
                  <p className="text-[9px] text-gray-400 font-bold uppercase">From Smart Account</p>
                  <p className="text-[10px] font-mono text-slate-700 truncate">{tx.account}</p>
                </div>

                {/* Body: Transaction Details */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-white p-2 rounded border border-slate-100">
                    <p className="text-[9px] text-gray-400 font-bold">Target</p>
                    <p className="text-[10px] font-mono truncate">{tx.targetAddress}</p>
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-100">
                    <p className="text-[9px] text-gray-400 font-bold">Value</p>
                    <p className="text-[10px] font-mono">{tx.value} Wei</p>
                  </div>
                </div>
              </div>
            ))
          ))}
        </div>
      </div>

    </div>
  );
}
