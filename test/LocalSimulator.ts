import hre from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
// import { ethers } from "hardhat";

import { ethers } from "hardhat";


// Test suite for the CCIP Cross Chain Name Service
describe("CCIP Cross Chain Name Service Test", async function() {

  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployFixture() {
    const ccipLocalSimualtorFactory = await hre.ethers.getContractFactory(
      "CCIPLocalSimulator"
    );
    const ccipLocalSimulator = await ccipLocalSimualtorFactory.deploy();
    const [alice, bob] = await ethers.getSigners();
    return { ccipLocalSimulator, alice, bob };
  }


  it("Should transfer CCIP test tokens from EOA to EOA", async function() {

    const { ccipLocalSimulator, alice, bob } = await loadFixture(deployFixture);

    // 调用 configuration() 函数获取 Router 合约地址
    const config = await ccipLocalSimulator.configuration();
    console.log(config)

    // 创建 CrossChainNameServiceRegister
    //      CrossChainNameServiceReceiver 
    //      CrossChainNameServiceLookup 智能合约的实例，并在需要时调用 enableChain() 函数
    const ccnsLookupFactory = await ethers.getContractFactory(
      "CrossChainNameServiceLookup"
    );
    const sourceCcnsLookup = await ccnsLookupFactory.deploy();
    await sourceCcnsLookup.deployed();
    console.log(
      `✔️ Source CrossChainNameServiceLookup deployed at address: ${sourceCcnsLookup.address}`
    );


    const ccnsRegisterFactory = await ethers.getContractFactory(
      "CrossChainNameServiceRegister"
    );
    const ccnsRegister = await ccnsRegisterFactory.deploy(
      config.sourceRouter_,
      sourceCcnsLookup.address
    );
    await ccnsRegister.deployed();
    console.log(
      `✔️ CrossChainNameServiceRegister deployed at address: ${ccnsRegister.address}`
    );


    // 目标链
    const destinationCcnsLookup = await ccnsLookupFactory.deploy();
    await destinationCcnsLookup.deployed();
    console.log(
      `✔️ Destination CrossChainNameServiceLookup deployed at address: ${destinationCcnsLookup.address}`
    );

    const ccnsReceiverFactory = await ethers.getContractFactory(
      "CrossChainNameServiceReceiver"
    );
    const ccnsReceiver = await ccnsReceiverFactory.deploy(
      config.destinationRouter_,
      destinationCcnsLookup.address,
      config.chainSelector_
    );
    await ccnsReceiver.deployed();
    console.log(
      `✔️ CrossChainNameServiceReceiver deployed at address: ${ccnsReceiver.address}`
    );

    let txResponse = await ccnsRegister.enableChain(
      config.chainSelector_,
      ccnsReceiver.address,
      500_000n
    );
    await txResponse.wait(); // Wait for the transaction to be confirmed
    console.log(
      `✔️ Enabled destination chain on CrossChainNameServiceRegister.\n   Transaction Hash: ${txResponse.hash}`
    );

    // Set up the cross-chain service addresses for both the source and destination chain lookups
    // Configure the source chain's lookup contract with the address of the registration contract
    txResponse = await sourceCcnsLookup.setCrossChainNameServiceAddress(
      ccnsRegister.address
    );
    await txResponse.wait();
    console.log(
      `✔️ Set register address on source CrossChainNameServiceLookup.\n   Transaction Hash: ${txResponse.hash}`
    );

    // Configure the destination chain's lookup contract with the address of the receiver contract
    txResponse = await destinationCcnsLookup.setCrossChainNameServiceAddress(
      ccnsReceiver.address
    );
    await txResponse.wait();
    console.log(
      `✔️ Set receiver address on destination CrossChainNameServiceLookup.\n   Transaction Hash: ${txResponse.hash}`
    );

    console.log(
      "\n✔️ Step 4: Completed setting CrossChainNameServiceRegister and CrossChainNameServiceReceiver addresses on the respective CrossChainNameServiceLookup instances.\n"
    );

    // Register the name 'alice.ccns' using Alice's account
    const r_txResponse = await ccnsRegister.connect(alice).register("alice.ccns");
    await r_txResponse.wait();
    console.log(
      `✔️ Registered 'alice.ccns' for Alice's address.\n   Transaction Hash: ${r_txResponse.hash}`
    );

    // Lookup the name 'alice.ccns' on the source chain and verify it resolves to Alice's address
    const resolvedAddressSource = await sourceCcnsLookup.lookup("alice.ccns");
    if (resolvedAddressSource === (await alice.getAddress())) {
      console.log(
        `✔️ Successfully resolved 'alice.ccns' on source chain to Alice's address: ${resolvedAddressSource}`
      );
    } else {
      console.log(
        `❌ Failed to resolve 'alice.ccns' on source chain. Expected: ${await alice.getAddress()}, but got: ${resolvedAddressSource}`
      );
    }
    expect(resolvedAddressSource).to.equal(await alice.getAddress());

    // Lookup the name 'alice.ccns' on the destination chain and verify it resolves to Alice's address
    const resolvedAddressDestination = await destinationCcnsLookup.lookup(
      "alice.ccns"
    );
    if (resolvedAddressDestination === (await alice.getAddress())) {
      console.log(
        `✔️ Successfully resolved 'alice.ccns' on destination chain to Alice's address: ${resolvedAddressDestination}`
      );
    } else {
      console.log(
        `❌ Failed to resolve 'alice.ccns' on destination chain. Expected: ${await alice.getAddress()}, but got: ${resolvedAddressDestination}`
      );
    }
    expect(resolvedAddressDestination).to.equal(await alice.getAddress());

  });

})

