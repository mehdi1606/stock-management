package com.stock.inventoryservice.event.consumer;

import com.stock.inventoryservice.dto.InventoryDTO;
import com.stock.inventoryservice.entity.Inventory;
import com.stock.inventoryservice.entity.InventoryStatus;
import com.stock.inventoryservice.event.dto.InventoryEvent;
import com.stock.inventoryservice.event.dto.MovementCompletedEvent;
import com.stock.inventoryservice.event.dto.MovementCompletedEvent.MovementLineDTO;
import com.stock.inventoryservice.repository.InventoryRepository;
import com.stock.inventoryservice.service.impl.InventoryEventPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

/**
 * 🔥 AUTOMATIC INVENTORY UPDATE CONSUMER
 * Listens to movement.completed events and automatically updates inventory
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class MovementEventConsumer {

    private final InventoryRepository inventoryRepository;
    private final InventoryEventPublisher eventPublisher;
    private final com.stock.inventoryservice.client.AlertClient alertClient; // 🚨 ADD ALERT CLIENT

    /**
     * 🎯 MAIN LISTENER - Processes movement completion
     */
    @KafkaListener(
            topics = "movement.completed",
            groupId = "inventory-service-group",
            containerFactory = "movementKafkaListenerContainerFactory"  // 🔥 Use the dedicated factory!
        )
    @Transactional
    public void handleMovementCompleted(
            @Payload MovementCompletedEvent event,
            @Header(KafkaHeaders.RECEIVED_KEY) String key,
            @Header(KafkaHeaders.RECEIVED_TOPIC) String topic
    ) {
        log.info("🔥🔥🔥 RECEIVED movement.completed event: {}", event.getMovementId());
        log.info("Movement Type: {}, Lines: {}", event.getMovementType(), event.getLines().size());

        try {
            // Process each product line
            for (MovementCompletedEvent.MovementLineDTO line : event.getLines()) {
                processMovementLine(event, line);
            }

            log.info("✅ Successfully processed movement {} with {} lines", 
                    event.getMovementId(), event.getLines().size());
                    
        } catch (Exception e) {
            log.error("❌ ERROR processing movement.completed: {}", event.getMovementId(), e);
            // TODO: Send to dead-letter queue
            throw e; // Retry via Kafka
        }
    }

    /**
     * 📦 Process single movement line (single product)
     */
    private void processMovementLine(MovementCompletedEvent movement, 
                                     MovementCompletedEvent.MovementLineDTO line) {
        
        log.info("Processing line {} - Item: {}, Qty: {}", 
                line.getLineId(), line.getItemId(), line.getActualQuantity());

        String movementType = movement.getMovementType().toUpperCase();
        Double quantity = line.getActualQuantity() != null ? 
                         line.getActualQuantity() : line.getRequestedQuantity();

        switch (movementType) {
            // Legacy types (for backward compatibility)
            case "INBOUND":
                handleInbound(movement, line, quantity);
                break;
            case "OUTBOUND":
                handleOutbound(movement, line, quantity);
                break;

            // Standard movement types
            case "RECEIPT":
                handleReceipt(movement, line, quantity);
                break;
            case "ISSUE":
                handleIssue(movement, line, quantity);
                break;
            case "TRANSFER":
                handleTransfer(movement, line, quantity);
                break;
            case "ADJUSTMENT":
                handleAdjustment(movement, line, quantity);
                break;
            case "PICKING":
                handlePicking(movement, line, quantity);
                break;
            case "PUTAWAY":
                handlePutaway(movement, line, quantity);
                break;
            case "RETURN":
                handleReturn(movement, line, quantity);
                break;
            case "CYCLE_COUNT":
                handleCycleCount(movement, line, quantity);
                break;
            case "QUARANTINE":
                handleQuarantine(movement, line, quantity);
                break;
            case "RELOCATION":
                handleRelocation(movement, line, quantity);
                break;
            default:
                log.error("❌ Unsupported movement type: {}. Inventory will NOT be updated!", movementType);
                throw new IllegalArgumentException("Unsupported movement type: " + movementType);
        }
    }

    /**
     * 📥 INBOUND: Receiving stock (increase inventory)
     */
    private void handleInbound(MovementCompletedEvent movement, 
                               MovementCompletedEvent.MovementLineDTO line, 
                               Double quantity) {
        
        log.info("📥 INBOUND: Adding {} units of item {} to location {}", 
                quantity, line.getItemId(), movement.getDestinationLocationId());

        String itemId = line.getItemId().toString();
        String locationId = movement.getDestinationLocationId().toString();
        String warehouseId = movement.getWarehouseId().toString();

        // Find or create inventory record
        Inventory inventory = inventoryRepository
                .findByItemIdAndLocationId(itemId, locationId)
                .orElseGet(() -> createNewInventory(itemId, warehouseId, locationId, line));

        // ✅ INCREASE quantity
        inventory.setQuantityOnHand(inventory.getQuantityOnHand() + quantity);
        inventory.setLastCountDate(LocalDate.now());

        Inventory saved = inventoryRepository.save(inventory);
        log.info("✅ Increased inventory: {} units now at location {}",
                saved.getQuantityOnHand(), locationId);

        // Check for low stock alerts
        checkLowStockAndCreateAlert(saved);

        // Publish event
        publishInventoryUpdate(saved, "INBOUND_RECEIVED", quantity);
    }

    /**
     * 📤 OUTBOUND: Shipping stock (decrease inventory)
     */
    private void handleOutbound(MovementCompletedEvent movement, 
                                MovementCompletedEvent.MovementLineDTO line, 
                                Double quantity) {
        
        log.info("📤 OUTBOUND: Removing {} units of item {} from location {}", 
                quantity, line.getItemId(), movement.getSourceLocationId());

        String itemId = line.getItemId().toString();
        String locationId = movement.getSourceLocationId().toString();

        Inventory inventory = inventoryRepository
                .findByItemIdAndLocationId(itemId, locationId)
                .orElseThrow(() -> new RuntimeException("Inventory not found for outbound movement"));

        // ✅ DECREASE quantity & release reservation
        inventory.setQuantityOnHand(inventory.getQuantityOnHand() - quantity);
        inventory.setQuantityReserved(Math.max(0, inventory.getQuantityReserved() - quantity));
        inventory.setLastCountDate(LocalDate.now());

        Inventory saved = inventoryRepository.save(inventory);
        log.info("✅ Decreased inventory: {} units remain at location {}",
                saved.getQuantityOnHand(), locationId);

        // Check for low stock alerts
        checkLowStockAndCreateAlert(saved);

        publishInventoryUpdate(saved, "OUTBOUND_SHIPPED", -quantity);
    }

    /**
     * 🔄 TRANSFER: Move between locations (decrease source, increase destination)
     */
    private void handleTransfer(MovementCompletedEvent movement, 
                                MovementCompletedEvent.MovementLineDTO line, 
                                Double quantity) {
        
        log.info("🔄 TRANSFER: Moving {} units from {} to {}", 
                quantity, movement.getSourceLocationId(), movement.getDestinationLocationId());

        String itemId = line.getItemId().toString();
        String sourceLocationId = movement.getSourceLocationId().toString();
        String destLocationId = movement.getDestinationLocationId().toString();
        String warehouseId = movement.getWarehouseId().toString();

        // 1️⃣ DECREASE from source
        Inventory sourceInventory = inventoryRepository
                .findByItemIdAndLocationId(itemId, sourceLocationId)
                .orElseThrow(() -> new RuntimeException("Source inventory not found"));

        sourceInventory.setQuantityOnHand(sourceInventory.getQuantityOnHand() - quantity);
        sourceInventory.setQuantityReserved(Math.max(0, sourceInventory.getQuantityReserved() - quantity));
        Inventory savedSource = inventoryRepository.save(sourceInventory);
        log.info("✅ Decreased source: {} units remain", savedSource.getQuantityOnHand());

        // Check for low stock alerts at source location
        checkLowStockAndCreateAlert(savedSource);

        // 2️⃣ INCREASE at destination
        Inventory destInventory = inventoryRepository
                .findByItemIdAndLocationId(itemId, destLocationId)
                .orElseGet(() -> createNewInventory(itemId, warehouseId, destLocationId, line));

        destInventory.setQuantityOnHand(destInventory.getQuantityOnHand() + quantity);
        Inventory savedDest = inventoryRepository.save(destInventory);
        log.info("✅ Increased destination: {} units now available", savedDest.getQuantityOnHand());

        // Check for low stock alerts at destination location
        checkLowStockAndCreateAlert(savedDest);

        publishInventoryUpdate(savedDest, "TRANSFER_COMPLETED", quantity);
    }

    /**
     * ⚖️ ADJUSTMENT: Inventory correction (cycle count, damage, etc.)
     */
    private void handleAdjustment(MovementCompletedEvent movement, 
                                  MovementCompletedEvent.MovementLineDTO line, 
                                  Double quantity) {
        
        log.info("⚖️ ADJUSTMENT: Adjusting item {} by {} units", 
                line.getItemId(), quantity);

        String itemId = line.getItemId().toString();
        String locationId = line.getToLocationId() != null ? 
                           line.getToLocationId().toString() : 
                           movement.getDestinationLocationId().toString();

        Inventory inventory = inventoryRepository
                .findByItemIdAndLocationId(itemId, locationId)
                .orElseThrow(() -> new RuntimeException("Inventory not found for adjustment"));

        // ✅ SET new quantity (not add/subtract)
        Double oldQuantity = inventory.getQuantityOnHand();
        inventory.setQuantityOnHand(quantity);
        inventory.setLastCountDate(LocalDate.now());

        Inventory saved = inventoryRepository.save(inventory);
        log.info("✅ Adjusted inventory: {} → {} units", oldQuantity, quantity);

        // Check for low stock alerts
        checkLowStockAndCreateAlert(saved);

        publishInventoryUpdate(saved, "ADJUSTMENT", quantity - oldQuantity);
    }

    /**
     * 🆕 Create new inventory record
     */
    private Inventory createNewInventory(String itemId, String warehouseId, 
                                        String locationId, MovementCompletedEvent.MovementLineDTO line) {
        
        log.info("🆕 Creating new inventory record for item {} at location {}", itemId, locationId);

        return Inventory.builder()
                .itemId(itemId)
                .warehouseId(warehouseId)
                .locationId(locationId)
                .lotId(line.getLotId() != null ? line.getLotId().toString() : null)
                .serialId(line.getSerialId() != null ? line.getSerialId().toString() : null)
                .quantityOnHand(0.0)
                .quantityReserved(0.0)
                .quantityDamaged(0.0)
                .status(InventoryStatus.AVAILABLE)
                .uom(line.getUom())
                .build();
    }

    /**
     * 📢 Publish inventory update event
     */
    private void publishInventoryUpdate(Inventory inventory, String reason, Double delta) {
        com.stock.inventoryservice.event.dto.InventoryEvent event =
            com.stock.inventoryservice.event.dto.InventoryEvent.builder()
                .inventoryId(inventory.getId())
                .itemId(inventory.getItemId())
                .warehouseId(inventory.getWarehouseId())
                .locationId(inventory.getLocationId())
                .quantityOnHand(inventory.getQuantityOnHand())
                .quantityReserved(inventory.getQuantityReserved())
                .availableQuantity(inventory.getAvailableQuantity())
                .eventType("UPDATED")
                .reason(reason + " (Delta: " + delta + ")")
                .timestamp(java.time.LocalDateTime.now())
                .build();

        eventPublisher.publishInventoryEvent(event);
    }

    /**
     * 🚨 Check for low stock and create alerts
     * Called after every inventory update to monitor stock levels
     */
    private void checkLowStockAndCreateAlert(Inventory inventory) {
        Double quantity = inventory.getAvailableQuantity(); // OnHand - Reserved

        final Double CRITICAL_THRESHOLD = 5.0;
        final Double WARNING_THRESHOLD = 10.0;

        try {
            if (quantity < CRITICAL_THRESHOLD) {
                String message = String.format(
                    "CRITICAL: Item %s has only %.2f units available at location %s (threshold: %.0f)",
                    inventory.getItemId(), quantity, inventory.getLocationId(), CRITICAL_THRESHOLD
                );

                alertClient.createLowStockAlert(
                    inventory.getItemId(),
                    inventory.getLocationId(),
                    quantity,
                    CRITICAL_THRESHOLD
                );

                log.warn("🚨 CRITICAL LOW STOCK after movement: Item {}, Location {}, Qty: {}",
                        inventory.getItemId(), inventory.getLocationId(), quantity);
            }
            else if (quantity < WARNING_THRESHOLD) {
                String message = String.format(
                    "WARNING: Item %s has %.2f units available at location %s (threshold: %.0f)",
                    inventory.getItemId(), quantity, inventory.getLocationId(), WARNING_THRESHOLD
                );

                alertClient.createLowStockAlert(
                    inventory.getItemId(),
                    inventory.getLocationId(),
                    quantity,
                    WARNING_THRESHOLD
                );

                log.warn("⚠️ WARNING LOW STOCK after movement: Item {}, Location {}, Qty: {}",
                        inventory.getItemId(), inventory.getLocationId(), quantity);
            }
        } catch (Exception e) {
            log.error("❌ Failed to create low stock alert after movement for item {}: {}",
                    inventory.getItemId(), e.getMessage());
        }
    }

    // ========================================
    // NEW MOVEMENT TYPE HANDLERS
    // ========================================

    /**
     * 📥 RECEIPT: Receiving goods into warehouse (same as INBOUND)
     * Increases inventory at destination location
     */
    private void handleReceipt(MovementCompletedEvent movement,
                               MovementCompletedEvent.MovementLineDTO line,
                               Double quantity) {
        log.info("📥 RECEIPT: Adding {} units of item {} to location {}",
                quantity, line.getItemId(), movement.getDestinationLocationId());

        String itemId = line.getItemId().toString();
        String locationId = movement.getDestinationLocationId().toString();
        String warehouseId = movement.getWarehouseId().toString();

        Inventory inventory = inventoryRepository
                .findByItemIdAndLocationId(itemId, locationId)
                .orElseGet(() -> createNewInventory(itemId, warehouseId, locationId, line));

        inventory.setQuantityOnHand(inventory.getQuantityOnHand() + quantity);
        inventory.setLastCountDate(LocalDate.now());

        Inventory saved = inventoryRepository.save(inventory);
        log.info("✅ RECEIPT complete: {} units now at location {}",
                saved.getQuantityOnHand(), locationId);

        // Check for low stock alerts
        checkLowStockAndCreateAlert(saved);

        publishInventoryUpdate(saved, "RECEIPT", quantity);
    }

    /**
     * 📤 ISSUE: Issuing goods out of warehouse (same as OUTBOUND)
     * Decreases inventory at source location
     */
    private void handleIssue(MovementCompletedEvent movement,
                             MovementCompletedEvent.MovementLineDTO line,
                             Double quantity) {
        log.info("📤 ISSUE: Removing {} units of item {} from location {}",
                quantity, line.getItemId(), movement.getSourceLocationId());

        String itemId = line.getItemId().toString();
        String locationId = movement.getSourceLocationId().toString();

        Inventory inventory = inventoryRepository
                .findByItemIdAndLocationId(itemId, locationId)
                .orElseThrow(() -> new RuntimeException("Inventory not found for ISSUE movement"));

        inventory.setQuantityOnHand(inventory.getQuantityOnHand() - quantity);
        inventory.setQuantityReserved(Math.max(0, inventory.getQuantityReserved() - quantity));
        inventory.setLastCountDate(LocalDate.now());

        Inventory saved = inventoryRepository.save(inventory);
        log.info("✅ ISSUE complete: {} units remain at location {}",
                saved.getQuantityOnHand(), locationId);

        // Check for low stock alerts
        checkLowStockAndCreateAlert(saved);

        publishInventoryUpdate(saved, "ISSUE", -quantity);
    }

    /**
     * 📦 PICKING: Pick items for orders
     * Moves inventory from storage to staging and marks as reserved
     */
    private void handlePicking(MovementCompletedEvent movement,
                               MovementCompletedEvent.MovementLineDTO line,
                               Double quantity) {
        log.info("📦 PICKING: Moving {} units from {} to staging {}",
                quantity, movement.getSourceLocationId(), movement.getDestinationLocationId());

        String itemId = line.getItemId().toString();
        String sourceLocationId = movement.getSourceLocationId().toString();
        String destLocationId = movement.getDestinationLocationId().toString();
        String warehouseId = movement.getWarehouseId().toString();

        // Decrease from source (storage location)
        Inventory sourceInventory = inventoryRepository
                .findByItemIdAndLocationId(itemId, sourceLocationId)
                .orElseThrow(() -> new RuntimeException("Source inventory not found for PICKING"));

        sourceInventory.setQuantityOnHand(sourceInventory.getQuantityOnHand() - quantity);
        Inventory savedSource = inventoryRepository.save(sourceInventory);
        log.info("✅ Decreased source (storage): {} units remain", savedSource.getQuantityOnHand());

        // Check for low stock alerts at source location
        checkLowStockAndCreateAlert(savedSource);

        // Increase at destination (staging/packing area) and mark as reserved
        Inventory destInventory = inventoryRepository
                .findByItemIdAndLocationId(itemId, destLocationId)
                .orElseGet(() -> createNewInventory(itemId, warehouseId, destLocationId, line));

        destInventory.setQuantityOnHand(destInventory.getQuantityOnHand() + quantity);
        destInventory.setQuantityReserved(destInventory.getQuantityReserved() + quantity); // Mark as reserved for order
        Inventory savedDest = inventoryRepository.save(destInventory);
        log.info("✅ Increased destination (staging): {} units, {} reserved",
                savedDest.getQuantityOnHand(), savedDest.getQuantityReserved());

        // Check for low stock alerts at destination location
        checkLowStockAndCreateAlert(savedDest);

        publishInventoryUpdate(savedDest, "PICKING", quantity);
    }

    /**
     * 🏪 PUTAWAY: Store received goods in final locations
     * Moves inventory from receiving to storage
     */
    private void handlePutaway(MovementCompletedEvent movement,
                               MovementCompletedEvent.MovementLineDTO line,
                               Double quantity) {
        log.info("🏪 PUTAWAY: Moving {} units from {} to storage {}",
                quantity, movement.getSourceLocationId(), movement.getDestinationLocationId());

        String itemId = line.getItemId().toString();
        String sourceLocationId = movement.getSourceLocationId().toString();
        String destLocationId = movement.getDestinationLocationId().toString();
        String warehouseId = movement.getWarehouseId().toString();

        // Decrease from receiving/staging area
        Inventory sourceInventory = inventoryRepository
                .findByItemIdAndLocationId(itemId, sourceLocationId)
                .orElseThrow(() -> new RuntimeException("Source inventory not found for PUTAWAY"));

        sourceInventory.setQuantityOnHand(sourceInventory.getQuantityOnHand() - quantity);
        Inventory savedSource = inventoryRepository.save(sourceInventory);
        log.info("✅ Decreased source (receiving): {} units remain", savedSource.getQuantityOnHand());

        // Check for low stock alerts at source location
        checkLowStockAndCreateAlert(savedSource);

        // Increase at final storage location
        Inventory destInventory = inventoryRepository
                .findByItemIdAndLocationId(itemId, destLocationId)
                .orElseGet(() -> createNewInventory(itemId, warehouseId, destLocationId, line));

        destInventory.setQuantityOnHand(destInventory.getQuantityOnHand() + quantity);
        Inventory savedDest = inventoryRepository.save(destInventory);
        log.info("✅ Increased destination (storage): {} units now available", savedDest.getQuantityOnHand());

        // Check for low stock alerts at destination location
        checkLowStockAndCreateAlert(savedDest);

        publishInventoryUpdate(savedDest, "PUTAWAY", quantity);
    }

    /**
     * ↩️ RETURN: Customer/supplier returns
     * Adds inventory back (same as RECEIPT)
     */
    private void handleReturn(MovementCompletedEvent movement,
                              MovementCompletedEvent.MovementLineDTO line,
                              Double quantity) {
        log.info("↩️ RETURN: Adding {} units back to location {}",
                quantity, movement.getDestinationLocationId());

        String itemId = line.getItemId().toString();
        String locationId = movement.getDestinationLocationId().toString();
        String warehouseId = movement.getWarehouseId().toString();

        Inventory inventory = inventoryRepository
                .findByItemIdAndLocationId(itemId, locationId)
                .orElseGet(() -> createNewInventory(itemId, warehouseId, locationId, line));

        inventory.setQuantityOnHand(inventory.getQuantityOnHand() + quantity);
        inventory.setLastCountDate(LocalDate.now());

        Inventory saved = inventoryRepository.save(inventory);
        log.info("✅ RETURN complete: {} units now at location {}",
                saved.getQuantityOnHand(), locationId);

        // Check for low stock alerts
        checkLowStockAndCreateAlert(saved);

        publishInventoryUpdate(saved, "RETURN", quantity);
    }

    /**
     * 🔢 CYCLE_COUNT: Physical inventory count
     * Adjusts inventory to match actual count (same as ADJUSTMENT)
     */
    private void handleCycleCount(MovementCompletedEvent movement,
                                  MovementCompletedEvent.MovementLineDTO line,
                                  Double quantity) {
        log.info("🔢 CYCLE_COUNT: Adjusting item {} to {} units based on count",
                line.getItemId(), quantity);

        String itemId = line.getItemId().toString();
        String locationId = line.getToLocationId() != null ?
                           line.getToLocationId().toString() :
                           movement.getDestinationLocationId().toString();

        Inventory inventory = inventoryRepository
                .findByItemIdAndLocationId(itemId, locationId)
                .orElseThrow(() -> new RuntimeException("Inventory not found for CYCLE_COUNT"));

        Double oldQuantity = inventory.getQuantityOnHand();
        inventory.setQuantityOnHand(quantity); // Set to actual counted quantity
        inventory.setLastCountDate(LocalDate.now());

        Inventory saved = inventoryRepository.save(inventory);
        log.info("✅ CYCLE_COUNT complete: {} → {} units (variance: {})",
                oldQuantity, quantity, quantity - oldQuantity);

        // Check for low stock alerts
        checkLowStockAndCreateAlert(saved);

        publishInventoryUpdate(saved, "CYCLE_COUNT", quantity - oldQuantity);
    }

    /**
     * 🚫 QUARANTINE: Move items to quarantine
     * Moves inventory and marks as damaged/quarantined
     */
    private void handleQuarantine(MovementCompletedEvent movement,
                                  MovementCompletedEvent.MovementLineDTO line,
                                  Double quantity) {
        log.info("🚫 QUARANTINE: Moving {} units from {} to quarantine {}",
                quantity, movement.getSourceLocationId(), movement.getDestinationLocationId());

        String itemId = line.getItemId().toString();
        String sourceLocationId = movement.getSourceLocationId().toString();
        String destLocationId = movement.getDestinationLocationId().toString();
        String warehouseId = movement.getWarehouseId().toString();

        // Decrease from source
        Inventory sourceInventory = inventoryRepository
                .findByItemIdAndLocationId(itemId, sourceLocationId)
                .orElseThrow(() -> new RuntimeException("Source inventory not found for QUARANTINE"));

        sourceInventory.setQuantityOnHand(sourceInventory.getQuantityOnHand() - quantity);
        Inventory savedSource = inventoryRepository.save(sourceInventory);
        log.info("✅ Decreased source: {} units remain", savedSource.getQuantityOnHand());

        // Check for low stock alerts at source location
        checkLowStockAndCreateAlert(savedSource);

        // Increase at quarantine location and mark as damaged
        Inventory destInventory = inventoryRepository
                .findByItemIdAndLocationId(itemId, destLocationId)
                .orElseGet(() -> createNewInventory(itemId, warehouseId, destLocationId, line));

        destInventory.setQuantityOnHand(destInventory.getQuantityOnHand() + quantity);
        destInventory.setQuantityDamaged(destInventory.getQuantityDamaged() + quantity); // Mark as damaged/quarantined
        destInventory.setStatus(InventoryStatus.DAMAGED); // Set status to damaged
        Inventory savedDest = inventoryRepository.save(destInventory);
        log.info("✅ Moved to quarantine: {} units quarantined", savedDest.getQuantityDamaged());

        // Check for low stock alerts at destination location
        checkLowStockAndCreateAlert(savedDest);

        publishInventoryUpdate(savedDest, "QUARANTINE", quantity);
    }

    /**
     * 📍 RELOCATION: Warehouse reorganization
     * Moves inventory to new optimized location (same as TRANSFER)
     */
    private void handleRelocation(MovementCompletedEvent movement,
                                  MovementCompletedEvent.MovementLineDTO line,
                                  Double quantity) {
        log.info("📍 RELOCATION: Moving {} units from {} to new location {}",
                quantity, movement.getSourceLocationId(), movement.getDestinationLocationId());

        String itemId = line.getItemId().toString();
        String sourceLocationId = movement.getSourceLocationId().toString();
        String destLocationId = movement.getDestinationLocationId().toString();
        String warehouseId = movement.getWarehouseId().toString();

        // Decrease from old location
        Inventory sourceInventory = inventoryRepository
                .findByItemIdAndLocationId(itemId, sourceLocationId)
                .orElseThrow(() -> new RuntimeException("Source inventory not found for RELOCATION"));

        sourceInventory.setQuantityOnHand(sourceInventory.getQuantityOnHand() - quantity);
        Inventory savedSource = inventoryRepository.save(sourceInventory);
        log.info("✅ Decreased old location: {} units remain", savedSource.getQuantityOnHand());

        // Check for low stock alerts at source location
        checkLowStockAndCreateAlert(savedSource);

        // Increase at new location
        Inventory destInventory = inventoryRepository
                .findByItemIdAndLocationId(itemId, destLocationId)
                .orElseGet(() -> createNewInventory(itemId, warehouseId, destLocationId, line));

        destInventory.setQuantityOnHand(destInventory.getQuantityOnHand() + quantity);
        Inventory savedDest = inventoryRepository.save(destInventory);
        log.info("✅ Increased new location: {} units now available", savedDest.getQuantityOnHand());

        // Check for low stock alerts at destination location
        checkLowStockAndCreateAlert(savedDest);

        publishInventoryUpdate(savedDest, "RELOCATION", quantity);
    }
}