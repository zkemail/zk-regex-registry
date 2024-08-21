pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "forge-std/console.sol";
import "forge-std/Script.sol";
import "./src/verifier.sol";
import "./src/contract.sol";
import "@zk-email/contracts/interfaces/IDKIMRegistry.sol";
import "@zk-email/contracts/DKIMRegistry.sol";

contract Deploy is Script, Test {
    function getPrivateKey() internal view returns (uint256) {
        try vm.envUint("PRIVATE_KEY") returns (uint256 privateKey) {
            return privateKey;
        } catch {
            // This is the anvil default exposed secret key
            return 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
        }
    }

    function getDkimRegistry() public view returns (IDKIMRegistry) {
        try vm.envAddress("DKIM_REGISTRY") returns (address dkimRegistry) {
            return IDKIMRegistry(dkimRegistry);
        } catch {
            return IDKIMRegistry(address(0));
        }
    }

    function getChainID() public view returns (uint256) {
        uint256 chainId;
        assembly {
            chainId := chainid()
        }
        return chainId;
    }

    function run() public returns (address, address, address)  {
        uint256 sk = getPrivateKey();
        vm.startBroadcast(sk);
        (address r, address c, address v) = deploy();
        vm.stopBroadcast();
        return ((r), (c), (v));
    }

    function deploy() public returns (address, address, address) {
        IDKIMRegistry dkimRegistry = getDkimRegistry();
        if (address(dkimRegistry) == address(0)) {
            dkimRegistry = new DKIMRegistry(msg.sender);
        }
        Groth16Verifier verifier = new Groth16Verifier();

        Contract c = new Contract(dkimRegistry, verifier);
        return (address(dkimRegistry), address(c), address(verifier));
    }
}