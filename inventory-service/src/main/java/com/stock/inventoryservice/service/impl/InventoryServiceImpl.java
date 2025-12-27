package com.stock.inventoryservice.service.impl;

import com.stock.inventoryservice.client.AlertClient;
import com.stock.inventoryservice.client.LocationClient;
import com.stock.inventoryservice.dto.*;
import com.stock.inventoryservice.dto.cache.ItemCacheDTO;
import com.stock.inventoryservice.dto.external.LocationResponseDTO;
import com.stock.inventoryservice.dto.request.InventoryAdjustmentRequest;
import com.stock.inventoryservice.dto.request.InventoryCreateRequest;
import com.stock.inventoryservice.dto.request.InventoryTransferRequest;
import com.stock.inventoryservice.dto.request.InventoryUpdateRequest;
import com.stock.inventoryservice.dto.request.QualityAdjustmentRequest;
import com.stock.inventoryservice.entity.Inventory;
import com.stock.inventoryservice.entity.InventoryStatus;
import com.stock.inventoryservice.event.StockBelowThresholdEvent;
import com.stock.inventoryservice.event.dto.InventoryEvent;
import com.stock.inventoryservice.exception.InsufficientStockException;
import com.stock.inventoryservice.exception.LocationCapacityExceededException;
import com.stock.inventoryservice.exception.ResourceNotFoundException;
import com.stock.inventoryservice.repository.InventoryRepository;
import com.stock.inventoryservice.service.InventoryService;
import com.stock.inventoryservice.service.ItemCacheService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class InventoryServiceImpl implements InventoryService {

    private final InventoryRepository inventoryRepository;
    private final ItemCacheService itemCacheService;
    private final InventoryEventPublisher eventPublisher;
    private final LocationClient locationClient;
    private final AlertClient alertClient; // 🔥 NEW: Inject AlertClient

    @Override
    public InventoryDTO createInventory(InventoryCreateRequest request) {
        log.info("Creating inventory for item: {} at location: {}",
                request.getItemId(), request.getLocationId());

        // Verify item exists in cache (throws exception if not found)
        ItemCacheDTO item = itemCacheService.getItem(request.getItemId());

        // Check if inventory already exists
        inventoryRepository.findByItemIdAndLocationId(request.getItemId(), request.getLocationId())
                .ifPresent(inv -> {
                    throw new IllegalStateException(
                            "Inventory already exists for item: " + request.getItemId() +
                                    " at location: " + request.getLocationId());
                });

        Double quantityOnHand = request.getQuantityOnHand() != null ? request.getQuantityOnHand() : 0.0;

        // 🔥 VALIDATE LOCATION CAPACITY BEFORE CREATING
        validateLocationCapacity(request.getLocationId(), quantityOnHand, null);

        Inventory inventory = Inventory.builder()
                .itemId(request.getItemId())
                .warehouseId(request.getWarehouseId())
                .locationId(request.getLocationId())
                .lotId(request.getLotId())
                .serialId(request.getSerialId())
                .quantityOnHand(quantityOnHand)
                .quantityReserved(request.getQuantityReserved() != null ? request.getQuantityReserved() : 0.0)
                .quantityDamaged(request.getQuantityDamaged() != null ? request.getQuantityDamaged() : 0.0)
                .uom(request.getUom())
                .status(request.getStatus())
                .unitCost(request.getUnitCost())
                .expiryDate(request.getExpiryDate())
                .manufactureDate(request.getManufactureDate())
                .attributes(request.getAttributes())
                .build();

        Inventory savedInventory = inventoryRepository.save(inventory);
        log.info("Inventory created successfully with ID: {}", savedInventory.getId());

        publishInventoryEvent(savedInventory, "CREATED");

        // 🚨 Check for low stock and create alert if needed
        checkLowStockAndCreateAlert(savedInventory);

        return mapToDTO(savedInventory);
    }

    @Override
    @Transactional(readOnly = true)
    public InventoryDTO getInventoryById(String id) {
        log.debug("Fetching inventory with ID: {}", id);

        Inventory inventory = inventoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Inventory not found with ID: " + id));

        return mapToDTO(inventory);
    }

    @Override
    @Transactional(readOnly = true)
    public List<InventoryDTO> getAllInventories() {
        log.debug("Fetching all inventories");

        return inventoryRepository.findAll().stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<InventoryDTO> getInventoriesByItemId(String itemId) {
        log.debug("Fetching inventories for item: {}", itemId);

        return inventoryRepository.findByItemId(itemId).stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<InventoryDTO> getInventoriesByWarehouseId(String warehouseId) {
        log.debug("Fetching inventories for warehouse: {}", warehouseId);

        return inventoryRepository.findByWarehouseId(warehouseId).stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<InventoryDTO> getInventoriesByLocationId(String locationId) {
        log.debug("Fetching inventories for location: {}", locationId);

        return inventoryRepository.findByLocationId(locationId).stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public InventoryDTO getInventoryByItemAndLocation(String itemId, String locationId) {
        log.debug("Fetching inventory for item: {} at location: {}", itemId, locationId);

        Inventory inventory = inventoryRepository.findByItemIdAndLocationId(itemId, locationId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Inventory not found for item: " + itemId + " at location: " + locationId));

        return mapToDTO(inventory);
    }

    @Override
    @Transactional(readOnly = true)
    public List<InventoryDTO> getLowStockItems(Double threshold) {
        log.debug("Fetching low stock items with threshold: {}", threshold);

        return inventoryRepository.findByQuantityOnHandLessThan(threshold).stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<InventoryDTO> getExpiringItems(int daysFromNow) {
        log.debug("Fetching items expiring in {} days", daysFromNow);

        LocalDate cutoffDate = LocalDate.now().plusDays(daysFromNow);

        return inventoryRepository.findByExpiryDateBefore(cutoffDate).stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Override
    public InventoryDTO adjustQuantity(String id, InventoryAdjustmentRequest request) {
        log.info("Adjusting quantity for inventory: {} to new quantity: {}", id, request.getNewQuantity());

        Inventory inventory = inventoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Inventory not found with ID: " + id));

        Double previousQuantity = inventory.getQuantityOnHand();

        if (request.getNewQuantity() < 0) {
            throw new InsufficientStockException(
                    "Quantity cannot be negative. Requested: " + request.getNewQuantity());
        }

        // 🔥 VALIDATE LOCATION CAPACITY IF INCREASING QUANTITY
        if (request.getNewQuantity() > previousQuantity) {
            Double additionalQuantity = request.getNewQuantity() - previousQuantity;
            validateLocationCapacity(inventory.getLocationId(), additionalQuantity, id);
        }

        inventory.setQuantityOnHand(request.getNewQuantity());
        inventory.setLastCountDate(LocalDate.now());

        Inventory savedInventory = inventoryRepository.save(inventory);
        log.info("Quantity adjusted from {} to {}", previousQuantity, request.getNewQuantity());

        publishInventoryEvent(savedInventory, "ADJUSTED");

        // 🚨 Check for low stock and create alert if needed
        checkLowStockAndCreateAlert(savedInventory);

        return mapToDTO(savedInventory);
    }

    @Override
    public InventoryDTO reserveQuantity(String id, Double quantity) {
        log.info("Reserving quantity {} for inventory: {}", quantity, id);

        Inventory inventory = inventoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Inventory not found with ID: " + id));

        Double available = inventory.getAvailableQuantity();

        if (available < quantity) {
            throw new InsufficientStockException(
                    "Insufficient available stock. Available: " + available + ", Requested: " + quantity);
        }

        inventory.setQuantityReserved(inventory.getQuantityReserved() + quantity);

        Inventory savedInventory = inventoryRepository.save(inventory);
        log.info("Reserved {} units. Total reserved: {}", quantity, savedInventory.getQuantityReserved());

        publishInventoryEvent(savedInventory, "RESERVED");

        return mapToDTO(savedInventory);
    }

    @Override
    public InventoryDTO releaseReservation(String id, Double quantity) {
        log.info("Releasing reservation {} for inventory: {}", quantity, id);

        Inventory inventory = inventoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Inventory not found with ID: " + id));

        if (inventory.getQuantityReserved() < quantity) {
            throw new IllegalStateException(
                    "Cannot release more than reserved. Reserved: " + inventory.getQuantityReserved());
        }

        inventory.setQuantityReserved(inventory.getQuantityReserved() - quantity);

        Inventory savedInventory = inventoryRepository.save(inventory);
        log.info("Released {} units. Total reserved: {}", quantity, savedInventory.getQuantityReserved());

        publishInventoryEvent(savedInventory, "RELEASED");

        return mapToDTO(savedInventory);
    }

    @Override
    public InventoryDTO transferInventory(InventoryTransferRequest request) {
        log.info("Transferring {} units of item {} from {} to {}",
                request.getQuantity(), request.getItemVariantId(),
                request.getSourceLocationId(), request.getDestinationLocationId());

        // Reduce from source
        Inventory fromInventory = inventoryRepository
                .findByItemIdAndLocationId(request.getItemVariantId(), request.getSourceLocationId())
                .orElseThrow(() -> new ResourceNotFoundException("Source inventory not found"));

        Double availableQuantity = fromInventory.getAvailableQuantity();
        if (availableQuantity < request.getQuantity().doubleValue()) {
            throw new InsufficientStockException("Insufficient stock at source location");
        }

        fromInventory.setQuantityOnHand(fromInventory.getQuantityOnHand() - request.getQuantity().doubleValue());
        inventoryRepository.save(fromInventory);

        // 🔥 VALIDATE DESTINATION LOCATION CAPACITY
        validateLocationCapacity(request.getDestinationLocationId(), request.getQuantity().doubleValue(), null);

        // Add to destination
        Inventory toInventory = inventoryRepository
                .findByItemIdAndLocationId(request.getItemVariantId(), request.getDestinationLocationId())
                .orElseGet(() -> Inventory.builder()
                        .itemId(request.getItemVariantId())
                        .warehouseId(fromInventory.getWarehouseId()) // Assuming same warehouse
                        .locationId(request.getDestinationLocationId())
                        .quantityOnHand(0.0)
                        .quantityReserved(0.0)
                        .quantityDamaged(0.0)
                        .status(InventoryStatus.AVAILABLE)
                        .uom(fromInventory.getUom())
                        .build());

        toInventory.setQuantityOnHand(toInventory.getQuantityOnHand() + request.getQuantity().doubleValue());
        Inventory savedInventory = inventoryRepository.save(toInventory);

        publishInventoryEvent(savedInventory, "TRANSFERRED");

        return mapToDTO(savedInventory);
    }

    @Override
    public InventoryDTO updateInventory(String id, InventoryUpdateRequest request) {
        log.info("Updating inventory with ID: {}", id);

        Inventory inventory = inventoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Inventory not found with ID: " + id));

        // 🔥 VALIDATE LOCATION CAPACITY IF QUANTITY_ON_HAND IS BEING INCREASED
        if (request.getQuantityOnHand() != null && request.getQuantityOnHand() > inventory.getQuantityOnHand()) {
            Double additionalQuantity = request.getQuantityOnHand() - inventory.getQuantityOnHand();
            validateLocationCapacity(inventory.getLocationId(), additionalQuantity, id);
        }

        if (request.getQuantityOnHand() != null) {
            inventory.setQuantityOnHand(request.getQuantityOnHand());
        }
        if (request.getQuantityReserved() != null) {
            inventory.setQuantityReserved(request.getQuantityReserved());
        }
        if (request.getQuantityDamaged() != null) {
            inventory.setQuantityDamaged(request.getQuantityDamaged());
        }
        if (request.getStatus() != null) {
            inventory.setStatus(request.getStatus());
        }
        if (request.getUnitCost() != null) {
            inventory.setUnitCost(request.getUnitCost());
        }
        if (request.getExpiryDate() != null) {
            inventory.setExpiryDate(request.getExpiryDate());
        }
        if (request.getLastCountDate() != null) {
            inventory.setLastCountDate(request.getLastCountDate());
        }
        if (request.getAttributes() != null) {
            inventory.setAttributes(request.getAttributes());
        }

        Inventory savedInventory = inventoryRepository.save(inventory);

        publishInventoryEvent(savedInventory, "UPDATED");

        // 🚨 Check for low stock and create alert if needed
        checkLowStockAndCreateAlert(savedInventory);

        return mapToDTO(savedInventory);
    }

    @Override
    public void deleteInventory(String id) {
        log.info("Deleting inventory with ID: {}", id);

        Inventory inventory = inventoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Inventory not found with ID: " + id));

        inventoryRepository.delete(inventory);

        publishInventoryEvent(inventory, "DELETED");
    }

    // ========== ENRICHED RESPONSES (WITH ITEM FROM CACHE) ==========

    @Override
    @Transactional(readOnly = true)
    public InventoryWithItemDTO getInventoryWithItem(String id) {
        Inventory inventory = inventoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Inventory not found with ID: " + id));

        ItemCacheDTO item = itemCacheService.getItem(inventory.getItemId());

        return mapToEnrichedDTO(inventory, item);
    }

    @Override
    @Transactional(readOnly = true)
    public List<InventoryWithItemDTO> getInventoriesWithItemByLocation(String locationId) {
        return inventoryRepository.findByLocationId(locationId).stream()
                .map(inv -> {
                    ItemCacheDTO item = itemCacheService.getItem(inv.getItemId());
                    return mapToEnrichedDTO(inv, item);
                })
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<InventoryWithItemDTO> getInventoriesWithItemByWarehouse(String warehouseId) {
        return inventoryRepository.findByWarehouseId(warehouseId).stream()
                .map(inv -> {
                    ItemCacheDTO item = itemCacheService.getItem(inv.getItemId());
                    return mapToEnrichedDTO(inv, item);
                })
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public boolean checkStockAvailability(String itemId, String locationId, Double quantity) {
        return inventoryRepository.findByItemIdAndLocationId(itemId, locationId)
                .map(inv -> inv.getAvailableQuantity() >= quantity)
                .orElse(false);
    }

    @Override
    @Transactional(readOnly = true)
    public Double getAvailableQuantity(String itemId, String locationId) {
        return inventoryRepository.findByItemIdAndLocationId(itemId, locationId)
                .map(Inventory::getAvailableQuantity)
                .orElse(0.0);
    }

    // ========== HELPER METHODS ==========

    /**
     * 🔥 VALIDATE LOCATION CAPACITY
     * Checks if adding new quantity will exceed location capacity
     * 
     * @param locationId Location ID to check
     * @param additionalQuantity Quantity to be added
     * @param excludeInventoryId Inventory ID to exclude from current total (for updates)
     */
    private void validateLocationCapacity(String locationId, Double additionalQuantity, String excludeInventoryId) {
        log.debug("Validating location capacity for location: {}, additional quantity: {}", 
                locationId, additionalQuantity);

        // Fetch location details from location-service
        LocationResponseDTO location = locationClient.getLocationById(locationId);

        if (location == null) {
            throw new ResourceNotFoundException("Location not found with ID: " + locationId);
        }

        // Check if location is active
        if (location.getIsActive() != null && !location.getIsActive()) {
            throw new IllegalStateException("Cannot add inventory to inactive location: " + locationId);
        }

        // Get capacity as Double
        Double locationCapacity = location.getCapacityAsDouble();

        // If capacity is null or 0, skip validation (unlimited capacity)
        if (locationCapacity == null || locationCapacity == 0) {
            log.debug("Location {} has unlimited capacity, skipping validation", locationId);
            return;
        }

        // Calculate current total quantity at this location
        List<Inventory> existingInventories = inventoryRepository.findByLocationId(locationId);
        
        Double currentTotalQuantity = existingInventories.stream()
                .filter(inv -> excludeInventoryId == null || !inv.getId().equals(excludeInventoryId))
                .mapToDouble(Inventory::getQuantityOnHand)
                .sum();

        Double newTotalQuantity = currentTotalQuantity + additionalQuantity;
        Double percentageFull = (newTotalQuantity / locationCapacity) * 100;

        log.debug("Location {}: Capacity={}, Current={}, Additional={}, New Total={}, Percentage={}%",
                locationId, locationCapacity, currentTotalQuantity, additionalQuantity, newTotalQuantity,
                String.format("%.1f", percentageFull));

        // 🚨 CREATE ALERTS BASED ON CAPACITY USAGE

        // CRITICAL ALERT: Capacity would exceed 100%
        if (newTotalQuantity > locationCapacity) {
            String message = String.format(
                    "Location %s capacity EXCEEDED! Capacity: %.2f, Current: %.2f, Attempting to add: %.2f, Would be: %.2f (%.1f%%)",
                    location.getCode(), locationCapacity, currentTotalQuantity,
                    additionalQuantity, newTotalQuantity, percentageFull);

            // Create CRITICAL alert
            alertClient.createLocationCapacityAlert(
                    "CRITICAL",
                    locationId,
                    location.getCode(),
                    message,
                    newTotalQuantity,
                    locationCapacity,
                    percentageFull
            );

            throw new LocationCapacityExceededException(message);
        }

        // CRITICAL ALERT: 95-100% full
        else if (percentageFull >= 95.0) {
            String message = String.format(
                    "Location %s is CRITICALLY FULL at %.1f%% capacity (%.2f / %.2f units)",
                    location.getCode(), percentageFull, newTotalQuantity, locationCapacity);

            alertClient.createLocationCapacityAlert(
                    "CRITICAL",
                    locationId,
                    location.getCode(),
                    message,
                    newTotalQuantity,
                    locationCapacity,
                    percentageFull
            );

            log.warn("🚨 CRITICAL: {}", message);
        }

        // WARNING ALERT: 80-95% full
        else if (percentageFull >= 80.0) {
            String message = String.format(
                    "Location %s is %.1f%% full (%.2f / %.2f units) - approaching capacity limit",
                    location.getCode(), percentageFull, newTotalQuantity, locationCapacity);

            alertClient.createLocationCapacityAlert(
                    "WARNING",
                    locationId,
                    location.getCode(),
                    message,
                    newTotalQuantity,
                    locationCapacity,
                    percentageFull
            );

            log.warn("⚠️ WARNING: {}", message);
        }

        log.info("✅ Location capacity validation passed for location: {} ({}% full)",
                locationId, String.format("%.1f", percentageFull));
    }

    private void publishInventoryEvent(Inventory inventory, String eventType) {
        boolean isBelowThreshold = inventory.getQuantityOnHand() < 5.0;
        
        InventoryEvent event = InventoryEvent.builder()
                .inventoryId(inventory.getId())
                .itemId(inventory.getItemId())
                .warehouseId(inventory.getWarehouseId())
                .locationId(inventory.getLocationId())
                .quantityOnHand(inventory.getQuantityOnHand())
                .quantityReserved(inventory.getQuantityReserved())
                .availableQuantity(inventory.getAvailableQuantity())
                .eventType(eventType)
                .timestamp(LocalDateTime.now())
                // ✅ ADD THESE CRITICAL FIELDS:
                .thresholdViolated(isBelowThreshold)
                .minThreshold(5.0)  // Your threshold
                .violationType(isBelowThreshold ? "LOW_STOCK" : null)
                .build();
    
        eventPublisher.publishInventoryEvent(event);
        
        if (isBelowThreshold) {
            publishStockBelowThresholdEvent(inventory);
        }
    }
    private void publishStockBelowThresholdEvent(Inventory inventory) {
    StockBelowThresholdEvent event = StockBelowThresholdEvent.builder()
            .itemId(inventory.getItemId())
            .locationId(inventory.getLocationId())
            .warehouseId(inventory.getWarehouseId())
            .currentQuantity(inventory.getQuantityOnHand())
            .threshold(5.0)
            .alertLevel(inventory.getQuantityOnHand() < 3.0 ? "CRITICAL" : "WARNING")
            .timestamp(LocalDateTime.now())
            .build();
            
    eventPublisher.publishStockBelowThreshold(event);
}

    /**
     * 🚨 Check if inventory is low and create alert via AlertClient
     *
     * Thresholds:
     * - CRITICAL: quantity < 5
     * - WARNING: quantity < 10
     */
    private void checkLowStockAndCreateAlert(Inventory inventory) {
        Double quantity = inventory.getAvailableQuantity(); // Available = OnHand - Reserved

        // Define thresholds
        final Double CRITICAL_THRESHOLD = 5.0;
        final Double WARNING_THRESHOLD = 10.0;

        log.debug("Checking low stock for item: {}, quantity: {}", inventory.getItemId(), quantity);

        try {
            // CRITICAL ALERT: quantity < 5
            if (quantity < CRITICAL_THRESHOLD) {
                String message = String.format(
                        "CRITICAL: Item %s has only %.2f units available at location %s (threshold: %.0f)",
                        inventory.getItemId(),
                        quantity,
                        inventory.getLocationId(),
                        CRITICAL_THRESHOLD
                );

                alertClient.createLowStockAlert(
                        inventory.getItemId(),
                        inventory.getLocationId(),
                        quantity,
                        CRITICAL_THRESHOLD
                );

                log.warn("🚨 CRITICAL LOW STOCK: {}", message);
            }
            // WARNING ALERT: quantity < 10
            else if (quantity < WARNING_THRESHOLD) {
                String message = String.format(
                        "WARNING: Item %s has %.2f units available at location %s (threshold: %.0f)",
                        inventory.getItemId(),
                        quantity,
                        inventory.getLocationId(),
                        WARNING_THRESHOLD
                );

                alertClient.createLowStockAlert(
                        inventory.getItemId(),
                        inventory.getLocationId(),
                        quantity,
                        WARNING_THRESHOLD
                );

                log.warn("⚠️ WARNING LOW STOCK: {}", message);
            }
        } catch (Exception e) {
            // Don't fail the inventory operation if alert creation fails
            log.error("Failed to create low stock alert for item {}: {}",
                    inventory.getItemId(), e.getMessage());
        }
    }

    private InventoryDTO mapToDTO(Inventory inventory) {
        return InventoryDTO.builder()
                .id(inventory.getId())
                .itemId(inventory.getItemId())
                .warehouseId(inventory.getWarehouseId())
                .locationId(inventory.getLocationId())
                .lotId(inventory.getLotId())
                .serialId(inventory.getSerialId())
                .quantityOnHand(inventory.getQuantityOnHand())
                .quantityReserved(inventory.getQuantityReserved())
                .quantityDamaged(inventory.getQuantityDamaged())
                .availableQuantity(inventory.getAvailableQuantity())
                .uom(inventory.getUom())
                .status(inventory.getStatus())
                .unitCost(inventory.getUnitCost())
                .expiryDate(inventory.getExpiryDate())
                .manufactureDate(inventory.getManufactureDate())
                .lastCountDate(inventory.getLastCountDate())
                .attributes(inventory.getAttributes())
                .version(inventory.getVersion())
                .createdAt(inventory.getCreatedAt())
                .updatedAt(inventory.getUpdatedAt())
                .build();
    }

    private InventoryWithItemDTO mapToEnrichedDTO(Inventory inventory, ItemCacheDTO item) {
        InventoryWithItemDTO.ItemDetailsDTO itemDetails = InventoryWithItemDTO.ItemDetailsDTO.builder()
                .sku(item.getSku())
                .name(item.getName())
                .categoryId(item.getCategoryId())
                .categoryName(item.getCategoryName())
                .isActive(item.getIsActive())
                .isSerialized(item.getIsSerialized())
                .isLotManaged(item.getIsLotManaged())
                .shelfLifeDays(item.getShelfLifeDays())
                .imageUrl(item.getImageUrl())
                .build();

        return InventoryWithItemDTO.builder()
                .id(inventory.getId())
                .itemId(inventory.getItemId())
                .warehouseId(inventory.getWarehouseId())
                .locationId(inventory.getLocationId())
                .lotId(inventory.getLotId())
                .serialId(inventory.getSerialId())
                .quantityOnHand(inventory.getQuantityOnHand())
                .quantityReserved(inventory.getQuantityReserved())
                .quantityDamaged(inventory.getQuantityDamaged())
                .availableQuantity(inventory.getAvailableQuantity())
                .uom(inventory.getUom())
                .status(inventory.getStatus())
                .unitCost(inventory.getUnitCost())
                .expiryDate(inventory.getExpiryDate())
                .manufactureDate(inventory.getManufactureDate())
                .lastCountDate(inventory.getLastCountDate())
                .version(inventory.getVersion())
                .createdAt(inventory.getCreatedAt())
                .updatedAt(inventory.getUpdatedAt())
                .itemDetails(itemDetails)
                .build();
    }

    @Override
    public void adjustInventoryForQuality(QualityAdjustmentRequest request) {
        log.info("📊 Adjusting inventory for quality results - item: {}, status: {}, total: {}",
                request.getItemId(), request.getQualityStatus(), request.getTotalQuantity());

        try {
            // Find inventory by item and location
            Inventory inventory;
            if (request.getLocationId() != null) {
                inventory = inventoryRepository.findByItemIdAndLocationId(
                        request.getItemId().toString(),
                        request.getLocationId().toString()
                ).orElseThrow(() -> new ResourceNotFoundException(
                        "Inventory not found for item: " + request.getItemId() +
                        " at location: " + request.getLocationId()));
            } else {
                // If no location specified, find first inventory for this item
                List<Inventory> inventories = inventoryRepository.findByItemId(request.getItemId().toString());
                if (inventories.isEmpty()) {
                    throw new ResourceNotFoundException("No inventory found for item: " + request.getItemId());
                }
                inventory = inventories.get(0);
                log.warn("⚠️ No location specified, using first available inventory location: {}",
                        inventory.getLocationId());
            }

            String qualityStatus = request.getQualityStatus().toUpperCase();

            // Adjust quantities based on quality status
            switch (qualityStatus) {
                case "PASSED":
                    // Items passed - no adjustment needed, inventory remains available
                    log.info("✅ Quality PASSED - {} units remain available", request.getTotalQuantity());
                    // Optionally update status to ensure it's AVAILABLE
                    if (inventory.getStatus() != InventoryStatus.AVAILABLE) {
                        inventory.setStatus(InventoryStatus.AVAILABLE);
                    }
                    break;

                case "FAILED":
                    // Items failed - move to damaged
                    Double failedQty = request.getFailedQuantity() != null ?
                            request.getFailedQuantity() : request.getTotalQuantity();

                    log.info("❌ Quality FAILED - moving {} units to damaged", failedQty);

                    // Deduct from available quantity (on-hand)
                    Double currentOnHand = inventory.getQuantityOnHand();
                    Double currentDamaged = inventory.getQuantityDamaged() != null ?
                            inventory.getQuantityDamaged() : 0.0;

                    if (currentOnHand < failedQty) {
                        log.warn("⚠️ Insufficient quantity on hand ({}) for failed adjustment ({})",
                                currentOnHand, failedQty);
                        // Adjust what we can
                        failedQty = currentOnHand;
                    }

                    inventory.setQuantityOnHand(currentOnHand - failedQty);
                    inventory.setQuantityDamaged(currentDamaged + failedQty);

                    // Update status if all inventory is damaged
                    if (inventory.getAvailableQuantity() <= 0) {
                        inventory.setStatus(InventoryStatus.DAMAGED);
                    }
                    break;

                case "QUARANTINED":
                    // Items quarantined - mark inventory as quarantined
                    Double quarantinedQty = request.getQuarantinedQuantity() != null ?
                            request.getQuarantinedQuantity() : request.getTotalQuantity();

                    log.info("🚫 Quality QUARANTINED - quarantining {} units", quarantinedQty);

                    // Move to reserved/quarantined state
                    Double currentReserved = inventory.getQuantityReserved() != null ?
                            inventory.getQuantityReserved() : 0.0;
                    inventory.setQuantityReserved(currentReserved + quarantinedQty);

                    // Update status to quarantined
                    inventory.setStatus(InventoryStatus.QUARANTINED);
                    break;

                default:
                    log.warn("⚠️ Unknown quality status: {}, no adjustment made", qualityStatus);
                    return;
            }

            // Save the updated inventory
            Inventory updatedInventory = inventoryRepository.save(inventory);
            log.info("✅ Inventory adjusted successfully - available: {}, damaged: {}, reserved: {}",
                    updatedInventory.getAvailableQuantity(),
                    updatedInventory.getQuantityDamaged(),
                    updatedInventory.getQuantityReserved());

            // Publish inventory event
            publishInventoryEvent(updatedInventory, "QUALITY_ADJUSTED");

            // Check for low stock and create alert if needed
            checkLowStockAndCreateAlert(updatedInventory);

        } catch (Exception e) {
            log.error("❌ Failed to adjust inventory for quality: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to adjust inventory for quality: " + e.getMessage(), e);
        }
    }
}