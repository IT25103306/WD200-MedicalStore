package com.WD200.MedicalStore.controller;

import com.WD200.MedicalStore.model.Review;
import com.WD200.MedicalStore.service.ReviewService;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/reviews")
@CrossOrigin
public class ReviewController {

    private final ReviewService service;

    public ReviewController(ReviewService service) {
        this.service = service;
    }

    @PostMapping
    public Review create(@RequestBody Review review) {
        return service.create(review);
    }

    @GetMapping
    public List<Review> getAll() { return service.getAll(); }

    @GetMapping("/{id}")
    public Review getById(@PathVariable Long id) { return service.getById(id); }

    @GetMapping("/medicine/{medicineId}")
    public List<Review> getByMedicine(@PathVariable Long medicineId) {
        return service.getByMedicine(medicineId);
    }

    @GetMapping("/user/{userId}")
    public List<Review> getByUser(@PathVariable Long userId) {
        return service.getByUser(userId);
    }

    @PutMapping("/{id}")
    public Review update(@PathVariable Long id, @RequestBody Review review) {
        return service.update(id, review);
    }

    @DeleteMapping("/{id}")
    public String delete(@PathVariable Long id) {
        service.delete(id);
        return "Review deleted successfully";
    }
}
