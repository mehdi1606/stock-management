package com.stock.qualityservice.service;

import com.stock.qualityservice.dto.request.QualityAttachmentRequest;
import com.stock.qualityservice.dto.response.QualityAttachmentResponse;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface QualityAttachmentService {

    QualityAttachmentResponse uploadAttachment(QualityAttachmentRequest request, MultipartFile file);

    QualityAttachmentResponse uploadFile(MultipartFile file, String qualityControlId, String quarantineId,
                                         String description, String attachmentType);

    List<QualityAttachmentResponse> getAllAttachments();

    QualityAttachmentResponse getAttachmentById(String id);

    List<QualityAttachmentResponse> getAttachmentsByQualityControlId(String qualityControlId);

    List<QualityAttachmentResponse> getAttachmentsByQuarantineId(String quarantineId);

    List<QualityAttachmentResponse> getAttachmentsByType(String attachmentType);

    void deleteAttachment(String id);

    void deleteAttachmentsByQualityControlId(String qualityControlId);

    void deleteAttachmentsByQuarantineId(String quarantineId);
}