package com.stock.inventoryservice.controller;

import com.stock.inventoryservice.dto.LotDTO;
import com.stock.inventoryservice.dto.request.LotCreateRequest;
import com.stock.inventoryservice.dto.request.LotUpdateRequest;
import com.stock.inventoryservice.service.LotService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/lots")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Lots", description = "Lot management endpoints for batch tracking")
public class LotController {

    private final LotService lotService;

    // ========== CRUD OPERATIONS ==========

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER', 'MANAGER', 'SUPERVISOR', 'PROCUREMENT')")
    @Operation(summary = "Create lot", description = "Create a new lot/batch record")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Lot created successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid input"),
            @ApiResponse(responseCode = "409", description = "Lot already exists")
    })
    public ResponseEntity<LotDTO> createLot(@Valid @RequestBody LotCreateRequest request) {
        log.info("REST request to create lot with code: {}", request.getCode());

        LotDTO created = lotService.createLot(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER', 'MANAGER', 'QUALITY_MANAGER', 'SUPERVISOR', 'OPERATOR', 'PROCUREMENT', 'AUDITOR', 'USER')")
    @Operation(summary = "Get lot by ID", description = "Retrieve lot details by ID")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Lot found"),
            @ApiResponse(responseCode = "404", description = "Lot not found")
    })
    public ResponseEntity<LotDTO> getLotById(
            @Parameter(description = "Lot ID", required = true)
            @PathVariable String id) {
        log.info("REST request to get lot: {}", id);

        LotDTO lot = lotService.getLotById(id);
        return ResponseEntity.ok(lot);
    }

    @GetMapping("/code/{code}")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER', 'MANAGER', 'QUALITY_MANAGER', 'SUPERVISOR', 'OPERATOR', 'PROCUREMENT', 'AUDITOR', 'USER')")
    @Operation(summary = "Get lot by code", description = "Retrieve lot by business code")
    public ResponseEntity<LotDTO> getLotByCode(@PathVariable String code) {
        log.info("REST request to get lot by code: {}", code);

        LotDTO lot = lotService.getLotByCode(code);
        return ResponseEntity.ok(lot);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER', 'MANAGER', 'QUALITY_MANAGER', 'SUPERVISOR', 'OPERATOR', 'PROCUREMENT', 'AUDITOR', 'USER')")
    @Operation(summary = "Get all lots", description = "Retrieve all lot records")
    @ApiResponse(responseCode = "200", description = "List of lots retrieved")
    public ResponseEntity<List<LotDTO>> getAllLots() {
        log.info("REST request to get all lots");

        List<LotDTO> lots = lotService.getAllLots();
        return ResponseEntity.ok(lots);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER', 'MANAGER')")
    @Operation(summary = "Update lot", description = "Update an existing lot record")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Lot updated successfully"),
            @ApiResponse(responseCode = "404", description = "Lot not found")
    })
    public ResponseEntity<LotDTO> updateLot(
            @PathVariable String id,
            @Valid @RequestBody LotUpdateRequest request) {
        log.info("REST request to update lot: {}", id);

        LotDTO updated = lotService.updateLot(id, request);
        return ResponseEntity.ok(updated);
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER', 'MANAGER')")
    @Operation(summary = "Update lot status", description = "Update only the status of a lot")
    @ApiResponse(responseCode = "200", description = "Lot status updated successfully")
    public ResponseEntity<LotDTO> updateLotStatus(
            @PathVariable String id,
            @Parameter(description = "New status (ACTIVE, QUARANTINED, EXPIRED, RECALLED)")
            @RequestParam String status) {
        log.info("REST request to update lot status: {} to {}", id, status);

        LotDTO updated = lotService.updateLotStatus(id, status);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Delete lot", description = "Delete a lot record")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "Lot deleted successfully"),
            @ApiResponse(responseCode = "404", description = "Lot not found")
    })
    public ResponseEntity<Void> deleteLot(@PathVariable String id) {
        log.info("REST request to delete lot: {}", id);

        lotService.deleteLot(id);
        return ResponseEntity.noContent().build();
    }

    // ========== QUERY OPERATIONS ==========

    @GetMapping("/item/{itemId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER', 'MANAGER', 'QUALITY_MANAGER', 'SUPERVISOR', 'OPERATOR', 'PROCUREMENT', 'AUDITOR', 'USER')")
    @Operation(summary = "Get lots by item", description = "Retrieve all lots for a specific item")
    public ResponseEntity<List<LotDTO>> getLotsByItem(@PathVariable String itemId) {
        log.info("REST request to get lots for item: {}", itemId);

        List<LotDTO> lots = lotService.getLotsByItemId(itemId);
        return ResponseEntity.ok(lots);
    }

    @GetMapping("/supplier/{supplierId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER', 'MANAGER', 'QUALITY_MANAGER', 'SUPERVISOR', 'OPERATOR', 'PROCUREMENT', 'AUDITOR', 'USER')")
    @Operation(summary = "Get lots by supplier", description = "Retrieve all lots from a specific supplier")
    public ResponseEntity<List<LotDTO>> getLotsBySupplier(@PathVariable String supplierId) {
        log.info("REST request to get lots for supplier: {}", supplierId);

        List<LotDTO> lots = lotService.getLotsBySupplierId(supplierId);
        return ResponseEntity.ok(lots);
    }

    @GetMapping("/status/{status}")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER', 'MANAGER', 'QUALITY_MANAGER', 'SUPERVISOR', 'OPERATOR', 'PROCUREMENT', 'AUDITOR', 'USER')")
    @Operation(summary = "Get lots by status", description = "Retrieve lots by status (ACTIVE, QUARANTINED, etc.)")
    public ResponseEntity<List<LotDTO>> getLotsByStatus(
            @Parameter(description = "Lot status")
            @PathVariable String status) {
        log.info("REST request to get lots with status: {}", status);

        List<LotDTO> lots = lotService.getLotsByStatus(status);
        return ResponseEntity.ok(lots);
    }

    @GetMapping("/expired")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER', 'MANAGER', 'QUALITY_MANAGER', 'SUPERVISOR', 'OPERATOR', 'PROCUREMENT', 'AUDITOR', 'USER')")
    @Operation(summary = "Get expired lots", description = "Retrieve all expired lots")
    @ApiResponse(responseCode = "200", description = "List of expired lots")
    public ResponseEntity<List<LotDTO>> getExpiredLots() {
        log.info("REST request to get expired lots");

        List<LotDTO> lots = lotService.getExpiredLots();
        return ResponseEntity.ok(lots);
    }

    @GetMapping("/expiring")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER', 'MANAGER', 'QUALITY_MANAGER', 'SUPERVISOR', 'OPERATOR', 'PROCUREMENT', 'AUDITOR', 'USER')")
    @Operation(summary = "Get lots expiring in date range", description = "Retrieve lots expiring between dates")
    public ResponseEntity<List<LotDTO>> getLotsExpiringBetween(
            @Parameter(description = "Start date (YYYY-MM-DD)")
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @Parameter(description = "End date (YYYY-MM-DD)")
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        log.info("REST request to get lots expiring between {} and {}", startDate, endDate);

        List<LotDTO> lots = lotService.getLotsExpiringBetween(startDate, endDate);
        return ResponseEntity.ok(lots);
    }

    @GetMapping("/item/{itemId}/active")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER', 'MANAGER', 'QUALITY_MANAGER', 'SUPERVISOR', 'OPERATOR', 'PROCUREMENT', 'AUDITOR', 'USER')")
    @Operation(summary = "Get active lots for item", description = "Retrieve only active (non-expired) lots for an item")
    public ResponseEntity<List<LotDTO>> getActiveLotsForItem(@PathVariable String itemId) {
        log.info("REST request to get active lots for item: {}", itemId);

        List<LotDTO> lots = lotService.getActiveLotsForItem(itemId);
        return ResponseEntity.ok(lots);
    }

    // ========== UTILITY OPERATIONS ==========

    @GetMapping("/item/{itemId}/count")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER', 'MANAGER', 'QUALITY_MANAGER', 'SUPERVISOR', 'OPERATOR', 'PROCUREMENT', 'AUDITOR', 'USER')")
    @Operation(summary = "Count lots by item", description = "Get total number of lots for an item")
    public ResponseEntity<Long> countLotsByItem(@PathVariable String itemId) {
        log.info("REST request to count lots for item: {}", itemId);

        Long count = lotService.countLotsByItem(itemId);
        return ResponseEntity.ok(count);
    }

    @GetMapping("/{lotId}/is-expired")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER', 'MANAGER', 'QUALITY_MANAGER', 'SUPERVISOR', 'OPERATOR', 'PROCUREMENT', 'AUDITOR', 'USER')")
    @Operation(summary = "Check if lot is expired", description = "Check expiry status of a lot")
    public ResponseEntity<Boolean> isLotExpired(@PathVariable String lotId) {
        log.info("REST request to check if lot is expired: {}", lotId);

        boolean expired = lotService.isLotExpired(lotId);
        return ResponseEntity.ok(expired);
    }
}
