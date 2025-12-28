package com.stock.qualityservice.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QualityControlUpdateRequest {

    @Size(min = 1, max = 50, message = "Inspection type must be between 1 and 50 characters")
    private String inspectionType;

    @Size(min = 1, max = 30, message = "Status must be between 1 and 30 characters")
    private String status;

    @Size(min = 1, max = 30, message = "Result must be between 1 and 30 characters")
    private String result;

    private Integer defectCount;

    private Integer samplesInspected;

    private String defectDescription;

    private String correctiveActions;

    private String notes;

    private LocalDateTime inspectionDate;

    private String inspectorId;

    private String inspectorName;

    private Boolean requiresReinspection;

    private LocalDateTime nextInspectionDate;

    private String certificateNumber;

    private List<InspectionResultRequest> inspectionResults;
}