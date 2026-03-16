package com.stock.inventoryservice.controller;

import com.stock.inventoryservice.dto.SerialDTO;
import com.stock.inventoryservice.dto.request.SerialCreateRequest;
import com.stock.inventoryservice.dto.request.SerialUpdateRequest;
import com.stock.inventoryservice.service.SerialService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/serials")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Serials", description = "Serial number management endpoints for serialized item tracking")
public class SerialController {

    private final SerialService serialService;

    // ========== CRUD OPERATIONS ==========

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER', 'MANAGER', 'SUPERVISOR')")
    @Operation(summary = "Create serial", description = "Create a new serial number record")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Serial created successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid input"),
            @ApiResponse(responseCode = "409", description = "Serial already exists")
    })
    public ResponseEntity<SerialDTO> createSerial(@Valid @RequestBody SerialCreateRequest request) {
        log.info("REST request to create serial with code: {}", request.getCode());

        SerialDTO created = serialService.createSerial(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER', 'MANAGER', 'QUALITY_MANAGER', 'SUPERVISOR', 'OPERATOR', 'PROCUREMENT', 'AUDITOR', 'USER')")
    @Operation(summary = "Get serial by ID", description = "Retrieve serial details by ID")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Serial found"),
            @ApiResponse(responseCode = "404", description = "Serial not found")
    })
    public ResponseEntity<SerialDTO> getSerialById(
            @Parameter(description = "Serial ID", required = true)
            @PathVariable String id) {
        log.info("REST request to get serial: {}", id);

        SerialDTO serial = serialService.getSerialById(id);
        return ResponseEntity.ok(serial);
    }

    @GetMapping("/code/{code}")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER', 'MANAGER', 'QUALITY_MANAGER', 'SUPERVISOR', 'OPERATOR', 'PROCUREMENT', 'AUDITOR', 'USER')")
    @Operation(summary = "Get serial by code", description = "Retrieve serial by business code")
    public ResponseEntity<SerialDTO> getSerialByCode(@PathVariable String code) {
        log.info("REST request to get serial by code: {}", code);

        SerialDTO serial = serialService.getSerialByCode(code);
        return ResponseEntity.ok(serial);
    }

    @GetMapping("/number/{serialNumber}")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER', 'MANAGER', 'QUALITY_MANAGER', 'SUPERVISOR', 'OPERATOR', 'PROCUREMENT', 'AUDITOR', 'USER')")
    @Operation(summary = "Get serial by serial number", description = "Retrieve serial by serial number")
    public ResponseEntity<SerialDTO> getSerialBySerialNumber(@PathVariable String serialNumber) {
        log.info("REST request to get serial by serial number: {}", serialNumber);

        SerialDTO serial = serialService.getSerialBySerialNumber(serialNumber);
        return ResponseEntity.ok(serial);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER', 'MANAGER', 'QUALITY_MANAGER', 'SUPERVISOR', 'OPERATOR', 'PROCUREMENT', 'AUDITOR', 'USER')")
    @Operation(summary = "Get all serials", description = "Retrieve all serial number records")
    @ApiResponse(responseCode = "200", description = "List of serials retrieved")
    public ResponseEntity<List<SerialDTO>> getAllSerials() {
        log.info("REST request to get all serials");

        List<SerialDTO> serials = serialService.getAllSerials();
        return ResponseEntity.ok(serials);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER', 'MANAGER')")
    @Operation(summary = "Update serial", description = "Update an existing serial record")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Serial updated successfully"),
            @ApiResponse(responseCode = "404", description = "Serial not found")
    })
    public ResponseEntity<SerialDTO> updateSerial(
            @PathVariable String id,
            @Valid @RequestBody SerialUpdateRequest request) {
        log.info("REST request to update serial: {}", id);

        SerialDTO updated = serialService.updateSerial(id, request);
        return ResponseEntity.ok(updated);
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER', 'MANAGER')")
    @Operation(summary = "Update serial status", description = "Update only the status of a serial")
    @ApiResponse(responseCode = "200", description = "Serial status updated successfully")
    public ResponseEntity<SerialDTO> updateSerialStatus(
            @PathVariable String id,
            @Parameter(description = "New status (IN_STOCK, SOLD, DEFECTIVE, RETURNING, SCRAPPED)")
            @RequestParam String status) {
        log.info("REST request to update serial status: {} to {}", id, status);

        SerialDTO updated = serialService.updateSerialStatus(id, status);
        return ResponseEntity.ok(updated);
    }

    @PatchMapping("/{id}/location")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER', 'MANAGER', 'OPERATOR')")
    @Operation(summary = "Update serial location", description = "Update the location of a serial")
    @ApiResponse(responseCode = "200", description = "Serial location updated successfully")
    public ResponseEntity<SerialDTO> updateSerialLocation(
            @PathVariable String id,
            @Parameter(description = "New location ID")
            @RequestParam String locationId) {
        log.info("REST request to update serial location: {} to location: {}", id, locationId);

        SerialDTO updated = serialService.updateSerialLocation(id, locationId);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Delete serial", description = "Delete a serial record")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "Serial deleted successfully"),
            @ApiResponse(responseCode = "404", description = "Serial not found")
    })
    public ResponseEntity<Void> deleteSerial(@PathVariable String id) {
        log.info("REST request to delete serial: {}", id);

        serialService.deleteSerial(id);
        return ResponseEntity.noContent().build();
    }

    // ========== QUERY OPERATIONS ==========

    @GetMapping("/item/{itemId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER', 'MANAGER', 'QUALITY_MANAGER', 'SUPERVISOR', 'OPERATOR', 'PROCUREMENT', 'AUDITOR', 'USER')")
    @Operation(summary = "Get serials by item", description = "Retrieve all serials for a specific item")
    public ResponseEntity<List<SerialDTO>> getSerialsByItem(@PathVariable String itemId) {
        log.info("REST request to get serials for item: {}", itemId);

        List<SerialDTO> serials = serialService.getSerialsByItemId(itemId);
        return ResponseEntity.ok(serials);
    }

    @GetMapping("/lot/{lotId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER', 'MANAGER', 'QUALITY_MANAGER', 'SUPERVISOR', 'OPERATOR', 'PROCUREMENT', 'AUDITOR', 'USER')")
    @Operation(summary = "Get serials by lot", description = "Retrieve all serials for a specific lot")
    public ResponseEntity<List<SerialDTO>> getSerialsByLot(@PathVariable String lotId) {
        log.info("REST request to get serials for lot: {}", lotId);

        List<SerialDTO> serials = serialService.getSerialsByLotId(lotId);
        return ResponseEntity.ok(serials);
    }

    @GetMapping("/location/{locationId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER', 'MANAGER', 'QUALITY_MANAGER', 'SUPERVISOR', 'OPERATOR', 'PROCUREMENT', 'AUDITOR', 'USER')")
    @Operation(summary = "Get serials by location", description = "Retrieve all serials at a specific location")
    public ResponseEntity<List<SerialDTO>> getSerialsByLocation(@PathVariable String locationId) {
        log.info("REST request to get serials for location: {}", locationId);

        List<SerialDTO> serials = serialService.getSerialsByLocationId(locationId);
        return ResponseEntity.ok(serials);
    }

    @GetMapping("/status/{status}")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER', 'MANAGER', 'QUALITY_MANAGER', 'SUPERVISOR', 'OPERATOR', 'PROCUREMENT', 'AUDITOR', 'USER')")
    @Operation(summary = "Get serials by status", description = "Retrieve serials by status")
    public ResponseEntity<List<SerialDTO>> getSerialsByStatus(
            @Parameter(description = "Serial status")
            @PathVariable String status) {
        log.info("REST request to get serials with status: {}", status);

        List<SerialDTO> serials = serialService.getSerialsByStatus(status);
        return ResponseEntity.ok(serials);
    }

    @GetMapping("/item/{itemId}/status/{status}")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER', 'MANAGER', 'QUALITY_MANAGER', 'SUPERVISOR', 'OPERATOR', 'PROCUREMENT', 'AUDITOR', 'USER')")
    @Operation(summary = "Get serials by item and status", description = "Retrieve serials for an item with specific status")
    public ResponseEntity<List<SerialDTO>> getSerialsByItemAndStatus(
            @PathVariable String itemId,
            @PathVariable String status) {
        log.info("REST request to get serials for item: {} with status: {}", itemId, status);

        List<SerialDTO> serials = serialService.getSerialsByItemIdAndStatus(itemId, status);
        return ResponseEntity.ok(serials);
    }

    @GetMapping("/item/{itemId}/available")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER', 'MANAGER', 'QUALITY_MANAGER', 'SUPERVISOR', 'OPERATOR', 'PROCUREMENT', 'AUDITOR', 'USER')")
    @Operation(summary = "Get available serials for item", description = "Retrieve available (IN_STOCK) serials for an item")
    public ResponseEntity<List<SerialDTO>> getAvailableSerials(@PathVariable String itemId) {
        log.info("REST request to get available serials for item: {}", itemId);

        List<SerialDTO> serials = serialService.getAvailableSerials(itemId);
        return ResponseEntity.ok(serials);
    }

    // ========== UTILITY OPERATIONS ==========

    @GetMapping("/lot/{lotId}/count")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER', 'MANAGER', 'QUALITY_MANAGER', 'SUPERVISOR', 'OPERATOR', 'PROCUREMENT', 'AUDITOR', 'USER')")
    @Operation(summary = "Count serials by lot", description = "Get total number of serials for a lot")
    public ResponseEntity<Long> countSerialsByLot(@PathVariable String lotId) {
        log.info("REST request to count serials for lot: {}", lotId);

        Long count = serialService.countSerialsByLot(lotId);
        return ResponseEntity.ok(count);
    }

    @GetMapping("/item/{itemId}/count")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER', 'MANAGER', 'QUALITY_MANAGER', 'SUPERVISOR', 'OPERATOR', 'PROCUREMENT', 'AUDITOR', 'USER')")
    @Operation(summary = "Count serials by item", description = "Get total number of serials for an item")
    public ResponseEntity<Long> countSerialsByItem(@PathVariable String itemId) {
        log.info("REST request to count serials for item: {}", itemId);

        Long count = serialService.countSerialsByItem(itemId);
        return ResponseEntity.ok(count);
    }

    @GetMapping("/number/{serialNumber}/available")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER', 'MANAGER', 'QUALITY_MANAGER', 'SUPERVISOR', 'OPERATOR', 'PROCUREMENT', 'AUDITOR', 'USER')")
    @Operation(summary = "Check if serial is available", description = "Check if a serial number is available (IN_STOCK)")
    public ResponseEntity<Boolean> isSerialAvailable(@PathVariable String serialNumber) {
        log.info("REST request to check availability of serial: {}", serialNumber);

        boolean available = serialService.isSerialAvailable(serialNumber);
        return ResponseEntity.ok(available);
    }
}