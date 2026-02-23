package com.stock.authservice.config;

import com.stock.authservice.entity.Role;
import com.stock.authservice.entity.User;
import com.stock.authservice.repository.RoleRepository;
import com.stock.authservice.repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Set;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements ApplicationRunner {

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        initializeRoles();
        initializeAdminUser();
    }

    private static final Object[][] SYSTEM_ROLES = {
            {"ADMIN",             "Full system access"},
            {"USER",              "Default user role"},
            {"MANAGER",           "Broad access except user and permission management"},
            {"WAREHOUSE_MANAGER", "Full warehouse, inventory and movement control"},
            {"QUALITY_MANAGER",   "Quality control and quarantine management"},
            {"SUPERVISOR",        "Supervise operations, approve movements"},
            {"OPERATOR",          "Day-to-day operational tasks"},
            {"PROCUREMENT",       "Product and lot creation for purchasing"},
            {"AUDITOR",           "Read-only audit access"},
    };

    private void initializeRoles() {
        for (Object[] roleData : SYSTEM_ROLES) {
            String name = (String) roleData[0];
            String description = (String) roleData[1];
            if (roleRepository.findByName(name).isEmpty()) {
                Role role = Role.builder()
                        .name(name)
                        .description(description)
                        .isSystem(true)
                        .isActive(true)
                        .build();
                roleRepository.save(role);
                log.info("Role created: {}", name);
            }
        }
    }

    private void initializeAdminUser() {
        if (userRepository.findByUsername("admin").isEmpty()) {
            Role adminRole = roleRepository.findByName("ADMIN")
                    .orElseThrow();

            User admin = User.builder()
                    .username("admin")
                    .email("admin@stock.com")
                    .passwordHash(passwordEncoder.encode("Admin@123"))
                    .firstName("System")
                    .lastName("Administrator")
                    .isActive(true)
                    .isEmailVerified(true)
                    .mfaEnabled(false)
                    .failedLoginAttempts(0)
                    .roles(Set.of(adminRole))
                    .build();

            userRepository.save(admin);
            log.info("Admin user created: admin / Admin@123");
        }
    }
}
