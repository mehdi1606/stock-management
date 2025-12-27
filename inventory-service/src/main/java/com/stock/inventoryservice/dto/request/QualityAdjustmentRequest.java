package com.stock.inventoryservice.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * Request DTO for adjusting inventory based on quality control results
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class QualityAdjustmentRequest {

    @NotNull(message = "Item ID is required")
    private UUID itemId;

    private UUID locationId;

    private UUID lotId;

    @NotNull(message = "Quality status is required")
    private String qualityStatus; // PASSED, FAILED, QUARANTINED

    @NotNull(message = "Total quantity is required")
    @PositiveOrZero(message = "Total quantity must be positive or zero")
    private Double totalQuantity;

    @PositiveOrZero(message = "Passed quantity must be positive or zero")
    private Double passedQuantity;

    @PositiveOrZero(message = "Failed quantity must be positive or zero")
    private Double failedQuantity;

    @PositiveOrZero(message = "Quarantined quantity must be positive or zero")
    private Double quarantinedQuantity;

    private String inspectionId;

    private String reason;
}
