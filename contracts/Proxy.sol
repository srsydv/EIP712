// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/**
 * @title Proxy
 * @notice A wrapper contract that extends ERC1967Proxy for Hardhat deployment
 * This allows Hardhat to compile and deploy the proxy contract
 */
contract Proxy is ERC1967Proxy {
    constructor(address implementation, bytes memory _data) 
        ERC1967Proxy(implementation, _data) 
    {}
}

