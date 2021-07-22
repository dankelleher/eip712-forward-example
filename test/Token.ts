import {expect} from "chai";
import {ethers} from "hardhat";
import {Contract} from "ethers";

import { signMetaTxRequest } from './signer'

describe("Token contract", function () {
  let forwarder: Contract;
  let hardhatToken: Contract;
  
  before('Deploy contracts',async () => {
    const MinimalForwarder = await ethers.getContractFactory("Forwarder");
    const Token = await ethers.getContractFactory("Token");

    forwarder = await MinimalForwarder.deploy();
    hardhatToken = await Token.deploy(forwarder.address);
  })
  
  it("Deployment should assign the total supply of tokens to the owner", async () => {
    const [owner] = await ethers.getSigners();

    const ownerBalance = await hardhatToken.balanceOf(owner.address);
    expect(await hardhatToken.totalSupply()).to.equal(ownerBalance);
  });

  it("Send to another address", async () => {
    const [owner, recipient] = await ethers.getSigners();

    const ownerBalance = await hardhatToken.balanceOf(owner.address);
    const recipientBalance = await hardhatToken.balanceOf(recipient.address);
    
    await hardhatToken.transfer(recipient.address, 100);

    const newOwnerBalance = await hardhatToken.balanceOf(owner.address);
    const newRecipientBalance = await hardhatToken.balanceOf(recipient.address);
    expect(newOwnerBalance).to.equal(ownerBalance - 100);
    expect(newRecipientBalance).to.equal(recipientBalance + 100);
  });

  it("Send to another address (recipient pays)", async () => {
    const [owner, recipient] = await ethers.getSigners();

    const ownerBalance = await hardhatToken.balanceOf(owner.address);
    const recipientBalance = await hardhatToken.balanceOf(recipient.address);
    const ownerEthBalance = await owner.getBalance();
    const recipientEthBalance = await recipient.getBalance();
    
    const { request, signature } = await signMetaTxRequest(owner, forwarder, {
      from: owner.address,
      to: hardhatToken.address,
      data: hardhatToken.interface.encodeFunctionData('transfer', [recipient.address, 100]),
    });
    
    await forwarder.connect(recipient).execute(request, signature)
    
    const newOwnerBalance = await hardhatToken.balanceOf(owner.address);
    const newRecipientBalance = await hardhatToken.balanceOf(recipient.address);
    const newOwnerEthBalance = await owner.getBalance();
    const newRecipientEthBalance = await recipient.getBalance();
    
    // the transaction was executed
    expect(newOwnerBalance).to.equal(ownerBalance - 100);
    expect(newRecipientBalance).to.equal(recipientBalance.toNumber() + 100);
    
    // Owner has not paid gas
    expect(newOwnerEthBalance).to.equal(ownerEthBalance);
    
    // Recipient has paid gas
    expect(newRecipientEthBalance.lt(recipientEthBalance)).to.be.true;
  });
});