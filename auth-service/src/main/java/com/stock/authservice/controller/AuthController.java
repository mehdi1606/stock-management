package com.stock.authservice.controller;


import com.stock.authservice.dto.request.*;
import com.stock.authservice.dto.response.ApiResponse;
import com.stock.authservice.dto.response.LoginResponse;
import com.stock.authservice.dto.response.TokenResponse;
import com.stock.authservice.dto.response.UserResponse;
import com.stock.authservice.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Authentication", description = "Authentication and authorization endpoints")
public class AuthController {

    private final AuthService authService;

    // ==================== LOGIN ====================

    @PostMapping("/login")
    @Operation(summary = "User login", description = "Authenticate user and return JWT tokens")
    public ResponseEntity<LoginResponse> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest) {
        log.info("POST /api/auth/login - Login attempt for: {}", request.getUsernameOrEmail());

        LoginResponse response = authService.login(request, httpRequest);

        return ResponseEntity.ok(response);
    }

    // ==================== REGISTER ====================

    @PostMapping("/register")
    @Operation(summary = "User registration", description = "Register a new user account")
    public ResponseEntity<ApiResponse<UserResponse>> register(@Valid @RequestBody RegisterRequest request) {
        log.info("POST /api/auth/register - Registration attempt for: {}", request.getUsername());

        ApiResponse<UserResponse> response = authService.register(request);

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // ==================== REFRESH TOKEN ====================

    @PostMapping("/refresh")
    @Operation(summary = "Refresh access token", description = "Get new access token using refresh token")
    public ResponseEntity<TokenResponse> refreshToken(
            @Valid @RequestBody RefreshTokenRequest request,
            HttpServletRequest httpRequest) {
        log.info("POST /api/auth/refresh - Refresh token request");

        TokenResponse response = authService.refreshAccessToken(request, httpRequest);

        return ResponseEntity.ok(response);
    }

    // ==================== LOGOUT ====================

    @PostMapping("/logout")
    @Operation(summary = "User logout", description = "Logout user and invalidate tokens")
    public ResponseEntity<ApiResponse<Void>> logout(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            HttpServletRequest httpRequest) {
        log.info("POST /api/auth/logout - Logout request");

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            // No valid token — treat as already logged out
            return ResponseEntity.ok(ApiResponse.<Void>builder()
                    .success(true)
                    .message("Logged out")
                    .build());
        }

        String accessToken = authHeader.substring(7); // Remove "Bearer " prefix
        ApiResponse<Void> response = authService.logout(accessToken, httpRequest);

        return ResponseEntity.ok(response);
    }

    // ==================== PASSWORD RESET ====================

    @PostMapping("/forgot-password")
    @Operation(summary = "Forgot password", description = "Request password reset link")
    public ResponseEntity<ApiResponse<Void>> forgotPassword(@Valid @RequestBody PasswordResetRequest request) {
        log.info("POST /api/auth/forgot-password - Password reset request for: {}", request.getEmail());

        ApiResponse<Void> response = authService.forgotPassword(request);

        return ResponseEntity.ok(response);
    }

    @PostMapping("/reset-password")
    @Operation(summary = "Reset password", description = "Reset password using reset token")
    public ResponseEntity<ApiResponse<Void>> resetPassword(@Valid @RequestBody PasswordResetConfirmRequest request) {
        log.info("POST /api/auth/reset-password - Password reset confirmation");

        ApiResponse<Void> response = authService.resetPassword(request);

        return ResponseEntity.ok(response);
    }

    @PostMapping("/change-password")
    @Operation(summary = "Change password", description = "Change password for authenticated user")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @Valid @RequestBody PasswordChangeRequest request,
            @RequestHeader("Authorization") String authHeader) {
        log.info("POST /api/auth/change-password - Password change request");

        // Extract username from token (handled in service via SecurityContext)
        String username = SecurityContextHolder.getContext()
                .getAuthentication().getName();

        ApiResponse<Void> response = authService.changePassword(request, username);

        return ResponseEntity.ok(response);
    }

    // ==================== EMAIL VERIFICATION ====================

    @GetMapping("/verify-email")
    @Operation(summary = "Verify email", description = "Verify user email using verification token")
    public ResponseEntity<ApiResponse<Void>> verifyEmail(@RequestParam String token) {
        log.info("GET /api/auth/verify-email - Email verification request");

        ApiResponse<Void> response = authService.verifyEmail(token);

        return ResponseEntity.ok(response);
    }
}
