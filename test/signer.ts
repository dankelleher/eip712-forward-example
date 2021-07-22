import {BigNumber, Contract} from "ethers";

import {EIP712Message, EIP712TypedData} from "eth-sig-util";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {TypedDataField} from "@ethersproject/abstract-signer";

type Input = {
  from: string,
  to: string,
  data: string
}

const EIP712Domain = [
  { name: 'name', type: 'string' },
  { name: 'version', type: 'string' },
  { name: 'chainId', type: 'uint256' },
  { name: 'verifyingContract', type: 'address' }
];

const ForwardRequest = [
  { name: 'from', type: 'address' },
  { name: 'to', type: 'address' },
  { name: 'value', type: 'uint256' },
  { name: 'gas', type: 'uint256' },
  { name: 'nonce', type: 'uint256' },
  { name: 'data', type: 'bytes' },
];

const getMetaTxTypeData = (chainId: number, verifyingContract: string):Omit<EIP712TypedData, 'message'> => ({
  types: {
    EIP712Domain,
    ForwardRequest,
  },
  domain: {
    name: 'MinimalForwarder',
    version: '0.0.1',
    chainId,
    verifyingContract,
  },
  primaryType: 'ForwardRequest',
});

async function signTypedData(signer: SignerWithAddress, data: EIP712TypedData) {
  const types = { ForwardRequest } as Record<string, Array<TypedDataField>>

  return signer._signTypedData(data.domain, types, data.message)
}

const buildRequest = async (forwarder: Contract, input: Input):Promise<EIP712Message> => {
  const nonce = await forwarder.getNonce(input.from).then((nonce: BigNumber) => nonce.toString());
  return { value: 0, gas: 1e6, nonce, ...input };
};

const buildTypedData = async (forwarder: Contract, request: EIP712Message):Promise<EIP712TypedData> => {
  const chainId = await forwarder.provider.getNetwork().then(n => n.chainId);
  const typeData = getMetaTxTypeData(chainId, forwarder.address);
  return { ...typeData, message: request };
};

export const signMetaTxRequest = async (signer: SignerWithAddress, forwarder: Contract, input: Input) => {
  const request = await buildRequest(forwarder, input);
  const toSign = await buildTypedData(forwarder, request);
  const signature = await signTypedData(signer, toSign);
  return { signature, request };
};