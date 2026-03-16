package com.stock.authservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.util.FileCopyUtils;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;
    private final ResourceLoader resourceLoader;

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Value("${app.frontend-url:http://localhost:3000}")
    private String frontendUrl;

    /**
     * Send HTML verification email using template
     */
    public void sendVerificationEmail(String email, String token) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(email);
            helper.setSubject("Verify Your Email - Stock Management System");

            // Build verification URL - points to frontend
            String verificationUrl = frontendUrl + "/verify-email?token=" + token;

            // Load and populate template
            String htmlContent = loadEmailTemplate("classpath:templates/email-verification.html");
            htmlContent = htmlContent.replace("${verificationUrl}", verificationUrl);
            htmlContent = htmlContent.replace("${email}", email);

            helper.setText(htmlContent, true); // true = HTML content

            mailSender.send(message);

            log.info("Verification email sent successfully to: {}", email);
        } catch (MessagingException | IOException e) {
            log.error("Failed to send verification email to: {}", email, e);
            throw new RuntimeException("Failed to send verification email", e);
        }
    }

    /**
     * Send HTML welcome email using template
     */
    public void sendWelcomeEmail(String email, String username) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(email);
            helper.setSubject("Welcome to Stock Management System! 🎉");

            // Load and populate template
            String htmlContent = loadEmailTemplate("classpath:templates/email-welcome.html");
            htmlContent = htmlContent.replace("${username}", username);
            htmlContent = htmlContent.replace("${email}", email);

            helper.setText(htmlContent, true); // true = HTML content

            mailSender.send(message);

            log.info("Welcome email sent successfully to: {}", email);
        } catch (MessagingException | IOException e) {
            log.error("Failed to send welcome email to: {}", email, e);
            throw new RuntimeException("Failed to send welcome email", e);
        }
    }

    /**
     * Send account-created email with username, generated password and role
     * Called by UserService after admin creates a new user account.
     */
    public void sendAccountCreatedEmail(String email, String username, String firstName,
                                        String rawPassword, String role) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(email);
            helper.setSubject("Your Account Has Been Created — Stock Management System");

            String htmlContent = loadEmailTemplate("classpath:templates/email-account-created.html");
            htmlContent = htmlContent.replace("${username}",  username);
            htmlContent = htmlContent.replace("${firstName}", firstName != null ? firstName : username);
            htmlContent = htmlContent.replace("${email}",     email);
            htmlContent = htmlContent.replace("${password}",  rawPassword);
            htmlContent = htmlContent.replace("${role}",      role.replace("_", " "));
            htmlContent = htmlContent.replace("${loginUrl}",  frontendUrl + "/login");

            helper.setText(htmlContent, true);
            mailSender.send(message);

            log.info("Account-created email sent to: {}", email);
        } catch (MessagingException | IOException e) {
            log.error("Failed to send account-created email to: {}", email, e);
            throw new RuntimeException("Failed to send account-created email", e);
        }
    }

    /**
     * Send password reset email
     */
    public void sendPasswordResetEmail(String email, String token) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(email);
            helper.setSubject("Password Reset Request - Stock Management System");

            String resetUrl = frontendUrl + "/reset-password?token=" + token;

            String htmlContent = String.format("""
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="UTF-8">
                    </head>
                    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h2 style="color: #667eea;">Password Reset Request</h2>
                        <p>Hello,</p>
                        <p>We received a request to reset your password. Click the button below to reset it:</p>
                        <p style="text-align: center; margin: 30px 0;">
                            <a href="%s" style="background-color: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
                        </p>
                        <p>Or copy and paste this link into your browser:</p>
                        <p style="background-color: #f4f4f4; padding: 10px; border-radius: 5px; word-break: break-all;">%s</p>
                        <p><strong>This link will expire in 1 hour.</strong></p>
                        <p>If you didn't request this password reset, please ignore this email or contact support if you have concerns.</p>
                        <p>Best regards,<br>Stock Management Team</p>
                    </body>
                    </html>
                    """, resetUrl, resetUrl);

            helper.setText(htmlContent, true);

            mailSender.send(message);

            log.info("Password reset email sent successfully to: {}", email);
        } catch (MessagingException e) {
            log.error("Failed to send password reset email to: {}", email, e);
            throw new RuntimeException("Failed to send password reset email", e);
        }
    }

    /**
     * Load email template from resources
     */
    private String loadEmailTemplate(String templatePath) throws IOException {
        Resource resource = resourceLoader.getResource(templatePath);
        try (InputStreamReader reader = new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8)) {
            return FileCopyUtils.copyToString(reader);
        }
    }
}