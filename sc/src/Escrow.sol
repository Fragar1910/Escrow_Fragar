// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title Escrow
 * @dev Secure escrow contract for ERC20 token swaps
 * @notice This contract allows users to create, complete, and cancel token swap operations
 *
 * Security features:
 * - ReentrancyGuard: Prevents reentrancy attacks
 * - SafeERC20: Prevents issues with non-standard ERC20 tokens
 * - Checks-Effects-Interactions pattern
 * - Input validation on all functions
 * - Access control with Ownable
 */
contract Escrow is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Operation status enum
    enum OperationStatus { Active, Completed, Cancelled }

    // Struct to store operation details
    struct Operation {
        uint256 id;
        address creator;
        address tokenA;
        address tokenB;
        uint256 amountA;
        uint256 amountB;
        OperationStatus status;
        address completer;
    }

    // State variables
    uint256 private operationCounter;
    mapping(uint256 => Operation) public operations;
    mapping(address => bool) public allowedTokens;
    address[] private allowedTokensList;
    uint256[] private operationIds;

    // Events
    event TokenAdded(address indexed token);
    event OperationCreated(
        uint256 indexed operationId,
        address indexed creator,
        address tokenA,
        address tokenB,
        uint256 amountA,
        uint256 amountB
    );
    event OperationCompleted(
        uint256 indexed operationId,
        address indexed completer
    );
    event OperationCancelled(uint256 indexed operationId);

    /**
     * @dev Constructor sets the initial owner
     */
    constructor() Ownable(msg.sender) {
        operationCounter = 0;
    }

    /**
     * @notice Add a token to the list of allowed tokens
     * @param _token Address of the ERC20 token to allow
     */
    function addToken(address _token) external onlyOwner {
        require(_token != address(0), "Invalid token address");
        require(!allowedTokens[_token], "Token already allowed");

        allowedTokens[_token] = true;
        allowedTokensList.push(_token);

        emit TokenAdded(_token);
    }

    /**
     * @notice Create a new swap operation
     * @param _tokenA Address of the token to deposit
     * @param _tokenB Address of the token to receive
     * @param _amountA Amount of tokenA to deposit
     * @param _amountB Amount of tokenB requested
     */
    function createOperation(
        address _tokenA,
        address _tokenB,
        uint256 _amountA,
        uint256 _amountB
    ) external nonReentrant {
        // Input validation
        require(allowedTokens[_tokenA], "TokenA not allowed");
        require(allowedTokens[_tokenB], "TokenB not allowed");
        require(_tokenA != _tokenB, "Tokens must be different");
        require(_amountA > 0, "AmountA must be greater than 0");
        require(_amountB > 0, "AmountB must be greater than 0");

        // Transfer tokenA from user to contract (user must have approved first)
        IERC20(_tokenA).safeTransferFrom(msg.sender, address(this), _amountA);

        // Create operation
        uint256 newOperationId = operationCounter;
        operations[newOperationId] = Operation({
            id: newOperationId,
            creator: msg.sender,
            tokenA: _tokenA,
            tokenB: _tokenB,
            amountA: _amountA,
            amountB: _amountB,
            status: OperationStatus.Active,
            completer: address(0)
        });

        operationIds.push(newOperationId);
        operationCounter++;

        emit OperationCreated(
            newOperationId,
            msg.sender,
            _tokenA,
            _tokenB,
            _amountA,
            _amountB
        );
    }

    /**
     * @notice Complete a swap operation
     * @param _operationId ID of the operation to complete
     */
    function completeOperation(uint256 _operationId) external nonReentrant {
        Operation storage operation = operations[_operationId];

        // Validation checks
        require(operation.creator != address(0), "Operation does not exist");
        require(operation.status == OperationStatus.Active, "Operation not active");
        require(msg.sender != operation.creator, "Creator cannot complete own operation");

        // Update state before external calls (Checks-Effects-Interactions)
        operation.status = OperationStatus.Completed;
        operation.completer = msg.sender;

        // Transfer tokenB from completer to creator
        IERC20(operation.tokenB).safeTransferFrom(
            msg.sender,
            operation.creator,
            operation.amountB
        );

        // Transfer tokenA from contract to completer
        IERC20(operation.tokenA).safeTransfer(msg.sender, operation.amountA);

        emit OperationCompleted(_operationId, msg.sender);
    }

    /**
     * @notice Cancel an active operation and return tokens to creator
     * @param _operationId ID of the operation to cancel
     */
    function cancelOperation(uint256 _operationId) external nonReentrant {
        Operation storage operation = operations[_operationId];

        // Validation checks
        require(operation.creator != address(0), "Operation does not exist");
        require(operation.status == OperationStatus.Active, "Operation not active");
        require(msg.sender == operation.creator, "Only creator can cancel");

        // Update state before external calls (Checks-Effects-Interactions)
        operation.status = OperationStatus.Cancelled;

        // Return tokenA to creator
        IERC20(operation.tokenA).safeTransfer(operation.creator, operation.amountA);

        emit OperationCancelled(_operationId);
    }

    /**
     * @notice Get all allowed tokens
     * @return Array of allowed token addresses
     */
    function getAllowedTokens() external view returns (address[] memory) {
        return allowedTokensList;
    }

    /**
     * @notice Get all operations
     * @return Array of all operations
     */
    function getAllOperations() external view returns (Operation[] memory) {
        Operation[] memory allOperations = new Operation[](operationIds.length);

        for (uint256 i = 0; i < operationIds.length; i++) {
            allOperations[i] = operations[operationIds[i]];
        }

        return allOperations;
    }

    /**
     * @notice Get operation by ID
     * @param _operationId ID of the operation
     * @return Operation struct
     */
    function getOperation(uint256 _operationId) external view returns (Operation memory) {
        require(operations[_operationId].creator != address(0), "Operation does not exist");
        return operations[_operationId];
    }

    /**
     * @notice Get total number of operations created
     * @return Number of operations
     */
    function getOperationCount() external view returns (uint256) {
        return operationCounter;
    }
}
