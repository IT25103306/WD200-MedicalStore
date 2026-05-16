package com.WD200.MedicalStore.service;

import com.WD200.MedicalStore.exception.ResourceNotFoundException;
import com.WD200.MedicalStore.model.Review;
import com.WD200.MedicalStore.repository.ReviewRepository;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.util.List;

@Service
public class ReviewService {

    private final ReviewRepository repo;

    public ReviewService(ReviewRepository repo) {
        this.repo = repo;
    }

    public Review create(Review review) {
        if (review.getRating() < 1 || review.getRating() > 5)
            throw new IllegalArgumentException("Rating must be between 1 and 5.");
        review.setDate(LocalDate.now());
        return repo.save(review);
    }

    public List<Review> getAll() { return repo.findAll(); }

    public Review getById(Long id) {
        return repo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Review not found: " + id));
    }

    public List<Review> getByMedicine(Long medicineId) {
        return repo.findByMedicine_Id(medicineId);
    }

    public List<Review> getByUser(Long userId) {
        return repo.findByUser_Id(userId);
    }

    public Review update(Long id, Review newData) {
        Review existing = getById(id);
        if (newData.getRating() < 1 || newData.getRating() > 5)
            throw new IllegalArgumentException("Rating must be between 1 and 5.");
        existing.setRating(newData.getRating());
        existing.setComment(newData.getComment());
        existing.setDate(LocalDate.now());
        return repo.save(existing);
    }

    public void delete(Long id) {
        repo.delete(getById(id));
    }
}
