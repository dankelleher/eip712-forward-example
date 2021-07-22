# EIP712 Forward Example

Demonstrates a "recipient pays" reverse relay using EIP712
signTypedData_v4 and an EIP2771 forwarding contract.

The demo currently uses a standard ERC20 token contract,
but can be adapted to use any contract.

The contract must inherit the OpenZeppelin ERC2771Context
contract, and accept a trustedForwarder parameter in its
constructor.

To test:

```
npm i
npm test
```