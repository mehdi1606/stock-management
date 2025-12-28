package com.stock.qualityservice.service.impl;

import com.stock.qualityservice.dto.request.QualityControlRequest;
import com.stock.qualityservice.dto.request.QualityControlUpdateRequest;
import com.stock.qualityservice.dto.response.QualityControlResponse;
import com.stock.qualityservice.dto.response.InspectionResultResponse;
import com.stock.qualityservice.entity.QualityControl;
import com.stock.qualityservice.entity.InspectionResult;
import com.stock.qualityservice.entity.QCStatus;
import com.stock.qualityservice.entity.Disposition;
import com.stock.qualityservice.exception.*;
import com.stock.qualityservice.repository.QualityControlRepository;
import com.stock.qualityservice.service.QualityControlService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class QualityControlServiceImpl implements QualityControlService {

    private final QualityControlRepository qualityControlRepository;
    private final com.stock.qualityservice.event.QualityEventPublisher qualityEventPublisher;
    private final com.stock.qualityservice.service.QuarantineService quarantineService;
    private final com.stock.qualityservice.client.LocationServiceClient locationServiceClient;
    private final com.stock.qualityservice.client.InventoryServiceClient inventoryServiceClient;

    @Override
    public QualityControlResponse createQualityControl(QualityControlRequest request) {
        log.info("Creating quality control for item ID: {}", request.getItemId());

        List<QCStatus> activeStatuses = Arrays.asList(QCStatus.PENDING, QCStatus.IN_PROGRESS);
        if (qualityControlRepository.existsByItemIdAndLotIdAndStatusIn(
                request.getItemId(), request.getLotId(), activeStatuses)) {
            throw new DuplicateInspectionException(request.getItemId(), request.getLotId());
        }

        QualityControl inspection = mapToEntity(request);
        inspection.setInspectionNumber(generateInspectionNumber());
        QualityControl savedInspection = qualityControlRepository.save(inspection);

        log.info("Quality control created successfully with ID: {}", savedInspection.getId());
        return mapToResponse(savedInspection);
    }

    @Override
    public QualityControlResponse updateQualityControl(String id, QualityControlUpdateRequest request) {
        log.info("Updating quality control ID: {}", id);

        QualityControl inspection = qualityControlRepository.findById(id)
                .orElseThrow(() -> new InspectionNotFoundException(id));

        if (inspection.getStatus() == QCStatus.PASSED || inspection.getStatus() == QCStatus.FAILED) {
            throw new InspectionAlreadyCompletedException(id);
        }

        updateEntityFromRequest(inspection, request);

        // Set audit trail - capture who updated the record
        try {
            String updatedBy = org.springframework.security.core.context.SecurityContextHolder
                .getContext().getAuthentication().getName();
            inspection.setUpdatedBy(updatedBy);
        } catch (Exception e) {
            log.warn("Could not get authenticated user for audit trail: {}", e.getMessage());
            inspection.setUpdatedBy("SYSTEM");
        }

        QualityControl updatedInspection = qualityControlRepository.save(inspection);

        // Publish quality control updated event
        publishQualityControlUpdatedEvent(updatedInspection);

        log.info("Quality control updated successfully: {}", id);
        return mapToResponse(updatedInspection);
    }

    @Override
    @Transactional(readOnly = true)
    public QualityControlResponse getQualityControlById(String id) {
        log.info("Fetching quality control by ID: {}", id);

        QualityControl inspection = qualityControlRepository.findById(id)
                .orElseThrow(() -> new InspectionNotFoundException(id));

        return mapToResponse(inspection);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<QualityControlResponse> getAllQualityControls(Pageable pageable) {
        log.info("Fetching all quality controls with pagination");
        return qualityControlRepository.findAll(pageable)
                .map(this::mapToResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public List<QualityControlResponse> getQualityControlsByProductId(String productId) {
        log.info("Fetching quality controls for product ID: {}", productId);
        return qualityControlRepository.findByItemId(productId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<QualityControlResponse> getQualityControlsByBatchNumber(String batchNumber) {
        log.info("Fetching quality controls for batch number: {}", batchNumber);
        return qualityControlRepository.findByLotId(batchNumber).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public Page<QualityControlResponse> getQualityControlsByStatus(String status, Pageable pageable) {
        log.info("Fetching quality controls by status: {}", status);
        QCStatus qcStatus = QCStatus.valueOf(status.toUpperCase());
        return qualityControlRepository.findByStatus(qcStatus, pageable)
                .map(this::mapToResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public List<QualityControlResponse> getQualityControlsByInspector(String inspectorId) {
        log.info("Fetching quality controls for inspector ID: {}", inspectorId);
        return qualityControlRepository.findByInspectorId(inspectorId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<QualityControlResponse> getQualityControlsByDateRange(LocalDateTime startDate, LocalDateTime endDate) {
        log.info("Fetching quality controls between {} and {}", startDate, endDate);
        return qualityControlRepository.findByCreatedAtBetween(startDate, endDate).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public QualityControlResponse updateQualityControlStatus(String id, String status) {
        log.info("Updating status for quality control ID {} to {}", id, status);

        QualityControl inspection = qualityControlRepository.findById(id)
                .orElseThrow(() -> new InspectionNotFoundException(id));

        QCStatus oldStatus = inspection.getStatus();
        QCStatus newStatus = QCStatus.valueOf(status.toUpperCase());

        // Validate status transition
        validateStatusTransition(oldStatus, newStatus);

        inspection.setStatus(newStatus);

        // Set end time for final statuses
        if (newStatus == QCStatus.PASSED || newStatus == QCStatus.FAILED || newStatus == QCStatus.QUARANTINED) {
            inspection.setEndTime(LocalDateTime.now());

            // Set approved timestamp
            if (inspection.getApprovedAt() == null) {
                inspection.setApprovedAt(LocalDateTime.now());
                try {
                    String approvedBy = org.springframework.security.core.context.SecurityContextHolder
                        .getContext().getAuthentication().getName();
                    inspection.setApprovedBy(approvedBy);
                } catch (Exception e) {
                    inspection.setApprovedBy("SYSTEM");
                }
            }
        }

        // Set disposition based on status
        if (newStatus == QCStatus.PASSED) {
            inspection.setDisposition(Disposition.ACCEPT);
        } else if (newStatus == QCStatus.FAILED) {
            inspection.setDisposition(Disposition.REJECT);
        } else if (newStatus == QCStatus.QUARANTINED) {
            inspection.setDisposition(Disposition.QUARANTINE);
        }

        QualityControl updatedInspection = qualityControlRepository.save(inspection);
        log.info("Quality control status updated successfully: {}", id);

        // Adjust inventory based on quality results
        adjustInventoryForQualityResults(updatedInspection, newStatus);

        // Publish appropriate event
        publishStatusChangeEvent(updatedInspection, newStatus);

        return mapToResponse(updatedInspection);
    }

    /**
     * Adjust inventory based on quality control results
     */
    private void adjustInventoryForQualityResults(QualityControl inspection, QCStatus newStatus) {
        try {
            // Only adjust inventory for final statuses
            if (newStatus != QCStatus.PASSED && newStatus != QCStatus.FAILED && newStatus != QCStatus.QUARANTINED) {
                log.debug("Skipping inventory adjustment for non-final status: {}", newStatus);
                return;
            }

            log.info("📊 Adjusting inventory based on quality control results for ID: {}", inspection.getId());

            // Parse location ID
            UUID locationId = null;
            if (inspection.getInspectionLocationId() != null) {
                try {
                    locationId = UUID.fromString(inspection.getInspectionLocationId());
                } catch (IllegalArgumentException e) {
                    log.error("Invalid location ID format: {}", inspection.getInspectionLocationId());
                }
            }

            // Parse lot ID
            UUID lotId = null;
            if (inspection.getLotId() != null) {
                try {
                    lotId = UUID.fromString(inspection.getLotId());
                } catch (IllegalArgumentException e) {
                    log.warn("Invalid lot ID format: {}", inspection.getLotId());
                }
            }

            // Calculate quantities based on status
            Double totalQuantity = inspection.getQuantityInspected() != null ? inspection.getQuantityInspected() : 0.0;
            Double passedQuantity = 0.0;
            Double failedQuantity = 0.0;
            Double quarantinedQuantity = 0.0;

            if (newStatus == QCStatus.PASSED) {
                passedQuantity = totalQuantity;
                inspection.setPassedQuantity(passedQuantity);
                inspection.setFailedQuantity(0.0);
            } else if (newStatus == QCStatus.FAILED) {
                failedQuantity = totalQuantity;
                inspection.setPassedQuantity(0.0);
                inspection.setFailedQuantity(failedQuantity);
            } else if (newStatus == QCStatus.QUARANTINED) {
                quarantinedQuantity = totalQuantity;
                inspection.setPassedQuantity(0.0);
                inspection.setFailedQuantity(0.0);
            }

            // Update inspection with calculated quantities
            qualityControlRepository.save(inspection);

            // Build adjustment request
            com.stock.qualityservice.client.InventoryServiceClient.QualityAdjustmentRequest adjustmentRequest =
                new com.stock.qualityservice.client.InventoryServiceClient.QualityAdjustmentRequest();
            adjustmentRequest.setItemId(UUID.fromString(inspection.getItemId()));
            adjustmentRequest.setLocationId(locationId);
            adjustmentRequest.setLotId(lotId);
            adjustmentRequest.setQualityStatus(newStatus.name());
            adjustmentRequest.setTotalQuantity(totalQuantity);
            adjustmentRequest.setPassedQuantity(passedQuantity);
            adjustmentRequest.setFailedQuantity(failedQuantity);
            adjustmentRequest.setQuarantinedQuantity(quarantinedQuantity);
            adjustmentRequest.setInspectionId(inspection.getId());
            adjustmentRequest.setReason("Quality inspection " + newStatus.name().toLowerCase() + " - Inspection #" + inspection.getInspectionNumber());

            // Call inventory service to adjust quantities
            Boolean success = inventoryServiceClient.adjustInventoryForQuality(adjustmentRequest);

            if (Boolean.TRUE.equals(success)) {
                log.info("✅ Inventory adjusted successfully for quality control: {}", inspection.getId());
            } else {
                log.warn("⚠️ Inventory adjustment returned false for quality control: {}", inspection.getId());
            }

        } catch (Exception e) {
            log.error("❌ Failed to adjust inventory for quality control {}: {}", inspection.getId(), e.getMessage(), e);
            // Don't fail the status update if inventory adjustment fails
        }
    }

    /**
     * Publish appropriate event based on status change
     */
    private void publishStatusChangeEvent(QualityControl inspection, QCStatus newStatus) {
        try {
            if (newStatus == QCStatus.PASSED) {
                qualityEventPublisher.publishInspectionCompleted(inspection);
            } else if (newStatus == QCStatus.FAILED) {
                qualityEventPublisher.publishInspectionFailed(inspection);
            } else {
                qualityEventPublisher.publishQualityControlUpdated(inspection);
            }
        } catch (Exception e) {
            log.error("Failed to publish status change event: {}", e.getMessage());
        }
    }

    @Override
    public QualityControlResponse approveQualityControl(String id) {
        log.info("✅ Approving quality control ID: {}", id);

        QualityControl inspection = qualityControlRepository.findById(id)
                .orElseThrow(() -> new InspectionNotFoundException(id));

        if (inspection.getStatus() == QCStatus.PASSED) {
            log.warn("⚠️ Inspection already approved: {}", id);
            return mapToResponse(inspection);
        }

        if (inspection.getStatus() != QCStatus.PENDING && inspection.getStatus() != QCStatus.IN_PROGRESS) {
            throw new InvalidInspectionStateException(id, inspection.getStatus(), "approve");
        }

        // Update inspection status
        inspection.setStatus(QCStatus.PASSED);
        inspection.setApprovedBy("SYSTEM"); // TODO: Get from security context
        inspection.setApprovedAt(LocalDateTime.now());
        inspection.setDisposition(Disposition.ACCEPT);
        inspection.setEndTime(LocalDateTime.now());

        QualityControl approvedInspection = qualityControlRepository.save(inspection);
        log.info("✅ Quality control approved successfully: {}", id);

        // Publish inspection completed event
        qualityEventPublisher.publishInspectionCompleted(approvedInspection);

        return mapToResponse(approvedInspection);
    }

    @Override
    public QualityControlResponse rejectQualityControl(String id, String reason) {
        log.info("❌ Rejecting quality control ID: {} with reason: {}", id, reason);

        QualityControl inspection = qualityControlRepository.findById(id)
                .orElseThrow(() -> new InspectionNotFoundException(id));

        if (inspection.getStatus() == QCStatus.FAILED) {
            log.warn("⚠️ Inspection already rejected: {}", id);
            return mapToResponse(inspection);
        }

        if (inspection.getStatus() != QCStatus.PENDING && inspection.getStatus() != QCStatus.IN_PROGRESS) {
            throw new InvalidInspectionStateException(id, inspection.getStatus(), "reject");
        }

        // Update inspection status
        inspection.setStatus(QCStatus.FAILED);
        inspection.setDisposition(Disposition.REJECT);
        inspection.setInspectorNotes(reason);
        inspection.setApprovedBy("SYSTEM"); // TODO: Get from security context
        inspection.setApprovedAt(LocalDateTime.now());
        inspection.setEndTime(LocalDateTime.now());

        QualityControl rejectedInspection = qualityControlRepository.save(inspection);
        log.info("❌ Quality control rejected successfully: {}", id);

        // Publish inspection failed event
        qualityEventPublisher.publishInspectionFailed(rejectedInspection);

        // Auto-create quarantine for rejected items
        try {
            log.info("🚫 Auto-creating quarantine for rejected inspection: {}", id);

            // Get quarantine location for the warehouse
            UUID quarantineLocationId = null;
            if (inspection.getInspectionLocationId() != null) {
                com.stock.qualityservice.client.LocationServiceClient.LocationDTO quarantineLocation =
                        locationServiceClient.getQuarantineLocation(UUID.fromString(inspection.getInspectionLocationId()));
                if (quarantineLocation != null) {
                    quarantineLocationId = quarantineLocation.getId();
                }
            }

            // Create quarantine request
            com.stock.qualityservice.dto.request.QuarantineRequest quarantineRequest =
                    new com.stock.qualityservice.dto.request.QuarantineRequest();
            quarantineRequest.setItemId(inspection.getItemId());
            quarantineRequest.setLotId(inspection.getLotId());
            quarantineRequest.setSerialNumber(inspection.getSerialNumber());
            quarantineRequest.setQuantity(inspection.getQuantityInspected());
            quarantineRequest.setLocationId(quarantineLocationId != null ? quarantineLocationId.toString() : null);
            quarantineRequest.setReason("Failed quality inspection: " + reason);
            quarantineRequest.setSeverity("HIGH");
            quarantineRequest.setRelatedInspectionId(id);

            com.stock.qualityservice.dto.response.QuarantineResponse quarantine =
                    quarantineService.createQuarantine(quarantineRequest);

            // Link quarantine to inspection
            inspection.setQuarantineId(quarantine.getId());
            qualityControlRepository.save(inspection);

            log.info("✅ Quarantine created successfully: {}", quarantine.getQuarantineNumber());

        } catch (Exception e) {
            log.error("❌ Failed to create quarantine for rejected inspection: {}", e.getMessage());
            // Don't fail the rejection if quarantine creation fails
        }

        return mapToResponse(rejectedInspection);
    }

    @Override
    public void deleteQualityControl(String id) {
        log.info("Deleting quality control ID: {}", id);

        if (!qualityControlRepository.existsById(id)) {
            throw new InspectionNotFoundException(id);
        }

        qualityControlRepository.deleteById(id);
        log.info("Quality control deleted successfully: {}", id);
    }

    // Helper methods
    private String generateInspectionNumber() {
        return "INS-" + System.currentTimeMillis() + "-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }

    private QualityControl mapToEntity(QualityControlRequest request) {
        QualityControl inspection = new QualityControl();
        inspection.setItemId(request.getItemId());
        inspection.setLotId(request.getLotId());
        inspection.setSerialNumber(request.getSerialNumber());
        inspection.setQuantityInspected(request.getQuantityInspected());
        inspection.setInspectionType(request.getInspectionType());
        inspection.setStatus(QCStatus.PENDING);
        inspection.setQualityProfileId(request.getQualityProfileId());
        inspection.setSamplingPlanId(request.getSamplingPlanId());
        inspection.setInspectorId(request.getInspectorId());
        inspection.setInspectionLocationId(request.getInspectionLocationId());
        inspection.setScheduledDate(request.getScheduledDate());
        inspection.setQuarantineId(request.getQuarantineId());
        return inspection;
    }

    private void updateEntityFromRequest(QualityControl inspection, QualityControlUpdateRequest request) {
        // Update inspection type
        if (request.getInspectionType() != null && !request.getInspectionType().isEmpty()) {
            try {
                inspection.setInspectionType(com.stock.qualityservice.entity.QCType.valueOf(
                    request.getInspectionType().toUpperCase()));
            } catch (IllegalArgumentException e) {
                log.warn("Invalid inspection type: {}", request.getInspectionType());
            }
        }

        // Update status with validation
        if (request.getStatus() != null && !request.getStatus().isEmpty()) {
            QCStatus newStatus = QCStatus.valueOf(request.getStatus().toUpperCase());
            validateStatusTransition(inspection.getStatus(), newStatus);
            inspection.setStatus(newStatus);
        }

        // Update result/disposition
        if (request.getResult() != null && !request.getResult().isEmpty()) {
            try {
                inspection.setDisposition(Disposition.valueOf(request.getResult().toUpperCase()));
            } catch (IllegalArgumentException e) {
                log.warn("Invalid result/disposition: {}", request.getResult());
            }
        }

        // Update defect count
        if (request.getDefectCount() != null) {
            inspection.setDefectCount(request.getDefectCount());
        }

        // Update samples inspected
        if (request.getSamplesInspected() != null) {
            inspection.setQuantityInspected(request.getSamplesInspected().doubleValue());
        }

        // Update defect description - separate from general notes
        if (request.getDefectDescription() != null) {
            inspection.setDefectType(request.getDefectDescription());
        }

        // Update corrective actions
        if (request.getCorrectiveActions() != null) {
            inspection.setCorrectiveAction(request.getCorrectiveActions());
        }

        // Update general notes
        if (request.getNotes() != null) {
            inspection.setInspectorNotes(request.getNotes());
        }

        // Update inspection date
        if (request.getInspectionDate() != null) {
            inspection.setScheduledDate(request.getInspectionDate());
        }

        // Update inspector information
        if (request.getInspectorId() != null && !request.getInspectorId().isEmpty()) {
            inspection.setInspectorId(request.getInspectorId());
        }

        if (request.getInspectorName() != null && !request.getInspectorName().isEmpty()) {
            inspection.setInspectedBy(request.getInspectorName());
        }

        // Update certificate number
        if (request.getCertificateNumber() != null) {
            inspection.setNotes(request.getCertificateNumber());
        }

        // Update inspection results if provided
        if (request.getInspectionResults() != null && !request.getInspectionResults().isEmpty()) {
            updateInspectionResults(inspection, request.getInspectionResults());
        }
    }

    private void validateStatusTransition(QCStatus currentStatus, QCStatus newStatus) {
        // If status is not changing, allow it
        if (currentStatus == newStatus) {
            return;
        }

        // Define valid status transitions
        boolean isValidTransition = switch (currentStatus) {
            case PENDING -> newStatus == QCStatus.IN_PROGRESS ||
                           newStatus == QCStatus.QUARANTINED;
            case IN_PROGRESS -> newStatus == QCStatus.PASSED ||
                               newStatus == QCStatus.FAILED ||
                               newStatus == QCStatus.QUARANTINED ||
                               newStatus == QCStatus.CONDITIONAL_ACCEPT;
            case QUARANTINED -> newStatus == QCStatus.IN_PROGRESS ||
                               newStatus == QCStatus.FAILED;
            case CONDITIONAL_ACCEPT -> newStatus == QCStatus.PASSED ||
                                      newStatus == QCStatus.FAILED;
            case PASSED, FAILED -> false; // Already handled in update method
        };

        if (!isValidTransition) {
            throw new InvalidInspectionStateException(
                "Invalid status transition from " + currentStatus + " to " + newStatus);
        }
    }

    private void updateInspectionResults(QualityControl inspection,
                                        List<com.stock.qualityservice.dto.request.InspectionResultRequest> resultRequests) {
        // Clear existing results
        inspection.getInspectionResults().clear();

        // Add updated results
        for (com.stock.qualityservice.dto.request.InspectionResultRequest resultRequest : resultRequests) {
            InspectionResult result = new InspectionResult();
            result.setQualityControl(inspection);
            result.setTestParameter(resultRequest.getTestParameter());
            result.setExpectedValue(resultRequest.getExpectedValue());
            result.setActualValue(resultRequest.getActualValue());
            result.setUnitOfMeasure(resultRequest.getUnitOfMeasure());
            result.setMinValue(resultRequest.getMinValue());
            result.setMaxValue(resultRequest.getMaxValue());
            result.setIsPassed(resultRequest.getIsPassed());
            result.setDefectType(resultRequest.getDefectType());
            result.setDefectSeverity(resultRequest.getDefectSeverity());
            result.setRemarks(resultRequest.getRemarks());
            result.setSequenceOrder(resultRequest.getSequenceOrder());

            inspection.getInspectionResults().add(result);
        }
    }

    private QualityControlResponse mapToResponse(QualityControl inspection) {
        QualityControlResponse response = new QualityControlResponse();
        response.setId(inspection.getId());
        response.setInspectionNumber(inspection.getInspectionNumber());
        response.setItemId(inspection.getItemId());
        response.setLotId(inspection.getLotId());
        response.setSerialNumber(inspection.getSerialNumber());
        response.setQuantityInspected(inspection.getQuantityInspected());
        response.setInspectionType(inspection.getInspectionType());
        response.setStatus(inspection.getStatus());
        response.setQualityProfileId(inspection.getQualityProfileId());
        response.setSamplingPlanId(inspection.getSamplingPlanId());
        response.setInspectorId(inspection.getInspectorId());
        response.setInspectionLocationId(inspection.getInspectionLocationId());
        response.setScheduledDate(inspection.getScheduledDate());
        response.setStartTime(inspection.getStartTime());
        response.setEndTime(inspection.getEndTime());
        response.setDisposition(inspection.getDisposition());
        response.setPassedQuantity(inspection.getPassedQuantity());
        response.setFailedQuantity(inspection.getFailedQuantity());
        response.setDefectCount(inspection.getDefectCount());
        response.setDefectRate(inspection.getDefectRate());
        response.setInspectorNotes(inspection.getInspectorNotes());
        response.setCorrectiveAction(inspection.getCorrectiveAction());
        response.setQuarantineId(inspection.getQuarantineId());
        response.setApprovedBy(inspection.getApprovedBy());
        response.setApprovedAt(inspection.getApprovedAt());
        response.setCreatedAt(inspection.getCreatedAt());
        response.setUpdatedAt(inspection.getUpdatedAt());
        response.setCreatedBy(inspection.getCreatedBy());
        response.setUpdatedBy(inspection.getUpdatedBy());

        if (inspection.getInspectionResults() != null && !inspection.getInspectionResults().isEmpty()) {
            List<InspectionResultResponse> resultResponses = inspection.getInspectionResults().stream()
                    .map(this::mapResultToResponse)
                    .collect(Collectors.toList());
            response.setInspectionResults(resultResponses);
        }

        return response;
    }

    private InspectionResultResponse mapResultToResponse(InspectionResult result) {
        InspectionResultResponse response = new InspectionResultResponse();
        response.setId(result.getId());
        response.setQualityControlId(result.getQualityControl().getId());
        response.setTestParameter(result.getTestParameter());
        response.setExpectedValue(result.getExpectedValue());
        response.setActualValue(result.getActualValue());
        response.setUnitOfMeasure(result.getUnitOfMeasure());
        response.setMinValue(result.getMinValue());
        response.setMaxValue(result.getMaxValue());
        response.setIsPassed(result.getIsPassed());
        response.setDefectType(result.getDefectType());
        response.setDefectSeverity(result.getDefectSeverity());
        response.setRemarks(result.getRemarks());
        response.setSequenceOrder(result.getSequenceOrder());
        response.setCreatedAt(result.getCreatedAt());
        return response;
    }

    private void publishQualityControlUpdatedEvent(QualityControl inspection) {
        try {
            log.info("Publishing quality control updated event for ID: {}", inspection.getId());
            qualityEventPublisher.publishQualityControlUpdated(inspection);
        } catch (Exception e) {
            log.error("Failed to publish quality control updated event: {}", e.getMessage());
            // Don't fail the update if event publishing fails
        }
    }
}