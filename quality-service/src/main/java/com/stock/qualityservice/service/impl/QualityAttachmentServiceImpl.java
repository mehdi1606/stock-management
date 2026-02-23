package com.stock.qualityservice.service.impl;

import com.stock.qualityservice.dto.request.QualityAttachmentRequest;
import com.stock.qualityservice.dto.response.QualityAttachmentResponse;
import com.stock.qualityservice.entity.QualityAttachment;
import com.stock.qualityservice.exception.ResourceNotFoundException;
import com.stock.qualityservice.exception.FileUploadException;
import com.stock.qualityservice.exception.InvalidFileTypeException;
import com.stock.qualityservice.repository.QualityAttachmentRepository;
import com.stock.qualityservice.service.QualityAttachmentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class QualityAttachmentServiceImpl implements QualityAttachmentService {

    private final QualityAttachmentRepository attachmentRepository;

    @Value("${file.upload.dir:./uploads/quality}")
    private String uploadDir;

    @Value("${file.upload.max-size:10485760}") // 10MB default
    private Long maxFileSize;

    private static final List<String> ALLOWED_FILE_TYPES = Arrays.asList(
            "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp",
            "video/mp4", "video/mpeg", "video/quicktime",
            "application/pdf", "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    @Override
    public QualityAttachmentResponse uploadAttachment(QualityAttachmentRequest request, MultipartFile file) {
        log.info("Uploading attachment: {}", file.getOriginalFilename());

        // Validate file
        validateFile(file);

        try {
            // Create upload directory if it doesn't exist
            Path uploadPath = Paths.get(uploadDir);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            // Generate unique file name
            String originalFileName = file.getOriginalFilename();
            String fileExtension = originalFileName != null && originalFileName.contains(".")
                    ? originalFileName.substring(originalFileName.lastIndexOf("."))
                    : "";
            String uniqueFileName = UUID.randomUUID().toString() + fileExtension;

            // Save file to disk
            Path filePath = uploadPath.resolve(uniqueFileName);
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

            // Create attachment entity
            QualityAttachment attachment = new QualityAttachment();
            attachment.setQualityControlId(request.getQualityControlId());
            attachment.setQuarantineId(request.getQuarantineId());
            attachment.setFileName(originalFileName);
            attachment.setFileType(file.getContentType());
            attachment.setFileSize(file.getSize());
            attachment.setFileUrl("/api/quality/attachments/download/" + uniqueFileName);
            attachment.setFilePath(filePath.toString());
            attachment.setDescription(request.getDescription());
            attachment.setAttachmentType(request.getAttachmentType());
            attachment.setUploadedBy("SYSTEM"); // TODO: Get from security context
            attachment.setUploadedAt(LocalDateTime.now());

            QualityAttachment savedAttachment = attachmentRepository.save(attachment);
            log.info("Attachment uploaded successfully with ID: {}", savedAttachment.getId());

            // Publish event to Kafka
           // qualityEventProducer.sendAttachmentUploadedEvent(savedAttachment);

            return mapToResponse(savedAttachment);

        } catch (IOException e) {
            log.error("Failed to upload file: {}", file.getOriginalFilename(), e);
            throw new FileUploadException("Failed to upload file", file.getOriginalFilename(), e);
        }
    }

    @Override
    public QualityAttachmentResponse uploadFile(MultipartFile file, String qualityControlId,
                                                String quarantineId, String description,
                                                String attachmentType) {
        log.info("Uploading file: {}", file.getOriginalFilename());

        // Validate file
        validateFile(file);

        try {
            // Create upload directory if not exists
            Path uploadPath = Paths.get(uploadDir);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            // Generate unique filename
            String originalFilename = file.getOriginalFilename();
            String fileExtension = originalFilename != null && originalFilename.contains(".")
                    ? originalFilename.substring(originalFilename.lastIndexOf("."))
                    : "";
            String uniqueFilename = UUID.randomUUID().toString() + fileExtension;

            // Save file
            Path filePath = uploadPath.resolve(uniqueFilename);
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

            // Create attachment record
            QualityAttachment attachment = new QualityAttachment();
            attachment.setQualityControlId(qualityControlId);
            attachment.setQuarantineId(quarantineId);
            attachment.setFileName(originalFilename);
            attachment.setFileType(file.getContentType());
            attachment.setFileSize(file.getSize());
            attachment.setFilePath(filePath.toString());
            attachment.setFileUrl("/api/v1/quality/attachments/download/" + uniqueFilename);
            attachment.setDescription(description);
            attachment.setAttachmentType(attachmentType);

            QualityAttachment savedAttachment = attachmentRepository.save(attachment);

            log.info("File uploaded successfully: {}", originalFilename);
            return mapToResponse(savedAttachment);

        } catch (IOException e) {
            log.error("Failed to upload file: {}", file.getOriginalFilename(), e);
            throw new FileUploadException(file.getOriginalFilename(), e.getMessage(), e);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<QualityAttachmentResponse> getAllAttachments() {
        log.info("Fetching all attachments");
        return attachmentRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public QualityAttachmentResponse getAttachmentById(String id) {
        log.info("Fetching attachment by ID: {}", id);

        QualityAttachment attachment = attachmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Attachment", "id", id));

        return mapToResponse(attachment);
    }

    @Override
    @Transactional(readOnly = true)
    public List<QualityAttachmentResponse> getAttachmentsByQualityControlId(String qualityControlId) {
        log.info("Fetching attachments for quality control ID: {}", qualityControlId);

        return attachmentRepository.findByQualityControlId(qualityControlId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<QualityAttachmentResponse> getAttachmentsByQuarantineId(String quarantineId) {
        log.info("Fetching attachments for quarantine ID: {}", quarantineId);

        return attachmentRepository.findByQuarantineId(quarantineId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<QualityAttachmentResponse> getAttachmentsByType(String attachmentType) {
        log.info("Fetching attachments by type: {}", attachmentType);

        return attachmentRepository.findByAttachmentType(attachmentType).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public void deleteAttachment(String id) {
        log.info("Deleting attachment ID: {}", id);

        QualityAttachment attachment = attachmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Attachment", "id", id));

        // Delete physical file
        deletePhysicalFile(attachment.getFilePath());

        // Delete record
        attachmentRepository.deleteById(id);
        log.info("Attachment deleted successfully: {}", id);
    }

    @Override
    public void deleteAttachmentsByQualityControlId(String qualityControlId) {
        log.info("Deleting attachments for quality control ID: {}", qualityControlId);

        List<QualityAttachment> attachments = attachmentRepository.findByQualityControlId(qualityControlId);

        // Delete physical files
        attachments.forEach(attachment -> deletePhysicalFile(attachment.getFilePath()));

        // Delete records
        attachmentRepository.deleteByQualityControlId(qualityControlId);
        log.info("Attachments deleted successfully for quality control: {}", qualityControlId);
    }

    @Override
    public void deleteAttachmentsByQuarantineId(String quarantineId) {
        log.info("Deleting attachments for quarantine ID: {}", quarantineId);

        List<QualityAttachment> attachments = attachmentRepository.findByQuarantineId(quarantineId);

        // Delete physical files
        attachments.forEach(attachment -> deletePhysicalFile(attachment.getFilePath()));

        // Delete records
        attachmentRepository.deleteByQuarantineId(quarantineId);
        log.info("Attachments deleted successfully for quarantine: {}", quarantineId);
    }

    // Helper methods
    private void validateFile(MultipartFile file) {
        // Check if file is empty
        if (file.isEmpty()) {
            throw new FileUploadException(file.getOriginalFilename(), "File is empty");
        }

        // Check file size
        if (file.getSize() > maxFileSize) {
            throw new FileUploadException(
                    file.getOriginalFilename(),
                    String.format("File size exceeds maximum allowed size of %d bytes", maxFileSize)
            );
        }

        // Check file type
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_FILE_TYPES.contains(contentType.toLowerCase())) {
            throw new InvalidFileTypeException(
                    contentType,
                    String.join(", ", ALLOWED_FILE_TYPES)
            );
        }
    }

    private void deletePhysicalFile(String filePath) {
        try {
            if (filePath != null && !filePath.isEmpty()) {
                Path path = Paths.get(filePath);
                if (Files.exists(path)) {
                    Files.delete(path);
                    log.info("Physical file deleted: {}", filePath);
                }
            }
        } catch (IOException e) {
            log.error("Failed to delete physical file: {}", filePath, e);
            // Don't throw exception here, just log the error
        }
    }

    private QualityAttachment mapToEntity(QualityAttachmentRequest request) {
        QualityAttachment attachment = new QualityAttachment();
        attachment.setQualityControlId(request.getQualityControlId());
        attachment.setQuarantineId(request.getQuarantineId());
        attachment.setFileName(request.getFileName());
        attachment.setFileType(request.getFileType());
        attachment.setFileSize(request.getFileSize());
        attachment.setFileUrl(request.getFileUrl());
        attachment.setFilePath(request.getFilePath());
        attachment.setDescription(request.getDescription());
        attachment.setAttachmentType(request.getAttachmentType());
        return attachment;
    }

    private QualityAttachmentResponse mapToResponse(QualityAttachment attachment) {
        QualityAttachmentResponse response = new QualityAttachmentResponse();
        response.setId(attachment.getId());
        response.setQualityControlId(attachment.getQualityControlId());
        response.setQuarantineId(attachment.getQuarantineId());
        response.setFileName(attachment.getFileName());
        response.setFileType(attachment.getFileType());
        response.setFileSize(attachment.getFileSize());
        response.setFileUrl(attachment.getFileUrl());
        response.setFilePath(attachment.getFilePath());
        response.setDescription(attachment.getDescription());
        response.setAttachmentType(attachment.getAttachmentType());
        response.setUploadedBy(attachment.getUploadedBy());
        response.setUploadedAt(attachment.getUploadedAt());
        return response;
    }
}