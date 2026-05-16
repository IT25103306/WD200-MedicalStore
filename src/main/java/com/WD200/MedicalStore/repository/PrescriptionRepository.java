package com.WD200.MedicalStore.repository;

import com.WD200.MedicalStore.model.Prescription;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PrescriptionRepository extends JpaRepository<Prescription, Long> {
    List<Prescription> findByUser_Id(Long userId);
    List<Prescription> findByStatusIgnoreCase(String status);
    List<Prescription> findByMedicine_Id(Long medicineId);
}