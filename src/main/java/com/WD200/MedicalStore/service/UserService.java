package com.WD200.MedicalStore.service;

import com.WD200.MedicalStore.dto.UserResponseDTO;
import com.WD200.MedicalStore.exception.ResourceNotFoundException;
import com.WD200.MedicalStore.model.User;
import com.WD200.MedicalStore.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class UserService {

    private final UserRepository repo;
    private final PasswordEncoder encoder; // ✅ injected from SecurityConfig bean

    public UserService(UserRepository repo, PasswordEncoder encoder) {
        this.repo = repo;
        this.encoder = encoder;
    }

    public UserResponseDTO create(User user) {
        if (repo.existsByEmail(user.getEmail()))
            throw new IllegalArgumentException("Email already in use: " + user.getEmail());
        if (repo.existsByUsername(user.getUsername()))
            throw new IllegalArgumentException("Username already taken: " + user.getUsername());

        user.setPassword(encoder.encode(user.getPassword()));
        if (user.getRole() == null || user.getRole().isBlank())
            user.setRole("CUSTOMER");

        User saved = repo.save(user);
        return toDTO(saved);
    }

    public List<UserResponseDTO> getAll() {
        return repo.findAll().stream().map(this::toDTO).collect(Collectors.toList());
    }

    public UserResponseDTO getById(Long id) {
        return toDTO(findById(id));
    }

    public UserResponseDTO getByUsername(String username) {
        User user = repo.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));
        return toDTO(user);
    }

    public UserResponseDTO update(Long id, User updated) {
        User existing = findById(id);
        existing.setEmail(updated.getEmail());
        existing.setPhone(updated.getPhone());
        if (updated.getPassword() != null && !updated.getPassword().isBlank())
            existing.setPassword(encoder.encode(updated.getPassword()));
        return toDTO(repo.save(existing));
    }

    public void delete(Long id) {
        repo.delete(findById(id));
    }

    // ✅ Internal helper — returns full entity for services that need it
    public User findEntityById(Long id) {
        return findById(id);
    }

    private User findById(Long id) {
        return repo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
    }

    private UserResponseDTO toDTO(User u) {
        return new UserResponseDTO(u.getId(), u.getUsername(),
                u.getEmail(), u.getPhone(), u.getRole());
    }

    public UserResponseDTO login(String username, String password) {
        User user = repo.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));
        if (!encoder.matches(password, user.getPassword()))
            throw new IllegalArgumentException("Incorrect password");
        return toDTO(user);
    }
}
