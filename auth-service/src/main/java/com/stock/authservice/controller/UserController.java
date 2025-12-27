package com.stock.authservice.controller;

import com.stock.authservice.dto.request.ChangePasswordRequest;
import com.stock.authservice.dto.request.UserCreateRequest;
import com.stock.authservice.dto.request.UserRoleAssignRequest;
import com.stock.authservice.dto.request.UserUpdateRequest;
import com.stock.authservice.dto.response.ApiResponse;
import com.stock.authservice.dto.response.PageResponse;
import com.stock.authservice.dto.response.UserResponse;
import com.stock.authservice.security.CustomUserDetails;
import com.stock.authservice.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "User Management", description = "User management endpoints")
@SecurityRequirement(name = "Bearer Authentication")
public class UserController {

    private final UserService userService;

    // ==================== GET CURRENT USER ====================

    @GetMapping("/me")
    @Operation(summary = "Get current user", description = "Get current authenticated user details")
    public ResponseEntity<UserResponse> getCurrentUser(Authentication authentication) {
        log.info("GET /api/users/me - Get current user");

        String userId = ((CustomUserDetails) authentication.getPrincipal()).getId();
        UserResponse response = userService.getUserById(userId);

        return ResponseEntity.ok(response);
    }

    // ==================== CREATE USER ====================

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Create user", description = "Create a new user (Admin only)")
    public ResponseEntity<ApiResponse<UserResponse>> createUser(@Valid @RequestBody UserCreateRequest request) {
        log.info("POST /api/users - Create user: {}", request.getUsername());

        ApiResponse<UserResponse> response = userService.createUser(request);

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // ==================== GET USER ====================

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or #id == authentication.principal.id")
    @Operation(summary = "Get user by ID", description = "Get user details by ID")
    public ResponseEntity<UserResponse> getUserById(@PathVariable String id) {
        log.info("GET /api/users/{} - Get user by ID", id);

        UserResponse response = userService.getUserById(id);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/username/{username}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Get user by username", description = "Get user details by username")
    public ResponseEntity<UserResponse> getUserByUsername(@PathVariable String username) {
        log.info("GET /api/users/username/{} - Get user by username", username);

        UserResponse response = userService.getUserByUsername(username);

        return ResponseEntity.ok(response);
    }

    // ==================== LIST USERS ====================

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Get all users", description = "Get paginated list of all users")
    public ResponseEntity<PageResponse<UserResponse>> getAllUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "username") String sortBy,
            @RequestParam(defaultValue = "ASC") String sortDirection) {
        log.info("GET /api/users - Get all users - page: {}, size: {}", page, size);

        PageResponse<UserResponse> response = userService.getAllUsers(page, size, sortBy, sortDirection);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/active")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Get active users", description = "Get all active users")
    public ResponseEntity<PageResponse<UserResponse>> getActiveUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        log.info("GET /api/users/active - Get active users");

        PageResponse<UserResponse> response = userService.getActiveUsers(page, size);

        return ResponseEntity.ok(response);
    }

    // ==================== UPDATE PREFERENCES ====================

    @PutMapping("/preferences")
    @Operation(summary = "Update user preferences", description = "Update current user's preferences")
    public ResponseEntity<ApiResponse<UserResponse>> updatePreferences(
            @RequestBody UserUpdateRequest request,
            Authentication authentication) {
        log.info("PUT /api/users/preferences - Update user preferences");

        String userId = ((CustomUserDetails) authentication.getPrincipal()).getId();
        ApiResponse<UserResponse> response = userService.updateUser(userId, request);

        return ResponseEntity.ok(response);
    }

    // ==================== CHANGE PASSWORD ====================

    @PutMapping("/change-password")
    @Operation(summary = "Change password", description = "Change current user's password")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @Valid @RequestBody ChangePasswordRequest request,
            Authentication authentication) {
        log.info("PUT /api/users/change-password - Change password");

        String userId = ((CustomUserDetails) authentication.getPrincipal()).getId();
        ApiResponse<Void> response = userService.changePassword(userId, request);

        return ResponseEntity.ok(response);
    }

    // ==================== UPDATE USER ====================

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or #id == authentication.principal.id")
    @Operation(summary = "Update user", description = "Update user details")
    public ResponseEntity<ApiResponse<UserResponse>> updateUser(
            @PathVariable String id,
            @Valid @RequestBody UserUpdateRequest request) {
        log.info("PUT /api/users/{} - Update user", id);

        ApiResponse<UserResponse> response = userService.updateUser(id, request);

        return ResponseEntity.ok(response);
    }

    // ==================== DELETE USER ====================

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Delete user", description = "Delete user by ID")
    public ResponseEntity<ApiResponse<Void>> deleteUser(@PathVariable String id) {
        log.info("DELETE /api/users/{} - Delete user", id);

        ApiResponse<Void> response = userService.deleteUser(id);

        return ResponseEntity.ok(response);
    }

    // ==================== USER ACTIVATION ====================

    @PatchMapping("/{id}/activate")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Activate user", description = "Activate user account")
    public ResponseEntity<ApiResponse<Void>> activateUser(@PathVariable String id) {
        log.info("PATCH /api/users/{}/activate - Activate user", id);

        ApiResponse<Void> response = userService.activateUser(id);

        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{id}/deactivate")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Deactivate user", description = "Deactivate user account")
    public ResponseEntity<ApiResponse<Void>> deactivateUser(@PathVariable String id) {
        log.info("PATCH /api/users/{}/deactivate - Deactivate user", id);

        ApiResponse<Void> response = userService.deactivateUser(id);

        return ResponseEntity.ok(response);
    }

    // ==================== ACCOUNT LOCK ====================

    @PatchMapping("/{id}/lock")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Lock user account", description = "Lock user account")
    public ResponseEntity<ApiResponse<Void>> lockUser(@PathVariable String id) {
        log.info("PATCH /api/users/{}/lock - Lock user", id);

        ApiResponse<Void> response = userService.lockUser(id);

        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{id}/unlock")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Unlock user account", description = "Unlock user account")
    public ResponseEntity<ApiResponse<Void>> unlockUser(@PathVariable String id) {
        log.info("PATCH /api/users/{}/unlock - Unlock user", id);

        ApiResponse<Void> response = userService.unlockUser(id);

        return ResponseEntity.ok(response);
    }

    // ==================== ROLE MANAGEMENT ====================

    @PostMapping("/{id}/roles")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Assign roles to user", description = "Assign roles to a user")
    public ResponseEntity<ApiResponse<UserResponse>> assignRoles(
            @PathVariable String id,
            @Valid @RequestBody UserRoleAssignRequest request) {
        log.info("POST /api/users/{}/roles - Assign roles to user", id);

        ApiResponse<UserResponse> response = userService.assignRoles(id, request);

        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{userId}/roles/{roleId}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Remove role from user", description = "Remove a role from a user")
    public ResponseEntity<ApiResponse<UserResponse>> removeRole(
            @PathVariable String userId,
            @PathVariable String roleId) {
        log.info("DELETE /api/users/{}/roles/{} - Remove role from user", userId, roleId);

        ApiResponse<UserResponse> response = userService.removeRole(userId, roleId);

        return ResponseEntity.ok(response);
    }
}
