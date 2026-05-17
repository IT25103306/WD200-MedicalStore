package com.WD200.MedicalStore.controller;

import com.WD200.MedicalStore.dto.UserResponseDTO;
import com.WD200.MedicalStore.model.User;
import com.WD200.MedicalStore.service.UserService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import com.WD200.MedicalStore.dto.LoginRequest;

@RestController
@RequestMapping("/users")
@CrossOrigin
public class UserController {

    private final UserService service;

    public UserController(UserService service) {
        this.service = service;
    }

    @PostMapping
    public UserResponseDTO create(@Valid @RequestBody User user) {
        return service.create(user);
    }

    @GetMapping
    public List<UserResponseDTO> getAll() {
        return service.getAll();
    }

    @GetMapping("/{id}")
    public UserResponseDTO getById(@PathVariable Long id) {
        return service.getById(id);
    }

    @GetMapping("/username/{username}")
    public UserResponseDTO getByUsername(@PathVariable String username) {
        return service.getByUsername(username);
    }

    @PutMapping("/{id}")
    public UserResponseDTO update(@PathVariable Long id, @RequestBody User user) {
        return service.update(id, user);
    }

    @DeleteMapping("/{id}")
    public String delete(@PathVariable Long id) {
        service.delete(id);
        return "User deleted successfully";
    }

    @PostMapping("/login")
    public UserResponseDTO login(@RequestBody LoginRequest request) {
        return service.login(request.getUsername(), request.getPassword());
    }
}
