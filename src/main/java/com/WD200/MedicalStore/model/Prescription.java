package com.WD200.MedicalStore.model;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "prescriptions")
public class Prescription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ✅ FK to User
    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // ✅ FK to Medicine (optional — prescription may cover multiple)
    @ManyToOne
    @JoinColumn(name = "medicine_id")
    private Medicine medicine;

    private String doctorName;
    private String fileName;       // uploaded prescription image path
    private LocalDate issueDate;
    private LocalDate expiryDate;

    // PENDING, APPROVED, REJECTED
    private String status;

    public Prescription() {}

    public Prescription(User user, Medicine medicine, String doctorName,
                        String fileName, LocalDate issueDate,
                        LocalDate expiryDate, String status) {
        this.user = user;
        this.medicine = medicine;
        this.doctorName = doctorName;
        this.fileName = fileName;
        this.issueDate = issueDate;
        this.expiryDate = expiryDate;
        this.status = status;
    }

    public Long getId() { return id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public Medicine getMedicine() { return medicine; }
    public void setMedicine(Medicine medicine) { this.medicine = medicine; }

    public String getDoctorName() { return doctorName; }
    public void setDoctorName(String doctorName) { this.doctorName = doctorName; }

    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }

    public LocalDate getIssueDate() { return issueDate; }
    public void setIssueDate(LocalDate issueDate) { this.issueDate = issueDate; }

    public LocalDate getExpiryDate() { return expiryDate; }
    public void setExpiryDate(LocalDate expiryDate) { this.expiryDate = expiryDate; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}