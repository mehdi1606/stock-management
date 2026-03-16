package com.stock.qualityservice.controller;

import com.stock.qualityservice.dto.request.QuarantineRequest;
import com.stock.qualityservice.dto.request.QuarantineUpdateRequest;
import com.stock.qualityservice.dto.response.QuarantineResponse;
import com.stock.qualityservice.service.QuarantineService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/quality/quarantine")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Quarantine", description = "Quarantine Management APIs")
public class QuarantineController {

    private final QuarantineService quarantineService;

    @PostMapping
    @PreAuthorize("hasAnyRole('QUALITY_MANAGER', 'QUALITY_INSPECTOR', 'ADMIN')")
    @Operation(summary = "Create quarantine", description = "Create a new quarantine record")
    public ResponseEntity<QuarantineResponse> createQuarantine(
            @Valid @RequestBody QuarantineRequest request) {
        log.info("Creating quarantine for product: {}", request.getItemId());
        QuarantineResponse response = quarantineService.createQuarantine(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('QUALITY_MANAGER', 'QUALITY_INSPECTOR', 'WAREHOUSE_MANAGER', 'ADMIN', 'MANAGER', 'SUPERVISOR', 'AUDITOR')")
    @Operation(summary = "Get quarantine by ID")
    public ResponseEntity<QuarantineResponse> getQuarantineById(@PathVariable String id) {
        log.info("Fetching quarantine with ID: {}", id);
        QuarantineResponse response = quarantineService.getQuarantineById(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('QUALITY_MANAGER', 'QUALITY_INSPECTOR', 'WAREHOUSE_MANAGER', 'ADMIN', 'MANAGER', 'SUPERVISOR', 'AUDITOR')")
    @Operation(summary = "Get all quarantines")
    public ResponseEntity<Page<QuarantineResponse>> getAllQuarantines(Pageable pageable) {
        log.info("Fetching all quarantines with pagination");
        Page<QuarantineResponse> response = quarantineService.getAllQuarantines(pageable);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/product/{productId}")
    @PreAuthorize("hasAnyRole('QUALITY_MANAGER', 'QUALITY_INSPECTOR', 'WAREHOUSE_MANAGER', 'ADMIN', 'MANAGER', 'SUPERVISOR', 'AUDITOR')")
    @Operation(summary = "Get quarantines by product ID")
    public ResponseEntity<List<QuarantineResponse>> getQuarantinesByProductId(@PathVariable String productId) {
        log.info("Fetching quarantines for product: {}", productId);
        List<QuarantineResponse> response = quarantineService.getQuarantinesByItemId(productId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/quality-control/{qualityControlId}")
    @PreAuthorize("hasAnyRole('QUALITY_MANAGER', 'QUALITY_INSPECTOR', 'WAREHOUSE_MANAGER', 'ADMIN', 'MANAGER', 'SUPERVISOR', 'AUDITOR')")
    @Operation(summary = "Get quarantines by quality control ID")
    public ResponseEntity<List<QuarantineResponse>> getQuarantinesByQualityControlId(
            @PathVariable String qualityControlId) {
        log.info("Fetching quarantines for quality control: {}", qualityControlId);
        List<QuarantineResponse> response = quarantineService.getQuarantinesByQualityControlId(qualityControlId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/status/{status}")
    @PreAuthorize("hasAnyRole('QUALITY_MANAGER', 'QUALITY_INSPECTOR', 'WAREHOUSE_MANAGER', 'ADMIN', 'MANAGER', 'SUPERVISOR', 'AUDITOR')")
    @Operation(summary = "Get quarantines by status")
    public ResponseEntity<Page<QuarantineResponse>> getQuarantinesByStatus(
            @PathVariable String status, Pageable pageable) {
        log.info("Fetching quarantines with status: {}", status);
        Page<QuarantineResponse> response = quarantineService.getQuarantinesByStatus(status, pageable);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/active")
    @PreAuthorize("hasAnyRole('QUALITY_MANAGER', 'QUALITY_INSPECTOR', 'WAREHOUSE_MANAGER', 'ADMIN', 'MANAGER', 'SUPERVISOR', 'AUDITOR')")
    @Operation(summary = "Get active quarantines")
    public ResponseEntity<List<QuarantineResponse>> getActiveQuarantines() {
        log.info("Fetching active quarantines");
        List<QuarantineResponse> response = quarantineService.getActiveQuarantines();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/location/{locationId}")
    @PreAuthorize("hasAnyRole('QUALITY_MANAGER', 'QUALITY_INSPECTOR', 'WAREHOUSE_MANAGER', 'ADMIN', 'MANAGER', 'SUPERVISOR', 'AUDITOR')")
    @Operation(summary = "Get quarantines by location")
    public ResponseEntity<List<QuarantineResponse>> getQuarantinesByLocation(@PathVariable String locationId) {
        log.info("Fetching quarantines for location: {}", locationId);
        List<QuarantineResponse> response = quarantineService.getQuarantinesByLocation(locationId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/expiring-soon")
    @PreAuthorize("hasAnyRole('QUALITY_MANAGER', 'QUALITY_INSPECTOR', 'WAREHOUSE_MANAGER', 'ADMIN', 'MANAGER', 'SUPERVISOR', 'AUDITOR')")
    @Operation(summary = "Get quarantines expiring soon")
    public ResponseEntity<List<QuarantineResponse>> getQuarantinesExpiringSoon(@RequestParam int days) {
        log.info("Fetching quarantines expiring within {} days", days);
        List<QuarantineResponse> response = quarantineService.getQuarantinesExpiringSoon(days);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('QUALITY_MANAGER', 'QUALITY_INSPECTOR', 'ADMIN')")
    @Operation(summary = "Update quarantine")
    public ResponseEntity<QuarantineResponse> updateQuarantine(
            @PathVariable String id,
            @Valid @RequestBody QuarantineUpdateRequest request) {
        log.info("Updating quarantine with ID: {}", id);
        QuarantineResponse response = quarantineService.updateQuarantine(id, request);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('QUALITY_MANAGER', 'ADMIN')")
    @Operation(summary = "Update quarantine status")
    public ResponseEntity<QuarantineResponse> updateQuarantineStatus(
            @PathVariable String id,
            @RequestParam String status) {
        log.info("Updating status for quarantine ID {} to {}", id, status);
        QuarantineResponse response = quarantineService.updateQuarantineStatus(id, status);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{id}/release")
    @PreAuthorize("hasAnyRole('QUALITY_MANAGER', 'ADMIN')")
    @Operation(summary = "Release quarantine")
    public ResponseEntity<QuarantineResponse> releaseQuarantine(
            @PathVariable String id,
            @RequestParam String releaseNotes) {
        log.info("Releasing quarantine with ID: {}", id);
        QuarantineResponse response = quarantineService.releaseQuarantine(id, releaseNotes);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{id}/extend")
    @PreAuthorize("hasAnyRole('QUALITY_MANAGER', 'ADMIN')")
    @Operation(summary = "Extend quarantine period")
    public ResponseEntity<QuarantineResponse> extendQuarantine(
            @PathVariable String id,
            @RequestParam LocalDateTime newEndDate,
            @RequestParam String reason) {
        log.info("Extending quarantine ID {} to {}", id, newEndDate);
        QuarantineResponse response = quarantineService.extendQuarantine(id, newEndDate, reason);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Delete quarantine")
    public ResponseEntity<Void> deleteQuarantine(@PathVariable String id) {
        log.info("Deleting quarantine with ID: {}", id);
        quarantineService.deleteQuarantine(id);
        return ResponseEntity.noContent().build();
    }
}