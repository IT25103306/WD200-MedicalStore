package com.WD200.MedicalStore.repository;

import com.WD200.MedicalStore.model.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ReviewRepository extends JpaRepository<Review, Long> {
    List<Review> findByMedicine_Id(Long medicineId);
    List<Review> findByUser_Id(Long userId);
}
