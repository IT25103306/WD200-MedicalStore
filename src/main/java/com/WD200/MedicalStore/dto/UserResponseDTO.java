package com.WD200.MedicalStore.dto;

// ✅ Never expose password in API responses
public class UserResponseDTO {

    private Long id;
    private String username;
    private String email;
    private String phone;
    private String role;

    public UserResponseDTO() {}

    public UserResponseDTO(Long id, String username, String email,
                           String phone, String role) {
        this.id = id;
        this.username = username;
        this.email = email;
        this.phone = phone;
        this.role = role;
    }

    public Long getId() { return id; }
    public String getUsername() { return username; }
    public String getEmail() { return email; }
    public String getPhone() { return phone; }
    public String getRole() { return role; }
}
