package com.WD200.MedicalStore.service;

import com.WD200.MedicalStore.exception.ResourceNotFoundException;
import com.WD200.MedicalStore.model.*;
import com.WD200.MedicalStore.repository.*;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class PrescriptionService {

    private final PrescriptionRepository repo;
    private final UserRepository userRepo;
    private final MedicineRepository medicineRepo;

    public PrescriptionService(PrescriptionRepository repo,
                               UserRepository userRepo,
                               MedicineRepository medicineRepo) {
        this.repo = repo;
        this.userRepo = userRepo;
        this.medicineRepo = medicineRepo;
    }

    public Prescription create(Prescription p) {
        // Validate user exists
        userRepo.findById(p.getUser().getId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "User not found: " + p.getUser().getId()));
        p.setStatus("PENDING");
        return repo.save(p);
    }

    public List<Prescription> getAll() { return repo.findAll(); }

    public Prescription getById(Long id) {
        return repo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Prescription not found: " + id));
    }

    public List<Prescription> getByUser(Long userId) {
        return repo.findByUser_Id(userId);
    }

    public List<Prescription> getByStatus(String status) {
        return repo.findByStatusIgnoreCase(status);
    }

    // ✅ ADMIN/PHARMACIST approves or rejects
    public Prescription updateStatus(Long id, String status) {
        Prescription existing = getById(id);
        existing.setStatus(status.toUpperCase());
        return repo.save(existing);
    }

    public Prescription update(Long id, Prescription newData) {
        Prescription existing = getById(id);
        existing.setDoctorName(newData.getDoctorName());
        existing.setFileName(newData.getFileName());
        existing.setIssueDate(newData.getIssueDate());
        existing.setExpiryDate(newData.getExpiryDate());
        return repo.save(existing);
    }

    public void delete(Long id) {
        repo.delete(getById(id));
    }
}