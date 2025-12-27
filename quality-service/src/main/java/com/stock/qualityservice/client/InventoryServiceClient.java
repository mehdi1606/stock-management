package com.stock.qualityservice.client;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.UUID;

/**
 * 📊 Inventory Service Client
 * REST client for inventory operations and status updates
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class InventoryServiceClient {

    private final RestTemplate restTemplate;

    @Value("${services.inventory.url:http://localhost:8086}")
    private String inventoryServiceUrl;

    /**
     * Get inventory details
     */
    public InventoryDTO getInventory(UUID itemId, UUID locationId) {
        try {
            log.info("🔍 Fetching inventory for item: {} at location: {}", itemId, locationId);
            String url = inventoryServiceUrl + "/api/inventory?itemId=" + itemId + "&locationId=" + locationId;
            InventoryDTO inventory = restTemplate.getForObject(url, InventoryDTO.class);
            log.info("✅ Inventory fetched successfully");
            return inventory;
        } catch (Exception e) {
            log.error("❌ Failed to fetch inventory: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Update inventory status
     */
    public Boolean updateInventoryStatus(UUID itemId, UUID lotId, String newStatus, String reason) {
        try {
            log.info("🔄 Updating inventory status for item: {}, lot: {} to: {}",
                     itemId, lotId, newStatus);

            String url = inventoryServiceUrl + "/api/inventory/update-status";

            UpdateStatusRequest request = new UpdateStatusRequest();
            request.setItemId(itemId);
            request.setLotId(lotId);
            request.setNewStatus(newStatus);
            request.setReason(reason);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<UpdateStatusRequest> entity = new HttpEntity<>(request, headers);

            restTemplate.exchange(url, HttpMethod.POST, entity, Void.class);
            log.info("✅ Inventory status updated successfully");
            return true;

        } catch (Exception e) {
            log.error("❌ Failed to update inventory status: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Check if inventory is available
     */
    public Boolean isAvailable(UUID itemId, UUID locationId, Double quantity) {
        try {
            log.info("🔍 Checking availability for item: {} at location: {}, quantity: {}",
                     itemId, locationId, quantity);

            String url = inventoryServiceUrl + "/api/inventory/check-availability" +
                    "?itemId=" + itemId +
                    "&locationId=" + locationId +
                    "&quantity=" + quantity;

            Boolean available = restTemplate.getForObject(url, Boolean.class);
            log.info("✅ Availability check: {}", available);
            return available != null ? available : false;

        } catch (Exception e) {
            log.error("❌ Failed to check availability: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Reserve inventory for inspection
     */
    public Boolean reserveForInspection(UUID itemId, UUID locationId, Double quantity) {
        try {
            log.info("📌 Reserving inventory for inspection - item: {}, location: {}, quantity: {}",
                     itemId, locationId, quantity);

            String url = inventoryServiceUrl + "/api/inventory/reserve";

            ReserveRequest request = new ReserveRequest();
            request.setItemId(itemId);
            request.setLocationId(locationId);
            request.setQuantity(quantity);
            request.setReason("QUALITY_INSPECTION");

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<ReserveRequest> entity = new HttpEntity<>(request, headers);

            restTemplate.exchange(url, HttpMethod.POST, entity, Void.class);
            log.info("✅ Inventory reserved successfully");
            return true;

        } catch (Exception e) {
            log.error("❌ Failed to reserve inventory: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Release reservation
     */
    public Boolean releaseReservation(UUID itemId, UUID locationId, Double quantity) {
        try {
            log.info("↩️ Releasing inventory reservation - item: {}, location: {}, quantity: {}",
                     itemId, locationId, quantity);

            String url = inventoryServiceUrl + "/api/inventory/release-reservation";

            ReserveRequest request = new ReserveRequest();
            request.setItemId(itemId);
            request.setLocationId(locationId);
            request.setQuantity(quantity);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<ReserveRequest> entity = new HttpEntity<>(request, headers);

            restTemplate.exchange(url, HttpMethod.POST, entity, Void.class);
            log.info("✅ Reservation released successfully");
            return true;

        } catch (Exception e) {
            log.error("❌ Failed to release reservation: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Adjust inventory based on quality control results
     */
    public Boolean adjustInventoryForQuality(QualityAdjustmentRequest request) {
        try {
            log.info("📊 Adjusting inventory based on quality results - item: {}, passed: {}, failed: {}",
                     request.getItemId(), request.getPassedQuantity(), request.getFailedQuantity());

            String url = inventoryServiceUrl + "/api/inventory/quality-adjustment";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<QualityAdjustmentRequest> entity = new HttpEntity<>(request, headers);

            restTemplate.exchange(url, HttpMethod.POST, entity, Void.class);
            log.info("✅ Inventory adjusted successfully based on quality results");
            return true;

        } catch (Exception e) {
            log.error("❌ Failed to adjust inventory for quality: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Inventory DTO
     */
    @lombok.Data
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class InventoryDTO {
        private UUID id;
        private UUID itemId;
        private UUID locationId;
        private UUID warehouseId;
        private Double quantityOnHand;
        private Double quantityReserved;
        private Double quantityDamaged;
        private Double availableQuantity;
        private String status; // AVAILABLE, RESERVED, QUARANTINED, DAMAGED
    }

    /**
     * Update Status Request
     */
    @lombok.Data
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class UpdateStatusRequest {
        private UUID itemId;
        private UUID lotId;
        private String newStatus;
        private String reason;
    }

    /**
     * Reserve Request
     */
    @lombok.Data
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class ReserveRequest {
        private UUID itemId;
        private UUID locationId;
        private Double quantity;
        private String reason;
    }

    /**
     * Quality Adjustment Request
     */
    @lombok.Data
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class QualityAdjustmentRequest {
        private UUID itemId;
        private UUID locationId;
        private UUID lotId;
        private String qualityStatus; // PASSED, FAILED, QUARANTINED
        private Double totalQuantity;
        private Double passedQuantity;
        private Double failedQuantity;
        private Double quarantinedQuantity;
        private String inspectionId;
        private String reason;
    }
}
