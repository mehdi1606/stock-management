package com.stock.inventoryservice.controller;

import com.stock.inventoryservice.dto.InventoryDTO;
import com.stock.inventoryservice.dto.InventoryWithItemDTO;
import com.stock.inventoryservice.dto.request.InventoryAdjustmentRequest;
import com.stock.inventoryservice.dto.request.InventoryCreateRequest;
import com.stock.inventoryservice.dto.request.InventoryReserveRequest;
import com.stock.inventoryservice.dto.request.InventoryUpdateRequest;
import com.stock.inventoryservice.service.InventoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
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
@RequestMapping("/api/inventory")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Inventory", description = "Inventory management endpoints")
public class InventoryController {

    private final InventoryService inventoryService;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER', 'MANAGER', 'SUPERVISOR')")
    @Operation(summary = "Create inventory", description = "Create a new inventory record")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Inventory created successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid input"),
            @ApiResponse(responseCode = "409", description = "Inventory already exists")
    })
    public ResponseEntity<InventoryDTO> createInventory(
            @Valid @RequestBody InventoryCreateRequest request) {
        log.info("REST request to create inventory for item: {} at location: {}",
                request.getItemId(), request.getLocationId());

        InventoryDTO created = inventoryService.createInventory(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER', 'MANAGER', 'QUALITY_MANAGER', 'SUPERVISOR', 'OPERATOR', 'PROCUREMENT', 'AUDITOR', 'USER')")
    @Operation(summary = "Get inventory by ID", description = "Retrieve inventory details by ID")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Inventory found"),
            @ApiResponse(responseCode = "404", description = "Inventory not found")
    })
    public ResponseEntity<InventoryDTO> getInventoryById(
            @Parameter(description = "Inventory ID", required = true)
            @PathVariable String id) {
        log.info("REST request to get inventory: {}", id);

        InventoryDTO inventory = inventoryService.getInventoryById(id);
        return ResponseEntity.ok(inventory);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER', 'MANAGER', 'QUALITY_MANAGER', 'SUPERVISOR', 'OPERATOR', 'PROCUREMENT', 'AUDITOR', 'USER')")
    @Operation(summary = "Get all inventories", description = "Retrieve all inventory records")
    @ApiResponse(responseCode = "200", description = "List of inventories retrieved")
    public ResponseEntity<List<InventoryDTO>> getAllInventories() {
        log.info("REST request to get all inventories");

        List<InventoryDTO> inventories = inventoryService.getAllInventories();
        return ResponseEntity.ok(inventories);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER', 'MANAGER')")
    @Operation(summary = "Update inventory", description = "Update an existing inventory record")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Inventory updated successfully"),
            @ApiResponse(responseCode = "404", description = "Inventory not found")
    })
    public ResponseEntity<InventoryDTO> updateInventory(
            @PathVariable String id,
            @Valid @RequestBody InventoryUpdateRequest request) {
        log.info("REST request to update inventory: {}", id);

        InventoryDTO updated = inventoryService.updateInventory(id, request);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Delete inventory", description = "Delete an inventory record")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "Inventory deleted successfully"),
            @ApiResponse(responseCode = "404", description = "Inventory not found")
    })
    public ResponseEntity<Void> deleteInventory(@PathVariable String id) {
        log.info("REST request to delete inventory: {}", id);

        inventoryService.deleteInventory(id);
        return ResponseEntity.noContent().build();
    }

    // ========== QUERY OPERATIONS ==========

    @GetMapping("/item/{itemId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER', 'MANAGER', 'QUALITY_MANAGER', 'SUPERVISOR', 'OPERATOR', 'PROCUREMENT', 'AUDITOR', 'USER')")
    @Operation(summary = "Get inventories by item", description = "Retrieve all inventory records for a specific item")
    public ResponseEntity<List<InventoryDTO>> getInventoriesByItem(
            @Parameter(description = "Item ID", required = true)
            @PathVariable String itemId) {
        log.info("REST request to get inventories for item: {}", itemId);

        List<InventoryDTO> inventories = inventoryService.getInventoriesByItemId(itemId);
        return ResponseEntity.ok(inventories);
    }

    @GetMapping("/warehouse/{warehouseId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER', 'MANAGER', 'QUALITY_MANAGER', 'SUPERVISOR', 'OPERATOR', 'PROCUREMENT', 'AUDITOR', 'USER')")
    @Operation(summary = "Get inventories by warehouse", description = "Retrieve all inventory records for a warehouse")
    public ResponseEntity<List<InventoryDTO>> getInventoriesByWarehouse(
            @PathVariable String warehouseId) {
        log.info("REST request to get inventories for warehouse: {}", warehouseId);

        List<InventoryDTO> inventories = inventoryService.getInventoriesByWarehouseId(warehouseId);
        return ResponseEntity.ok(inventories);
    }

    @GetMapping("/location/{locationId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER', 'MANAGER', 'QUALITY_MANAGER', 'SUPERVISOR', 'OPERATOR', 'PROCUREMENT', 'AUDITOR', 'USER')")
    @Operation(summary = "Get inventories by location", description = "Retrieve all inventory records at a location")
    public ResponseEntity<List<InventoryDTO>> getInventoriesByLocation(
            @PathVariable String locationId) {
        log.info("REST request to get inventories for location: {}", locationId);

        List<InventoryDTO> inventories = inventoryService.getInventoriesByLocationId(locationId);
        return ResponseEntity.ok(inventories);
    }

    @GetMapping("/item/{itemId}/location/{locationId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER', 'MANAGER', 'QUALITY_MANAGER', 'SUPERVISOR', 'OPERATOR', 'PROCUREMENT', 'AUDITOR', 'USER')")
    @Operation(summary = "Get inventory by item and location", description = "Get specific inventory record")
    public ResponseEntity<InventoryDTO> getInventoryByItemAndLocation(
            @PathVariable String itemId,
            @PathVariable String locationId) {
        log.info("REST request to get inventory for item: {} at location: {}", itemId, locationId);

        InventoryDTO inventory = inventoryService.getInventoryByItemAndLocation(itemId, locationId);
        return ResponseEntity.ok(inventory);
    }

    @GetMapping("/low-stock")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER', 'MANAGER', 'QUALITY_MANAGER', 'SUPERVISOR', 'OPERATOR', 'PROCUREMENT', 'AUDITOR', 'USER')")
    @Operation(summary = "Get low stock items", description = "Retrieve items below threshold quantity")
    public ResponseEntity<List<InventoryDTO>> getLowStockItems(
            @Parameter(description = "Threshold quantity")
            @RequestParam(defaultValue = "10.0") Double threshold) {
        log.info("REST request to get low stock items with threshold: {}", threshold);

        List<InventoryDTO> inventories = inventoryService.getLowStockItems(threshold);
        return ResponseEntity.ok(inventories);
    }

    @GetMapping("/expiring")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER', 'MANAGER', 'QUALITY_MANAGER', 'SUPERVISOR', 'OPERATOR', 'PROCUREMENT', 'AUDITOR', 'USER')")
    @Operation(summary = "Get expiring items", description = "Retrieve items expiring within specified days")
    public ResponseEntity<List<InventoryDTO>> getExpiringItems(
            @Parameter(description = "Days from now")
            @RequestParam(defaultValue = "30") Integer daysFromNow) {
        log.info("REST request to get items expiring in {} days", daysFromNow);

        List<InventoryDTO> inventories = inventoryService.getExpiringItems(daysFromNow);
        return ResponseEntity.ok(inventories);
    }

    // ========== INVENTORY OPERATIONS ==========

    @PostMapping("/{id}/adjust")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER', 'MANAGER')")
    @Operation(summary = "Adjust inventory quantity", description = "Adjust inventory quantity (cycle count, correction)")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Quantity adjusted successfully"),
            @ApiResponse(responseCode = "404", description = "Inventory not found"),
            @ApiResponse(responseCode = "400", description = "Invalid adjustment")
    })
    public ResponseEntity<InventoryDTO> adjustQuantity(
            @PathVariable String id,
            @Valid @RequestBody InventoryAdjustmentRequest request) {
        log.info("REST request to adjust quantity for inventory: {} to {}", id, request.getNewQuantity());

        InventoryDTO adjusted = inventoryService.adjustQuantity(id, request);
        return ResponseEntity.ok(adjusted);
    }

    @PostMapping("/{id}/reserve")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER', 'MANAGER')")
    @Operation(summary = "Reserve inventory", description = "Reserve inventory quantity for order/transfer")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Inventory reserved successfully"),
            @ApiResponse(responseCode = "400", description = "Insufficient stock"),
            @ApiResponse(responseCode = "404", description = "Inventory not found")
    })
    public ResponseEntity<InventoryDTO> reserveInventory(
            @PathVariable String id,
            @Valid @RequestBody InventoryReserveRequest request) {
        log.info("REST request to reserve {} for inventory: {}", request.getQuantityToReserve(), id);

        InventoryDTO reserved = inventoryService.reserveQuantity(id, request.getQuantityToReserve());
        return ResponseEntity.ok(reserved);
    }

    @PostMapping("/{id}/release")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER', 'MANAGER')")
    @Operation(summary = "Release reservation", description = "Release reserved inventory quantity")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Reservation released successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid release amount"),
            @ApiResponse(responseCode = "404", description = "Inventory not found")
    })
    public ResponseEntity<InventoryDTO> releaseReservation(
            @PathVariable String id,
            @Parameter(description = "Quantity to release", required = true)
            @RequestParam Double quantity) {
        log.info("REST request to release {} for inventory: {}", quantity, id);

        InventoryDTO released = inventoryService.releaseReservation(id, quantity);
        return ResponseEntity.ok(released);
    }

    // ========== ENRICHED RESPONSES (WITH ITEM DETAILS) ==========

    @GetMapping("/{id}/with-item")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER', 'MANAGER', 'QUALITY_MANAGER', 'SUPERVISOR', 'OPERATOR', 'PROCUREMENT', 'AUDITOR', 'USER')")
    @Operation(summary = "Get inventory with item details", description = "Get inventory with enriched item information from cache")
    public ResponseEntity<InventoryWithItemDTO> getInventoryWithItem(@PathVariable String id) {
        log.info("REST request to get inventory with item details: {}", id);

        InventoryWithItemDTO inventory = inventoryService.getInventoryWithItem(id);
        return ResponseEntity.ok(inventory);
    }

    @GetMapping("/location/{locationId}/with-items")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER', 'MANAGER', 'QUALITY_MANAGER', 'SUPERVISOR', 'OPERATOR', 'PROCUREMENT', 'AUDITOR', 'USER')")
    @Operation(summary = "Get inventories by location with item details", description = "Get all inventories at location with item info")
    public ResponseEntity<List<InventoryWithItemDTO>> getInventoriesWithItemByLocation(
            @PathVariable String locationId) {
        log.info("REST request to get inventories with items for location: {}", locationId);

        List<InventoryWithItemDTO> inventories = inventoryService.getInventoriesWithItemByLocation(locationId);
        return ResponseEntity.ok(inventories);
    }

    @GetMapping("/warehouse/{warehouseId}/with-items")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER', 'MANAGER', 'QUALITY_MANAGER', 'SUPERVISOR', 'OPERATOR', 'PROCUREMENT', 'AUDITOR', 'USER')")
    @Operation(summary = "Get inventories by warehouse with item details", description = "Get all inventories in warehouse with item info")
    public ResponseEntity<List<InventoryWithItemDTO>> getInventoriesWithItemByWarehouse(
            @PathVariable String warehouseId) {
        log.info("REST request to get inventories with items for warehouse: {}", warehouseId);

        List<InventoryWithItemDTO> inventories = inventoryService.getInventoriesWithItemByWarehouse(warehouseId);
        return ResponseEntity.ok(inventories);
    }

    // ========== AVAILABILITY CHECKS ==========

    @GetMapping("/check-availability")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER', 'MANAGER', 'QUALITY_MANAGER', 'SUPERVISOR', 'OPERATOR', 'PROCUREMENT', 'AUDITOR', 'USER')")
    @Operation(summary = "Check stock availability", description = "Check if sufficient stock is available")
    public ResponseEntity<Boolean> checkStockAvailability(
            @RequestParam String itemId,
            @RequestParam String locationId,
            @RequestParam Double quantity) {
        log.info("REST request to check availability for item: {} at location: {} (qty: {})",
                itemId, locationId, quantity);

        boolean available = inventoryService.checkStockAvailability(itemId, locationId, quantity);
        return ResponseEntity.ok(available);
    }

    @GetMapping("/available-quantity")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER', 'MANAGER', 'QUALITY_MANAGER', 'SUPERVISOR', 'OPERATOR', 'PROCUREMENT', 'AUDITOR', 'USER')")
    @Operation(summary = "Get available quantity", description = "Get available quantity for item at location")
    public ResponseEntity<Double> getAvailableQuantity(
            @RequestParam String itemId,
            @RequestParam String locationId) {
        log.info("REST request to get available quantity for item: {} at location: {}",
                itemId, locationId);

        Double quantity = inventoryService.getAvailableQuantity(itemId, locationId);
        return ResponseEntity.ok(quantity);
    }

    // ========== QUALITY CONTROL INTEGRATION ==========

    @PostMapping("/quality-adjustment")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER', 'QUALITY_MANAGER')")
    @Operation(summary = "Adjust inventory based on quality results",
               description = "Adjust inventory quantities based on quality inspection results (PASSED/FAILED/QUARANTINED)")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Inventory adjusted successfully"),
            @ApiResponse(responseCode = "404", description = "Inventory not found"),
            @ApiResponse(responseCode = "400", description = "Invalid adjustment request")
    })
    public ResponseEntity<Void> adjustInventoryForQuality(
            @Valid @RequestBody com.stock.inventoryservice.dto.request.QualityAdjustmentRequest request) {
        log.info("📊 REST request to adjust inventory based on quality results - item: {}, status: {}, total: {}",
                request.getItemId(), request.getQualityStatus(), request.getTotalQuantity());

        inventoryService.adjustInventoryForQuality(request);
        return ResponseEntity.ok().build();
    }
}
