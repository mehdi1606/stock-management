package com.stock.authservice.repository;

import com.stock.authservice.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, String> {

    Optional<User> findByUsername(String username);

    Optional<User> findByEmail(String email);

    Optional<User> findByUsernameOrEmail(String username, String email);

    Boolean existsByUsername(String username);

    Boolean existsByEmail(String email);

    /** Check duplicate only among non-deleted users */
    Boolean existsByUsernameAndDeletedAtIsNull(String username);

    Boolean existsByEmailAndDeletedAtIsNull(String email);

    List<User> findByIsActive(Boolean isActive);

    List<User> findByIsLocked(Boolean isLocked);

    @Query("SELECT u FROM User u WHERE u.isActive = true AND u.isLocked = false")
    List<User> findActiveAndUnlockedUsers();

    @Query("SELECT u FROM User u WHERE u.lockedUntil IS NOT NULL AND u.lockedUntil < :now")
    List<User> findUsersWithExpiredLocks(@Param("now") LocalDateTime now);

    @Query("SELECT u FROM User u WHERE u.passwordExpiresAt IS NOT NULL AND u.passwordExpiresAt < :now")
    List<User> findUsersWithExpiredPasswords(@Param("now") LocalDateTime now);

    @Query("SELECT u FROM User u JOIN u.roles r WHERE r.name = :roleName")
    List<User> findByRoleName(@Param("roleName") String roleName);

    @Query("SELECT COUNT(u) FROM User u WHERE u.isActive = true")
    Long countActiveUsers();

    @Query("SELECT COUNT(u) FROM User u WHERE u.isLocked = true")
    Long countLockedUsers();

    /** Returns only non-soft-deleted users (deletedAt IS NULL). */
    Page<User> findByDeletedAtIsNull(Pageable pageable);

    /** Find a soft-deleted user by username (to restore instead of re-inserting). */
    Optional<User> findByUsernameAndDeletedAtIsNotNull(String username);

    /** Find a soft-deleted user by email (to restore instead of re-inserting). */
    Optional<User> findByEmailAndDeletedAtIsNotNull(String email);
}
