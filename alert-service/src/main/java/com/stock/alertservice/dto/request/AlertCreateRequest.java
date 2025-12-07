package com.stock.alertservice.dto.request;

import com.stock.alertservice.enums.AlertLevel;
import com.stock.alertservice.enums.AlertType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * DTO for creating a new alert
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AlertCreateRequest {

    @NotNull(message = "Alert type is required")
    private AlertType type;

    @NotNull(message = "Alert level is required")
    private AlertLevel level;

    @NotBlank(message = "Entity type is required")
    private String entityType;

    @NotBlank(message = "Entity ID is required")
    private String entityId;

    @NotBlank(message = "Message is required")
    private String message;

    private Map<String, Object> data;
}
