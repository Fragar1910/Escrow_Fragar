// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "forge-std/Script.sol";
import "../src/Escrow.sol";
import "../src/MockToken.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        // Deploy Escrow contract
        Escrow escrow = new Escrow();
        console.log("Escrow deployed at:", address(escrow));

        // Deploy Token A
        MockToken tokenA = new MockToken("Token A", "TKA", 1_000_000 * 10**18);
        console.log("Token A deployed at:", address(tokenA));

        // Deploy Token B
        MockToken tokenB = new MockToken("Token B", "TKB", 1_000_000 * 10**18);
        console.log("Token B deployed at:", address(tokenB));

        // Add tokens to escrow
        escrow.addToken(address(tokenA));
        escrow.addToken(address(tokenB));
        console.log("Tokens added to escrow");

        // Mint tokens to test accounts
        address account0 = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;
        address account1 = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;
        address account2 = 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC;

        tokenA.mint(account0, 1000 * 10**18);
        tokenA.mint(account1, 1000 * 10**18);
        tokenA.mint(account2, 1000 * 10**18);

        tokenB.mint(account0, 1000 * 10**18);
        tokenB.mint(account1, 1000 * 10**18);
        tokenB.mint(account2, 1000 * 10**18);

        console.log("Tokens minted to test accounts");

        vm.stopBroadcast();

        // Log deployment addresses for the shell script to capture
        console.log("\n=== DEPLOYMENT ADDRESSES ===");
        console.log("ESCROW_ADDRESS=", vm.toString(address(escrow)));
        console.log("TOKEN_A_ADDRESS=", vm.toString(address(tokenA)));
        console.log("TOKEN_B_ADDRESS=", vm.toString(address(tokenB)));
        console.log("=== END ADDRESSES ===");
    }
}
