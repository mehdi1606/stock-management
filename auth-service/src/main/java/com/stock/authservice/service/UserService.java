package com.stock.authservice.service;

import com.stock.authservice.dto.request.ChangePasswordRequest;
import com.stock.authservice.dto.request.UserCreateRequest;
import com.stock.authservice.dto.request.UserRoleAssignRequest;
import com.stock.authservice.dto.request.UserUpdateRequest;
import com.stock.authservice.dto.response.ApiResponse;
import com.stock.authservice.dto.response.PageResponse;
import com.stock.authservice.dto.response.UserResponse;
import com.stock.authservice.entity.Role;
import com.stock.authservice.entity.User;
import com.stock.authservice.event.UserEventPublisher;
import com.stock.authservice.event.dto.UserCreatedEvent;
import com.stock.authservice.exception.DuplicateResourceException;
import com.stock.authservice.exception.InvalidCredentialsException;
import com.stock.authservice.exception.ResourceNotFoundException;
import com.stock.authservice.repository.RoleRepository;
import com.stock.authservice.repository.UserRepository;
import com.stock.authservice.security.SecurityContextHelper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final UserEventPublisher userEventPublisher;
    private final SecurityContextHelper securityContextHelper;
    private final EmailService emailService;

    // Secure password generator
    private static final String PASSWORD_CHARS =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private String generateSecurePassword() {
        StringBuilder sb = new StringBuilder(12);
        // Guarantee at least one of each required character type
        sb.append((char) PASSWORD_CHARS.charAt(SECURE_RANDOM.nextInt(26)));               // uppercase
        sb.append((char) PASSWORD_CHARS.charAt(26 + SECURE_RANDOM.nextInt(26)));          // lowercase
        sb.append((char) PASSWORD_CHARS.charAt(52 + SECURE_RANDOM.nextInt(10)));          // digit
        sb.append((char) PASSWORD_CHARS.charAt(62 + SECURE_RANDOM.nextInt(8)));           // special
        // Fill remaining 8 characters
        for (int i = 0; i < 8; i++) {
            sb.append(PASSWORD_CHARS.charAt(SECURE_RANDOM.nextInt(PASSWORD_CHARS.length())));
        }
        // Shuffle the result so required chars are not always at the start
        char[] arr = sb.toString().toCharArray();
        for (int i = arr.length - 1; i > 0; i--) {
            int j = SECURE_RANDOM.nextInt(i + 1);
            char tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
        }
        return new String(arr);
    }

    // ==================== CREATE USER ====================

    @Transactional
    public ApiResponse<UserResponse> createUser(UserCreateRequest request) {
        log.info("Creating user: {}", request.getUsername());

        // Check if username exists among non-deleted users only
        if (userRepository.existsByUsernameAndDeletedAtIsNull(request.getUsername())) {
            throw new DuplicateResourceException("User", "username", request.getUsername());
        }

        // Check if email exists among non-deleted users only
        if (userRepository.existsByEmailAndDeletedAtIsNull(request.getEmail())) {
            throw new DuplicateResourceException("User", "email", request.getEmail());
        }

        // Auto-generate password if not provided
        String rawPassword = (request.getPassword() != null && !request.getPassword().isBlank())
                ? request.getPassword()
                : generateSecurePassword();

        // If a soft-deleted user with this username or email exists, restore it instead of inserting a new row
        // (the DB has a unique constraint so a second INSERT would fail)
        User user = userRepository.findByUsernameAndDeletedAtIsNotNull(request.getUsername())
                .or(() -> userRepository.findByEmailAndDeletedAtIsNotNull(request.getEmail()))
                .orElse(null);

        if (user != null) {
            // Restore the soft-deleted record with the new details
            user.setUsername(request.getUsername());
            user.setEmail(request.getEmail());
            user.setPasswordHash(passwordEncoder.encode(rawPassword));
            user.setFirstName(request.getFirstName());
            user.setLastName(request.getLastName());
            user.setPhoneNumber(request.getPhoneNumber());
            user.setIsActive(request.getIsActive() != null ? request.getIsActive() : true);
            user.setIsEmailVerified(true);
            user.setIsLocked(false);
            user.setFailedLoginAttempts(0);
            user.setDeletedAt(null);  // un-soft-delete
            user.setLockedUntil(null);
        } else {
            user = User.builder()
                    .username(request.getUsername())
                    .email(request.getEmail())
                    .passwordHash(passwordEncoder.encode(rawPassword))
                    .firstName(request.getFirstName())
                    .lastName(request.getLastName())
                    .phoneNumber(request.getPhoneNumber())
                    .isActive(request.getIsActive() != null ? request.getIsActive() : true)
                    .isEmailVerified(true)  // Admin-created accounts are pre-verified
                    .isPhoneVerified(false)
                    .mfaEnabled(false)
                    .failedLoginAttempts(0)
                    .build();
        }

        // Assign roles — prefer roleIds (UUIDs), fall back to role names, then default USER role
        if (request.getRoleIds() != null && !request.getRoleIds().isEmpty()) {
            Set<Role> roles = new HashSet<>(roleRepository.findAllById(request.getRoleIds()));
            if (!roles.isEmpty()) {
                user.setRoles(roles);
            } else {
                assignDefaultRole(user);
            }
        } else if (request.getRoles() != null && !request.getRoles().isEmpty()) {
            // Resolve by role name (e.g. "ADMIN", "MANAGER")
            Set<Role> roles = new HashSet<>();
            for (String roleName : request.getRoles()) {
                // Normalise: strip ROLE_ prefix if frontend sent it, uppercase
                String normalised = roleName.toUpperCase().replaceAll("^ROLE_", "");
                roleRepository.findByName(normalised).ifPresent(roles::add);
            }
            if (!roles.isEmpty()) {
                user.setRoles(roles);
            } else {
                assignDefaultRole(user);
            }
        } else {
            assignDefaultRole(user);
        }

        user = userRepository.save(user);

        // Determine assigned role name for the email (first role, fallback to "USER")
        String roleName = user.getRoles().stream()
                .map(Role::getName)
                .findFirst()
                .orElse("USER");

        // Send account-created email with credentials (non-blocking: log errors, don't fail transaction)
        try {
            emailService.sendAccountCreatedEmail(
                    user.getEmail(),
                    user.getUsername(),
                    user.getFirstName(),
                    rawPassword,
                    roleName
            );
        } catch (Exception ex) {
            log.error("Failed to send account-created email to {}: {}", user.getEmail(), ex.getMessage(), ex);
        }

        // Publish event
        userEventPublisher.publishUserCreated(UserCreatedEvent.builder()
                .userId(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .roles(user.getRoles().stream().map(Role::getName).collect(Collectors.toSet()))
                .createdBy(securityContextHelper.getCurrentUsername())
                .createdAt(LocalDateTime.now())
                .build());

        log.info("User created successfully: {}", user.getUsername());

        return ApiResponse.success("User created successfully", mapToUserResponse(user));
    }

    // ==================== GET USER ====================

    @Transactional(readOnly = true)
    public UserResponse getUserById(String id) {
        log.debug("Getting user by id: {}", id);

        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));

        return mapToUserResponse(user);
    }

    @Transactional(readOnly = true)
    public UserResponse getUserByUsername(String username) {
        log.debug("Getting user by username: {}", username);

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", username));

        return mapToUserResponse(user);
    }

    @Transactional(readOnly = true)
    public PageResponse<UserResponse> getAllUsers(int page, int size, String sortBy, String sortDirection) {
        log.debug("Getting all users - page: {}, size: {}", page, size);

        Sort.Direction direction = sortDirection.equalsIgnoreCase("ASC") ?
                Sort.Direction.ASC : Sort.Direction.DESC;

        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));
        Page<User> userPage = userRepository.findByDeletedAtIsNull(pageable);

        List<UserResponse> content = userPage.getContent().stream()
                .map(this::mapToUserResponse)
                .collect(Collectors.toList());

        return PageResponse.<UserResponse>builder()
                .content(content)
                .pageNumber(userPage.getNumber())
                .pageSize(userPage.getSize())
                .totalElements(userPage.getTotalElements())
                .totalPages(userPage.getTotalPages())
                .isLast(userPage.isLast())
                .build();
    }

    @Transactional(readOnly = true)
    public PageResponse<UserResponse> getActiveUsers(int page, int size) {
        log.debug("Getting active users - page: {}, size: {}", page, size);

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.ASC, "username"));
        Page<User> userPage = userRepository.findAll(pageable);

        List<UserResponse> content = userPage.getContent().stream()
                .filter(User::getIsActive)
                .map(this::mapToUserResponse)
                .collect(Collectors.toList());

        return PageResponse.<UserResponse>builder()
                .content(content)
                .pageNumber(userPage.getNumber())
                .pageSize(userPage.getSize())
                .totalElements((long) content.size())
                .totalPages(userPage.getTotalPages())
                .isLast(userPage.isLast())
                .build();
    }

    // ==================== UPDATE USER ====================

    @Transactional
    public ApiResponse<UserResponse> updateUser(String id, UserUpdateRequest request) {
        log.info("Updating user: {}", id);

        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));

        // Update email if changed
        if (request.getEmail() != null && !request.getEmail().equals(user.getEmail())) {
            if (userRepository.existsByEmailAndDeletedAtIsNull(request.getEmail())) {
                throw new DuplicateResourceException("User", "email", request.getEmail());
            }
            user.setEmail(request.getEmail());
            user.setIsEmailVerified(false); // Require re-verification
        }

        // Update other fields
        if (request.getFirstName() != null) user.setFirstName(request.getFirstName());
        if (request.getLastName() != null) user.setLastName(request.getLastName());
        if (request.getPhoneNumber() != null) user.setPhoneNumber(request.getPhoneNumber());
        if (request.getLanguage() != null) user.setLanguage(request.getLanguage());
        if (request.getTimezone() != null) user.setTimezone(request.getTimezone());
        if (request.getProfileImageUrl() != null) user.setProfileImageUrl(request.getProfileImageUrl());
        if (request.getMetadata() != null) user.setMetadata(request.getMetadata());

        user = userRepository.save(user);

        log.info("User updated successfully: {}", user.getUsername());

        return ApiResponse.success("User updated successfully", mapToUserResponse(user));
    }

    // ==================== CHANGE PASSWORD ====================

    @Transactional
    public ApiResponse<Void> changePassword(String userId, ChangePasswordRequest request) {
        log.info("Changing password for user: {}", userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        // Verify current password
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            log.warn("Invalid current password for user: {}", userId);
            throw new InvalidCredentialsException("Current password is incorrect");
        }

        // Check if new password is same as current
        if (passwordEncoder.matches(request.getNewPassword(), user.getPasswordHash())) {
            throw new IllegalArgumentException("New password must be different from current password");
        }

        // Update password
        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        user.setLastPasswordChange(LocalDateTime.now());
        userRepository.save(user);

        log.info("Password changed successfully for user: {}", user.getUsername());

        return ApiResponse.success("Password changed successfully", null);
    }

    // ==================== DELETE USER ====================

    @Transactional
    public ApiResponse<Void> deleteUser(String id) {
        log.info("Deleting user: {}", id);

        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));

        // Soft delete
        user.setIsActive(false);
        user.setDeletedAt(LocalDateTime.now());
        userRepository.save(user);

        log.info("User deleted successfully: {}", user.getUsername());

        return ApiResponse.success("User deleted successfully", null);
    }

    // ==================== USER ACTIVATION ====================

    @Transactional
    public ApiResponse<Void> activateUser(String id) {
        log.info("Activating user: {}", id);

        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));

        user.setIsActive(true);
        user.setDeletedAt(null);
        userRepository.save(user);

        log.info("User activated successfully: {}", user.getUsername());

        return ApiResponse.success("User activated successfully", null);
    }

    @Transactional
    public ApiResponse<Void> deactivateUser(String id) {
        log.info("Deactivating user: {}", id);

        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));

        user.setIsActive(false);
        userRepository.save(user);

        log.info("User deactivated successfully: {}", user.getUsername());

        return ApiResponse.success("User deactivated successfully", null);
    }

    // ==================== ACCOUNT LOCK ====================

    @Transactional
    public ApiResponse<Void> lockUser(String id) {
        log.info("Locking user: {}", id);

        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));

        user.lock(0); // Lock indefinitely
        userRepository.save(user);

        log.info("User locked successfully: {}", user.getUsername());

        return ApiResponse.success("User locked successfully", null);
    }

    @Transactional
    public ApiResponse<Void> unlockUser(String id) {
        log.info("Unlocking user: {}", id);

        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));

        user.unlock();
        userRepository.save(user);

        log.info("User unlocked successfully: {}", user.getUsername());

        return ApiResponse.success("User unlocked successfully", null);
    }

    // ==================== ROLE MANAGEMENT ====================

    @Transactional
    public ApiResponse<UserResponse> assignRoles(String userId, UserRoleAssignRequest request) {
        log.info("Assigning roles to user: {}", userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        Set<Role> roles = new HashSet<>(roleRepository.findAllById(request.getRoleIds()));

        if (roles.size() != request.getRoleIds().size()) {
            throw new ResourceNotFoundException("Some roles not found");
        }

        user.getRoles().addAll(roles);
        user = userRepository.save(user);

        log.info("Roles assigned successfully to user: {}", user.getUsername());

        return ApiResponse.success("Roles assigned successfully", mapToUserResponse(user));
    }

    @Transactional
    public ApiResponse<UserResponse> removeRole(String userId, String roleId) {
        log.info("Removing role {} from user: {}", roleId, userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> new ResourceNotFoundException("Role", "id", roleId));

        user.getRoles().remove(role);
        user = userRepository.save(user);

        log.info("Role removed successfully from user: {}", user.getUsername());

        return ApiResponse.success("Role removed successfully", mapToUserResponse(user));
    }

    // ==================== HELPER METHODS ====================

    public void assignDefaultRole(User user) {
        Role userRole = roleRepository.findByName("USER")
                .orElseGet(() -> {
                    Role newRole = Role.builder()
                            .name("USER")
                            .description("Default user role")
                            .isSystem(true)
                            .build();
                    return roleRepository.save(newRole);
                });

        Set<Role> roles = new HashSet<>();
        roles.add(userRole);
        user.setRoles(roles);
    }

    public UserResponse mapToUserResponse(User user) {
        Set<String> roleNames = user.getRoles().stream()
                .map(Role::getName)
                .collect(Collectors.toSet());

        Set<String> permissions = user.getRoles().stream()
                .flatMap(role -> role.getPermissions().stream())
                .map(permission -> permission.getName())
                .collect(Collectors.toSet());

        return UserResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .phoneNumber(user.getPhoneNumber())
                .profileImageUrl(user.getProfileImageUrl())
                .language(user.getLanguage())
                .timezone(user.getTimezone())
                .metadata(user.getMetadata())
                .isActive(user.getIsActive())
                .isLocked(user.getIsLocked())
                .isEmailVerified(user.getIsEmailVerified())
                .isPhoneVerified(user.getIsPhoneVerified())
                .mfaEnabled(user.getMfaEnabled())
                .lastLogin(user.getLastLogin())
                .roles(roleNames)
                .permissions(permissions)
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }
}
