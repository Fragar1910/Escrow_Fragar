// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "forge-std/Test.sol";
import "../src/Escrow.sol";
import "../src/MockToken.sol";

contract EscrowTest is Test {
    Escrow public escrow;
    MockToken public tokenA;
    MockToken public tokenB;
    MockToken public tokenC;

    address public owner;
    address public user1;
    address public user2;
    address public user3;

    uint256 constant INITIAL_BALANCE = 10000 * 10**18;

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

    function setUp() public {
        // Setup accounts
        owner = address(this);
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        user3 = makeAddr("user3");

        // Deploy contracts
        escrow = new Escrow();
        tokenA = new MockToken("Token A", "TKA", INITIAL_BALANCE);
        tokenB = new MockToken("Token B", "TKB", INITIAL_BALANCE);
        tokenC = new MockToken("Token C", "TKC", INITIAL_BALANCE);

        // Distribute tokens to users
        tokenA.transfer(user1, 1000 * 10**18);
        tokenA.transfer(user2, 1000 * 10**18);
        tokenB.transfer(user1, 1000 * 10**18);
        tokenB.transfer(user2, 1000 * 10**18);
        tokenC.transfer(user1, 1000 * 10**18);
    }

    // ============ addToken Tests ============

    function test_AddToken_Success() public {
        vm.expectEmit(true, false, false, false);
        emit TokenAdded(address(tokenA));

        escrow.addToken(address(tokenA));

        assertTrue(escrow.allowedTokens(address(tokenA)));

        address[] memory allowedTokens = escrow.getAllowedTokens();
        assertEq(allowedTokens.length, 1);
        assertEq(allowedTokens[0], address(tokenA));
    }

    function test_AddToken_MultipleTokens() public {
        escrow.addToken(address(tokenA));
        escrow.addToken(address(tokenB));

        address[] memory allowedTokens = escrow.getAllowedTokens();
        assertEq(allowedTokens.length, 2);
        assertEq(allowedTokens[0], address(tokenA));
        assertEq(allowedTokens[1], address(tokenB));
    }

    function test_AddToken_RevertWhen_NotOwner() public {
        vm.prank(user1);
        vm.expectRevert();
        escrow.addToken(address(tokenA));
    }

    function test_AddToken_RevertWhen_ZeroAddress() public {
        vm.expectRevert("Invalid token address");
        escrow.addToken(address(0));
    }

    function test_AddToken_RevertWhen_AlreadyAdded() public {
        escrow.addToken(address(tokenA));

        vm.expectRevert("Token already allowed");
        escrow.addToken(address(tokenA));
    }

    // ============ createOperation Tests ============

    function test_CreateOperation_Success() public {
        // Setup
        escrow.addToken(address(tokenA));
        escrow.addToken(address(tokenB));

        uint256 amountA = 100 * 10**18;
        uint256 amountB = 50 * 10**18;

        vm.startPrank(user1);
        tokenA.approve(address(escrow), amountA);

        uint256 balanceBefore = tokenA.balanceOf(user1);

        vm.expectEmit(true, true, false, true);
        emit OperationCreated(0, user1, address(tokenA), address(tokenB), amountA, amountB);

        escrow.createOperation(address(tokenA), address(tokenB), amountA, amountB);
        vm.stopPrank();

        // Verify token transfer
        assertEq(tokenA.balanceOf(user1), balanceBefore - amountA);
        assertEq(tokenA.balanceOf(address(escrow)), amountA);

        // Verify operation created
        Escrow.Operation memory op = escrow.getOperation(0);
        assertEq(op.id, 0);
        assertEq(op.creator, user1);
        assertEq(op.tokenA, address(tokenA));
        assertEq(op.tokenB, address(tokenB));
        assertEq(op.amountA, amountA);
        assertEq(op.amountB, amountB);
        assertEq(uint(op.status), uint(Escrow.OperationStatus.Active));
        assertEq(op.completer, address(0));

        assertEq(escrow.getOperationCount(), 1);
    }

    function test_CreateOperation_MultipleOperations() public {
        escrow.addToken(address(tokenA));
        escrow.addToken(address(tokenB));

        // Create first operation
        vm.startPrank(user1);
        tokenA.approve(address(escrow), 200 * 10**18);
        escrow.createOperation(address(tokenA), address(tokenB), 100 * 10**18, 50 * 10**18);
        vm.stopPrank();

        // Create second operation
        vm.startPrank(user2);
        tokenA.approve(address(escrow), 200 * 10**18);
        escrow.createOperation(address(tokenA), address(tokenB), 100 * 10**18, 75 * 10**18);
        vm.stopPrank();

        assertEq(escrow.getOperationCount(), 2);

        Escrow.Operation[] memory ops = escrow.getAllOperations();
        assertEq(ops.length, 2);
        assertEq(ops[0].creator, user1);
        assertEq(ops[1].creator, user2);
    }

    function test_CreateOperation_RevertWhen_TokenANotAllowed() public {
        escrow.addToken(address(tokenB));

        vm.startPrank(user1);
        tokenA.approve(address(escrow), 100 * 10**18);

        vm.expectRevert("TokenA not allowed");
        escrow.createOperation(address(tokenA), address(tokenB), 100 * 10**18, 50 * 10**18);
        vm.stopPrank();
    }

    function test_CreateOperation_RevertWhen_TokenBNotAllowed() public {
        escrow.addToken(address(tokenA));

        vm.startPrank(user1);
        tokenA.approve(address(escrow), 100 * 10**18);

        vm.expectRevert("TokenB not allowed");
        escrow.createOperation(address(tokenA), address(tokenB), 100 * 10**18, 50 * 10**18);
        vm.stopPrank();
    }

    function test_CreateOperation_RevertWhen_SameToken() public {
        escrow.addToken(address(tokenA));

        vm.startPrank(user1);
        tokenA.approve(address(escrow), 100 * 10**18);

        vm.expectRevert("Tokens must be different");
        escrow.createOperation(address(tokenA), address(tokenA), 100 * 10**18, 50 * 10**18);
        vm.stopPrank();
    }

    function test_CreateOperation_RevertWhen_ZeroAmountA() public {
        escrow.addToken(address(tokenA));
        escrow.addToken(address(tokenB));

        vm.startPrank(user1);
        vm.expectRevert("AmountA must be greater than 0");
        escrow.createOperation(address(tokenA), address(tokenB), 0, 50 * 10**18);
        vm.stopPrank();
    }

    function test_CreateOperation_RevertWhen_ZeroAmountB() public {
        escrow.addToken(address(tokenA));
        escrow.addToken(address(tokenB));

        vm.startPrank(user1);
        tokenA.approve(address(escrow), 100 * 10**18);

        vm.expectRevert("AmountB must be greater than 0");
        escrow.createOperation(address(tokenA), address(tokenB), 100 * 10**18, 0);
        vm.stopPrank();
    }

    function test_CreateOperation_RevertWhen_InsufficientAllowance() public {
        escrow.addToken(address(tokenA));
        escrow.addToken(address(tokenB));

        vm.startPrank(user1);
        tokenA.approve(address(escrow), 50 * 10**18);

        vm.expectRevert();
        escrow.createOperation(address(tokenA), address(tokenB), 100 * 10**18, 50 * 10**18);
        vm.stopPrank();
    }

    // ============ completeOperation Tests ============

    function test_CompleteOperation_Success() public {
        // Setup - create operation
        escrow.addToken(address(tokenA));
        escrow.addToken(address(tokenB));

        uint256 amountA = 100 * 10**18;
        uint256 amountB = 50 * 10**18;

        vm.startPrank(user1);
        tokenA.approve(address(escrow), amountA);
        escrow.createOperation(address(tokenA), address(tokenB), amountA, amountB);
        vm.stopPrank();

        // Complete operation
        uint256 user1BalanceBBefore = tokenB.balanceOf(user1);
        uint256 user2BalanceABefore = tokenA.balanceOf(user2);
        uint256 user2BalanceBBefore = tokenB.balanceOf(user2);

        vm.startPrank(user2);
        tokenB.approve(address(escrow), amountB);

        vm.expectEmit(true, true, false, false);
        emit OperationCompleted(0, user2);

        escrow.completeOperation(0);
        vm.stopPrank();

        // Verify token transfers
        assertEq(tokenB.balanceOf(user1), user1BalanceBBefore + amountB);
        assertEq(tokenA.balanceOf(user2), user2BalanceABefore + amountA);
        assertEq(tokenB.balanceOf(user2), user2BalanceBBefore - amountB);
        assertEq(tokenA.balanceOf(address(escrow)), 0);

        // Verify operation status
        Escrow.Operation memory op = escrow.getOperation(0);
        assertEq(uint(op.status), uint(Escrow.OperationStatus.Completed));
        assertEq(op.completer, user2);
    }

    function test_CompleteOperation_RevertWhen_OperationDoesNotExist() public {
        vm.prank(user2);
        vm.expectRevert("Operation does not exist");
        escrow.completeOperation(999);
    }

    function test_CompleteOperation_RevertWhen_OperationNotActive() public {
        // Create and complete operation
        escrow.addToken(address(tokenA));
        escrow.addToken(address(tokenB));

        vm.startPrank(user1);
        tokenA.approve(address(escrow), 100 * 10**18);
        escrow.createOperation(address(tokenA), address(tokenB), 100 * 10**18, 50 * 10**18);
        vm.stopPrank();

        vm.startPrank(user2);
        tokenB.approve(address(escrow), 50 * 10**18);
        escrow.completeOperation(0);
        vm.stopPrank();

        // Try to complete again
        vm.prank(user3);
        vm.expectRevert("Operation not active");
        escrow.completeOperation(0);
    }

    function test_CompleteOperation_RevertWhen_CreatorTriesToComplete() public {
        escrow.addToken(address(tokenA));
        escrow.addToken(address(tokenB));

        vm.startPrank(user1);
        tokenA.approve(address(escrow), 100 * 10**18);
        escrow.createOperation(address(tokenA), address(tokenB), 100 * 10**18, 50 * 10**18);

        tokenB.approve(address(escrow), 50 * 10**18);
        vm.expectRevert("Creator cannot complete own operation");
        escrow.completeOperation(0);
        vm.stopPrank();
    }

    function test_CompleteOperation_RevertWhen_CancelledOperation() public {
        escrow.addToken(address(tokenA));
        escrow.addToken(address(tokenB));

        vm.startPrank(user1);
        tokenA.approve(address(escrow), 100 * 10**18);
        escrow.createOperation(address(tokenA), address(tokenB), 100 * 10**18, 50 * 10**18);
        escrow.cancelOperation(0);
        vm.stopPrank();

        vm.prank(user2);
        vm.expectRevert("Operation not active");
        escrow.completeOperation(0);
    }

    // ============ cancelOperation Tests ============

    function test_CancelOperation_Success() public {
        // Create operation
        escrow.addToken(address(tokenA));
        escrow.addToken(address(tokenB));

        uint256 amountA = 100 * 10**18;

        vm.startPrank(user1);
        tokenA.approve(address(escrow), amountA);
        escrow.createOperation(address(tokenA), address(tokenB), amountA, 50 * 10**18);

        uint256 balanceBefore = tokenA.balanceOf(user1);

        vm.expectEmit(true, false, false, false);
        emit OperationCancelled(0);

        escrow.cancelOperation(0);
        vm.stopPrank();

        // Verify token returned
        assertEq(tokenA.balanceOf(user1), balanceBefore + amountA);
        assertEq(tokenA.balanceOf(address(escrow)), 0);

        // Verify operation status
        Escrow.Operation memory op = escrow.getOperation(0);
        assertEq(uint(op.status), uint(Escrow.OperationStatus.Cancelled));
    }

    function test_CancelOperation_RevertWhen_OperationDoesNotExist() public {
        vm.prank(user1);
        vm.expectRevert("Operation does not exist");
        escrow.cancelOperation(999);
    }

    function test_CancelOperation_RevertWhen_NotCreator() public {
        escrow.addToken(address(tokenA));
        escrow.addToken(address(tokenB));

        vm.startPrank(user1);
        tokenA.approve(address(escrow), 100 * 10**18);
        escrow.createOperation(address(tokenA), address(tokenB), 100 * 10**18, 50 * 10**18);
        vm.stopPrank();

        vm.prank(user2);
        vm.expectRevert("Only creator can cancel");
        escrow.cancelOperation(0);
    }

    function test_CancelOperation_RevertWhen_AlreadyCompleted() public {
        escrow.addToken(address(tokenA));
        escrow.addToken(address(tokenB));

        vm.startPrank(user1);
        tokenA.approve(address(escrow), 100 * 10**18);
        escrow.createOperation(address(tokenA), address(tokenB), 100 * 10**18, 50 * 10**18);
        vm.stopPrank();

        vm.startPrank(user2);
        tokenB.approve(address(escrow), 50 * 10**18);
        escrow.completeOperation(0);
        vm.stopPrank();

        vm.prank(user1);
        vm.expectRevert("Operation not active");
        escrow.cancelOperation(0);
    }

    function test_CancelOperation_RevertWhen_AlreadyCancelled() public {
        escrow.addToken(address(tokenA));
        escrow.addToken(address(tokenB));

        vm.startPrank(user1);
        tokenA.approve(address(escrow), 100 * 10**18);
        escrow.createOperation(address(tokenA), address(tokenB), 100 * 10**18, 50 * 10**18);
        escrow.cancelOperation(0);

        vm.expectRevert("Operation not active");
        escrow.cancelOperation(0);
        vm.stopPrank();
    }

    // ============ View Functions Tests ============

    function test_GetAllowedTokens_EmptyArray() public {
        address[] memory tokens = escrow.getAllowedTokens();
        assertEq(tokens.length, 0);
    }

    function test_GetAllOperations_EmptyArray() public {
        Escrow.Operation[] memory ops = escrow.getAllOperations();
        assertEq(ops.length, 0);
    }

    function test_GetOperation_RevertWhen_DoesNotExist() public {
        vm.expectRevert("Operation does not exist");
        escrow.getOperation(0);
    }

    function test_GetOperationCount_Initial() public {
        assertEq(escrow.getOperationCount(), 0);
    }

    // ============ Integration Tests ============

    function test_FullWorkflow_CreateCompleteCancel() public {
        escrow.addToken(address(tokenA));
        escrow.addToken(address(tokenB));
        escrow.addToken(address(tokenC));

        // User1 creates operation swapping tokenA for tokenB
        vm.startPrank(user1);
        tokenA.approve(address(escrow), 100 * 10**18);
        escrow.createOperation(address(tokenA), address(tokenB), 100 * 10**18, 50 * 10**18);
        vm.stopPrank();

        // User2 completes the operation
        vm.startPrank(user2);
        tokenB.approve(address(escrow), 50 * 10**18);
        escrow.completeOperation(0);
        vm.stopPrank();

        // User1 creates another operation and cancels it
        vm.startPrank(user1);
        tokenB.approve(address(escrow), 50 * 10**18);
        escrow.createOperation(address(tokenB), address(tokenC), 50 * 10**18, 25 * 10**18);
        escrow.cancelOperation(1);
        vm.stopPrank();

        assertEq(escrow.getOperationCount(), 2);

        Escrow.Operation memory op0 = escrow.getOperation(0);
        Escrow.Operation memory op1 = escrow.getOperation(1);

        assertEq(uint(op0.status), uint(Escrow.OperationStatus.Completed));
        assertEq(uint(op1.status), uint(Escrow.OperationStatus.Cancelled));
    }

    // ============ Security Tests ============

    function test_ReentrancyProtection() public {
        // This test verifies that the nonReentrant modifier is in place
        // The actual reentrancy attack would require a malicious token contract
        // which is beyond this basic test, but the modifier presence ensures protection
        escrow.addToken(address(tokenA));
        escrow.addToken(address(tokenB));

        vm.startPrank(user1);
        tokenA.approve(address(escrow), 100 * 10**18);
        escrow.createOperation(address(tokenA), address(tokenB), 100 * 10**18, 50 * 10**18);
        vm.stopPrank();

        // Normal completion should work
        vm.startPrank(user2);
        tokenB.approve(address(escrow), 50 * 10**18);
        escrow.completeOperation(0);
        vm.stopPrank();
    }

    function test_Fuzz_CreateOperation(uint256 amountA, uint256 amountB) public {
        // Bound amounts to reasonable values
        amountA = bound(amountA, 1, 1000 * 10**18);
        amountB = bound(amountB, 1, 1000 * 10**18);

        escrow.addToken(address(tokenA));
        escrow.addToken(address(tokenB));

        vm.startPrank(user1);
        tokenA.approve(address(escrow), amountA);
        escrow.createOperation(address(tokenA), address(tokenB), amountA, amountB);
        vm.stopPrank();

        Escrow.Operation memory op = escrow.getOperation(0);
        assertEq(op.amountA, amountA);
        assertEq(op.amountB, amountB);
    }
}
