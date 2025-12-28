package com.stock.authservice.dto.request;

import jakarta.validation.constraints.Email;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserUpdateRequest {

    @Email(message = "Invalid email format")
    private String email;

    private String firstName;
    private String lastName;
    private String phoneNumber;
    private String language;
    private String timezone;
    private String profileImageUrl;
    private String metadata;
}
